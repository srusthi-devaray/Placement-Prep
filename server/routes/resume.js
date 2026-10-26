const express = require('express');
const { ResumeAnalysis } = require('../models');
const upload = require('../middleware/upload');
const { extractText, kindOf } = require('../services/files');
const { analyzeResume } = require('../services/ats');
const { ROLES } = require('../services/roles');
const { getUserSkillSet } = require('../services/profile');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();

// Upload a PDF/DOCX/TXT (field "file") or send {text}. Optional: jobDescription, role.
router.post('/analyze', upload.single('file'), wrap(async (req, res) => {
  let text = '';
  const file = req.file;
  if (file) {
    if (!['pdf', 'docx', 'text'].includes(kindOf(file))) throw new HttpError(400, 'Upload a PDF, DOCX or TXT resume');
    try { text = (await extractText(file)) || ''; } catch { throw new HttpError(422, 'Could not read that file. Try another export of your resume or paste the text.'); }
  } else {
    text = str(req.body.text, 30000);
  }
  if (text.length < 80) throw new HttpError(422, 'Could not find enough text. If your PDF is a scan/image, paste the text instead.');

  const { user } = await getUserSkillSet(req.user.id);
  const role = ROLES[req.body.role] ? req.body.role : (user && user.targetRole) || 'fullstack';
  const jd = str(req.body.jobDescription, 8000);
  const result = analyzeResume(text, { jd, role });

  const doc = await ResumeAnalysis.create({
    user: req.user.id, fileName: file ? file.originalname.slice(0, 120) : 'Pasted text', role, hasJD: !!jd,
    score: result.score, text: text.slice(0, 30000), result
  });
  res.status(201).json(doc);
}));

router.get('/', wrap(async (req, res) => {
  res.json(await ResumeAnalysis.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30).select('-text'));
}));

router.get('/:id', wrap(async (req, res) => {
  const doc = await ResumeAnalysis.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) throw new HttpError(404, 'Not found');
  res.json(doc);
}));

router.delete('/:id', wrap(async (req, res) => {
  const doc = await ResumeAnalysis.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!doc) throw new HttpError(404, 'Not found');
  res.json({ ok: true });
}));

module.exports = router;
