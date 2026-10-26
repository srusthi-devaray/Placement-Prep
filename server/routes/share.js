// Opt-in progress sharing. Off by default. The public page only ever contains the aggregate numbers the student ticked.
// It never contains: email, college, resume, notes, interview answers or chats, company applications, or the student's real username
// (unless they type it as their display name).
const crypto = require('crypto');
const express = require('express');
const { ShareSetting, StudySetting, Project } = require('../models');
const planner = require('../services/planner');
const insights = require('../services/insights');
const { ROLES } = require('../services/roles');
const { wrap, str, HttpError, validDay, todayUTC } = require('../utils');

const KEYS = ['readiness', 'streak', 'hours', 'coding', 'aptitude', 'mock', 'milestones', 'targetRole', 'projects'];
const newToken = () => crypto.randomBytes(18).toString('base64url');

const router = express.Router();          // logged-in owner controls
const publicRouter = express.Router();    // anyone with the link

const getOrCreate = async (userId) => (await ShareSetting.findOne({ user: userId })) || ShareSetting.create({ user: userId, show: {} });
const view = (s) => ({ enabled: s.enabled, token: s.enabled ? s.token : '', displayName: s.displayName, tagline: s.tagline, show: Object.fromEntries(KEYS.map((k) => [k, !!(s.show && s.show[k])])), keys: KEYS });

router.get('/', wrap(async (req, res) => { res.json(view(await getOrCreate(req.user.id))); }));

router.put('/', wrap(async (req, res) => {
  const s = await getOrCreate(req.user.id);
  const b = req.body || {};
  if (b.displayName !== undefined) s.displayName = str(b.displayName, 40);
  if (b.tagline !== undefined) s.tagline = str(b.tagline, 140);
  if (b.show && typeof b.show === 'object') { s.show = Object.fromEntries(KEYS.map((k) => [k, !!b.show[k]])); s.markModified('show'); }
  if (b.enabled !== undefined) {
    s.enabled = !!b.enabled;
    if (s.enabled && !s.token) s.token = newToken();
  }
  await s.save();
  res.json(view(s));
}));

// New link = the old link stops working immediately.
router.post('/rotate', wrap(async (req, res) => {
  const s = await getOrCreate(req.user.id);
  s.token = newToken(); await s.save();
  res.json(view(s));
}));

publicRouter.get('/:token', wrap(async (req, res) => {
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  const token = str(req.params.token, 60);
  const s = token.length >= 16 ? await ShareSetting.findOne({ token, enabled: true }) : null;
  if (!s) throw new HttpError(404, 'This progress page does not exist or sharing was turned off.');
  const show = s.show || {};
  const uid = String(s.user);
  const today = validDay(req.query.today) || todayUTC();
  const out = { name: s.displayName || 'A student', tagline: s.tagline || '', shown: [], updatedAt: new Date() };
  const put = (k, v) => { out[k] = v; out.shown.push(k); };

  if (show.targetRole) { const st = await StudySetting.findOne({ user: uid }).select('targetRole targetCompany').lean(); const r = st && ROLES[st.targetRole]; if (r) put('targetRole', r.title); }
  if (show.readiness) { const rd = await planner.readiness(uid, today, 0); put('readiness', { score: rd.score, note: 'A practice-progress indicator, not a prediction of selection.' }); }
  if (show.streak || show.hours) {
    const settings = await planner.getSettings(uid);
    const active = await planner.activityDays(uid, 0);
    if (show.streak) { const st = planner.fairStreak(active, settings.studyDays, today); put('streak', { current: st.current, longest: st.longest }); }
    if (show.hours) { const r = await planner.report(uid, { period: 'month', today, tz: 0 }); put('hours', { last30Days: r.studyHours, activeDays: r.activeDays }); }
  }
  if (show.coding) { const c = await insights.codingInsights(uid); put('coding', { solved: c.solved, total: c.total, acceptRate: insights.pct(c.accepted, c.submissions) }); }
  if (show.aptitude) { const a = await insights.aptitudeInsights(uid); put('aptitude', { questions: a.questions, accuracy: a.accuracy }); }
  if (show.mock) { const m = await insights.mockInsights(uid); put('mock', { sessions: m.sessions, averageScore: m.avgRecent }); }
  if (show.milestones) { const ms = await planner.milestones(uid, today, 0); put('milestones', ms.filter((m) => m.achieved).map((m) => ({ title: m.title, date: m.date }))); }
  if (show.projects) {
    // Only projects the student marked "show on public page", and only fields meant for the public.
    const ps = await Project.find({ user: uid, showPublic: true }).sort({ featured: -1, updatedAt: -1 }).limit(12).lean();
    put('projects', ps.map((p) => ({ title: p.title, description: p.description, techStack: p.techStack, githubUrl: p.githubUrl, liveUrl: p.liveUrl, status: p.status })));
  }
  res.json(out);
}));

module.exports = router;
module.exports.publicRouter = publicRouter;
