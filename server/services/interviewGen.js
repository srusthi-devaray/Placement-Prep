// Builds interview questions from the user's own resume skills (works without AI).
const { ROLES } = require('./roles');

function resumeQuestions(skills, roleId, count = 8) {
  const role = ROLES[roleId] || ROLES.fullstack;
  const flat = (arr) => arr.flatMap((x) => (Array.isArray(x) ? x : [x]));
  const pool = [...new Set([...(skills || []), ...flat(role.required)])].filter((s) => !['Communication', 'Teamwork', 'Leadership', 'Git'].includes(s));
  const mine = (skills || []).filter((s) => pool.includes(s));
  const ordered = [...mine, ...pool.filter((s) => !mine.includes(s))].slice(0, 6);

  const qs = [
    { q: 'Walk me through your most challenging project: the problem, your role, the tech stack and the result.', category: 'Resume', keywords: ['problem', 'role', 'stack', 'result', 'challenge', 'team'] },
    { q: 'If you had one more month on your best project, what would you improve and why?', category: 'Resume', keywords: ['improve', 'scale', 'testing', 'users', 'performance', 'feature'] }
  ];
  for (const s of ordered) {
    qs.push({ q: `You listed ${s} on your resume. Explain the core concepts and describe where you actually used it.`, category: 'Resume', keywords: [s.toLowerCase(), 'project', 'example', 'used'] });
  }
  if (ordered.length >= 2) {
    qs.push({ q: `Why did you choose ${ordered[0]} together with ${ordered[1]} instead of alternatives?`, category: 'Resume', keywords: [ordered[0].toLowerCase(), ordered[1].toLowerCase(), 'because', 'trade-off', 'alternative'] });
  }
  return qs.slice(0, count).map((q, i) => ({ id: `r${i + 1}`, ...q }));
}

// Questions built from the student's OWN saved projects (My Projects). Rule-based templates, no AI needed.
function projectQuestions(projects, count = 8) {
  const out = [];
  const list = (projects || []).slice(0, 6);
  for (const p of list) {
    const stack = (p.techStack || []).filter(Boolean);
    const kw = [...stack.map((s) => s.toLowerCase()), 'problem', 'because', 'result'];
    out.push({ q: `Walk me through "${p.title}": what problem does it solve, what was your role, and how does it work end to end?`, category: 'Projects', keywords: ['problem', 'role', 'users', 'architecture', ...kw.slice(0, 3)], project: p.title });
    if (stack[0]) out.push({ q: `In "${p.title}" you used ${stack[0]}${stack[1] ? ` and ${stack[1]}` : ''}. Why those choices, and what would you pick differently today?`, category: 'Projects', keywords: [...stack.slice(0, 2).map((s) => s.toLowerCase()), 'because', 'trade-off', 'alternative'], project: p.title });
    out.push({ q: `What was the hardest bug or technical problem in "${p.title}", and how did you find and fix it?`, category: 'Projects', keywords: ['bug', 'debug', 'cause', 'fix', 'learned', 'tested'], project: p.title });
    out.push({ q: `How would "${p.title}" behave with 100 times more users or data? What would you change first?`, category: 'Projects', keywords: ['scale', 'database', 'cache', 'index', 'bottleneck', 'load'], project: p.title });
    if (p.liveUrl || p.githubUrl) out.push({ q: `How did you test and deploy "${p.title}"? What happens if something fails in production?`, category: 'Projects', keywords: ['test', 'deploy', 'error', 'logs', 'monitor', 'environment'], project: p.title });
  }
  // Mix projects instead of asking everything about the first one.
  const byProject = {};
  out.forEach((q) => { (byProject[q.project] = byProject[q.project] || []).push(q); });
  const mixed = [];
  for (let i = 0; mixed.length < out.length; i++) for (const k of Object.keys(byProject)) if (byProject[k][i]) mixed.push(byProject[k][i]);
  return mixed.slice(0, count).map((q, i) => ({ id: `p${i + 1}`, ...q }));
}

module.exports = { resumeQuestions, projectQuestions };
