// Planner: settings, tasks, generated plans, readiness, milestones, reports.
const express = require('express');
const { PlanTask, StudySetting } = require('../models');
const planner = require('../services/planner');
const tracks = require('../services/trackStore');
const { ROLES } = require('../services/roles');
const mailer = require('../services/mailer');
const { User } = require('../models');
const { wrap, str, pick, HttpError, validDay, todayUTC } = require('../utils');

const router = express.Router();
const ctx = (req) => {
  const tz = Number(req.query.tz ?? req.body.tz);
  return { today: validDay(req.query.today || req.body.today) || todayUTC(), tz: Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0 };
};
const KINDS = ['coding', 'aptitude', 'revision', 'mock', 'cs', 'behavioral', 'resume', 'other'];

router.get('/settings', wrap(async (req, res) => {
  res.json({ settings: await planner.getSettings(req.user.id), companies: (await tracks.all()).map((t) => ({ id: t.id, name: t.name })), roles: Object.values(ROLES).map((r) => ({ id: r.id, title: r.title })), emailConfigured: mailer.isConfigured() });
}));

router.put('/settings', wrap(async (req, res) => {
  const b = req.body || {};
  const s = await planner.getSettings(req.user.id);
  if (b.targetCompany !== undefined) { const c = str(b.targetCompany, 60).toLowerCase(); if (c && !(await tracks.byId(c))) throw new HttpError(400, 'Unknown company track'); s.targetCompany = c; }
  if (b.targetRole !== undefined) { const r = str(b.targetRole, 60); if (r && !ROLES[r]) throw new HttpError(400, 'Unknown role'); s.targetRole = r; }
  if (b.hoursPerDay !== undefined) { const h = Number(b.hoursPerDay); if (!(h >= 0.5 && h <= 12)) throw new HttpError(400, 'Study hours per day must be between 0.5 and 12'); s.hoursPerDay = h; }
  if (Array.isArray(b.studyDays)) { const d = [...new Set(b.studyDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))]; if (!d.length) throw new HttpError(400, 'Pick at least one study day'); s.studyDays = d.sort(); }
  if (b.placementDate !== undefined) s.placementDate = b.placementDate === '' ? '' : (validDay(b.placementDate) || ''); 
  if (b.reminderEmail !== undefined) { s.reminderEmail = !!b.reminderEmail; if (s.reminderEmail && !mailer.isConfigured()) throw new HttpError(400, 'Email is not set up on this server, so email reminders are unavailable.'); }
  await s.save();
  res.json(s);
}));

// ---- tasks ----
router.get('/tasks', wrap(async (req, res) => {
  const from = validDay(req.query.from) || planner.addDays(ctx(req).today, -7), to = validDay(req.query.to) || planner.addDays(ctx(req).today, 14);
  res.json(await PlanTask.find({ user: req.user.id, date: { $gte: from, $lte: to } }).sort({ date: 1, createdAt: 1 }).limit(400));
}));

router.post('/tasks', wrap(async (req, res) => {
  const b = pick(req.body, ['date', 'title', 'kind', 'topic', 'minutes']);
  if (!validDay(b.date)) throw new HttpError(400, 'Pick a valid date');
  if (b.kind && !KINDS.includes(b.kind)) b.kind = 'other';
  res.status(201).json(await PlanTask.create({ ...b, user: req.user.id, auto: false }));
}));

router.put('/tasks/:id', wrap(async (req, res) => {
  const b = pick(req.body, ['date', 'title', 'kind', 'topic', 'minutes']);
  if (b.date !== undefined && !validDay(b.date)) throw new HttpError(400, 'Pick a valid date');
  if (b.kind && !KINDS.includes(b.kind)) b.kind = 'other';
  const t = await PlanTask.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: b }, { new: true, runValidators: true });
  if (!t) throw new HttpError(404, 'Task not found');
  res.json(t);
}));

router.patch('/tasks/:id/done', wrap(async (req, res) => {
  const { today } = ctx(req);
  const t = await PlanTask.findOne({ _id: req.params.id, user: req.user.id });
  if (!t) throw new HttpError(404, 'Task not found');
  const done = req.body.done !== false;
  const wasDone = t.done;
  t.done = done; t.doneAt = done ? new Date() : null;
  await t.save();
  let next = null;
  if (done && !wasDone) next = await planner.afterTaskDone(t, today);
  res.json({ task: t, next });
}));

router.delete('/tasks/:id', wrap(async (req, res) => {
  const t = await PlanTask.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!t) throw new HttpError(404, 'Task not found');
  res.json({ ok: true });
}));

router.post('/generate', wrap(async (req, res) => {
  const { today } = ctx(req);
  const days = [7, 14].includes(Number(req.body.days)) ? Number(req.body.days) : 7;
  res.json(await planner.generatePlan(req.user.id, { today, days }));
}));

router.post('/reschedule', wrap(async (req, res) => { res.json(await planner.reschedule(req.user.id, ctx(req).today)); }));

// ---- insight endpoints ----
router.get('/overview', wrap(async (req, res) => {
  const { today, tz } = ctx(req);
  const settings = await planner.getSettings(req.user.id);
  const [tasks, active, rd] = await Promise.all([
    PlanTask.find({ user: req.user.id, $or: [{ date: today }, { date: { $lt: today }, done: false }] }).sort({ date: 1, createdAt: 1 }).limit(60),
    planner.activityDays(req.user.id, tz), planner.readiness(req.user.id, today, tz)
  ]);
  const streak = planner.fairStreak(active, settings.studyDays, today);
  res.json({
    today, streak, readiness: { score: rd.score, withData: rd.withData, total: rd.total },
    todayTasks: tasks.filter((t) => t.date === today), overdue: tasks.filter((t) => t.date < today && !t.done),
    settings: { targetCompany: settings.targetCompany, targetRole: settings.targetRole, hoursPerDay: settings.hoursPerDay }
  });
}));

router.get('/readiness', wrap(async (req, res) => { const { today, tz } = ctx(req); res.json(await planner.readiness(req.user.id, today, tz)); }));
router.get('/milestones', wrap(async (req, res) => { const { today, tz } = ctx(req); res.json(await planner.milestones(req.user.id, today, tz)); }));
router.get('/weak', wrap(async (req, res) => {
  const w = await planner.weakAreas(req.user.id);
  res.json({ areas: w.areas, repeatedMistakes: w.coding.repeated, aptitudeMistakes: w.apt.mistakeCount, recommendations: planner.recommendations(w) });
}));
router.get('/report', wrap(async (req, res) => { const { today, tz } = ctx(req); res.json(await planner.report(req.user.id, { period: req.query.period === 'month' ? 'month' : 'week', today, tz })); }));

// Send myself a test reminder email (only works when email is configured on the server).
router.post('/reminders/test', wrap(async (req, res) => {
  if (!mailer.isConfigured()) throw new HttpError(400, 'Email is not set up on this server.');
  const u = await User.findById(req.user.id);
  await mailer.send({ to: u.email, subject: 'Study reminder test', html: '<p>This is a test reminder from your Placement Prep Tracker. Reminders are optional and you can turn them off in the Planner settings.</p>' });
  res.json({ ok: true });
}));

module.exports = router;
