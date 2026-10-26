// Code judge. User code is NEVER run inside this Node process.
// CODE_RUNNER selects where it runs:
//   docker  (default when Docker works): throw-away container: no network, read-only FS, 256 MB RAM, 0.5 CPU, 64 processes, non-root.
//   judge0  : a Judge0 server (self-hosted, or RapidAPI) - see README.
//   local   : DEV ONLY. A separate Python child process with rlimits. NOT a sandbox. Refused when NODE_ENV=production
//             unless ALLOW_UNSAFE_LOCAL_RUNNER=1.
//   off     : code running disabled.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { normalize } = require('./judgeUtil');

const HARNESS = fs.readFileSync(path.join(__dirname, 'harness.py'), 'utf8');
const TIME_LIMIT_MS = Number(process.env.CODE_TIME_LIMIT_MS) || 2000;
const MEM_LIMIT_MB = Number(process.env.CODE_MEM_LIMIT_MB) || 256;
const IMAGE = process.env.CODE_DOCKER_IMAGE || 'python:3.12-alpine';
const MAX_CONCURRENT = Number(process.env.CODE_MAX_CONCURRENT) || 2;
const PY = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

let mode = null, modeNote = '';
function detectMode() {
  if (mode) return mode;
  const want = (process.env.CODE_RUNNER || '').toLowerCase();
  const dockerOk = () => { try { return spawnSync('docker', ['info'], { timeout: 8000 }).status === 0; } catch { return false; } };
  if (want === 'off') { mode = 'off'; modeNote = 'Code running is switched off (CODE_RUNNER=off).'; }
  else if (want === 'judge0') {
    if (!process.env.JUDGE0_URL) { mode = 'off'; modeNote = 'CODE_RUNNER=judge0 but JUDGE0_URL is not set.'; } else { mode = 'judge0'; modeNote = 'Judge0'; }
  } else if (want === 'local') {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNSAFE_LOCAL_RUNNER !== '1') { mode = 'off'; modeNote = 'The local runner is not a sandbox and is refused in production.'; }
    else { mode = 'local'; modeNote = 'DEV ONLY: runs code in a plain Python process, not a sandbox. Use only on your own computer.'; }
  } else if (want === 'docker' || !want) {
    if (dockerOk()) { mode = 'docker'; modeNote = `Docker (${IMAGE})`; }
    else { mode = 'off'; modeNote = want === 'docker' ? 'CODE_RUNNER=docker but Docker is not running.' : 'No code runner is configured. Install and start Docker Desktop, or set CODE_RUNNER (see README).'; }
  } else { mode = 'off'; modeNote = `Unknown CODE_RUNNER "${want}".`; }
  if (mode === 'local') console.warn('\nWARNING: ' + modeNote + '\n');
  return mode;
}
const status = () => { const m = detectMode(); return { enabled: m !== 'off', mode: m, note: modeNote, language: 'Python 3', timeLimitMs: TIME_LIMIT_MS, memoryLimitMb: MEM_LIMIT_MB }; };

// ---- simple FIFO semaphore so a few users cannot start dozens of containers at once ----
let active = 0; const waiting = [];
const acquire = () => new Promise((res) => { if (active < MAX_CONCURRENT) { active += 1; res(); } else waiting.push(res); });
const release = () => { const n = waiting.shift(); if (n) n(); else active -= 1; };

function runHarness(cmd, args, payload, timeoutMs, onTimeout) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', done = false;
    const timer = setTimeout(() => { if (!done) { done = true; try { onTimeout && onTimeout(); p.kill('SIGKILL'); } catch { /* gone */ } reject(Object.assign(new Error('The judge timed out'), { code: 'JUDGE_TIMEOUT' })); } }, timeoutMs);
    p.stdout.on('data', (d) => { if (out.length < 4e6) out += d; });
    p.stderr.on('data', (d) => { if (err.length < 1e5) err += d; });
    p.on('error', (e) => { if (!done) { done = true; clearTimeout(timer); reject(e); } });
    p.on('close', () => {
      if (done) return; done = true; clearTimeout(timer);
      try { resolve(JSON.parse(out)); } catch { reject(new Error('The judge returned no result. ' + err.slice(-300))); }
    });
    p.stdin.on('error', () => {});
    p.stdin.end(payload);
  });
}

async function runPython(code, inputs) {
  const m = detectMode();
  const payload = JSON.stringify({ code, tests: inputs.map((input) => ({ input })), timeLimitMs: TIME_LIMIT_MS, memLimitMb: MEM_LIMIT_MB });
  const budget = inputs.length * (TIME_LIMIT_MS + 600) + 15000;
  if (m === 'docker') {
    const name = `pp-judge-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const args = ['run', '--rm', '-i', '--name', name, '--network', 'none', '--memory', `${MEM_LIMIT_MB + 64}m`, '--memory-swap', `${MEM_LIMIT_MB + 64}m`,
      '--cpus', '0.5', '--pids-limit', '64', '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--user', '65534:65534', '-e', 'TMPDIR=/tmp', IMAGE, 'python', '-I', '-c', HARNESS];
    const r = await runHarness('docker', args, payload, budget, () => spawn('docker', ['kill', name], { stdio: 'ignore' }));
    return r.results;
  }
  if (m === 'local') {
    const r = await runHarness(PY, ['-I', '-c', HARNESS], payload, budget);
    return r.results;
  }
  if (m === 'judge0') return runJudge0(code, inputs);
  throw Object.assign(new Error(modeNote || 'Code running is not available'), { code: 'NO_RUNNER' });
}

// ---- Judge0 (self-hosted or RapidAPI). Python 3 language id 71 (3.8.x) on Judge0 CE. ----
async function runJudge0(code, inputs) {
  const base = process.env.JUDGE0_URL.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_RAPIDAPI_KEY) { headers['X-RapidAPI-Key'] = process.env.JUDGE0_RAPIDAPI_KEY; headers['X-RapidAPI-Host'] = process.env.JUDGE0_RAPIDAPI_HOST || new URL(base).host; }
  if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
  const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
  const unb64 = (s) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');
  const results = [];
  for (const input of inputs) {
    const res = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST', headers,
      body: JSON.stringify({ language_id: Number(process.env.JUDGE0_PYTHON_ID) || 71, source_code: b64(code), stdin: b64(input), cpu_time_limit: TIME_LIMIT_MS / 1000, memory_limit: MEM_LIMIT_MB * 1024 })
    });
    if (!res.ok) throw new Error(`Judge0 returned ${res.status}`);
    const j = await res.json();
    const id = j.status && j.status.id;
    let st = 'ok';
    if (id === 5) st = 'tle'; else if (id >= 6 && id !== 3 && id !== 4) st = 're';
    if (id === 12 && /MemoryError/.test(unb64(j.stderr))) st = 'mle';
    results.push({ status: st, stdout: unb64(j.stdout), stderr: (unb64(j.stderr) || unb64(j.compile_output) || (j.message ? unb64(j.message) : '')).slice(-2000), timeMs: Math.round(Number(j.time || 0) * 1000), memoryKb: j.memory == null ? null : Number(j.memory) });
  }
  return results;
}

const VERDICT_TEXT = { AC: 'Accepted', WA: 'Wrong Answer', TLE: 'Time Limit Exceeded', RE: 'Runtime Error', MLE: 'Memory Limit Exceeded', CE: 'Syntax Error' };

function verdictOf(r, expected) {
  if (r.status === 'tle') return 'TLE';
  if (r.status === 'mle') return 'MLE';
  if (r.status === 're') return /SyntaxError|IndentationError|TabError/.test(r.stderr || '') ? 'CE' : 'RE';
  return normalize(r.stdout) === normalize(expected) ? 'AC' : 'WA';
}

// tests: [{input, output|null, visible}] -> detailed results (hidden test details are withheld).
async function judge(code, tests, { stopOnFail = false } = {}) {
  await acquire();
  try {
    // Run everything in one sandbox. For submissions we may stop early on the first failure to save time.
    const raw = await runPython(code, tests.map((t) => t.input));
    const results = [];
    let firstFail = null;
    raw.forEach((r, i) => {
      const t = tests[i];
      const v = t.output == null ? (r.status === 'ok' ? 'RAN' : verdictOf(r, '')) : verdictOf(r, t.output);
      if (!firstFail && v !== 'AC' && v !== 'RAN') firstFail = v;
      const item = { index: i, visible: !!t.visible, verdict: v, timeMs: r.timeMs, memoryKb: r.memoryKb };
      if (t.visible || t.output == null) { item.input = t.input; item.expected = t.output == null ? undefined : t.output; item.got = normalize(r.stdout).slice(0, 4000); item.stderr = r.stderr; }
      else if (v === 'RE' || v === 'CE') item.stderr = (r.stderr || '').split('\n').slice(-3).join('\n');
      results.push(item);
    });
    void stopOnFail;
    const passed = results.filter((r) => r.verdict === 'AC' || r.verdict === 'RAN').length;
    const overall = firstFail || (tests.every((t) => t.output == null) ? 'RAN' : 'AC');
    const times = results.map((r) => r.timeMs).filter((x) => x != null);
    const mems = results.map((r) => r.memoryKb).filter((x) => x != null);
    return { verdict: overall, verdictText: VERDICT_TEXT[overall] || 'Ran', passed, total: results.length, timeMs: times.length ? Math.max(...times) : null, memoryKb: mems.length ? Math.max(...mems) : null, results };
  } finally { release(); }
}

module.exports = { judge, status, detectMode, VERDICT_TEXT, TIME_LIMIT_MS, MEM_LIMIT_MB };
