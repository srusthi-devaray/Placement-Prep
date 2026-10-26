// Study planner, fair streaks, readiness score, milestones, reports and recommendations.
// Everything is computed from the student's own records. Nothing here is a prediction of placement results.
const mongoose = require('mongoose');
const { Progress, PlanTask, StudySetting, CodeProgress, CodeSubmission, AptitudeResult, MockSession, Company, ResumeAnalysis, CsAttempt } = require('../models');
const problems = require('./problems');
const apt = require('./aptitude');
const { aptitudeInsights, codingInsights, mockInsights, csInsights, pct } = require('./insights');
const tracks = require('./trackStore');
const { ROLES } = require('./roles');

const addDays = (day, n) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
// Convert a timestamp to the student's local day. tz = minutes as returned by JS getTimezoneOffset() (IST = -330).
const localDay = (ts, tz = 0) => new Date(new Date(ts).getTime() - tz * 60000).toISOString().slice(0, 10);
const LEVEL_MIN = { Beginner: 30, Intermediate: 45, Advanced: 60 };

async function getSettings(userId) {
  let s = await StudySetting.findOne({ user: userId });
  if (!s) s = await StudySetting.create({ user: userId });
  return s;
}

// ---------- activity + fair streak ----------
async function activityDays(userId, tz) {
  const uid = new mongoose.Types.ObjectId(userId);
  const [prog, tasks, subs, apts, mocks, csa] = await Promise.all([
    Progress.distinct('date', { user: uid }),
    PlanTask.find({ user: uid, done: true, doneAt: { $ne: null } }).select('doneAt').lean(),
    CodeSubmission.find({ user: uid }).select('createdAt').lean(),
    AptitudeResult.find({ user: uid }).select('createdAt').lean(),
    MockSession.find({ user: uid }).select('createdAt').lean(),
    CsAttempt.find({ user: uid }).select('createdAt').lean()
  ]);
  const set = new Set(prog);
  for (const t of tasks) set.add(localDay(t.doneAt, tz));
  for (const s of subs) set.add(localDay(s.createdAt, tz));
  for (const a of apts) set.add(localDay(a.createdAt, tz));
  for (const m of mocks) set.add(localDay(m.createdAt, tz));
  for (const c of csa) set.add(localDay(c.createdAt, tz));
  return set;
}

// Fair streak rules (shown to the student in the UI):
//  - Rest days (days you did not choose as study days) never break a streak.
//  - Every 7 days of activity earns one "grace day" (max 2 banked) that is used automatically when you miss a planned study day.
//  - Today never breaks the streak - you still have time.
function fairStreak(active, studyDays, today) {
  const days = [...active].filter((d) => d <= today).sort();
  if (!days.length) return { current: 0, longest: 0, graceBanked: 0, graceUsed: 0 };
  let cur = 0, longest = 0, bank = 0, used = 0;
  for (let d = days[0]; d <= today; d = addDays(d, 1)) {
    if (active.has(d)) { cur++; longest = Math.max(longest, cur); if (cur % 7 === 0) bank = Math.min(bank + 1, 2); }
    else if (d === today) continue;
    else if (!studyDays.includes(weekday(d))) continue;
    else if (bank > 0) { bank--; used++; }
    else cur = 0;
  }
  return { current: cur, longest, graceBanked: bank, graceUsed: used };
}

// ---------- weak areas + recommendations ----------
async function weakAreas(userId) {
  const [a, c, m, k] = await Promise.all([aptitudeInsights(userId), codingInsights(userId), mockInsights(userId), csInsights(userId)]);
  const areas = [];
  for (const l of k.weakLessons) areas.push({ area: 'cs', topic: l.title, lessonId: l.id, severity: 100 - l.accuracy, reason: `${l.accuracy}% correct over ${l.attempted} quiz questions in "${l.title}".` });
  for (const t of c.weakTopics) areas.push({ area: 'coding', topic: t.topic, severity: 100 - t.acceptRate, reason: `${t.acceptRate}% of your ${t.submissions} submissions in ${t.topic} were accepted.` });
  for (const t of a.weakTopics) areas.push({ area: 'aptitude', topic: t.topic, severity: 100 - t.accuracy, reason: `${t.accuracy}% accuracy over ${t.attempted} ${t.topic} questions.` });
  for (const t of a.slowTopics) areas.push({ area: 'aptitude-speed', topic: t.topic, severity: 40, reason: `You take about ${t.avgTimeSec}s per ${t.topic} question (aim for under 75s).` });
  for (const t of m.weakCategories) areas.push({ area: 'mock', topic: t.category, severity: 100 - t.avg, reason: `Average mock interview score in ${t.category} is ${t.avg}/100 over ${t.sessions} sessions.` });
  areas.sort((x, y) => y.severity - x.severity);
  return { areas, apt: a, coding: c, mock: m, cs: k };
}

function recommendations(w) {
  const recs = [];
  for (const r of w.coding.repeated.slice(0, 3)) recs.push({ kind: 'mistake', text: `You have ${r.wrongAttempts} wrong submissions on "${r.title}". Open its hints, rewrite the plan on paper, then solve it again from scratch.`, link: `/app/code/${r.id}` });
  for (const t of w.coding.weakTopics.slice(0, 2)) recs.push({ kind: 'weak', text: `${t.topic} is a weak spot (${t.acceptRate}% accepted). Do the easiest unsolved ${t.topic} problems first and read the editorial after each attempt.`, link: '/app/code' });
  if (w.apt.mistakeCount) recs.push({ kind: 'mistake', text: `${w.apt.mistakeCount} aptitude question${w.apt.mistakeCount === 1 ? '' : 's'} are still unresolved. Reattempt them in "Mistakes" mode.`, link: '/app/aptitude' });
  for (const t of w.apt.weakTopics.slice(0, 2)) recs.push({ kind: 'weak', text: `Aptitude: ${t.topic} accuracy is ${t.accuracy}%. Study the worked solutions, then practise 10 questions of that topic.`, link: '/app/aptitude' });
  for (const t of w.apt.slowTopics.slice(0, 1)) recs.push({ kind: 'speed', text: `You are slow on ${t.topic} (${t.avgTimeSec}s per question). Learn one shortcut and practise it in timed mode.`, link: '/app/aptitude' });
  for (const l of w.cs.weakLessons.slice(0, 2)) recs.push({ kind: 'weak', text: `CS Fundamentals: "${l.title}" is at ${l.accuracy}% (${l.attempted} questions). Re-read the lesson, then retake its quiz.`, link: `/app/cs/${l.id}` });
  if (w.cs.mistakeCount) recs.push({ kind: 'mistake', text: `${w.cs.mistakeCount} CS question${w.cs.mistakeCount === 1 ? '' : 's'} are still wrong from your last attempt. Practise them in "Mistakes" mode.`, link: '/app/cs' });
  if (w.cs.next && !w.cs.weakLessons.length) recs.push({ kind: 'next', text: `Next CS lesson: "${w.cs.next.title}". ${w.cs.next.reason}`, link: `/app/cs/${w.cs.next.id}` });
  for (const t of w.mock.weakCategories.slice(0, 1)) recs.push({ kind: 'weak', text: `Mock interviews: ${t.category} scores average ${t.avg}/100. Review the Knowledge Base for it, then retry a ${t.category} session.`, link: '/app/mock' });
  if (!recs.length) recs.push({ kind: 'start', text: 'Not enough practice data yet to find weak spots. Solve a few coding problems, take an aptitude test and try a mock interview. Recommendations will then be based on your real results.', link: '/app/code' });
  return recs;
}

// ---------- readiness ----------
async function readiness(userId, today, tz = 0) {
  const settings = await getSettings(userId);
  const uid = new mongoose.Types.ObjectId(userId);
  const [c, a, m, resume, active, planned14] = await Promise.all([
    codingInsights(userId), aptitudeInsights(userId), mockInsights(userId),
    ResumeAnalysis.findOne({ user: uid }).sort({ createdAt: -1 }).select('score').lean(),
    activityDays(userId, tz),
    PlanTask.find({ user: uid, date: { $gte: addDays(today, -13), $lte: today } }).select('done date').lean()
  ]);
  const start = addDays(today, -13);
  let studyDaysInWindow = 0, activeInWindow = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) { if (settings.studyDays.includes(weekday(d))) { studyDaysInWindow++; if (active.has(d)) activeInWindow++; } }
  const due = planned14.filter((t) => t.date <= today);
  const comps = [];
  const add = (key, label, weight, value, confidence, evidence, tip) => comps.push({ key, label, weight, value: value === null ? null : Math.max(0, Math.min(100, Math.round(value))), confidence, evidence, tip, points: value === null ? 0 : Math.round((Math.max(0, Math.min(100, value)) * weight) / 100 * 10) / 10 });
  add('coding', 'Coding practice', 25, c.submissions ? Math.min(c.solved / 25, 1) * 70 + pct(c.accepted, c.submissions) * 0.3 : null, c.submissions >= 15 ? 'medium' : 'low',
    `${c.solved} of ${c.total} problems solved, ${pct(c.accepted, c.submissions)}% of ${c.submissions} submissions accepted. 25 solved problems = full marks for the volume part.`, 'Solve problems across several topics.');
  add('mock', 'Mock interviews', 20, m.avgRecent, m.sessions >= 5 ? 'medium' : 'low', m.sessions ? `Average of your last ${Math.min(m.sessions, 5)} mock sessions (automatic scoring).` : 'No mock interviews yet.', 'Do a mock interview in each category.');
  add('aptitude', 'Aptitude', 15, a.questions ? a.accuracy : null, a.questions >= 50 ? 'medium' : 'low', `${a.accuracy}% correct over ${a.questions} questions.`, 'Take timed mixed mock tests.');
  add('resume', 'Resume (ATS check)', 15, resume ? resume.score : null, 'medium', resume ? `Latest ATS score ${resume.score}/100 (an automatic check, not what a recruiter thinks).` : 'No resume analysed yet.', 'Analyse your resume and fix the top issues.');
  add('consistency', 'Consistency', 15, studyDaysInWindow ? (activeInWindow / studyDaysInWindow) * 100 : null, studyDaysInWindow >= 10 ? 'medium' : 'low', `Active on ${activeInWindow} of ${studyDaysInWindow} planned study days in the last 14 days.`, 'Short sessions on planned days beat long, rare ones.');
  add('plan', 'Plan follow-through', 10, due.length ? pct(due.filter((t) => t.done).length, due.length) : null, due.length >= 10 ? 'medium' : 'low', due.length ? `${due.filter((t) => t.done).length} of ${due.length} planned tasks done in the last 14 days.` : 'No planned tasks in the last 14 days.', 'Generate a weekly plan in the Planner.');
  const score = Math.round(comps.reduce((s, x) => s + x.points, 0));
  return {
    score, components: comps, withData: comps.filter((x) => x.value !== null).length, total: comps.length,
    limitations: [
      'This score is a progress indicator based on practice you did inside this app. It does not predict whether you will be selected.',
      'Parts with no data score zero, so a new account starts low on purpose. The score rises as you practise.',
      'The practice libraries are small (51 coding problems, 69 aptitude questions). Real tests are broader.',
      'Mock interview and resume scores are automatic heuristics, not human judgement.',
      'Low-confidence components rest on very little data and can swing a lot.'
    ]
  };
}

// ---------- milestones ----------
async function milestones(userId, today, tz = 0) {
  const uid = new mongoose.Types.ObjectId(userId);
  const settings = await getSettings(userId);
  const [solvedRows, mocks, aptRes, hoursAgg, companies, resume, tasksDone, active] = await Promise.all([
    CodeProgress.find({ user: uid, status: 'solved' }).sort({ solvedAt: 1 }).select('solvedAt').lean(),
    MockSession.find({ user: uid }).sort({ createdAt: 1 }).select('avgScore createdAt').lean(),
    AptitudeResult.find({ user: uid }).sort({ createdAt: 1 }).select('score total createdAt').lean(),
    Progress.aggregate([{ $match: { user: uid } }, { $group: { _id: null, h: { $sum: '$hours' } } }]),
    Company.find({ user: uid }).select('status createdAt').lean(),
    ResumeAnalysis.findOne({ user: uid }).sort({ score: -1 }).select('score createdAt').lean(),
    PlanTask.find({ user: uid, done: true }).sort({ doneAt: 1 }).select('doneAt').lean(),
    activityDays(userId, tz)
  ]);
  const hours = hoursAgg[0] ? hoursAgg[0].h : 0;
  const streak = fairStreak(active, settings.studyDays, today);
  const nth = (arr, n, key) => (arr.length >= n ? arr[n - 1][key] : null);
  let aq = 0, firstAq = null; for (const r of aptRes) { aq += r.total; if (aq >= 100 && !firstAq) firstAq = r.createdAt; }
  const aptScore = aptRes.reduce((s, r) => s + r.score, 0);
  const M = (id, title, current, target, date) => ({ id, title, current: Math.min(current, target), target, achieved: current >= target, date: current >= target ? date || null : null });
  const best = mocks.find((x) => x.avgScore >= 70);
  const offer = companies.find((c) => c.status === 'Offer');
  return [
    M('code1', 'Solve your first coding problem', solvedRows.length, 1, nth(solvedRows, 1, 'solvedAt')),
    M('code10', 'Solve 10 coding problems', solvedRows.length, 10, nth(solvedRows, 10, 'solvedAt')),
    M('code25', 'Solve 25 coding problems', solvedRows.length, 25, nth(solvedRows, 25, 'solvedAt')),
    M('code50', 'Solve 50 coding problems', solvedRows.length, 50, nth(solvedRows, 50, 'solvedAt')),
    M('mock1', 'Finish your first mock interview', mocks.length, 1, nth(mocks, 1, 'createdAt')),
    M('mock5', 'Finish 5 mock interviews', mocks.length, 5, nth(mocks, 5, 'createdAt')),
    M('mock70', 'Score 70+ in a mock interview', best ? 70 : Math.max(0, ...mocks.map((x) => x.avgScore)), 70, best && best.createdAt),
    M('apt100', 'Answer 100 aptitude questions', aq, 100, firstAq),
    M('aptacc', '75%+ aptitude accuracy (50+ questions)', aq >= 50 ? pct(aptScore, aq) : 0, 75, null),
    M('streak7', 'Reach a 7-day study streak', streak.longest, 7, null),
    M('streak30', 'Reach a 30-day study streak', streak.longest, 30, null),
    M('hours50', 'Log 50 study hours', Math.round(hours), 50, null),
    M('hours100', 'Log 100 study hours', Math.round(hours), 100, null),
    M('resume75', 'Get an ATS resume score of 75+', resume ? resume.score : 0, 75, resume && resume.createdAt),
    M('tasks20', 'Complete 20 planned tasks', tasksDone.length, 20, nth(tasksDone, 20, 'doneAt')),
    M('apply1', 'Add your first company application', companies.length, 1, companies[0] && companies[0].createdAt),
    M('offer', 'Receive an offer', offer ? 1 : 0, 1, offer && offer.createdAt)
  ];
}

// ---------- plan generation ----------
async function generatePlan(userId, { today, days = 7, start }) {
  const settings = await getSettings(userId);
  const uid = new mongoose.Types.ObjectId(userId);
  const first = start || today;
  const last = addDays(first, days - 1);
  const budget = Math.round(settings.hoursPerDay * 60);
  const w = await weakAreas(userId);
  const lib = problems.load();
  const progRows = await CodeProgress.find({ user: uid }).select('problemId status').lean();
  const solved = new Set(progRows.filter((g) => g.status === 'solved').map((g) => g.problemId));
  const track = await tracks.byId(String(settings.targetCompany || '').toLowerCase());
  const role = ROLES[settings.targetRole] || null;

  await PlanTask.deleteMany({ user: uid, auto: true, done: false, date: { $gte: first, $lte: last } });
  const existing = await PlanTask.find({ user: uid, date: { $gte: first, $lte: last } }).lean();
  const openRevisionRefs = new Set((await PlanTask.find({ user: uid, kind: 'revision', done: false, date: { $gte: first } }).select('ref').lean()).map((t) => t.ref));
  const usedIds = new Set(existing.map((t) => t.ref).filter(Boolean));

  const unsolvedIn = (topic, n) => lib.problems.filter((p) => p.topic === topic && !solved.has(p.id) && !usedIds.has(p.id))
    .sort((a, b) => problems.LEVELS.indexOf(a.level) - problems.LEVELS.indexOf(b.level)).slice(0, n);
  const codingTask = (p, reason) => { usedIds.add(p.id); return { kind: 'coding', title: `Solve: ${p.title}`, topic: p.topic, minutes: LEVEL_MIN[p.level] || 40, link: `/app/code/${p.id}`, ref: p.id, reason }; };

  const q = { revision: [], weak: [], track: [], other: [] };
  // 1) repeated mistakes -> spaced revision (step 0 now, later steps are created when you finish a revision task)
  for (const r of w.coding.repeated.slice(0, 4)) if (!openRevisionRefs.has(r.id)) q.revision.push({ kind: 'revision', title: `Revisit: ${r.title}`, topic: r.topic, minutes: 30, link: `/app/code/${r.id}`, ref: r.id, step: 0, reason: `${r.wrongAttempts} wrong attempts so far.` });
  if (w.apt.mistakeCount && !openRevisionRefs.has('apt-mistakes')) q.revision.push({ kind: 'revision', title: `Reattempt ${Math.min(w.apt.mistakeCount, 10)} missed aptitude questions`, topic: 'Aptitude', minutes: 20, link: '/app/aptitude', ref: 'apt-mistakes', step: 0, reason: 'Questions you answered wrongly last time.' });
  // 2) weak areas
  for (const a of w.areas.slice(0, 6)) {
    if (a.area === 'coding') unsolvedIn(a.topic, 2).forEach((p) => q.weak.push(codingTask(p, `Weak topic: ${a.reason}`)));
    else if (a.area === 'aptitude' || a.area === 'aptitude-speed') q.weak.push({ kind: 'aptitude', title: `Aptitude practice: ${a.topic} (10 questions)`, topic: a.topic, minutes: 25, link: '/app/aptitude', reason: a.reason });
    else if (a.area === 'cs') q.weak.push({ kind: 'cs', title: `Revise: ${a.topic} (lesson + quiz)`, topic: a.topic, minutes: 30, link: `/app/cs/${a.lessonId}`, ref: `cs:${a.lessonId}`, reason: a.reason });
    else if (a.area === 'mock') q.weak.push({ kind: 'mock', title: `Mock interview: ${a.topic}`, topic: a.topic, minutes: 30, link: '/app/mock', reason: a.reason });
  }
  // 3) target company track (or role) -> topics with the least progress
  if (track) {
    const order = track.dsa.topics.map((t) => ({ t, ratio: (lib.problems.filter((p) => p.topic === t && solved.has(p.id)).length) / Math.max(1, lib.problems.filter((p) => p.topic === t).length) })).sort((a, b) => a.ratio - b.ratio);
    for (const o of order.slice(0, 5)) unsolvedIn(o.t, 2).forEach((p) => q.track.push(codingTask(p, `${track.name} track: ${o.t}`)));
    for (const t of track.aptitude.topics.slice(0, 3)) q.track.push({ kind: 'aptitude', title: `Aptitude practice: ${t} (10 questions)`, topic: t, minutes: 25, link: '/app/aptitude', reason: `${track.name} track` });
    track.mock.slice(0, 2).forEach((c) => q.track.push({ kind: 'mock', title: `Mock interview: ${c}`, topic: c, minutes: 30, link: '/app/mock', reason: `${track.name} track` }));
    q.track.push({ kind: 'behavioral', title: `Prepare 2 behavioural stories (${track.name})`, topic: 'Behavioral', minutes: 30, link: `/app/tracks`, reason: `${track.name} track` });
  } else if (role) {
    (role.required || []).slice(0, 2).forEach((sk) => q.track.push({ kind: 'cs', title: `Revise ${sk} fundamentals`, topic: sk, minutes: 40, link: '/app/roadmap', reason: `Required skill for ${role.title}` }));
  }
  // 4) fillers: beginner-first coding in library order + mixed aptitude + mock + resume
  for (const t of lib.topics) unsolvedIn(t, 1).forEach((p) => q.other.push(codingTask(p, 'Next unsolved problem in this topic')));
  if (w.cs.next && !w.cs.weakLessons.length) q.other.unshift({ kind: 'cs', title: `Learn: ${w.cs.next.title}`, topic: 'CS Fundamentals', minutes: 30, link: `/app/cs/${w.cs.next.id}`, ref: `cs:${w.cs.next.id}`, reason: w.cs.next.reason });
  q.other.push({ kind: 'aptitude', title: 'Mixed aptitude set (15 questions)', topic: 'Mixed', minutes: 25, link: '/app/aptitude', reason: 'Keeps all sections warm' });
  q.other.push({ kind: 'mock', title: 'Mock interview (any category)', topic: 'Mock', minutes: 30, link: '/app/mock', reason: 'Regular speaking practice' });
  if (!(await ResumeAnalysis.exists({ user: uid }))) q.other.unshift({ kind: 'resume', title: 'Analyse your resume (ATS check)', topic: 'Resume', minutes: 20, link: '/app/resume', reason: 'No resume analysed yet' });

  // interleave: revision, weak, track, other, repeat
  const order = [];
  const keys = ['revision', 'weak', 'track', 'other'];
  for (let i = 0; keys.some((k) => i < q[k].length); i++) for (const k of keys) if (i < q[k].length) order.push(q[k][i]);

  const out = [];
  let cursor = 0;
  const typeCount = {};
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (!settings.studyDays.includes(weekday(d))) continue;
    let used = existing.filter((t) => t.date === d).reduce((s, t) => s + t.minutes, 0);
    let n = 0, guard = 0;
    while (cursor < order.length && n < 6 && guard++ < order.length) {
      const t = order[cursor];
      const key = `${d}|${t.kind}`;
      if (used + t.minutes > budget) { if (used === 0) { /* a single long task on an otherwise empty day is fine */ } else break; }
      if ((typeCount[key] || 0) >= 3 && t.kind !== 'coding') { cursor++; continue; }
      typeCount[key] = (typeCount[key] || 0) + 1;
      out.push({ ...t, user: uid, date: d, auto: true });
      used += t.minutes; n++; cursor++;
      if (used >= budget) break;
    }
  }
  const created = out.length ? await PlanTask.insertMany(out) : [];
  return { created: created.length, from: first, to: last, hoursPerDay: settings.hoursPerDay, usedTrack: track ? track.name : null, basedOn: { csWeakLessons: w.cs.weakLessons.length, weakAreas: w.areas.length, repeatedMistakes: w.coding.repeated.length, aptitudeMistakes: w.apt.mistakeCount } };
}

// Move overdue, unfinished tasks onto upcoming study days (no penalty, no guilt).
async function reschedule(userId, today) {
  const settings = await getSettings(userId);
  const uid = new mongoose.Types.ObjectId(userId);
  const overdue = await PlanTask.find({ user: uid, done: false, date: { $lt: today } }).sort({ date: 1, createdAt: 1 });
  if (!overdue.length) return { moved: 0 };
  const budget = Math.round(settings.hoursPerDay * 60);
  const upcoming = await PlanTask.find({ user: uid, done: false, date: { $gte: today } }).select('date minutes').lean();
  const load = {}; for (const t of upcoming) load[t.date] = (load[t.date] || 0) + t.minutes;
  let moved = 0;
  for (const t of overdue) {
    let d = today, tries = 0;
    while (tries++ < 60) {
      if (settings.studyDays.includes(weekday(d)) && (load[d] || 0) + t.minutes <= budget * 1.25) break;
      d = addDays(d, 1);
    }
    if (!t.movedFrom) t.movedFrom = t.date;
    t.date = d; load[d] = (load[d] || 0) + t.minutes;
    await t.save(); moved++;
  }
  return { moved };
}

// When a revision task is finished, schedule the next spaced review (3 days, then 7 days later).
async function afterTaskDone(task, today) {
  if (task.kind !== 'revision' || !task.ref || task.step >= 2) return null;
  const gap = task.step === 0 ? 3 : 7;
  return PlanTask.create({ user: task.user, date: addDays(today, gap), title: task.title.replace(/^(Revisit|Review again): /, 'Review again: '), kind: 'revision', topic: task.topic, minutes: 15, link: task.link, ref: task.ref, step: task.step + 1, auto: true, reason: `Spaced review (${gap} days after the last one)` });
}

// ---------- reports ----------
async function report(userId, { period, today, tz = 0 }) {
  const uid = new mongoose.Types.ObjectId(userId);
  const len = period === 'month' ? 30 : 7;
  const from = addDays(today, -(len - 1)), prevFrom = addDays(from, -len), prevTo = addDays(from, -1);
  const since = new Date(`${addDays(from, -1)}T00:00:00Z`);   // one day of slack for timezones; exact filtering is done by inRange()
  const inRange = (ts) => { const d = localDay(ts, tz); return d >= from && d <= today; };
  const [prog, prevHours, tasks, solvedRows, subs, apts, mocks, ms, w, rd] = await Promise.all([
    Progress.find({ user: uid, date: { $gte: from, $lte: today } }).select('date hours category topic done').lean(),
    Progress.aggregate([{ $match: { user: uid, date: { $gte: prevFrom, $lte: prevTo } } }, { $group: { _id: null, h: { $sum: '$hours' } } }]),
    PlanTask.find({ user: uid, date: { $gte: from, $lte: today } }).select('done kind date').lean(),
    CodeProgress.find({ user: uid, status: 'solved', solvedAt: { $ne: null } }).select('solvedAt problemId').lean(),
    CodeSubmission.find({ user: uid, createdAt: { $gte: since } }).select('verdict createdAt').lean(),
    AptitudeResult.find({ user: uid, createdAt: { $gte: since } }).select('score total createdAt').lean(),
    MockSession.find({ user: uid, createdAt: { $gte: since } }).select('avgScore createdAt').lean(),
    milestones(userId, today, tz), weakAreas(userId), readiness(userId, today, tz)
  ]);
  const settings = await getSettings(userId);
  const active = await activityDays(userId, tz);
  const hours = prog.reduce((s, p) => s + p.hours, 0);
  const byCategory = {}; for (const p of prog) byCategory[p.category || 'General'] = (byCategory[p.category || 'General'] || 0) + p.hours;
  const subsIn = subs.filter((s) => inRange(s.createdAt)), aptsIn = apts.filter((a) => inRange(a.createdAt)), mocksIn = mocks.filter((m) => inRange(m.createdAt));
  const solvedIn = solvedRows.filter((s) => inRange(s.solvedAt));
  const aq = aptsIn.reduce((s, a) => s + a.total, 0), ac = aptsIn.reduce((s, a) => s + a.score, 0);
  const series = [];
  for (let d = from; d <= today; d = addDays(d, 1)) series.push({ date: d, hours: Math.round(prog.filter((p) => p.date === d).reduce((s, p) => s + p.hours, 0) * 10) / 10, tasksDone: tasks.filter((t) => t.date === d && t.done).length, submissions: subsIn.filter((s) => localDay(s.createdAt, tz) === d).length, active: active.has(d) });
  const planned = settings.studyDays.length ? Array.from({ length: len }, (_, i) => addDays(from, i)).filter((d) => settings.studyDays.includes(weekday(d))).length : 0;
  return {
    period: period === 'month' ? 'month' : 'week', from, to: today,
    studyHours: Math.round(hours * 10) / 10, previousStudyHours: Math.round((prevHours[0] ? prevHours[0].h : 0) * 10) / 10, byCategory: Object.entries(byCategory).map(([name, h]) => ({ name, hours: Math.round(h * 10) / 10 })).sort((a, b) => b.hours - a.hours),
    activeDays: series.filter((s) => s.active).length, plannedStudyDays: planned,
    tasks: { planned: tasks.length, done: tasks.filter((t) => t.done).length },
    coding: { solved: solvedIn.length, submissions: subsIn.length, accepted: subsIn.filter((s) => s.verdict === 'AC').length },
    aptitude: { tests: aptsIn.length, questions: aq, accuracy: pct(ac, aq) },
    mock: { sessions: mocksIn.length, avgScore: mocksIn.length ? Math.round(mocksIn.reduce((s, m) => s + m.avgScore, 0) / mocksIn.length) : null },
    milestonesAchieved: ms.filter((m) => m.achieved && m.date && inRange(m.date)).map((m) => m.title),
    weakAreas: w.areas.slice(0, 5), recommendations: recommendations(w).slice(0, 5),
    readiness: { score: rd.score, withData: rd.withData, total: rd.total },
    series,
    note: 'Based only on activity recorded in this app. Study you did elsewhere appears only if you logged it in Daily Progress.'
  };
}

module.exports = { addDays, weekday, dayDiff, localDay, getSettings, activityDays, fairStreak, weakAreas, recommendations, readiness, milestones, generatePlan, reschedule, afterTaskDone, report };
