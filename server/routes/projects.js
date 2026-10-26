// Project showcase. Every project belongs to one student; links are validated (http/https only).
const express = require('express');
const { Project } = require('../models');
const { wrap, str, safeUrl, HttpError } = require('../utils');

const router = express.Router();
const STATUS = ['idea', 'building', 'completed'];
const tags = (v, max = 15) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => str(x, 30)).filter(Boolean).slice(0, max);
const lines = (v, max = 8) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => str(x, 240)).filter(Boolean).slice(0, max);

function clean(b, partial) {
  const out = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has('title')) { out.title = str(b.title, 120); if (!out.title) throw new HttpError(400, 'Give the project a title'); }
  if (has('description')) out.description = str(b.description, 2000);
  if (has('role')) out.role = str(b.role, 120);
  if (has('techStack')) out.techStack = tags(b.techStack);
  if (has('highlights')) out.highlights = lines(b.highlights);
  if (has('githubUrl')) { out.githubUrl = safeUrl(b.githubUrl, 'GitHub link'); if (out.githubUrl && !/^https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\//i.test(out.githubUrl)) throw new HttpError(400, 'Repository link should be on github.com, gitlab.com or bitbucket.org'); }
  if (has('liveUrl')) out.liveUrl = safeUrl(b.liveUrl, 'Live demo link');
  if (has('status') && (partial || (b.status !== undefined && b.status !== ''))) { if (!STATUS.includes(b.status)) throw new HttpError(400, 'Status must be idea, building or completed'); out.status = b.status; }
  if (has('featured')) out.featured = !!b.featured;
  if (has('showPublic')) out.showPublic = !!b.showPublic;
  return out;
}

// GET /api/projects?q=react&status=completed&sort=recent|title
router.get('/', wrap(async (req, res) => {
  const q = str(req.query.q, 60).toLowerCase(), status = str(req.query.status, 20), sort = str(req.query.sort, 10);
  let rows = await Project.find({ user: req.user.id }).sort({ featured: -1, updatedAt: -1 }).limit(200).lean();
  if (status && STATUS.includes(status)) rows = rows.filter((p) => p.status === status);
  if (q) rows = rows.filter((p) => [p.title, p.description, p.role, ...(p.techStack || [])].join(' ').toLowerCase().includes(q));
  if (sort === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  if ((await Project.countDocuments({ user: req.user.id })) >= 50) throw new HttpError(400, 'You can keep up to 50 projects');
  res.status(201).json(await Project.create({ ...clean(req.body || {}, false), user: req.user.id }));
}));

router.put('/:id', wrap(async (req, res) => {
  const doc = await Project.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: clean(req.body || {}, true) }, { new: true, runValidators: true });
  if (!doc) throw new HttpError(404, 'Project not found');
  res.json(doc);
}));

router.delete('/:id', wrap(async (req, res) => {
  const doc = await Project.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!doc) throw new HttpError(404, 'Project not found');
  res.json({ ok: true });
}));

module.exports = router;
