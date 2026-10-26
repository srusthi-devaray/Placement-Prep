const express = require('express');
const { CodeProgress, CompanyTrack, User } = require('../models');
const problems = require('../services/problems');
const store = require('../services/trackStore');
const { wrap, HttpError, str, safeUrl, validDay, todayUTC } = require('../utils');

const router = express.Router();

// Tracks come from MongoDB (seeded on first use). Every track reports when it was written and whether anyone verified it.
router.get('/', wrap(async (req, res) => {
  const list = await store.all();
  res.json(list.map((t) => ({ id: t.id, name: t.name, kind: t.kind, summary: t.summary, verifiedAt: t._meta.verifiedAt, authoredAt: t._meta.authoredAt })));
}));

router.get('/:id', wrap(async (req, res) => {
  const t = await store.byId(String(req.params.id).toLowerCase());
  if (!t) throw new HttpError(404, 'Track not found');
  const lib = problems.load();
  const prog = await CodeProgress.find({ user: req.user.id, status: 'solved' }).select('problemId').lean();
  const solvedByTopic = {}, totalByTopic = {};
  for (const p of lib.problems) totalByTopic[p.topic] = (totalByTopic[p.topic] || 0) + 1;
  for (const g of prog) { const p = problems.get(g.problemId); if (p) solvedByTopic[p.topic] = (solvedByTopic[p.topic] || 0) + 1; }
  const { _meta, ...rest } = t;
  const me = await User.findById(req.user.id).select('email').lean();
  res.json({ ...store.publicTrack(rest, solvedByTopic, totalByTopic), meta: _meta, canEdit: isAdmin(me) });
}));

// Maintainers only (emails listed in ADMIN_EMAILS). Lets the owner correct a track and record that it was verified.
const isAdmin = (u) => !!(u && u.email && (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean).includes(String(u.email).toLowerCase()));
const list = (v, max = 30, len = 140) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : null);

router.put('/:id', wrap(async (req, res) => {
  const me = await User.findById(req.user.id).select('email').lean();
  if (!isAdmin(me)) throw new HttpError(403, 'Only maintainers can edit company tracks');
  const row = await CompanyTrack.findOne({ trackId: String(req.params.id).toLowerCase() });
  if (!row) throw new HttpError(404, 'Track not found');
  const b = req.body || {}, d = JSON.parse(JSON.stringify(row.data));
  if (b.summary !== undefined) d.summary = str(b.summary, 400);
  if (Array.isArray(b.official)) d.official = b.official.slice(0, 6).map((o) => ({ label: str(o && o.label, 100), url: safeUrl(o && o.url, 'Official link') })).filter((o) => o.label && o.url);
  const st = list(b.stages), dsa = list(b.dsaTopics), cs = list(b.csTopics), ap = list(b.aptitudeTopics);
  if (st) d.stages.items = st;
  if (dsa) d.dsa.topics = dsa;
  if (cs) d.cs.topics = cs;
  if (ap) d.aptitude.topics = ap;
  row.data = d;
  if (b.sourceNote !== undefined) row.sourceNote = str(b.sourceNote, 500);
  if (b.markVerified === true) { row.verifiedAt = validDay(b.verifiedAt) || todayUTC(); row.verifiedBy = 'maintainer'; }
  if (b.markVerified === false) { row.verifiedAt = null; row.verifiedBy = ''; }
  if (row.markModified) row.markModified('data');
  await row.save();
  store.invalidate();
  res.json({ ok: true });
}));

module.exports = router;
