// Developer tool (needs python3). Runs each reference solution to produce the expected output for every test,
// checks the hand-written example outputs, and writes server/data/problems.json. Not used at runtime.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalize } = require('../services/judgeUtil');

const problems = [...require('../data/problems/src1'), ...require('../data/problems/src2')];
const PY = process.env.PYTHON_BIN || 'python3';

const TOPICS = ['Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Linked Lists', 'Stacks', 'Queues', 'Binary Search', 'Recursion', 'Trees', 'BSTs', 'Heaps', 'Graphs', 'Greedy', 'Backtracking', 'Dynamic Programming'];
const COLLECTIONS = [
  { id: 'placement-essentials', title: 'Placement Essentials', description: 'The classic questions that show up again and again in campus online tests and interviews.' },
  { id: 'service-company', title: 'Service-Company Online Tests', description: 'Easier problems in the style of mass-recruiter coding rounds (TCS / Infosys / Wipro / Cognizant style).' },
  { id: 'product-company', title: 'Product-Company Starters', description: 'Medium and hard problems that product-company interviews are known to draw from.' },
  { id: 'top-revision', title: 'Last-Week Revision', description: 'A short list of high-value patterns to revise right before your interviews.' }
];

const run = (code, input) => {
  const r = spawnSync(PY, ['-I', '-c', code], { input, encoding: 'utf8', timeout: 20000 });
  if (r.status !== 0) throw new Error(`reference solution failed for input ${JSON.stringify(input.slice(0, 80))}: ${r.stderr || r.error}`);
  return r.stdout;
};

const ids = new Set();
const out = [];
let fail = 0, tests = 0;
for (const p of problems) {
  if (ids.has(p.id)) throw new Error('duplicate id ' + p.id);
  ids.add(p.id);
  if (!TOPICS.includes(p.topic)) throw new Error('bad topic ' + p.topic);
  const examples = [];
  const all = [];
  for (const [input, expected, explain] of p.ex) {
    const got = normalize(run(p.code, input + '\n'));
    if (got !== normalize(expected)) { console.error(`MISMATCH ${p.id}: example input ${JSON.stringify(input)} expected ${JSON.stringify(expected)} got ${JSON.stringify(got)}`); fail++; }
    examples.push({ input, output: expected, explain: explain || '' });
    all.push({ input, output: normalize(expected), visible: true });
  }
  for (const input of p.hidden) all.push({ input, output: normalize(run(p.code, input + '\n')), visible: false });
  tests += all.length;
  out.push({
    id: p.id, title: p.title, topic: p.topic, level: p.level, collections: p.collections,
    description: p.desc, inputFormat: p.input, outputFormat: p.output, constraints: p.constraints,
    examples, tests: all, starter: p.starter, hints: p.hints,
    editorial: { approach: p.edit, time: p.time, space: p.space, code: p.code },
    source: 'Original statement written for PlacePrep. The underlying technique is a widely known classic.'
  });
}
if (fail) { console.error(`${fail} example mismatch(es). Not writing output.`); process.exit(1); }
fs.writeFileSync(path.join(__dirname, '../data/problems.json'), JSON.stringify({ topics: TOPICS, collections: COLLECTIONS, problems: out }));
console.log(`OK: ${out.length} problems, ${tests} tests`);
