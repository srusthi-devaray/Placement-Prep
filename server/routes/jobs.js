// Live job / internship feed (official APIs only - see services/jobs.js) + saving jobs + listing checks.
const express = require('express');
const { Opportunity, JobCache } = require('../models');
const jobs = require('../services/jobs');
const { getUserSkillSet } = require('../services/profile');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const PAGE = 15;

router.get('/feed', wrap(async (req, res) => {
  const [{ sources, items }, { skills }] = await Promise.all([jobs.getAllJobs(), getUserSkillSet(req.user.id)]);
  const q = req.query;
  let list = jobs.filterJobs(items, { q: str(q.q, 80), location: str(q.location, 60), skills: str(q.skills, 200), type: str(q.type, 20), exp: str(q.exp, 20), source: str(q.source, 20) }, skills);
  const sort = str(q.sort, 10);
  if (sort === 'match') list.sort((a, b) => (b.matchPercent ?? -1) - (a.matchPercent ?? -1) || new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  else list.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  const page = Math.max(1, Number(q.page) || 1);
  const saved = new Set((await Opportunity.find({ user: req.user.id, externalId: { $ne: '' } }).select('source externalId').lean()).map((o) => `${o.source}:${o.externalId}`));
  const now = Date.now();
  res.json({
    sources, total: list.length, page, pages: Math.max(1, Math.ceil(list.length / PAGE)), hasProfileSkills: skills.size > 0,
    items: list.slice((page - 1) * PAGE, page * PAGE).map((j) => ({
      ...j, saved: saved.has(`${j.source}:${j.externalId}`),
      ageDays: j.postedAt ? Math.floor((now - new Date(j.postedAt).getTime()) / 86400000) : null
    }))
  });
}));

// Save a job from the feed. We look the job up in OUR cache by id so the saved record is exactly what the provider returned.
router.post('/save', wrap(async (req, res) => {
  const source = str(req.body.source, 20), externalId = str(req.body.externalId, 120);
  if (!jobs.PROVIDERS[source]) throw new HttpError(400, 'Unknown source');
  const doc = await JobCache.findOne({ key: source }).lean();
  const job = doc && doc.items.find((j) => j.externalId === externalId);
  if (!job) throw new HttpError(404, 'That listing is no longer in the feed. Refresh and try again.');
  const dup = await Opportunity.findOne({ user: req.user.id, source, externalId });
  if (dup) return res.json(dup);
  const { skills } = await getUserSkillSet(req.user.id);
  const m = jobs.matchJob(job, skills);
  const created = await Opportunity.create({
    user: req.user.id, title: job.title, company: job.company, link: job.url, jd: job.description,
    matchPercent: m.matchPercent || 0, matchedSkills: m.matchedSkills, missingSkills: m.missingSkills,
    source, externalId, location: job.location, jobType: job.jobType, experience: job.experience, eligibility: job.eligibility,
    deadline: job.deadline || '', postedAt: job.postedAt || null, fetchedAt: doc.fetchedAt
  });
  res.status(201).json(created);
}));

// Re-check saved external jobs against the latest feed. Never says "open"/"closed" - only "listed"/"not listed".
router.post('/check-saved', wrap(async (req, res) => {
  const mine = await Opportunity.find({ user: req.user.id, source: { $ne: '' } });
  const cache = {};
  for (const name of new Set(mine.map((o) => o.source))) if (jobs.PROVIDERS[name] && jobs.PROVIDERS[name].enabled()) cache[name] = await jobs.loadProvider(name);
  for (const o of mine) {
    const st = jobs.listingStatus(o, cache);
    o.listingCheck = st.text; o.listingCheckedAt = new Date();
    await o.save();
  }
  res.json(mine);
}));

module.exports = router;
