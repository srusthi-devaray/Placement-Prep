const express = require('express');
const { AptitudeResult } = require('../models');
const apt = require('../services/aptitude');
const { aptitudeInsights } = require('../services/insights');
const { wrap, str } = require('../utils');

const router = express.Router();
const MODES = ['practice', 'progressive', 'mock', 'weak', 'mistakes'];

router.get('/sections', (req, res) => {
  res.json({
    sections: apt.SECTIONS.map((name) => ({ name, count: apt.QUESTIONS.filter((q) => q.section === name).length, topics: apt.topicsOf(name) })),
    levels: apt.LEVELS.map((l) => ({ id: l, name: apt.LEVEL_NAME[l] })),
    total: apt.QUESTIONS.length
  });
});

router.get('/questions', wrap(async (req, res) => {
  const mode = MODES.includes(req.query.mode) ? req.query.mode : 'practice';
  const opts = { section: str(req.query.section, 20) || 'All', topic: str(req.query.topic, 40), level: str(req.query.level, 1), mode, count: Number(req.query.count) || 10 };
  let note = '';
  if (mode === 'weak' || mode === 'mistakes') {
    const ins = await aptitudeInsights(req.user.id);
    if (mode === 'weak') { opts.topics = ins.weakTopics.map((t) => t.topic); if (!opts.topics.length) note = 'No weak topics found yet (you need a few answers per topic). Showing a normal practice set instead.'; }
    else { opts.ids = ins.mistakeIds; if (!opts.ids.length) note = 'You have no unresolved mistakes. Showing a normal practice set instead.'; }
    if (note) opts.mode = 'practice';
  }
  const list = apt.pickQuestions(opts);
  res.json({ note, mode: opts.mode, timeLimitSec: mode === 'mock' ? list.length * 75 : 0, questions: list.map(apt.publicQuestion) });   // answers are NOT sent
}));

router.post('/submit', wrap(async (req, res) => {
  const graded = apt.grade(req.body.answers);
  const mode = MODES.includes(req.body.mode) ? req.body.mode : 'practice';
  const doc = await AptitudeResult.create({
    user: req.user.id, section: str(req.body.section, 20) || 'All', score: graded.score, total: graded.total, mode,
    durationSec: Math.max(0, Math.min(86400, Number(req.body.durationSec) || 0)),
    details: graded.details.map((d) => ({ id: d.id, section: d.section, topic: d.topic, level: d.level, correct: d.correct, choice: d.choice, timeSec: d.timeSec }))
  });
  res.status(201).json({ ...graded, id: doc.id });
}));

router.get('/results', wrap(async (req, res) => {
  res.json(await AptitudeResult.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30).select('-details'));
}));

// Accuracy + time per topic / level / section, weak topics, unresolved mistakes.
router.get('/analytics', wrap(async (req, res) => { res.json(await aptitudeInsights(req.user.id)); }));

module.exports = router;
