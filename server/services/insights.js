// Turns raw practice records into the "weak topics", "repeated mistakes" and similar facts the planner and dashboard use.
// Everything here is computed from the student's actual results. Nothing is guessed.
const mongoose = require('mongoose');
const { AptitudeResult, CodeProgress, CodeSubmission, MockSession, CsAttempt, CsProgress } = require('../models');
const cs = require('./csBank');
const problems = require('./problems');
const apt = require('./aptitude');

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

async function aptitudeInsights(userId) {
  const results = await AptitudeResult.find({ user: userId }).sort({ createdAt: 1 }).limit(100).lean();
  const topic = {}, level = {}, section = {}, latest = new Map();
  const bump = (map, key, d) => {
    const m = map[key] || (map[key] = { attempted: 0, correct: 0, timeSum: 0, timed: 0 });
    m.attempted++; if (d.correct) m.correct++; if (d.timeSec > 0) { m.timeSum += d.timeSec; m.timed++; }
  };
  for (const r of results) for (const d of r.details || []) {
    if (!d || d.choice === undefined) continue;                      // old results without per-question data
    const q = apt.QUESTIONS.find((x) => x.id === d.id);
    const t = d.topic || (q && q.topic), l = d.level || (q && q.level);
    if (t) bump(topic, t, d);
    if (l) bump(level, l, d);
    if (d.section) bump(section, d.section, d);
    latest.set(d.id, !!d.correct);
  }
  const fmt = (map, nameOf = (k) => k) => Object.entries(map).map(([k, m]) => ({ name: nameOf(k), key: k, attempted: m.attempted, correct: m.correct, accuracy: pct(m.correct, m.attempted), avgTimeSec: m.timed ? Math.round(m.timeSum / m.timed) : null }));
  const byTopic = fmt(topic).sort((a, b) => a.accuracy - b.accuracy);
  const weakTopics = byTopic.filter((t) => t.attempted >= 3 && t.accuracy < 60).map((t) => ({ topic: t.name, accuracy: t.accuracy, attempted: t.attempted }));
  const slowTopics = byTopic.filter((t) => t.attempted >= 3 && t.avgTimeSec && t.avgTimeSec > 90).map((t) => ({ topic: t.name, avgTimeSec: t.avgTimeSec }));
  const mistakeIds = [...latest.entries()].filter(([, ok]) => !ok).map(([id]) => id);
  const total = results.reduce((a, r) => a + (r.total || 0), 0), score = results.reduce((a, r) => a + (r.score || 0), 0);
  return {
    tests: results.length, questions: total, accuracy: pct(score, total),
    byTopic, byLevel: fmt(level, (k) => apt.LEVEL_NAME[k] || k), bySection: fmt(section),
    weakTopics, slowTopics, mistakeIds, mistakeCount: mistakeIds.length,
    trend: results.slice(-12).map((r) => ({ date: r.createdAt, accuracy: pct(r.score, r.total), total: r.total, mode: r.mode || 'practice' })),
    lowData: total < 15
  };
}

// Coding: topics where the student keeps getting wrong answers, and problems that keep failing.
async function codingInsights(userId) {
  const lib = problems.load();
  const [prog, subs] = await Promise.all([
    CodeProgress.find({ user: userId }).lean(),
    CodeSubmission.find({ user: userId }).select('problemId verdict createdAt').lean()
  ]);
  const topicOf = (id) => (problems.get(id) || {}).topic;
  const per = {};
  for (const s of subs) {
    const t = topicOf(s.problemId); if (!t) continue;
    const m = per[t] || (per[t] = { submissions: 0, accepted: 0, wrong: 0 });
    m.submissions++; if (s.verdict === 'AC') m.accepted++; else m.wrong++;
  }
  const solvedBy = {};
  for (const g of prog) if (g.status === 'solved' && topicOf(g.problemId)) solvedBy[topicOf(g.problemId)] = (solvedBy[topicOf(g.problemId)] || 0) + 1;
  const topics = lib.topics.map((name) => {
    const total = lib.problems.filter((p) => p.topic === name).length;
    const m = per[name] || { submissions: 0, accepted: 0, wrong: 0 };
    return { topic: name, total, solved: solvedBy[name] || 0, submissions: m.submissions, wrong: m.wrong, acceptRate: pct(m.accepted, m.submissions) };
  });
  const weakTopics = topics.filter((t) => t.submissions >= 3 && t.acceptRate < 40 && t.solved < t.total).map((t) => ({ topic: t.topic, acceptRate: t.acceptRate, submissions: t.submissions }));
  const repeated = prog.filter((g) => g.status !== 'solved' && g.wrongAttempts >= 2 && problems.get(g.problemId))
    .map((g) => ({ id: g.problemId, title: problems.get(g.problemId).title, topic: topicOf(g.problemId), wrongAttempts: g.wrongAttempts })).sort((a, b) => b.wrongAttempts - a.wrongAttempts);
  const solved = prog.filter((g) => g.status === 'solved').length;
  return { topics, weakTopics, repeated, solved, total: lib.problems.length, submissions: subs.length, accepted: subs.filter((s) => s.verdict === 'AC').length };
}

async function mockInsights(userId) {
  const sessions = await MockSession.find({ user: userId }).sort({ createdAt: -1 }).limit(20).select('category avgScore createdAt').lean();
  const byCat = {};
  for (const s of sessions) { const m = byCat[s.category || 'General'] || (byCat[s.category || 'General'] = { n: 0, sum: 0 }); m.n++; m.sum += s.avgScore || 0; }
  const categories = Object.entries(byCat).map(([category, m]) => ({ category, sessions: m.n, avg: Math.round(m.sum / m.n) })).sort((a, b) => a.avg - b.avg);
  const recent = sessions.slice(0, 5);
  return { sessions: sessions.length, avgRecent: recent.length ? Math.round(recent.reduce((a, s) => a + (s.avgScore || 0), 0) / recent.length) : null, categories, weakCategories: categories.filter((c) => c.avg < 50) };
}

// CS Fundamentals: accuracy per lesson and subject from real quiz answers, lessons read, and what to study next.
async function csInsights(userId) {
  const [attempts, reads] = await Promise.all([
    CsAttempt.find({ user: userId }).sort({ createdAt: 1 }).limit(200).lean(),
    CsProgress.find({ user: userId, read: true }).lean()
  ]);
  const byLesson = {}, bySubject = {}, latest = new Map();
  const bump = (map, key, d) => { const m = map[key] || (map[key] = { attempted: 0, correct: 0 }); m.attempted++; if (d.correct) m.correct++; };
  for (const a of attempts) for (const d of a.details || []) {
    const q = cs.questionById[d.id]; if (!q) continue;
    bump(byLesson, q.lessonId, d); bump(bySubject, q.subject, d); latest.set(d.id, !!d.correct);
  }
  const readSet = new Set(reads.map((r) => r.lessonId));
  const lessons = cs.LESSONS.map((l) => {
    const m = byLesson[l.id] || { attempted: 0, correct: 0 };
    return { id: l.id, subject: l.subject, title: l.title, read: readSet.has(l.id), attempted: m.attempted, correct: m.correct, accuracy: m.attempted ? pct(m.correct, m.attempted) : null };
  });
  const subjects = cs.SUBJECTS.map((s) => {
    const m = bySubject[s.id] || { attempted: 0, correct: 0 };
    const ls = lessons.filter((l) => l.subject === s.id);
    return { id: s.id, name: s.name, blurb: s.blurb, lessons: ls.length, read: ls.filter((l) => l.read).length, attempted: m.attempted, accuracy: m.attempted ? pct(m.correct, m.attempted) : null };
  });
  const weakLessons = lessons.filter((l) => l.attempted >= 3 && l.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const mistakeIds = [...latest.entries()].filter(([, ok]) => !ok).map(([id]) => id);
  // Next lesson: first weak lesson to revise; otherwise the first lesson not yet read (beginner lessons first); otherwise the least accurate one.
  const order = (l) => ({ Beginner: 0, Intermediate: 1, Advanced: 2 }[cs.lessonById[l.id].level] || 1);
  const unread = lessons.filter((l) => !l.read).sort((a, b) => order(a) - order(b));
  let next = null;
  if (weakLessons[0]) next = { id: weakLessons[0].id, title: weakLessons[0].title, reason: `Revise: ${weakLessons[0].accuracy}% correct over ${weakLessons[0].attempted} questions.` };
  else if (unread[0]) next = { id: unread[0].id, title: unread[0].title, reason: 'You have not read this lesson yet.' };
  const total = attempts.reduce((a, r) => a + (r.total || 0), 0), score = attempts.reduce((a, r) => a + (r.score || 0), 0);
  return { lessons, subjects, weakLessons, mistakeIds, mistakeCount: mistakeIds.length, next, quizzes: attempts.length, questions: total, accuracy: pct(score, total), lessonsRead: readSet.size, totalLessons: cs.LESSONS.length };
}

module.exports = { aptitudeInsights, codingInsights, mockInsights, csInsights, pct };
