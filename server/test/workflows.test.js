// End-to-end API workflow tests (in-memory database). Covers per-user isolation and the newer modules:
// projects, resume versions, DB-driven company tracks, public share of projects.
process.env.JWT_SECRET = 'x';
process.env.CODE_RUNNER = process.env.CODE_RUNNER || 'local';
const Module = require('module');
const http = require('http');
const assert = require('assert');
const { makeModels, ObjectId } = require('./fakeDb');
const { tryReal, miniExpress } = require('./miniExpress');

const models = makeModels();
const realExpress = tryReal('express');
const mini = realExpress ? null : miniExpress();
const hasRateLimit = !!tryReal('express-rate-limit');
const origLoad = Module._load;
Module._load = function (req, parent, ...r) {
  if (req === '../models') return models;
  if (req === 'mongoose') return { Types: { ObjectId }, models: {}, mongo: {} };
  if (!realExpress && req === 'express') return mini;
  if (!hasRateLimit && req === 'express-rate-limit') return () => (rq, rs, nx) => nx();
  return origLoad.call(this, req, parent, ...r);
};
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/public', require('../routes/share').publicRouter);
app.use((req, res, next) => { req.user = { id: req.headers['x-user'] || 'u1' }; next(); });
app.use('/api/projects', require('../routes/projects'));
app.use('/api/builder', require('../routes/builder'));
app.use('/api/tracks', require('../routes/tracks'));
app.use('/api/share', require('../routes/share'));
app.use('/api/plan', require('../routes/plan'));
app.use('/api/cs', require('../routes/cs'));
app.use('/api/mock', require('../routes/mock'));
app.use('/api/skills', require('../routes/skills'));
app.use('/api/code', require('../routes/code'));
app.use('/api/assessments', require('../routes/assessments'));
app.use('/api/debug', require('../routes/assessments').debugRouter);
app.use((e, req, res, next) => res.status(e.status || 500).json({ error: e.message })); // eslint-disable-line no-unused-vars

const call = (srv, method, path, body, user = 'u1') => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const rq = http.request({ port: srv.address().port, path, method, headers: { 'Content-Type': 'application/json', 'x-user': user, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
    let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b || '{}') }));
  });
  rq.on('error', reject); if (data) rq.write(data); rq.end();
});
const T = (n) => console.log('PASS', n);

(async () => {
  const srv = app.listen(0);
  const { User } = models;
  await User.create({ _id: 'u1', email: 'a@example.com', username: 'a' });
  await User.create({ _id: 'u2', email: 'b@example.com', username: 'b' });

  // ---- projects ----
  let r = await call(srv, 'POST', '/api/projects', { title: 'Tracker', techStack: 'React, Node', githubUrl: 'github.com/me/tracker', liveUrl: 'https://tracker.example.com', highlights: 'JWT auth\nIsolation' });
  assert.equal(r.status, 201, JSON.stringify(r.body)); assert.deepEqual(r.body.techStack, ['React', 'Node']); assert.equal(r.body.githubUrl, 'https://github.com/me/tracker');
  const pid = r.body._id;
  r = await call(srv, 'POST', '/api/projects', { title: 'Bad', liveUrl: 'javascript:alert(1)' }); assert.equal(r.status, 400);
  r = await call(srv, 'POST', '/api/projects', { title: 'Bad2', githubUrl: 'https://evil.com/x' }); assert.equal(r.status, 400);
  r = await call(srv, 'POST', '/api/projects', { title: '  ' }); assert.equal(r.status, 400);
  r = await call(srv, 'POST', '/api/projects', { title: 'Second', status: 'building', showPublic: true, user: 'u2' });
  assert.equal(String(r.body.user), 'u1', 'client cannot choose the owner');
  T('projects: create + URL/owner validation');
  r = await call(srv, 'GET', '/api/projects?q=react'); assert.equal(r.body.length, 1, JSON.stringify(r.body));
  r = await call(srv, 'GET', '/api/projects?status=building'); assert.equal(r.body.length, 1);
  r = await call(srv, 'GET', '/api/projects?sort=title'); assert.equal(r.body[0].title, 'Second');
  T('projects: search/filter/sort');
  r = await call(srv, 'GET', '/api/projects', null, 'u2'); assert.equal(r.body.length, 0);
  r = await call(srv, 'PUT', `/api/projects/${pid}`, { title: 'hack' }, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'DELETE', `/api/projects/${pid}`, null, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'PUT', `/api/projects/${pid}`, { featured: true }); assert.equal(r.body.featured, true); assert.equal(r.body.title, 'Tracker');
  T('projects: other users cannot read/edit/delete');

  // ---- share: projects only when ticked and flagged public ----
  r = await call(srv, 'PUT', '/api/share', { enabled: true, displayName: 'Asha', show: { projects: true } });
  const token = r.body.token; assert(token);
  r = await call(srv, 'GET', `/api/public/${token}`);
  assert.equal(r.body.projects.length, 1); assert.equal(r.body.projects[0].title, 'Second');
  assert(!('user' in r.body.projects[0]) && !('_id' in r.body.projects[0]) && !('highlights' in r.body.projects[0]));
  T('share: only public-flagged projects, no private fields');

  // ---- resume versions ----
  const data = { name: 'Asha', title: 'SDE', skills: 'JS\nNode', education: [], projects: [], experience: [] };
  r = await call(srv, 'PUT', '/api/builder', { template: 'classic', data }); assert.equal(r.status, 200);
  r = await call(srv, 'POST', '/api/builder/versions', { name: 'v1', template: 'classic', data }); assert.equal(r.status, 201);
  const vid = r.body.id;
  await call(srv, 'PUT', '/api/builder', { template: 'modern', data: { ...data, name: 'Changed' } });
  r = await call(srv, 'POST', `/api/builder/versions/${vid}/restore`); assert.equal(r.body.data.name, 'Asha'); assert.equal(r.body.template, 'classic');
  r = await call(srv, 'GET', '/api/builder'); assert.equal(r.body.data.name, 'Asha');
  r = await call(srv, 'GET', '/api/builder/versions'); assert.equal(r.body.length, 1);
  r = await call(srv, 'GET', '/api/builder/versions', null, 'u2'); assert.equal(r.body.length, 0);
  r = await call(srv, 'GET', `/api/builder/versions/${vid}`, null, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'POST', `/api/builder/versions/${vid}/restore`, null, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'POST', '/api/builder/versions', { name: 'x', data: [1] }); assert.equal(r.status, 400);
  r = await call(srv, 'PUT', `/api/builder/versions/${vid}`, { name: 'Amazon resume' }); assert.equal(r.body.name, 'Amazon resume');
  r = await call(srv, 'DELETE', `/api/builder/versions/${vid}`); assert.equal(r.status, 200);
  T('resume versions: save/restore/rename/delete + isolation');

  // ---- DB-driven tracks ----
  r = await call(srv, 'GET', '/api/tracks');
  assert(r.body.length >= 6 && r.body.every((t) => t.verifiedAt === null && t.authoredAt));
  assert.equal(models.CompanyTrack.rows.length, r.body.length, 'tracks were seeded into the database');
  r = await call(srv, 'GET', '/api/tracks/amazon');
  assert.equal(r.body.meta.verifiedAt, null); assert(/Not verified/.test(r.body.meta.verification)); assert.equal(r.body.canEdit, false);
  r = await call(srv, 'PUT', '/api/tracks/amazon', { summary: 'hacked', markVerified: true }); assert.equal(r.status, 403);
  process.env.ADMIN_EMAILS = 'a@example.com';
  r = await call(srv, 'PUT', '/api/tracks/amazon', { summary: 'Edited summary', markVerified: true, official: [{ label: 'Jobs', url: 'https://www.amazon.jobs' }, { label: 'x', url: 'javascript:1' }] });
  assert.equal(r.status, 400, 'bad official URL rejected');
  r = await call(srv, 'PUT', '/api/tracks/amazon', { summary: 'Edited summary', markVerified: true, sourceNote: 'Checked on careers page.' });
  assert.equal(r.status, 200);
  r = await call(srv, 'GET', '/api/tracks/amazon'); assert.equal(r.body.summary, 'Edited summary'); assert(r.body.meta.verifiedAt); assert(/Checked against/.test(r.body.meta.verification));
  r = await call(srv, 'PUT', '/api/tracks/amazon', { summary: 'x' }, 'u2'); assert.equal(r.status, 403);
  T('tracks: DB seeded, unverified by default, admin-only edit + verification');
  r = await call(srv, 'PUT', '/api/plan/settings', { targetCompany: 'amazon' }); assert.equal(r.status, 200);
  r = await call(srv, 'PUT', '/api/plan/settings', { targetCompany: 'nope' }); assert.equal(r.status, 400);
  T('plan settings use DB tracks');

  // ---- CS Fundamentals ----
  const bank = require('../services/csBank');
  r = await call(srv, 'GET', '/api/cs');
  assert.equal(r.body.lessons.length, 16); assert.equal(r.body.subjects.length, 5);
  assert.equal(r.body.next.id !== undefined, true);
  r = await call(srv, 'GET', '/api/cs?q=deadlock'); assert(r.body.lessons.length >= 1 && r.body.lessons.every((l) => /deadlock/i.test(JSON.stringify(bank.lessonById[l.id]))));
  r = await call(srv, 'GET', '/api/cs?subject=sql&level=Beginner'); assert(r.body.lessons.every((l) => l.subject === 'sql' && l.level === 'Beginner') && r.body.lessons.length >= 1);
  r = await call(srv, 'GET', '/api/cs/lessons/sql-joins');
  assert.equal(r.body.questions.length, 4);
  assert(r.body.questions.every((q) => !('answer' in q) && !('explain' in q) && q.options.length === 4 && q.options.every((o) => typeof o.i === 'number')), 'answers must not be sent to the browser');
  r = await call(srv, 'GET', '/api/cs/lessons/nope'); assert.equal(r.status, 404);
  T('cs: list/search/filter + answers withheld');

  // answer everything in sql-joins WRONG (3 attempts of the lesson -> weak)
  const lesson = bank.lessonById['sql-joins'];
  const wrong = (qs) => qs.map((q) => ({ id: q.id, choice: (q.answer + 1) % 4, timeSec: 20 }));
  const right = (qs) => qs.map((q) => ({ id: q.id, choice: q.answer, timeSec: 15 }));
  r = await call(srv, 'POST', '/api/cs/grade', { mode: 'lesson', lessonId: 'sql-joins', answers: wrong(lesson.questions) });
  assert.equal(r.body.score, 0); assert(r.body.results.every((x) => x.explain && x.answerText));
  r = await call(srv, 'POST', '/api/cs/grade', { mode: 'lesson', lessonId: 'sql-joins', answers: right(lesson.questions) });
  assert.equal(r.body.score, 4);
  // forged ids / out-of-range choices are ignored or counted wrong
  r = await call(srv, 'POST', '/api/cs/grade', { answers: [{ id: 'fake:1', choice: 0 }, { id: lesson.questions[0].id, choice: 99 }] });
  assert.equal(r.body.total, 1); assert.equal(r.body.score, 0);
  r = await call(srv, 'POST', '/api/cs/grade', { answers: [] }); assert.equal(r.status, 400);
  r = await call(srv, 'GET', '/api/cs');
  const j = r.body.lessons.find((l) => l.id === 'sql-joins'); assert.equal(j.attempted, 9); assert.equal(j.accuracy, 44); assert.equal(j.weak, true);
  assert.equal(r.body.next.id, 'sql-joins', 'weak lesson is recommended first');
  T('cs: server-side grading, forged answers rejected, weak lesson detected');

  r = await call(srv, 'GET', '/api/cs/practice?mode=weak'); assert(r.body.questions.length > 0 && r.body.questions.every((q) => q.lessonId === 'sql-joins'));
  r = await call(srv, 'GET', '/api/cs/practice?mode=mistakes'); assert(r.body.questions.length >= 1);
  r = await call(srv, 'GET', '/api/cs/practice?mode=mixed&subject=os&count=5'); assert.equal(r.body.questions.length, 5); assert(r.body.questions.every((q) => q.subject === 'os'));
  r = await call(srv, 'GET', '/api/cs', null, 'u2'); assert.equal(r.body.stats.questions, 0); assert.equal(r.body.mistakeCount, 0);
  r = await call(srv, 'GET', '/api/cs/practice?mode=mistakes', null, 'u2'); assert.equal(r.body.questions.length, 0);
  T('cs: practice modes + per-user isolation');

  r = await call(srv, 'POST', '/api/cs/lessons/os-scheduling/read', { read: true }); assert.equal(r.body.read, true);
  r = await call(srv, 'GET', '/api/cs/lessons/os-scheduling'); assert.equal(r.body.read, true);
  r = await call(srv, 'GET', '/api/cs/lessons/os-scheduling', null, 'u2'); assert.equal(r.body.read, false);

  // planner picks up the weak CS lesson
  r = await call(srv, 'GET', '/api/plan/weak');
  assert(r.body.areas.some((a) => a.area === 'cs' && a.lessonId === 'sql-joins'));
  assert(r.body.recommendations.some((x) => /sql|join/i.test(x.text) && x.link === '/app/cs/sql-joins'));
  r = await call(srv, 'POST', '/api/plan/generate', { today: '2026-10-19', days: 3 });
  const tasks = models.PlanTask.rows.filter((t) => String(t.user) === 'u1');
  assert(tasks.some((t) => t.kind === 'cs' && t.link === '/app/cs/sql-joins'), 'plan contains a CS revision task for the weak lesson');
  T('planner: weak CS lesson becomes a recommendation and a plan task');

  // ---- timed assessments ----
  const problemsLib = require('../services/problems');
  r = await call(srv, 'POST', '/api/assessments', { durationMin: 5, count: 2 }); assert.equal(r.status, 400, 'too short');
  r = await call(srv, 'POST', '/api/assessments', { durationMin: 30, count: 9 }); assert.equal(r.status, 400);
  r = await call(srv, 'POST', '/api/assessments', { durationMin: 30, count: 2, level: 'Beginner' });
  assert.equal(r.status, 201, JSON.stringify(r.body)); assert.equal(r.body.problems.length, 2);
  assert(r.body.remainingSec > 1700 && r.body.remainingSec <= 1800);
  assert(r.body.problems.every((p) => !('tests' in p) && p.verdict === null));
  const aid = r.body.id, apids = r.body.problems.map((p) => p.id);
  r = await call(srv, 'POST', '/api/assessments', { durationMin: 30, count: 1 }); assert.equal(r.status, 409, 'only one active assessment');
  r = await call(srv, 'POST', `/api/code/problems/${apids[0]}/hint`); assert.equal(r.status, 403, 'hints locked during assessment');
  r = await call(srv, 'GET', `/api/code/problems/${apids[0]}/editorial?reveal=1`); assert.equal(r.status, 403);
  const other = problemsLib.load().problems.find((p) => !apids.includes(p.id));
  r = await call(srv, 'POST', `/api/code/problems/${other.id}/hint`); assert.equal(r.status, 200, 'other problems unaffected');
  r = await call(srv, 'GET', `/api/assessments/${aid}`, null, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'POST', `/api/assessments/${aid}/problems/${apids[0]}/submit`, { code: 'print(1)' }, 'u2'); assert.equal(r.status, 404);
  r = await call(srv, 'GET', `/api/assessments/${aid}/problems/${apids[0]}`); assert(r.body.starter && !('tests' in r.body) && !('editorial' in r.body));
  T('assessments: validation, one at a time, hints locked, isolation');

  const p0 = problemsLib.get(apids[0]);
  r = await call(srv, 'POST', `/api/assessments/${aid}/problems/${apids[0]}/submit`, { code: 'print("wrong")' });
  assert.equal(r.status, 200); assert.notEqual(r.body.verdict, 'AC');
  r = await call(srv, 'POST', `/api/assessments/${aid}/problems/${apids[0]}/submit`, { code: p0.editorial.code });
  assert.equal(r.body.verdict, 'AC'); assert.equal(r.body.attempts, 2);
  r = await call(srv, 'POST', `/api/assessments/${aid}/problems/${apids[0]}/submit`, { code: 'print("wrong again")' });   // must not lower the best result
  r = await call(srv, 'POST', `/api/assessments/${aid}/finish`);
  assert.equal(r.body.status, 'submitted'); assert.equal(r.body.solved, 1); assert.equal(r.body.score, 50);
  assert.equal(r.body.problems.find((p) => p.id === apids[0]).verdict, 'AC');
  r = await call(srv, 'POST', `/api/assessments/${aid}/problems/${apids[1]}/submit`, { code: 'print(1)' }); assert.equal(r.status, 409, 'closed after finishing');
  r = await call(srv, 'GET', `/api/code/progress`); assert(r.body.solved >= 1, 'assessment submissions count in normal progress');
  T('assessments: best result kept, score computed from real test results, closed after finish');

  // expiry is decided by the server clock
  r = await call(srv, 'POST', '/api/assessments', { durationMin: 15, count: 1 });
  const aid2 = r.body.id;
  models.Assessment.rows.find((x) => String(x._id) === aid2).deadline = new Date(Date.now() - 1000);
  r = await call(srv, 'POST', `/api/assessments/${aid2}/problems/${r.body.problems[0].id}/submit`, { code: 'print(1)' }); assert.equal(r.status, 409);
  r = await call(srv, 'GET', `/api/assessments/${aid2}`); assert.equal(r.body.status, 'expired'); assert.equal(r.body.remainingSec, 0);
  r = await call(srv, 'GET', '/api/assessments'); assert.equal(r.body.active, null); assert.equal(r.body.history.length, 2);
  T('assessments: server enforces the deadline, history kept');

  // ---- debugging exercises ----
  r = await call(srv, 'GET', '/api/debug'); assert(r.body.length >= 8); const ex = r.body[0];
  r = await call(srv, 'GET', `/api/debug/${ex.id}`); assert(r.body.brokenCode && r.body.symptom && !('tests' in r.body.problem));
  const dbg = require('../data/debug.json').exercises.find((e) => e.id === ex.id);
  r = await call(srv, 'POST', `/api/debug/${ex.id}/submit`, { code: dbg.brokenCode }); assert.equal(r.status, 400, 'unchanged code is rejected');
  const pr = problemsLib.get(dbg.problemId);
  r = await call(srv, 'POST', `/api/debug/${ex.id}/submit`, { code: dbg.brokenCode + '\n# touched' }); assert.notEqual(r.body.verdict, 'AC'); assert.equal(r.body.fixed, false);
  r = await call(srv, 'POST', `/api/debug/${ex.id}/submit`, { code: pr.editorial.code }); assert.equal(r.body.verdict, 'AC'); assert.equal(r.body.fixed, true);
  r = await call(srv, 'GET', '/api/debug?status=fixed'); assert.equal(r.body.length, 1);
  r = await call(srv, 'GET', '/api/debug?status=fixed', null, 'u2'); assert.equal(r.body.length, 0);
  T('debug exercises: broken code fails, fix verified by the judge, progress per user');

  // ---- mock interview upgrades ----
  delete process.env.ANTHROPIC_API_KEY;
  r = await call(srv, 'GET', '/api/mock/categories', null, 'u3'); assert.equal(r.body.find((c) => c.name === 'Projects').disabled, true);
  r = await call(srv, 'GET', '/api/mock/questions?category=Projects&count=4', null, 'u3'); assert.equal(r.body.length, 0, 'no projects, no project questions');
  r = await call(srv, 'GET', '/api/mock/categories'); assert.equal(r.body.find((c) => c.name === 'Projects').disabled, false);
  r = await call(srv, 'GET', '/api/mock/questions?category=Projects&count=6');
  assert(r.body.length >= 3 && r.body.every((q) => q.category === 'Projects'));
  assert(r.body.some((q) => /Tracker|Second/.test(q.q)), 'questions mention the student\'s own project');
  r = await call(srv, 'GET', '/api/mock/questions?category=HR&count=3'); assert.equal(r.body.length, 3);
  r = await call(srv, 'POST', '/api/mock/follow-up', { question: 'Tell me about a project', answer: 'ok' }); assert.equal(r.status, 400);
  r = await call(srv, 'POST', '/api/mock/follow-up', { question: 'Describe your project', category: 'Resume', answer: 'We built a tracker with React and MongoDB and it worked well for the team.' });
  assert.equal(r.body.source, 'rule-based'); assert(r.body.followUps.length >= 1 && r.body.followUps.length <= 2);
  assert(r.body.followUps.some((f) => /react|mongodb/i.test(f.text)), 'follow-up refers to a technology named in the answer');
  r = await call(srv, 'POST', '/api/mock/follow-up', { question: 'Tell me about a time you led a team', category: 'HR', answer: 'We had a deadline and we all worked hard and we finished the work together with the whole group.' });
  assert(r.body.followUps.some((f) => /own contribution|outcome|number/i.test(f.text)));
  r = await call(srv, 'POST', '/api/mock/analyze', { question: 'Describe your project', category: 'Resume', keywords: ['react'], answer: 'I built a React app. '.repeat(10), durationSec: 30 });
  assert(r.body.metrics && 'fillerCount' in r.body.metrics);
  r = await call(srv, 'POST', '/api/mock/sessions', { category: 'Projects', durationSec: 120, answers: [{ question: 'q1', answer: 'a', score: 60, metrics: { wordCount: 100, wpm: 140, fillerCount: 2 } }, { question: 'q2', answer: 'b', score: 80, followUp: true, metrics: { wordCount: 50, wpm: 0, fillerCount: 0 } }] });
  assert.equal(r.status, 201); assert.equal(r.body.communication.avgWords, 75); assert.equal(r.body.communication.avgWpm, 140); assert.equal(r.body.communication.fillersPer100Words, 1.3);
  r = await call(srv, 'GET', '/api/mock/sessions', null, 'u2'); assert.equal(r.body.length, 0);
  T('mock: project-based questions, follow-ups (rule-based, labelled), communication numbers, isolation');

  // ---- roadmap adapts to real data ----
  await call(srv, 'POST', '/api/projects', { title: 'Py tool', techStack: 'python, javascript' });
  r = await call(srv, 'POST', '/api/skills/gap', { roleId: 'fullstack', hoursPerWeek: 10 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert(r.body.fromProjects.includes('JavaScript') && r.body.have.includes('JavaScript'), 'skills used in saved projects count');
  assert(r.body.practiceFocus.some((f) => f.area === 'cs' && f.topic.includes('Joins')), 'weak CS lesson shows up in the roadmap focus');
  r = await call(srv, 'POST', '/api/skills/gap', { roleId: 'fullstack' }, 'u2'); assert.deepEqual(r.body.practiceFocus, []);
  T('roadmap: uses project skills and real weak areas');

  srv.close(); console.log('\nWorkflow tests passed.');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
