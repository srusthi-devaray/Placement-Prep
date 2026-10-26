// Runs every reference solution through the real judge pipeline (local runner) and checks that:
//  - correct solutions are Accepted on every test, - a wrong solution is rejected, - an infinite loop times out,
//  - a syntax error is reported, - a memory hog is stopped. Run: CODE_RUNNER=local node scripts/judgeSelfTest.js
process.env.CODE_RUNNER = process.env.CODE_RUNNER || 'local';
const { judge, status } = require('../services/judge');
const data = require('../data/problems.json');
(async () => {
  console.log(status());
  let bad = 0;
  for (const p of data.problems) {
    const r = await judge(p.editorial.code, p.tests);
    if (r.verdict !== 'AC') { bad++; console.log('FAIL', p.id, r.verdict, r.results.filter((x) => x.verdict !== 'AC').slice(0, 1)); }
  }
  console.log(`reference solutions: ${data.problems.length - bad}/${data.problems.length} accepted`);
  const p = data.problems.find((x) => x.id === 'two-sum');
  const check = async (name, code, want) => { const r = await judge(code, p.tests.slice(0, 3)); const ok = r.verdict === want; if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', name, '->', r.verdict, `${r.timeMs}ms`, r.memoryKb ? r.memoryKb + 'KB' : ''); };
  await check('wrong answer', 'print("0 0")', 'WA');
  await check('infinite loop', 'while True:\n    pass', 'TLE');
  await check('syntax error', 'def x(:\n', 'CE');
  await check('runtime error', 'print(1/0)', 'RE');
  await check('memory hog', 'x = [0] * (10**9)\nprint(1)', 'MLE');
  await check('huge output is stopped (file-size limit)', 'print("a" * 10**7)', 'RE');
  process.exit(bad ? 1 : 0);
})();
