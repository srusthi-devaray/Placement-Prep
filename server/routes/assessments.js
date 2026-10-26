// Timed coding assessments + "find the bug" exercises. All code runs in services/judge.js (never in this process).
const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Assessment, DebugProgress } = require('../models');
const problems = require('../services/problems');
const A = require('../services/assessments');
const { cleanCode, ensureRunner, runAll, submitAndRecord } = require('../services/submit');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const runLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => (req.user && req.user.id) || req.ip, message: { error: 'You are running code too fast. Wait a few seconds.' } });

// ---------------- timed assessments ----------------
router.get('/', wrap(async (req, res) => {
  const cur = await A.active(req.user.id);
  const rows = await Assessment.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
  for (const r of rows) await A.settle(r);
  res.json({
    limits: A.LIMITS, active: cur ? A.view(cur) : null,
    history: rows.filter((r) => r.status !== 'active').map((r) => A.view(r, false))
  });
}));

router.post('/', wrap(async (req, res) => {
  ensureRunner();                                   // be honest: no runner = no assessment
  if (await A.active(req.user.id)) throw new HttpError(409, 'You already have a running assessment. Finish it first.');
  const b = req.body || {};
  const durationMin = Math.round(Number(b.durationMin) || 45);
  if (durationMin < A.LIMITS.minMin || durationMin > A.LIMITS.maxMin) throw new HttpError(400, `Duration must be between ${A.LIMITS.minMin} and ${A.LIMITS.maxMin} minutes`);
  const count = Math.round(Number(b.count) || 2);
  if (count < 1 || count > A.LIMITS.maxProblems) throw new HttpError(400, `Choose 1 to ${A.LIMITS.maxProblems} problems`);
  const level = str(b.level, 20), topic = str(b.topic, 40);
  if (level && !problems.LEVELS.includes(level)) throw new HttpError(400, 'Unknown level');
  if (topic && !problems.load().topics.includes(topic)) throw new HttpError(400, 'Unknown topic');
  const chosen = await A.pick(req.user.id, { count, level, topic });
  if (!chosen.length) throw new HttpError(400, 'No problems match those filters');
  const now = Date.now();
  const a = await Assessment.create({ user: req.user.id, status: 'active', durationMin, startedAt: new Date(now), deadline: new Date(now + durationMin * 60000), problemIds: chosen.map((p) => p.id), results: [] });
  res.status(201).json(A.view(a));
}));

router.get('/:id', wrap(async (req, res) => {
  const a = await Assessment.findOne({ _id: req.params.id, user: req.user.id });
  if (!a) throw new HttpError(404, 'Assessment not found');
  await A.settle(a);
  res.json(A.view(a));
}));

// Problem statement for a problem inside a running (or finished) assessment. Hidden tests are never sent.
router.get('/:id/problems/:pid', wrap(async (req, res) => {
  const a = await Assessment.findOne({ _id: req.params.id, user: req.user.id });
  if (!a || !a.problemIds.includes(req.params.pid)) throw new HttpError(404, 'Not found');
  await A.settle(a);
  const p = problems.get(req.params.pid);
  const last = (a.results || []).find((r) => r.problemId === p.id);
  res.json({ ...problems.publicView(p), assessment: A.view(a, false), lastCode: last ? last.code || '' : '', result: last ? { verdict: last.verdict, passed: last.passed, total: last.total, attempts: last.attempts } : null });
}));

router.post('/:id/problems/:pid/submit', runLimiter, wrap(async (req, res) => {
  const a = await Assessment.findOne({ _id: req.params.id, user: req.user.id });
  if (!a || !a.problemIds.includes(req.params.pid)) throw new HttpError(404, 'Not found');
  await A.settle(a);
  if (a.status !== 'active') throw new HttpError(409, 'Time is up. This assessment is closed.');
  const code = cleanCode(req.body && req.body.code);
  ensureRunner();
  const p = problems.get(req.params.pid);
  const result = await submitAndRecord(req.user.id, p, code);
  // Keep the best attempt per problem (accepted beats everything; otherwise the most tests passed).
  const results = [...(a.results || [])];
  const i = results.findIndex((r) => r.problemId === p.id);
  const prev = i >= 0 ? results[i] : null;
  const better = !prev || result.verdict === 'AC' && prev.verdict !== 'AC' || (prev.verdict !== 'AC' && result.passed >= prev.passed);
  const entry = better ? { problemId: p.id, verdict: result.verdict, passed: result.passed, total: result.total, attempts: (prev ? prev.attempts : 0) + 1, submittedAt: new Date(), code } : { ...prev, attempts: prev.attempts + 1 };
  if (i >= 0) results[i] = entry; else results.push(entry);
  a.results = results; if (a.markModified) a.markModified('results');
  await a.save();
  // Hidden test details are not returned beyond what the judge already exposes for visible tests.
  res.json({ ...result, attempts: entry.attempts, remainingSec: A.view(a, false).remainingSec });
}));

router.post('/:id/finish', wrap(async (req, res) => {
  const a = await Assessment.findOne({ _id: req.params.id, user: req.user.id });
  if (!a) throw new HttpError(404, 'Assessment not found');
  await A.settle(a);
  if (a.status === 'active') await A.finish(a);
  res.json(A.view(a));
}));

// ---------------- debugging exercises ----------------
// Mounted separately at /api/debug (see debugRouter below).
const debugRouter = express.Router();
let DEBUG = null;
const loadDebug = () => {
  if (DEBUG) return DEBUG;
  const f = path.join(__dirname, '../data/debug.json');
  DEBUG = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { exercises: [] };
  return DEBUG;
};
const exercise = (id) => { const e = loadDebug().exercises.find((x) => x.id === id); if (!e) throw new HttpError(404, 'Exercise not found'); return e; };

debugRouter.get('/', wrap(async (req, res) => {
  const prog = new Map((await DebugProgress.find({ user: req.user.id }).lean()).map((x) => [x.exerciseId, x]));
  const level = str(req.query.level, 20), q = str(req.query.q, 60).toLowerCase(), status = str(req.query.status, 10);
  let list = loadDebug().exercises.map((e) => ({ id: e.id, title: e.title, bugType: e.bugType, level: e.level, topic: e.topic, fixed: !!(prog.get(e.id) && prog.get(e.id).fixed), attempts: prog.get(e.id) ? prog.get(e.id).attempts : 0 }));
  if (level) list = list.filter((e) => e.level === level);
  if (status === 'fixed') list = list.filter((e) => e.fixed); if (status === 'open') list = list.filter((e) => !e.fixed);
  if (q) list = list.filter((e) => `${e.title} ${e.topic} ${e.bugType}`.toLowerCase().includes(q));
  res.json(list);
}));

debugRouter.get('/:id', wrap(async (req, res) => {
  const e = exercise(req.params.id), p = problems.get(e.problemId);
  const g = await DebugProgress.findOne({ user: req.user.id, exerciseId: e.id });
  res.json({ id: e.id, title: e.title, bugType: e.bugType, level: e.level, topic: e.topic, symptom: e.symptom, brokenCode: (g && g.lastCode) || e.brokenCode, originalBroken: e.brokenCode, problem: problems.publicView(p), fixed: !!(g && g.fixed), attempts: g ? g.attempts : 0 });
}));

debugRouter.get('/:id/hint', wrap(async (req, res) => { res.json({ hint: exercise(req.params.id).hint }); }));

// Run the student's fixed code against ALL tests of the underlying problem. Only the debug progress is recorded (this does not
// count as solving the problem itself in the coding-practice stats).
debugRouter.post('/:id/submit', runLimiter, wrap(async (req, res) => {
  const e = exercise(req.params.id), p = problems.get(e.problemId);
  const code = cleanCode(req.body && req.body.code);
  ensureRunner();
  if (code.trim() === e.brokenCode.trim()) throw new HttpError(400, 'This is still the original broken code. Change something first.');
  const result = await runAll(p, code);
  const verdict = result.verdict === 'RAN' ? 'RE' : result.verdict;
  const g = (await DebugProgress.findOne({ user: req.user.id, exerciseId: e.id })) || new DebugProgress({ user: req.user.id, exerciseId: e.id });
  g.attempts += 1; g.lastCode = code;
  if (verdict === 'AC' && !g.fixed) { g.fixed = true; g.fixedAt = new Date(); }
  await g.save();
  res.json({ ...result, verdict, fixed: g.fixed, attempts: g.attempts });
}));

debugRouter.post('/:id/reset', wrap(async (req, res) => {
  const e = exercise(req.params.id);
  const g = await DebugProgress.findOne({ user: req.user.id, exerciseId: e.id });
  if (g) { g.lastCode = ''; await g.save(); }
  res.json({ brokenCode: e.brokenCode });
}));

module.exports = router;
module.exports.debugRouter = debugRouter;
