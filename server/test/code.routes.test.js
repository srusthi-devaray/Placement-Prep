// Exercises routes/code.js with in-memory stand-ins for the Mongoose models (no database needed).
// Run: CODE_RUNNER=local node test/code.routes.test.js
process.env.CODE_RUNNER = process.env.CODE_RUNNER || 'local';
process.env.JWT_SECRET = 'x';
const Module = require('module');
const http = require('http');
const assert = require('assert');

function fakeModel(defaults) {
  const rows = [];
  const match = (r, q) => Object.entries(q).every(([k, v]) => String(r[k]) === String(v));
  const wrapQ = (arr) => { const p = Promise.resolve(arr); const q = { sort: () => q, limit: () => q, select: () => q, lean: () => Promise.resolve(arr), then: p.then.bind(p), catch: p.catch.bind(p) }; return q; };
  class M {
    constructor(d) { Object.assign(this, JSON.parse(JSON.stringify(defaults)), d); }
    async save() { if (!rows.includes(this)) rows.push(this); return this; }
    static find(q) { return wrapQ(rows.filter((r) => match(r, q))); }
    static findOne(q) { const r = rows.find((x) => match(x, q)) || null; const p = Promise.resolve(r); return { lean: () => Promise.resolve(r && { ...r }), then: p.then.bind(p), catch: p.catch.bind(p) }; }
    static async create(d) { const m = new M(d); rows.push(m); return m; }
    static async updateOne(q, u, o) { let r = rows.find((x) => match(x, q)); if (!r) { if (!(o && o.upsert)) return; r = new M({ ...q, ...(u.$setOnInsert || {}) }); rows.push(r); } Object.assign(r, u.$set || {}); }
  }
  M.rows = rows; return M;
}
const CodeProgress = fakeModel({ status: 'untouched', attempts: 0, wrongAttempts: 0, bookmarked: false, revise: false, note: '', savedCode: '', hintsRevealed: 0, editorialViewed: false, bestTimeMs: null });
const CodeSubmission = fakeModel({});

// ---- minimal stand-ins for express / express-rate-limit (used only when the real packages are not installed) ----
function tryReal(name) { try { return require(name); } catch { return null; } }
function miniExpress() {
  const compile = (path) => { if (process.env.DBG) console.error('compile', JSON.stringify(path)); const keys = []; const re = new RegExp('^' + path.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'); return { re, keys }; };
  const mkRouter = () => {
    const routes = []; const uses = [];
    const add = (method) => (path, ...h) => { routes.push({ method, ...compile(path), h }); };
    const r = (req, res, next) => {
      const base = req.url.split('?')[0];
      const hit = routes.find((x) => x.method === req.method && x.re.test(base));
      if (!hit) return next();
      const m = base.match(hit.re); req.params = Object.fromEntries(hit.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const q = req.url.split('?')[1]; req.query = Object.fromEntries(new URLSearchParams(q || ''));
      let i = 0; const step = (err) => { if (err) return next(err); const f = hit.h[i++]; if (!f) return next(); try { f(req, res, step); } catch (e) { next(e); } }; step();
    };
    r.get = add('GET'); r.post = add('POST'); r.put = add('PUT'); r.delete = add('DELETE'); r.use = (f) => uses.push(f);
    return r;
  };
  const ex = () => {
    const stack = []; const app = (req, res) => {
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      let i = 0; const next = (err) => { const f = stack[i++]; if (!f) return res.status(404).json({ error: 'nf' });
        try { if (f.length === 4) return err ? f(err, req, res, next) : next(); if (err) return next(err); f(req, res, next); } catch (e) { next(e); } }; next();
    };
    app.use = (a, b) => { if (typeof a === 'string') { const r = b; stack.push((req, res, next) => { if (req.url.startsWith(a)) { const o = req.url; req.url = req.url.slice(a.length) || '/'; r(req, res, (e) => { req.url = o; next(e); }); } else next(); }); } else stack.push(a); };
    app.listen = (port) => require('http').createServer(app).listen(port);
    return app;
  };
  ex.Router = mkRouter;
  ex.json = () => (req, res, next) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { try { req.body = b ? JSON.parse(b) : {}; next(); } catch { res.status(400).json({ error: 'bad json' }); } }); };
  return ex;
}
const realExpress = tryReal('express');
const stubbed = !realExpress;

const origLoad = Module._load;
const mini = stubbed ? miniExpress() : null;
const hasRateLimit = !!tryReal('express-rate-limit');
Module._load = function (req, parent, ...r) {
  if (req === '../models') return { CodeProgress, CodeSubmission, Assessment: { findOne: async () => null } };
  if (stubbed && req === 'express') return mini;
  if (!hasRateLimit && req === 'express-rate-limit') return () => (rq, rs, nx) => nx();
  return origLoad.call(this, req, parent, ...r);
};

const express = require('express');
console.log(stubbed ? '(using built-in Express stand-in)' : '(using real Express)');
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 'u1' }; next(); });
app.use('/api/code', require('../routes/code'));
app.use((e, req, res, next) => res.status(e.status || 500).json({ error: e.message })); // eslint-disable-line no-unused-vars

const call = (srv, method, path, body) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const rq = http.request({ port: srv.address().port, path, method, headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
    let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b || '{}') }));
  });
  rq.on('error', reject); if (data) rq.write(data); rq.end();
});

if (process.env.SERVE_ONLY) {  // UI test helper: serve the API (in-memory) plus static files from SERVE_DIR
  const fs = require('fs'); const path = require('path');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  http.createServer((req, res) => {
    if (req.url.startsWith('/api')) { req.url = req.url.replace(/^\/api\/code/, '/api/code'); return app(req, res); }
    const f = path.join(process.env.SERVE_DIR, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(f)] || 'text/plain'); res.end(d); });
  }).listen(Number(process.env.SERVE_ONLY), () => console.log('serving on', process.env.SERVE_ONLY));
}
if (!process.env.SERVE_ONLY) (async () => {
  const srv = app.listen(0);
  const T = (n) => console.log('PASS', n);
  const meta = await call(srv, 'GET', '/api/code/meta'); assert.equal(meta.body.topics.length, 17); T('meta: 17 topics, ' + meta.body.total + ' problems');
  const list = await call(srv, 'GET', '/api/code/problems?topic=Arrays'); assert(list.body.length >= 3 && !('tests' in list.body[0])); T('list filter by topic');
  const prob = await call(srv, 'GET', '/api/code/problems/two-sum'); assert(prob.body.examples.length === 2 && !prob.body.tests && !prob.body.editorial && !prob.body.hints); T('problem view hides tests/editorial/hints');
  const h1 = await call(srv, 'POST', '/api/code/problems/two-sum/hint'); assert.equal(h1.body.hints.length, 1);
  const h2 = await call(srv, 'POST', '/api/code/problems/two-sum/hint'); assert.equal(h2.body.hints.length, 2); T('hints revealed one at a time');
  const ed0 = await call(srv, 'GET', '/api/code/problems/two-sum/editorial'); assert.equal(ed0.status, 400); T('editorial needs confirmation');
  const ed1 = await call(srv, 'GET', '/api/code/problems/two-sum/editorial?reveal=1'); assert(ed1.body.code && ed1.body.time); T('editorial after confirm');
  const bad = await call(srv, 'POST', '/api/code/problems/two-sum/submit', { code: 'print("0 0")' }); assert.equal(bad.body.verdict, 'WA'); assert(bad.body.results.every((r) => r.visible || (r.input === undefined && r.expected === undefined))); T('wrong submission -> WA, hidden test data not leaked');
  let prog = await call(srv, 'GET', '/api/code/progress'); assert.equal(prog.body.revision.length, 1); T('wrong answer enters revision queue');
  const sol = require('../data/problems.json').problems.find((p) => p.id === 'two-sum').editorial.code;
  const ok = await call(srv, 'POST', '/api/code/problems/two-sum/submit', { code: sol }); assert.equal(ok.body.verdict, 'AC'); assert.equal(ok.body.status, 'solved'); T('correct submission -> AC, solved');
  prog = await call(srv, 'GET', '/api/code/progress'); assert.equal(prog.body.solved, 1); assert.equal(prog.body.revision.length, 0); assert.equal(prog.body.submissions, 2); assert.equal(prog.body.accuracy, 50); T('progress: solved=1, accuracy=50%, revision cleared');
  const run = await call(srv, 'POST', '/api/code/problems/two-sum/run', { code: sol }); assert.equal(run.body.verdict, 'AC'); assert.equal(run.body.total, 2); T('run examples');
  const cust = await call(srv, 'POST', '/api/code/problems/two-sum/run', { code: sol, input: '3 6\n3 2 4\n' }); assert.equal(cust.body.results[0].got, '1 2'); T('run with custom input');
  const st = await call(srv, 'PUT', '/api/code/problems/two-sum/state', { note: 'use dict', bookmarked: true }); assert(st.body.ok);
  const again = await call(srv, 'GET', '/api/code/problems/two-sum'); assert.equal(again.body.progress.note, 'use dict'); assert(again.body.progress.bookmarked); T('notes + bookmark saved');
  const subs = await call(srv, 'GET', '/api/code/problems/two-sum/submissions'); assert.equal(subs.body.length, 2); T('submission history');
  assert.equal((await call(srv, 'POST', '/api/code/problems/two-sum/run', { code: '   ' })).status, 400);
  assert.equal((await call(srv, 'GET', '/api/code/problems/nope')).status, 404); T('validation + 404');
  srv.close(); console.log('\nAll code-route tests passed'); process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
