// Coding practice: problem library, run/submit (executed by services/judge.js, never in this process), progress, notes, hints.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { CodeSubmission, CodeProgress } = require('../models');
const problems = require('../services/problems');
const judge = require('../services/judge');
const { submitAndRecord } = require('../services/submit');
const { lockedFor } = require('../services/assessments');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const MAX_CODE = 20000;
const runLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => (req.user && req.user.id) || req.ip, message: { error: 'You are running code too fast. Wait a few seconds.' } });

const getProblem = (id) => { const p = problems.get(String(id)); if (!p) throw new HttpError(404, 'Problem not found'); return p; };
const cleanCode = (c) => {
  const code = typeof c === 'string' ? c : '';
  if (!code.trim()) throw new HttpError(400, 'Write some code first');
  if (code.length > MAX_CODE) throw new HttpError(413, `Your code is too long (limit ${MAX_CODE} characters)`);
  return code.replace(/\r\n/g, '\n');
};
const ensureRunner = () => { const s = judge.status(); if (!s.enabled) throw new HttpError(503, s.note || 'Code running is not available on this server'); };
const progressFor = async (userId, problemId) => (await CodeProgress.findOne({ user: userId, problemId })) || new CodeProgress({ user: userId, problemId });

router.get('/status', (req, res) => res.json(judge.status()));

router.get('/meta', wrap(async (req, res) => {
  const lib = problems.load();
  res.json({
    topics: lib.topics.map((t) => ({ name: t, count: lib.problems.filter((p) => p.topic === t).length })),
    levels: problems.LEVELS.map((l) => ({ name: l, count: lib.problems.filter((p) => p.level === l).length })),
    collections: lib.collections.map((c) => ({ ...c, count: lib.problems.filter((p) => p.collections.includes(c.id)).length })),
    total: lib.problems.length
  });
}));

router.get('/problems', wrap(async (req, res) => {
  const lib = problems.load();
  const { topic, level, collection, status, q } = req.query;
  const prog = new Map((await CodeProgress.find({ user: req.user.id }).lean()).map((x) => [x.problemId, x]));
  const needle = str(q, 80).toLowerCase();
  const list = lib.problems
    .filter((p) => (!topic || p.topic === topic) && (!level || p.level === level) && (!collection || p.collections.includes(collection)) && (!needle || p.title.toLowerCase().includes(needle)))
    .map((p) => {
      const g = prog.get(p.id);
      return { ...problems.summary(p), status: g ? g.status : 'untouched', bookmarked: !!(g && g.bookmarked), revise: !!(g && g.revise) };
    })
    .filter((p) => !status || (status === 'bookmarked' ? p.bookmarked : status === 'revise' ? p.revise : p.status === status));
  res.json(list);
}));

router.get('/problems/:id', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  const g = await CodeProgress.findOne({ user: req.user.id, problemId: p.id }).lean();
  res.json({
    ...problems.publicView(p),
    progress: g ? { status: g.status, attempts: g.attempts, bookmarked: g.bookmarked, revise: g.revise, note: g.note, savedCode: g.savedCode, hintsRevealed: g.hintsRevealed, editorialViewed: g.editorialViewed, bestTimeMs: g.bestTimeMs }
      : { status: 'untouched', attempts: 0, bookmarked: false, revise: false, note: '', savedCode: '', hintsRevealed: 0, editorialViewed: false, bestTimeMs: null }
  });
}));

// Progressive hints: they must be revealed in order, and the server counts how many were used.
router.post('/problems/:id/hint', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  await lockedFor(req.user.id, p.id);
  const g = await progressFor(req.user.id, p.id);
  const n = Math.min(p.hints.length, g.hintsRevealed + 1);
  if (g.hintsRevealed < n) g.hintsRevealed = n;
  await g.save();
  res.json({ hints: p.hints.slice(0, g.hintsRevealed), revealed: g.hintsRevealed, total: p.hints.length });
}));
router.get('/problems/:id/hints', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  const g = await CodeProgress.findOne({ user: req.user.id, problemId: p.id }).lean();
  const k = g ? g.hintsRevealed : 0;
  res.json({ hints: p.hints.slice(0, k), revealed: k, total: p.hints.length });
}));

// The editorial is a spoiler: the client must confirm (reveal=1). It is remembered so the problem is tagged as "looked at the solution".
router.get('/problems/:id/editorial', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  await lockedFor(req.user.id, p.id);
  const g = await progressFor(req.user.id, p.id);
  if (!g.editorialViewed && req.query.reveal !== '1') throw new HttpError(400, 'Confirm that you want to see the solution');
  if (!g.editorialViewed) { g.editorialViewed = true; await g.save(); }
  res.json(p.editorial);
}));

// Run: visible examples (or a custom input). Nothing is saved except the draft code.
router.post('/problems/:id/run', runLimiter, wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  const code = cleanCode(req.body && req.body.code);
  ensureRunner();
  const custom = typeof (req.body && req.body.input) === 'string' ? req.body.input : null;
  let tests;
  if (custom !== null && custom.length) {
    if (custom.length > 20000) throw new HttpError(413, 'Custom input is too long');
    tests = [{ input: custom.endsWith('\n') ? custom : custom + '\n', output: null, visible: true }];
  } else tests = p.tests.filter((t) => t.visible).map((t) => ({ input: t.input + '\n', output: t.output, visible: true }));
  let result;
  try { result = await judge.judge(code, tests); } catch (e) { throw new HttpError(503, `The code runner failed: ${e.message}`); }
  await CodeProgress.updateOne({ user: req.user.id, problemId: p.id }, { $set: { savedCode: code }, $setOnInsert: { status: 'untouched' } }, { upsert: true });
  res.json(result);
}));

// Submit: visible + hidden tests. Updates progress, history and the revision queue.
router.post('/problems/:id/submit', runLimiter, wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  const code = cleanCode(req.body && req.body.code);
  ensureRunner();
  res.json(await submitAndRecord(req.user.id, p, code));
}));

router.put('/problems/:id/state', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  const b = req.body || {};
  const set = {};
  if (typeof b.note === 'string') set.note = b.note.slice(0, 4000);
  if (typeof b.bookmarked === 'boolean') set.bookmarked = b.bookmarked;
  if (typeof b.revise === 'boolean') set.revise = b.revise;
  if (typeof b.savedCode === 'string') set.savedCode = b.savedCode.slice(0, MAX_CODE);
  await CodeProgress.updateOne({ user: req.user.id, problemId: p.id }, { $set: set, $setOnInsert: { status: 'untouched' } }, { upsert: true });
  res.json({ ok: true });
}));

router.get('/problems/:id/submissions', wrap(async (req, res) => {
  const p = getProblem(req.params.id);
  res.json(await CodeSubmission.find({ user: req.user.id, problemId: p.id }).sort({ createdAt: -1 }).limit(20));
}));

router.get('/progress', wrap(async (req, res) => {
  const lib = problems.load();
  const [prog, subs] = await Promise.all([
    CodeProgress.find({ user: req.user.id }).lean(),
    CodeSubmission.find({ user: req.user.id }).sort({ createdAt: -1 }).select('problemId verdict createdAt timeMs').lean()
  ]);
  const by = new Map(prog.map((g) => [g.problemId, g]));
  const solved = (p) => by.get(p.id) && by.get(p.id).status === 'solved';
  const attempted = (p) => by.get(p.id) && by.get(p.id).status !== 'untouched';
  const group = (key, names) => names.map((name) => {
    const ps = lib.problems.filter((p) => p[key] === name);
    return { name, total: ps.length, solved: ps.filter(solved).length, attempted: ps.filter(attempted).length };
  });
  const accepted = subs.filter((s) => s.verdict === 'AC').length;
  const titleOf = (id) => (problems.get(id) || {}).title || id;
  const revision = prog.filter((g) => g.revise && g.status !== 'solved' && problems.get(g.problemId)).map((g) => ({ id: g.problemId, title: titleOf(g.problemId), topic: problems.get(g.problemId).topic, level: problems.get(g.problemId).level, wrongAttempts: g.wrongAttempts }));
  const bookmarks = prog.filter((g) => g.bookmarked && problems.get(g.problemId)).map((g) => ({ id: g.problemId, title: titleOf(g.problemId), topic: problems.get(g.problemId).topic, level: problems.get(g.problemId).level, status: g.status }));
  res.json({
    total: lib.problems.length, solved: lib.problems.filter(solved).length, attempted: lib.problems.filter(attempted).length,
    submissions: subs.length, accepted, accuracy: subs.length ? Math.round((accepted / subs.length) * 100) : 0,
    byTopic: group('topic', lib.topics), byLevel: group('level', problems.LEVELS),
    revision, bookmarks,
    recent: subs.slice(0, 8).map((s) => ({ id: s.problemId, title: titleOf(s.problemId), verdict: s.verdict, createdAt: s.createdAt }))
  });
}));

module.exports = router;
