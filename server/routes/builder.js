// Saved data for the Resume Builder (one resume per user).
const express = require('express');
const { BuilderResume, ResumeVersion } = require('../models');
const { wrap, HttpError, str } = require('../utils');

const router = express.Router();

router.get('/', wrap(async (req, res) => {
  const doc = await BuilderResume.findOne({ user: req.user.id });
  res.json(doc ? { template: doc.template, data: doc.data, updatedAt: doc.updatedAt } : { template: 'modern', data: null });
}));

router.put('/', wrap(async (req, res) => {
  const { template, data } = req.body || {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid resume data');
  if (JSON.stringify(data).length > 60000) throw new HttpError(413, 'Resume is too large');
  const doc = await BuilderResume.findOneAndUpdate(
    { user: req.user.id },
    { $set: { template: ['modern', 'classic'].includes(template) ? template : 'modern', data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ template: doc.template, data: doc.data, updatedAt: doc.updatedAt });
}));

// ---- Saved versions (snapshots). A version never changes after it is saved; "restore" copies it into the working resume. ----
const MAX_VERSIONS = 30;
const okData = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid resume data');
  if (JSON.stringify(data).length > 60000) throw new HttpError(413, 'Resume is too large');
};

router.get('/versions', wrap(async (req, res) => {
  const rows = await ResumeVersion.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(MAX_VERSIONS).lean();
  res.json(rows.map((v) => ({ id: String(v._id), name: v.name, template: v.template, createdAt: v.createdAt, title: (v.data && v.data.title) || '', skills: String((v.data && v.data.skills) || '').split(/[\n,]/).filter(Boolean).length })));
}));

router.post('/versions', wrap(async (req, res) => {
  const { name, template, data } = req.body || {};
  okData(data);
  if ((await ResumeVersion.countDocuments({ user: req.user.id })) >= MAX_VERSIONS) throw new HttpError(400, `You can keep ${MAX_VERSIONS} versions. Delete an old one first.`);
  const v = await ResumeVersion.create({ user: req.user.id, name: str(name, 80) || `Version ${new Date().toISOString().slice(0, 10)}`, template: ['modern', 'classic'].includes(template) ? template : 'modern', data });
  res.status(201).json({ id: String(v._id), name: v.name, createdAt: v.createdAt });
}));

router.get('/versions/:id', wrap(async (req, res) => {
  const v = await ResumeVersion.findOne({ _id: req.params.id, user: req.user.id });
  if (!v) throw new HttpError(404, 'Version not found');
  res.json({ id: String(v._id), name: v.name, template: v.template, data: v.data, createdAt: v.createdAt });
}));

router.post('/versions/:id/restore', wrap(async (req, res) => {
  const v = await ResumeVersion.findOne({ _id: req.params.id, user: req.user.id });
  if (!v) throw new HttpError(404, 'Version not found');
  const doc = await BuilderResume.findOneAndUpdate({ user: req.user.id }, { $set: { template: v.template, data: v.data } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ template: doc.template, data: doc.data, updatedAt: doc.updatedAt });
}));

router.put('/versions/:id', wrap(async (req, res) => {
  const name = str((req.body || {}).name, 80);
  if (!name) throw new HttpError(400, 'Give the version a name');
  const v = await ResumeVersion.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { name } }, { new: true });
  if (!v) throw new HttpError(404, 'Version not found');
  res.json({ id: String(v._id), name: v.name });
}));

router.delete('/versions/:id', wrap(async (req, res) => {
  const v = await ResumeVersion.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!v) throw new HttpError(404, 'Version not found');
  res.json({ ok: true });
}));

module.exports = router;
