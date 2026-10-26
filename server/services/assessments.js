// Timed coding assessments. The SERVER owns the clock; the browser timer is only a display.
const { Assessment, CodeProgress } = require('../models');
const problems = require('./problems');
const { HttpError } = require('../utils');

const LIMITS = { minMin: 15, maxMin: 120, maxProblems: 4 };

function scoreOf(a) {
  const n = a.problemIds.length || 1;
  const sum = a.problemIds.reduce((s, id) => { const r = (a.results || []).find((x) => x.problemId === id); return s + (r && r.total ? r.passed / r.total : 0); }, 0);
  const solved = (a.results || []).filter((r) => r.verdict === 'AC').length;
  return { score: Math.round((sum / n) * 100), solved };
}

// If the deadline has passed, close the assessment (idempotent).
async function settle(a) {
  if (a && a.status === 'active' && new Date(a.deadline).getTime() <= Date.now()) {
    const { score, solved } = scoreOf(a);
    a.status = 'expired'; a.finishedAt = a.deadline; a.score = score; a.solved = solved;
    await a.save();
  }
  return a;
}
async function active(userId) {
  const a = await Assessment.findOne({ user: userId, status: 'active' });
  return a ? settle(a).then((x) => (x.status === 'active' ? x : null)) : null;
}
async function lockedFor(userId, problemId) {
  const a = await active(userId);
  if (a && a.problemIds.includes(problemId)) throw new HttpError(403, 'Hints and solutions are locked while this problem is part of your running timed assessment.');
}
async function finish(a) {
  const { score, solved } = scoreOf(a);
  a.status = 'submitted'; a.finishedAt = new Date(); a.score = score; a.solved = solved;
  await a.save();
  return a;
}

// Prefer problems the student has not solved; spread across topics; optional level / topic filters.
async function pick(userId, { count, level, topic }) {
  const lib = problems.load();
  const solved = new Set((await CodeProgress.find({ user: userId, status: 'solved' }).select('problemId').lean()).map((g) => g.problemId));
  let pool = lib.problems.filter((p) => (!level || p.level === level) && (!topic || p.topic === topic));
  const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const fresh = shuffle(pool.filter((p) => !solved.has(p.id))), old = shuffle(pool.filter((p) => solved.has(p.id)));
  const chosen = [], topics = new Set();
  for (const p of [...fresh, ...old]) { if (chosen.length >= count) break; if (!topics.has(p.topic) || fresh.length + old.length <= count) { chosen.push(p); topics.add(p.topic); } }
  for (const p of [...fresh, ...old]) { if (chosen.length >= count) break; if (!chosen.includes(p)) chosen.push(p); }
  return chosen;
}

const view = (a, withProblems = true) => ({
  id: String(a._id), status: a.status, durationMin: a.durationMin, startedAt: a.startedAt, deadline: a.deadline, finishedAt: a.finishedAt,
  remainingSec: a.status === 'active' ? Math.max(0, Math.round((new Date(a.deadline).getTime() - Date.now()) / 1000)) : 0,
  score: a.score, solved: a.solved, total: a.problemIds.length,
  problems: withProblems ? a.problemIds.map((id) => { const p = problems.get(id); const r = (a.results || []).find((x) => x.problemId === id); return { ...(p ? problems.summary(p) : { id, title: id }), verdict: r ? r.verdict : null, passed: r ? r.passed : 0, testCount: r ? r.total : 0, attempts: r ? r.attempts : 0 }; }) : undefined
});

module.exports = { LIMITS, settle, active, lockedFor, finish, pick, view, scoreOf };
