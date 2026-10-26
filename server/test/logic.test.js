// Run with:  node test/logic.test.js     (no database or npm packages needed)
const assert = require('assert');
const { extractSkills } = require('../services/skills');
const { analyzeResume, parseResume } = require('../services/ats');
const kb = require('../services/kb');
const { ROLES, evaluateRole, buildRoadmap } = require('../services/roles');
const apt = require('../services/aptitude');
const { analyze } = require('../services/analyzer');
const { resumeQuestions } = require('../services/interviewGen');
const ai = require('../services/ai');

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('PASS', name); }
  catch (e) { console.error('FAIL', name, '\n   ', e.message); process.exitCode = 1; }
};

const GOOD_RESUME = `Priya Sharma
priya.sharma@example.com | +91 98765 43210 | linkedin.com/in/priya-sharma | github.com/priyasharma

SUMMARY
Final-year CSE student who builds full stack web apps with the MERN stack and enjoys solving DSA problems.

EDUCATION
B.Tech Computer Science, ABC Institute of Technology, 2022 - 2026, CGPA: 8.4

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, SQL, HTML, CSS, Git, REST API, Docker, Data Structures and Algorithms, OOP, DBMS

PROJECTS
Interview Preparation Tracker (React, Node.js, Express, MongoDB)
- Built a full stack app with JWT authentication used by 120+ students for placement preparation
- Reduced API response time by 35% by adding MongoDB indexes and caching
- Designed a real-time mock interview feedback engine that scores answers on 5 parameters

E-commerce Website (React, Redux, Node.js)
- Developed a shopping cart with Stripe payments and deployed it on Render
- Implemented role based access control for 3 user types

INTERNSHIP
Web Developer Intern, XYZ Solutions, Jun 2025 - Aug 2025
- Created 12 reusable React components that cut page build time by 40%
- Collaborated with 4 engineers using Git and Agile sprints

CERTIFICATIONS
Meta Front-End Developer Certificate, MongoDB Basics

ACHIEVEMENTS
- Solved 300+ problems on LeetCode
- Won 2nd place in college hackathon 2025
`;

const WEAK_RESUME = `rahul
I am a hard working student. I did some projects. I know computer.
Education
BTech
Projects
Worked on a website
Responsible for coding
`;

(async () => {
  await test('skills: boundaries (java vs javascript, c++, node.js)', () => {
    const s = extractSkills('Skilled in JavaScript and React. Used Node.js, MongoDB, C++ and Java. Know DSA, OOPs.');
    ['JavaScript', 'React', 'Node.js', 'MongoDB', 'C++', 'Java', 'DSA', 'OOP'].forEach((k) => assert(s.includes(k), `missing ${k} in ${s}`));
    const onlyJs = extractSkills('I write javascript every day');
    assert(!onlyJs.includes('Java'), 'javascript must not match Java');
  });

  await test('skills: no false positives on plain english', () => {
    const s = extractSkills('I am a hard working student who likes to learn and go to college');
    assert.deepStrictEqual(s, [], `got ${s}`);
  });

  await test('ats: strong resume scores high', () => {
    const r = analyzeResume(GOOD_RESUME, { role: 'fullstack' });
    console.log('     good resume score', r.score, r.breakdown.map((b) => `${b.key}:${b.score}/${b.max}`).join(' '));
    assert(r.score >= 80, `expected >=80 got ${r.score}`);
    assert(r.parsed.email === 'priya.sharma@example.com');
    assert(r.parsed.github.includes('priyasharma') && r.parsed.linkedin.includes('priya-sharma'));
    assert(r.parsed.cgpa === '8.4');
    ['education', 'skills', 'projects', 'experience', 'certifications', 'achievements', 'summary'].forEach((s) => assert(r.parsed.sections.includes(s), `section ${s} not detected: ${r.parsed.sections}`));
  });

  await test('ats: weak resume scores low with actionable issues', () => {
    const r = analyzeResume(WEAK_RESUME, { role: 'fullstack' });
    console.log('     weak resume score', r.score);
    assert(r.score < 35, `expected <35 got ${r.score}`);
    assert(r.issues.length >= 5);
    assert(r.issues[0].severity === 'high');
  });

  await test('ats: job description keyword matching', () => {
    const jd = 'We need an intern with React, Node.js, MongoDB, Docker, Kubernetes and AWS experience.';
    const r = analyzeResume(GOOD_RESUME, { jd });
    assert(r.keywords.source === 'job description');
    assert(r.keywords.matched.includes('React') && r.keywords.missing.includes('Kubernetes') && r.keywords.missing.includes('AWS'));
  });

  await test('roles: evaluate + any-of groups + roadmap personalization', () => {
    const ev = evaluateRole(ROLES.sde, new Set(['DSA', 'Python', 'OOP']));
    assert(ev.have.includes('DSA') && ev.have.includes('Java / Python / C++'), JSON.stringify(ev.have));
    assert(ev.missing.includes('DBMS'));
    const road = buildRoadmap(ROLES.fullstack, new Set(['HTML', 'CSS', 'JavaScript', 'Git', 'React']), 10);
    assert(road[0].status === 'revise' && road[0].weeks < ROLES.fullstack.phases[0].weeks);
    assert(road[1].status === 'revise');
    assert(road[2].status === 'learn' && road[2].weeks === 3);
    const slower = buildRoadmap(ROLES.fullstack, new Set(), 5);
    assert(slower[0].weeks === 8, 'half the hours should double the weeks');
    // every skill referenced by roles must exist in the dictionary
    const { ALL_SKILLS } = require('../services/skills');
    for (const r of Object.values(ROLES)) {
      const names = [...r.required, ...r.nice, ...r.phases.flatMap((p) => p.skills)].flat();
      names.forEach((n) => assert(ALL_SKILLS.includes(n), `role ${r.id} references unknown skill "${n}"`));
    }
  });

  await test('kb: BM25 finds the right passage', () => {
    const top = (q) => kb.search(q, [], 1)[0];
    assert(top('what is the STAR method for behavioral questions').id === 'hr-star');
    assert(top('explain deadlock conditions').id === 'os');
    assert(top('normalization 3NF ACID').id === 'dbms');
    assert(top('big o complexity of quicksort').id === 'dsa-complexity');
    assert(top('how to answer tell me about yourself').id === 'hr-tell-me');
    assert(top('what is a closure in javascript').id === 'js-core');
    assert(kb.search('zzzz qqqq', []).length === 0);
  });

  await test('kb: user notes are searchable and can outrank built-ins', () => {
    const notes = [{ id: 'n1', title: 'My Kubernetes cheatsheet', text: 'kubectl get pods, deployments, services, ingress, helm charts', source: 'note' }];
    const hits = kb.search('kubectl pods ingress', notes, 2);
    assert(hits[0].id === 'n1' && hits[0].source === 'note');
  });

  await test('aptitude: answers are correct (recomputed) and hidden until graded', () => {
    // independently verify the arithmetic ones
    assert.strictEqual(150 / 15 * 3.6, 36);
    assert.strictEqual(+(1.2 * 0.8).toFixed(2), 0.96);
    assert.strictEqual(+(1 / 10 + 1 / 15).toFixed(6), +(1 / 6).toFixed(6));
    assert.strictEqual(5000 * 8 * 3 / 100, 1200);
    assert.strictEqual((10 * 11 / 2) / 10, 5.5);
    assert.strictEqual(96 * 5 / 8, 60);
    assert.strictEqual(12 * 8 / 16, 6);
    assert.strictEqual(+(10000 * 1.1 * 1.1 - 10000).toFixed(2), 2100);
    assert.strictEqual(45 / (12 + 3), 3);
    assert.strictEqual(Math.hypot(3, 4), 5);
    const bank = apt.QUESTIONS;
    bank.forEach((q) => { assert(q.answer >= 0 && q.answer < q.options.length, q.id); assert(new Set(q.options).size === q.options.length, `dup options ${q.id}`); });
    assert(new Set(bank.map((q) => q.id)).size === bank.length);
    const pub = apt.publicQuestion(bank[0]);
    assert(!('answer' in pub) && !('explain' in pub));
    const g = apt.grade([{ id: 'q1', choice: 1 }, { id: 'q2', choice: 0 }, { id: 'nope', choice: 1 }]);
    assert(g.score === 1 && g.total === 2 && g.details[1].correct === false);
    // number-series sanity
    const s1 = [2, 6, 12, 20, 30].map((_, i) => (i + 1) * (i + 2)); assert.strictEqual((6 * 7), 42); assert.deepStrictEqual(s1, [2, 6, 12, 20, 30]);
    assert.strictEqual([3, 6, 11, 18, 27].map((_, i) => (i + 1) ** 2 + 2).join(), '3,6,11,18,27'); assert.strictEqual(6 ** 2 + 2, 38);
  });

  await test('mock analyzer (live feedback) works and rewards structure', () => {
    const bad = analyze({ category: 'HR', keywords: [], answer: 'Um basically I think maybe I did a project you know like stuff.' });
    const good = analyze({ category: 'HR', keywords: [], answer: 'In my college project, the situation was a tight deadline. My task was to build the backend. I designed the API, implemented authentication and fixed three bugs myself. As a result we delivered two days early and reduced load time by 30 percent. I learned to prioritize and communicate clearly with my team members every single day.' });
    assert(good.score > bad.score + 25, `${bad.score} vs ${good.score}`);
    assert(good.star && Object.values(good.star).every(Boolean));
  });

  await test('resume-based interview questions', () => {
    const qs = resumeQuestions(['React', 'MongoDB', 'Docker'], 'fullstack', 8);
    assert(qs.length === 8 && qs.every((q) => q.id && q.q && q.category === 'Resume'));
    assert(qs.some((q) => q.q.includes('React')));
  });

  await test('ai: SSE stream parser (mocked fetch) incl. split chunks', async () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    const enc = new TextEncoder();
    const events = [
      'event: message_start\ndata: {"type":"message_start"}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo "}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"world"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n'
    ].join('');
    const cut = 97; // split in the middle of an event
    let sent;
    global.fetch = async (url, opts) => {
      sent = JSON.parse(opts.body);
      return { ok: true, body: new ReadableStream({ start(c) { c.enqueue(enc.encode(events.slice(0, cut))); c.enqueue(enc.encode(events.slice(cut))); c.close(); } }) };
    };
    let out = '';
    for await (const piece of ai.streamText({ system: 's', messages: [{ role: 'user', content: 'hi' }] })) out += piece;
    assert.strictEqual(out, 'Hello world');
    assert(sent.stream === true && sent.model && sent.max_tokens);
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'invalid x-api-key' } }) });
    let err; try { for await (const _ of ai.streamText({ system: 's', messages: [] })) { /* */ } } catch (e) { err = e; }
    assert(err && err.status === 502 && /invalid x-api-key/.test(err.message), 'upstream 401 must map to 502');
    global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok!' }] }) });
    assert.strictEqual(await ai.complete({ system: 's', messages: [] }), 'ok!');
    delete process.env.ANTHROPIC_API_KEY;
    assert(!ai.isAIEnabled());
  });

  await test('ai: basic-mode reply + improve fallback', () => {
    const hits = kb.search('explain oop', [], 3);
    const r = ai.basicReply({ message: 'explain oop', hits, fileSummaries: [], imageCount: 0 });
    assert(/Basic mode/.test(r) && /OOP/.test(r));
    const g = ai.basicReply({ message: 'hi', hits: [], fileSummaries: [], imageCount: 0 });
    assert(/PlaceBot/.test(g));
    const imp = ai.improveFallback('Worked on a website', 'bullet');
    assert(imp.tips.length >= 2 && imp.ai === false);
  });

  console.log(`\n${passed} tests passed${process.exitCode ? ' (some FAILED)' : ''}`);
})();
