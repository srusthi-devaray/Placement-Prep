const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { User } = require('../models');
const mailer = require('../services/mailer');
const auth = require('../middleware/auth');
const { ROLES } = require('../services/roles');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, targetRole: u.targetRole, college: u.college, skills: u.skills });

router.post('/register', wrap(async (req, res) => {
  const username = str(req.body.username, 40).toLowerCase();
  const email = str(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) throw new HttpError(400, 'Username must be 3-40 characters (letters, numbers, _ . -)');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (password.length < 6 || password.length > 72) throw new HttpError(400, 'Password must be 6-72 characters');
  if (await User.findOne({ $or: [{ username }, { email }] })) throw new HttpError(409, 'Username or email already registered');
  const user = await User.create({ username, email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user.id), user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const id = str(req.body.username, 120).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = id ? await User.findOne({ $or: [{ username: id }, { email: id }] }) : null;
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid username or password');
  res.json({ token: sign(user.id), user: publicUser(user) });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(user) });
}));

// Update profile: target role, college, self-declared skills.
router.patch('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  const b = req.body || {};
  if (b.targetRole !== undefined) { if (!ROLES[b.targetRole]) throw new HttpError(400, 'Unknown role'); user.targetRole = b.targetRole; }
  if (b.college !== undefined) user.college = str(b.college, 120);
  if (Array.isArray(b.skills)) user.skills = [...new Set(b.skills.map((s) => str(s, 40)).filter(Boolean))].slice(0, 60);
  await user.save();
  res.json({ user: publicUser(user) });
}));

// ---- Password reset by email (only when an email provider is configured) ----
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const appUrl = (req) => (process.env.CLIENT_URL || '').split(',')[0].trim() || req.get('origin') || `${req.protocol}://${req.get('host')}`;

router.post('/forgot', wrap(async (req, res) => {
  if (!mailer.isConfigured()) throw new HttpError(503, 'Password reset by email is not set up on this server.');
  const email = str(req.body.email, 120).toLowerCase();
  const user = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? await User.findOne({ email }) : null;
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetHash = sha(token); user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const link = `${appUrl(req).replace(/\/$/, '')}/reset?token=${token}`;
    try {
      await mailer.send({ to: user.email, subject: 'Reset your Placement Prep password', html: `<p>Hi ${user.username},</p><p>Use this link to choose a new password. It works for 30 minutes and only once:</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email - your password stays the same.</p>` });
    } catch (e) { console.error('Reset email failed:', e.message); }
  }
  // Same answer whether or not the email exists, so this cannot be used to find out who has an account.
  res.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' });
}));

router.post('/reset', wrap(async (req, res) => {
  const token = str(req.body.token, 100);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (password.length < 6 || password.length > 72) throw new HttpError(400, 'Password must be 6-72 characters');
  const user = token.length >= 32 ? await User.findOne({ resetHash: sha(token), resetExpires: { $gt: new Date() } }).select('+resetHash +resetExpires') : null;
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');
  user.passwordHash = await bcrypt.hash(password, 10); user.resetHash = ''; user.resetExpires = null;
  await user.save();
  res.json({ ok: true });
}));

router.get('/config', (req, res) => res.json({ passwordReset: mailer.isConfigured() }));

// Delete my account and everything stored for it.
router.delete('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(400, 'Password is incorrect');
  for (const [name, Model] of Object.entries(mongoose.models)) if (name !== 'User' && Model.schema.path('user')) await Model.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });
  res.json({ ok: true });
}));

module.exports = router;
