// CS Fundamentals: lessons, quizzes, practice. Questions are sent WITHOUT answers (options are shuffled per request);
// answers are graded on the server and every answer is stored, so weak lessons come from real results.
const express = require('express');
const { CsAttempt, CsProgress } = require('../models');
const bank = require('../services/csBank');
const insights = require('../services/insights');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const publicQ = (q) => ({ id: q.id, lessonId: q.lessonId, subject: q.subject, q: q.q, options: shuffle(q.options.map((text, i) => ({ i, text }))) });
const lessonMeta = (l) => ({ id: l.id, subject: l.subject, title: l.title, minutes: l.minutes, level: l.level, summary: l.summary });

// Overview + search/filter: GET /api/cs?q=join&subject=sql&level=Beginner&status=unread|weak|read
router.get('/', wrap(async (req, res) => {
  const ins = await insights.csInsights(req.user.id);
  const q = str(req.query.q, 60).toLowerCase(), subject = str(req.query.subject, 10), level = str(req.query.level, 15), status = str(req.query.status, 10);
  const weakIds = new Set(ins.weakLessons.map((l) => l.id));
  let list = ins.lessons.map((p) => ({ ...lessonMeta(bank.lessonById[p.id]), read: p.read, attempted: p.attempted, accuracy: p.accuracy, weak: weakIds.has(p.id) }));
  if (subject) list = list.filter((l) => l.subject === subject);
  if (level) list = list.filter((l) => l.level === level);
  if (status === 'unread') list = list.filter((l) => !l.read);
  if (status === 'read') list = list.filter((l) => l.read);
  if (status === 'weak') list = list.filter((l) => l.weak);
  if (q) list = list.filter((l) => { const full = bank.lessonById[l.id]; return `${l.title} ${l.summary} ${full.body} ${full.keyPoints.join(' ')}`.toLowerCase().includes(q); });
  res.json({ subjects: ins.subjects, lessons: list, next: ins.next, mistakeCount: ins.mistakeCount, weakLessons: ins.weakLessons, stats: { lessonsRead: ins.lessonsRead, totalLessons: ins.totalLessons, quizzes: ins.quizzes, questions: ins.questions, accuracy: ins.accuracy } });
}));

router.get('/lessons/:id', wrap(async (req, res) => {
  const l = bank.lessonById[req.params.id];
  if (!l) throw new HttpError(404, 'Lesson not found');
  const prog = await CsProgress.findOne({ user: req.user.id, lessonId: l.id });
  res.json({ ...lessonMeta(l), body: l.body, keyPoints: l.keyPoints, read: !!(prog && prog.read), questions: l.questions.map(publicQ), source: 'Written for this app from standard computer-science material. Verify details in your textbook or course.' });
}));

router.post('/lessons/:id/read', wrap(async (req, res) => {
  const l = bank.lessonById[req.params.id];
  if (!l) throw new HttpError(404, 'Lesson not found');
  const read = !(req.body && req.body.read === false);
  await CsProgress.findOneAndUpdate({ user: req.user.id, lessonId: l.id }, { $set: { read, readAt: read ? new Date() : null } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ ok: true, read });
}));

// Practice sets built from the student's own results. mode: weak | mistakes | mixed, optional subject and count.
router.get('/practice', wrap(async (req, res) => {
  const mode = ['weak', 'mistakes', 'mixed'].includes(req.query.mode) ? req.query.mode : 'mixed';
  const subject = str(req.query.subject, 10);
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 8, 3), 20);
  const ins = await insights.csInsights(req.user.id);
  let pool = bank.QUESTIONS;
  if (subject) pool = pool.filter((q) => q.subject === subject);
  if (mode === 'mistakes') { const ids = new Set(ins.mistakeIds); pool = pool.filter((q) => ids.has(q.id)); }
  if (mode === 'weak') { const w = new Set(ins.weakLessons.map((l) => l.id)); pool = pool.filter((q) => w.has(q.lessonId)); }
  if (!pool.length) return res.json({ mode, questions: [], message: mode === 'mistakes' ? 'No unresolved mistakes. Nice!' : mode === 'weak' ? 'No weak lessons found yet. Take a few lesson quizzes first.' : 'No questions available.' });
  res.json({ mode, questions: shuffle(pool).slice(0, count).map(publicQ) });
}));

// Grade answers: body { mode, lessonId?, answers: [{ id, choice, timeSec }] }
router.post('/grade', wrap(async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.answers) || !b.answers.length || b.answers.length > 30) throw new HttpError(400, 'Send between 1 and 30 answers');
  const seen = new Set(), details = [];
  for (const a of b.answers) {
    const q = bank.questionById[a && a.id];
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    const choice = Number.isInteger(a.choice) && a.choice >= 0 && a.choice < q.options.length ? a.choice : -1;
    details.push({ id: q.id, lessonId: q.lessonId, subject: q.subject, choice, correct: choice === q.answer, timeSec: Math.max(0, Math.min(600, Math.round(Number(a.timeSec) || 0))) });
  }
  if (!details.length) throw new HttpError(400, 'No valid questions in the answers');
  const mode = ['lesson', 'weak', 'mistakes', 'mixed'].includes(b.mode) ? b.mode : 'lesson';
  const score = details.filter((d) => d.correct).length;
  await CsAttempt.create({ user: req.user.id, mode, lessonId: bank.lessonById[b.lessonId] ? b.lessonId : '', score, total: details.length, details });
  res.json({
    score, total: details.length, percent: Math.round((score / details.length) * 100),
    results: details.map((d) => { const q = bank.questionById[d.id]; return { id: d.id, correct: d.correct, choice: d.choice, answer: q.answer, answerText: q.options[q.answer], explain: q.explain, lessonId: q.lessonId, lessonTitle: bank.lessonById[q.lessonId].title }; }),
    note: 'Graded automatically against the answer key in this app (objective result).'
  });
}));

module.exports = router;
