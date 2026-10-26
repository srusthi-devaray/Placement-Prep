// Shared by the practice route and timed assessments: run code in the judge (never in this process) and record the outcome.
const { CodeSubmission, CodeProgress } = require('../models');
const judge = require('./judge');
const { HttpError } = require('../utils');

const MAX_CODE = 20000;
function cleanCode(c) {
  const code = typeof c === 'string' ? c : '';
  if (!code.trim()) throw new HttpError(400, 'Write some code first');
  if (code.length > MAX_CODE) throw new HttpError(413, `Your code is too long (limit ${MAX_CODE} characters)`);
  return code.replace(/\r\n/g, '\n');
}
function ensureRunner() {
  const s = judge.status();
  if (!s.enabled) throw new HttpError(503, s.note || 'Code running is not available on this server');
}
const allTests = (p) => p.tests.map((t) => ({ input: t.input + '\n', output: t.output, visible: t.visible }));

async function runAll(p, code) {
  try { return await judge.judge(code, allTests(p)); } catch (e) { throw new HttpError(503, `The code runner failed: ${e.message}`); }
}

// Judge against ALL tests and update submission history + progress.
async function submitAndRecord(userId, p, code) {
  const result = await runAll(p, code);
  const verdict = result.verdict === 'RAN' ? 'RE' : result.verdict;
  await CodeSubmission.create({ user: userId, problemId: p.id, code, verdict, passed: result.passed, total: result.total, timeMs: result.timeMs, memoryKb: result.memoryKb });
  const g = (await CodeProgress.findOne({ user: userId, problemId: p.id })) || new CodeProgress({ user: userId, problemId: p.id });
  g.attempts += 1; g.savedCode = code;
  if (verdict === 'AC') {
    if (g.status !== 'solved') { g.status = 'solved'; g.solvedAt = new Date(); }
    g.revise = false;
    if (result.timeMs != null && (g.bestTimeMs == null || result.timeMs < g.bestTimeMs)) g.bestTimeMs = result.timeMs;
  } else {
    g.wrongAttempts += 1;
    if (g.status === 'untouched') g.status = 'attempted';
    g.revise = g.status !== 'solved';
  }
  await g.save();
  return { ...result, verdict, status: g.status };
}

module.exports = { cleanCode, ensureRunner, runAll, submitAndRecord, MAX_CODE };
