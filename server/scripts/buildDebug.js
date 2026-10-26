// Builds data/debug.json: "find and fix the bug" exercises.
// Every exercise is derived from the verified editorial solution of a real problem by injecting ONE bug, and is then checked
// by actually running both versions: the broken code must FAIL at least one test and the original must pass ALL tests.
// Run: CODE_RUNNER=local node scripts/buildDebug.js   (needs python3; development machine only)
process.env.CODE_RUNNER = process.env.CODE_RUNNER || 'local';
const fs = require('fs');
const path = require('path');
const problems = require('../services/problems');
const judge = require('../services/judge');

const BUGS = [
  { problemId: 'max-subarray', bugType: 'Logic', from: 'cur = max(x, cur + x)', to: 'cur = cur + x', symptom: 'Works on positive numbers but gives a wrong answer when the array has large negative values.', hint: 'When should the running sum be thrown away and restarted?' },
  { problemId: 'valid-palindrome', bugType: 'Logic', from: ' if c.isalnum()]', to: ']', symptom: 'Plain words work, but sentences with spaces or punctuation are rejected.', hint: 'What should happen to characters that are not letters or digits?' },
  { problemId: 'two-sum', bugType: 'Output', from: 'return (seen[target - x], j)', to: 'return (j, seen[target - x])', symptom: 'The right two positions are found, but they are printed in the wrong order.', hint: 'Which index was stored earlier, the one in `seen` or `j`?' },
  { problemId: 'first-unique-char', bugType: 'Logic', from: 'if c[ch] == 1:', to: 'if c[ch] > 1:', symptom: 'It returns the first character that REPEATS, not the first one that is unique.', hint: 'Read the condition out loud. What does it select?' },
  { problemId: 'pair-sum-sorted', bugType: 'Off-by-one', from: 'while l < r:', to: 'while l <= r:', symptom: 'Sometimes says "true" when the only way to reach the target is to use the same element twice.', hint: 'Can the left and right pointers be on the same element?' },
  { problemId: 'max-sum-k', bugType: 'Off-by-one', from: 'for i in range(k, len(a)):', to: 'for i in range(k + 1, len(a)):', symptom: 'The answer is wrong when the best window is the one that starts at index 1.', hint: 'Which window does the loop skip?' },
  { problemId: 'valid-parentheses', bugType: 'Edge case', from: 'return not st', to: 'return True', symptom: 'Inputs such as "((" are accepted as valid.', hint: 'What should be true about the stack when the whole string has been read?' },
  { problemId: 'binary-search', bugType: 'Infinite loop', from: 'lo = mid + 1', to: 'lo = mid', symptom: 'On some inputs the program never finishes (Time Limit Exceeded).', hint: 'Does the search range always shrink after each step?' },
  { problemId: 'assign-cookies', bugType: 'Logic', from: '    g.sort()\n', to: '', symptom: 'Works when the greed factors are already sorted, fails otherwise.', hint: 'The greedy idea needs both lists in a particular order.' },
  { problemId: 'rotate-array', bugType: 'Edge case', from: '    k %= n\n', to: '', symptom: 'Fails when k is larger than the array length.', hint: 'Rotating by n positions gives the same array. How do you use that?' },
  { problemId: 'longest-unique-substring', bugType: 'Logic', from: 'if ch in last and last[ch] >= left:', to: 'if ch in last:', symptom: 'Fails on strings like "abba", where a character was seen earlier but is no longer inside the window.', hint: 'A previous position only matters if it is inside the current window.' }
];

async function run() {
  const st = judge.status();
  if (!st.enabled) { console.error('Code runner not available:', st.note); process.exit(1); }
  const out = [];
  for (const b of BUGS) {
    const p = problems.get(b.problemId);
    const good = p.editorial.code;
    if (!good.includes(b.from)) { console.error('SKIP (pattern not found):', b.problemId); continue; }
    const broken = good.replace(b.from, b.to);
    const tests = p.tests.map((t) => ({ input: t.input + '\n', output: t.output, visible: t.visible }));
    const g = await judge.judge(good, tests), r = await judge.judge(broken, tests);
    const ok = g.verdict === 'AC' && r.verdict !== 'AC';
    console.log(`${ok ? 'OK  ' : 'DROP'} ${b.problemId}: original=${g.verdict} broken=${r.verdict} (${r.passed}/${r.total})`);
    if (ok) out.push({ id: `dbg-${b.problemId}`, problemId: b.problemId, title: `Fix the bug: ${p.title}`, bugType: b.bugType, level: p.level, topic: p.topic, symptom: b.symptom, hint: b.hint, brokenCode: broken });
  }
  fs.writeFileSync(path.join(__dirname, '../data/debug.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), exercises: out }, null, 1));
  console.log(`Wrote ${out.length} exercises.`);
}
run().catch((e) => { console.error(e); process.exit(1); });
