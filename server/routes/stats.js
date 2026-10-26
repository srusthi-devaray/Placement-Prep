const express = require('express');
const mongoose = require('mongoose');
const { Company, Progress, Goal, Note, Experience, MockSession, AptitudeResult, ResumeAnalysis, ChatThread, Opportunity } = require('../models');
const { wrap, validDay, todayUTC } = require('../utils');
const planner = require('../services/planner');

const router = express.Router();
const addDays = (day, n) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

router.get('/', wrap(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const today = validDay(req.query.today) || todayUTC();   // the browser sends its own local date so streaks are right in every timezone
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const [byStatus, hoursAgg, topicsDone, days, weekAgg, goalsDone, goalsOpen, notes, experiences, mock, apt, resume, threads, opportunities] = await Promise.all([
    Company.aggregate([{ $match: { user: userId } }, { $group: { _id: '$status', c: { $sum: 1 } } }]),
    Progress.aggregate([{ $match: { user: userId } }, { $group: { _id: null, h: { $sum: '$hours' } } }]),
    Progress.countDocuments({ user: userId, done: true }),
    Progress.distinct('date', { user: userId }),
    Progress.aggregate([{ $match: { user: userId, date: { $in: weekDays } } }, { $group: { _id: '$date', h: { $sum: '$hours' } } }]),
    Goal.countDocuments({ user: userId, done: true }),
    Goal.countDocuments({ user: userId, done: false }),
    Note.countDocuments({ user: userId }),
    Experience.countDocuments({ user: userId }),
    MockSession.aggregate([{ $match: { user: userId } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$avgScore' } } }]),
    AptitudeResult.aggregate([{ $match: { user: userId } }, { $group: { _id: null, n: { $sum: 1 }, score: { $sum: '$score' }, total: { $sum: '$total' } } }]),
    ResumeAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).select('score').lean(),
    ChatThread.countDocuments({ user: userId }),
    Opportunity.countDocuments({ user: userId })
  ]);

  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.c]));
  const total = Object.values(status).reduce((a, b) => a + b, 0);

  // Fair streak: rest days and an earned grace day do not break it (rules in services/planner.js). Counts any study activity in the app.
  const tzq = Number(req.query.tz);
  const settings = await planner.getSettings(req.user.id);
  const streakInfo = planner.fairStreak(await planner.activityDays(req.user.id, Number.isFinite(tzq) && Math.abs(tzq) <= 840 ? tzq : 0), settings.studyDays, today);
  const streak = streakInfo.current;

  const weekMap = Object.fromEntries(weekAgg.map((w) => [w._id, w.h]));
  res.json({
    total, applied: status.Applied || 0, interview: status.Interview || 0, offer: status.Offer || 0, rejected: status.Rejected || 0,
    streak, streakInfo,
    totalHours: hoursAgg[0] ? hoursAgg[0].h : 0,
    topicsDone, goalsDone, goalsOpen, notes, experiences, threads, opportunities,
    mockSessions: mock[0] ? mock[0].n : 0,
    avgMockScore: mock[0] ? Math.round(mock[0].avg) : 0,
    aptitudeAttempts: apt[0] ? apt[0].n : 0,
    aptitudePercent: apt[0] && apt[0].total ? Math.round((apt[0].score / apt[0].total) * 100) : 0,
    resumeScore: resume ? resume.score : null,
    week: weekDays.map((d) => ({ date: d, hours: weekMap[d] || 0 }))
  });
}));

module.exports = router;
