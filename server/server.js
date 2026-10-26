require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/error');
const crud = require('./routes/crud');
const { ContactMessage, Company, Progress, Experience, Note, Goal } = require('./models');
const { wrap, str, HttpError } = require('./utils');

const isProd = process.env.NODE_ENV === 'production';
if (!process.env.JWT_SECRET && isProd) {
  console.error('FATAL: JWT_SECRET is not set. Add a long random JWT_SECRET in your hosting dashboard (Environment variables).');
  process.exit(1);
}
if (isProd && !process.env.CLIENT_URL) console.warn('WARNING: CLIENT_URL is not set, so the API accepts requests from any website. Set it to your frontend URL.');
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: JWT_SECRET is not set. Using a temporary secret - everyone will be logged out on every restart. Set JWT_SECRET in server/.env');
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));

// One log line per API request (method, path, status, time). No bodies, tokens or query strings are logged.
app.use('/api', (req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => { if (!req.originalUrl.startsWith('/api/health')) console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - t0}ms`); });
  next();
});

const limiter = (windowMs, max, message) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: message } });

// Health checks. /api/health = "the process is alive" (use for uptime monitors). /api/health/ready = "alive AND database connected".
const mongoose = require('mongoose');
const dbReady = () => mongoose.connection.readyState === 1;
app.get('/api/health', (req, res) => res.json({ ok: true, db: dbReady() ? 'connected' : 'connecting', uptimeSec: Math.round(process.uptime()) }));
app.get('/api/health/ready', (req, res) => res.status(dbReady() ? 200 : 503).json({ ok: dbReady(), db: dbReady() ? 'connected' : 'not connected' }));

// While the database is (re)connecting, answer clearly instead of hanging.
app.use('/api', (req, res, next) => (dbReady() || req.path.startsWith('/health') ? next() : res.status(503).json({ error: 'The server is starting up or the database is unavailable. Please try again in a few seconds.' })));

// ---- Public routes ----
app.use('/api/auth', limiter(10 * 60 * 1000, 60, 'Too many attempts. Please try again in a few minutes.'), require('./routes/auth'));
app.post('/api/contact', limiter(60 * 60 * 1000, 10, 'Too many messages. Try again later.'), wrap(async (req, res) => {
  const name = str(req.body.name, 100), email = str(req.body.email, 120), message = str(req.body.message, 3000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 5) throw new HttpError(400, 'Please fill in your name, a valid email and a message');
  await ContactMessage.create({ name, email, message });
  res.status(201).json({ ok: true });
}));

app.use('/api/public', limiter(60 * 1000, 60, 'Too many requests.'), require('./routes/share').publicRouter);

// Called by an external scheduler (e.g. cron-job.org) once a day. Protected by a secret; also keeps a free host awake.
app.post('/api/cron/reminders', wrap(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get('x-cron-secret') !== secret) throw new HttpError(401, 'Not allowed');
  res.json(await require('./services/reminders').runReminders());
}));

// ---- Everything below needs a logged-in user ----
app.use('/api', auth);
app.use('/api/stats', require('./routes/stats'));
app.use('/api/plan', require('./routes/plan'));
app.use('/api/share', require('./routes/share'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/cs', require('./routes/cs'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/debug', require('./routes/assessments').debugRouter);
app.use('/api/companies', crud(Company, ['name', 'role', 'status', 'date', 'notes']));
app.use('/api/progress', crud(Progress, ['date', 'topic', 'category', 'hours', 'notes', 'done'], { sort: { date: -1, createdAt: -1 } }));
app.use('/api/experiences', crud(Experience, ['company', 'role', 'round', 'date', 'difficulty', 'questions', 'experience', 'outcome']));
app.use('/api/notes', crud(Note, ['title', 'category', 'content', 'pinned'], { sort: { pinned: -1, updatedAt: -1 } }));
app.use('/api/goals', crud(Goal, ['title', 'company', 'targetDate', 'done'], { sort: { done: 1, targetDate: 1, createdAt: -1 } }));
app.use('/api/mock', require('./routes/mock'));
app.use('/api/aptitude', require('./routes/aptitude'));
app.use('/api/chat', limiter(60 * 1000, 30, 'You are sending messages too fast. Wait a moment.'), require('./routes/chat'));
app.use('/api/resume', limiter(60 * 1000, 20, 'Too many resume uploads. Wait a moment.'), require('./routes/resume'));
app.use('/api/builder', require('./routes/builder'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/jobs', limiter(60 * 1000, 40, 'Too many job searches. Wait a moment.'), require('./routes/jobs'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/code', require('./routes/code'));
app.use('/api/ai', limiter(60 * 1000, 30, 'Too many AI requests. Wait a moment.'), require('./routes/aiTools'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Production: serve the built React app from the same server ----
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`API running on port ${PORT}`));
server.keepAliveTimeout = 65000;   // longer than the 60s idle timeout of most hosting proxies, avoids random 502s
server.headersTimeout = 66000;

// Connect to MongoDB in the background with retries, so a short Atlas hiccup or a slow cold start does not crash the server.
(async () => {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try { await connectDB(); require('./services/trackStore').ensureSeeded().catch((e) => console.warn('Could not seed company tracks:', e.message)); return; }
    catch (err) {
      console.error(`\n[attempt ${attempt}/6] ${err.message}\n`);
      if (!process.env.MONGODB_URI || attempt === 6) { console.error('Giving up. Fix the problem above and restart.'); process.exit(1); }
      await new Promise((r) => setTimeout(r, Math.min(30000, attempt * 5000)));
    }
  }
})();

// Finish in-flight requests when the host restarts or redeploys the service.
const shutdown = (sig) => {
  console.log(`${sig} received, shutting down...`);
  server.close(() => mongoose.connection.close(false).finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
