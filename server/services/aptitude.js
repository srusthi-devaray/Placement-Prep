// Aptitude question bank. `answer` is the index of the correct option. Answers are graded on the server.
const BASE = [
  // ---- Quantitative ----
  { id: 'q1', section: 'Quantitative', q: 'A train 150 m long passes a pole in 15 seconds. What is its speed in km/h?', options: ['30', '36', '40', '45'], answer: 1, explain: 'Speed = 150/15 = 10 m/s. Multiply by 18/5 to get km/h: 10 x 3.6 = 36 km/h.' },
  { id: 'q2', section: 'Quantitative', q: 'A price is increased by 20% and then decreased by 20%. What is the net change?', options: ['No change', '4% decrease', '4% increase', '2% decrease'], answer: 1, explain: '1.20 x 0.80 = 0.96, so the price is 96% of the original: a 4% decrease.' },
  { id: 'q3', section: 'Quantitative', q: 'A can finish a job in 10 days and B in 15 days. Working together, how many days will they take?', options: ['5', '6', '7.5', '8'], answer: 1, explain: 'Together: 1/10 + 1/15 = 1/6 of the work per day, so 6 days.' },
  { id: 'q4', section: 'Quantitative', q: 'What is the simple interest on Rs 5,000 at 8% per annum for 3 years?', options: ['Rs 1,000', 'Rs 1,200', 'Rs 1,500', 'Rs 1,600'], answer: 1, explain: 'SI = P x R x T / 100 = 5000 x 8 x 3 / 100 = Rs 1,200.' },
  { id: 'q5', section: 'Quantitative', q: 'What is the average of the first 10 natural numbers?', options: ['5', '5.5', '6', '10.5'], answer: 1, explain: 'Sum = 10 x 11 / 2 = 55. Average = 55 / 10 = 5.5.' },
  { id: 'q6', section: 'Quantitative', q: 'Two numbers are in the ratio 3:5 and their sum is 96. What is the larger number?', options: ['36', '48', '60', '64'], answer: 2, explain: 'Total parts = 8, one part = 12. Larger number = 5 x 12 = 60.' },
  { id: 'q7', section: 'Quantitative', q: '12 men can complete a job in 8 days. How many days will 16 men take?', options: ['5', '6', '7', '9'], answer: 1, explain: 'Total work = 12 x 8 = 96 man-days. With 16 men: 96 / 16 = 6 days.' },
  { id: 'q8', section: 'Quantitative', q: 'What is the compound interest on Rs 10,000 at 10% per annum for 2 years?', options: ['Rs 2,000', 'Rs 2,050', 'Rs 2,100', 'Rs 2,200'], answer: 2, explain: 'Amount = 10000 x 1.1 x 1.1 = 12,100. CI = 12,100 - 10,000 = Rs 2,100.' },
  { id: 'q9', section: 'Quantitative', q: 'Two fair dice are rolled. What is the probability that the sum is 7?', options: ['1/12', '1/6', '1/9', '5/36'], answer: 1, explain: 'Favourable outcomes: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6 out of 36 = 1/6.' },
  { id: 'q10', section: 'Quantitative', q: 'A boat goes 12 km/h in still water and the stream flows at 3 km/h. How long will it take to travel 45 km downstream?', options: ['3 hours', '3.75 hours', '4 hours', '5 hours'], answer: 0, explain: 'Downstream speed = 12 + 3 = 15 km/h. Time = 45 / 15 = 3 hours.' },
  // ---- Logical ----
  { id: 'l1', section: 'Logical', q: 'Find the next number: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], answer: 1, explain: 'Differences are 4, 6, 8, 10, so the next difference is 12: 30 + 12 = 42. (Also n x (n+1).)' },
  { id: 'l2', section: 'Logical', q: 'Find the next number: 3, 6, 11, 18, 27, ?', options: ['36', '38', '40', '42'], answer: 1, explain: 'Differences are 3, 5, 7, 9, so the next is 11: 27 + 11 = 38. (Also n^2 + 2.)' },
  { id: 'l3', section: 'Logical', q: 'If CAT is coded as 24 (using A=1, B=2, ... C=3, T=20 and adding), what is DOG?', options: ['24', '26', '28', '30'], answer: 1, explain: 'CAT = 3 + 1 + 20 = 24. DOG = 4 + 15 + 7 = 26.' },
  { id: 'l4', section: 'Logical', q: 'Pointing to a photograph, Ravi says, "She is the daughter of my grandfather\'s only son." How is she related to Ravi?', options: ['Cousin', 'Sister', 'Mother', 'Aunt'], answer: 1, explain: 'Ravi\'s grandfather\'s only son is Ravi\'s father. His daughter is Ravi\'s sister.' },
  { id: 'l5', section: 'Logical', q: 'A man walks 3 km north and then 4 km east. How far is he from the starting point in a straight line?', options: ['5 km', '6 km', '7 km', '4 km'], answer: 0, explain: 'By Pythagoras: sqrt(3^2 + 4^2) = sqrt(25) = 5 km.' },
  { id: 'l6', section: 'Logical', q: 'All pens are books. All books are papers. Which conclusion definitely follows?', options: ['All papers are pens', 'All pens are papers', 'Some papers are not books', 'No pen is a paper'], answer: 1, explain: 'Pens are inside books, and books are inside papers, so all pens are papers.' },
  { id: 'l7', section: 'Logical', q: 'Find the odd one out: 8, 27, 64, 100, 125', options: ['27', '64', '100', '125'], answer: 2, explain: '8, 27, 64 and 125 are perfect cubes (2^3, 3^3, 4^3, 5^3). 100 is not.' },
  // ---- Verbal ----
  { id: 'v1', section: 'Verbal', q: 'Choose the correct sentence: "Neither of the students ___ present."', options: ['were', 'was', 'are', 'have been'], answer: 1, explain: '"Neither" takes a singular verb, so "was" is correct.' },
  { id: 'v2', section: 'Verbal', q: 'Choose the synonym of "abundant".', options: ['Scarce', 'Plentiful', 'Rare', 'Tiny'], answer: 1, explain: '"Abundant" means existing in large quantities, the same as "plentiful".' },
  { id: 'v3', section: 'Verbal', q: 'Choose the antonym of "transparent".', options: ['Clear', 'Opaque', 'Thin', 'Bright'], answer: 1, explain: '"Transparent" means see-through; "opaque" means not see-through.' },
  { id: 'v4', section: 'Verbal', q: 'Fill in the blank: "She is very good ___ mathematics."', options: ['in', 'at', 'on', 'with'], answer: 1, explain: 'The correct collocation is "good at" a subject.' },
  { id: 'v5', section: 'Verbal', q: 'Which spelling is correct?', options: ['Acommodation', 'Accomodation', 'Accommodation', 'Acomodation'], answer: 2, explain: '"Accommodation" has a double c and a double m.' }
];

const { META, EXTRA } = require('./aptitudeBank');

const QUESTIONS = [...BASE.map((q) => ({ ...q, topic: META[q.id][0], level: META[q.id][1] })), ...EXTRA];
const SECTIONS = ['Quantitative', 'Logical', 'Verbal'];
const LEVELS = ['E', 'M', 'H'];
const LEVEL_NAME = { E: 'Easy', M: 'Medium', H: 'Hard' };

const shuffle = (arr) => arr.map((q) => ({ q, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.q);
const topicsOf = (section) => [...new Set(QUESTIONS.filter((q) => !section || section === 'All' || q.section === section).map((q) => q.topic))].sort();

// opts: { section, topic, level, mode: practice|progressive|mock|weak|mistakes, count, topics[] (for weak), ids[] (for mistakes) }
function pickQuestions(opts = {}) {
  const { section = 'All', topic = '', level = '', mode = 'practice' } = opts;
  const count = Math.max(1, Math.min(opts.count || 10, 30));
  let pool = QUESTIONS.filter((q) => (section === 'All' || q.section === section) && (!topic || q.topic === topic) && (!level || q.level === level));
  if (mode === 'weak' && opts.topics && opts.topics.length) pool = QUESTIONS.filter((q) => opts.topics.includes(q.topic));
  if (mode === 'mistakes') { const ids = new Set(opts.ids || []); pool = QUESTIONS.filter((q) => ids.has(q.id)); }
  if (mode === 'mock') {
    // balanced mix across the three sections with a spread of difficulty
    const per = Math.ceil(count / SECTIONS.length);
    const picked = SECTIONS.flatMap((sec) => shuffle(QUESTIONS.filter((q) => q.section === sec)).slice(0, per));
    return shuffle(picked).slice(0, count);
  }
  pool = shuffle(pool);
  if (mode === 'progressive') pool = pool.slice(0, count).sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  return pool.slice(0, count);
}

// Never send the answer to the browser before the user submits.
const publicQuestion = ({ id, section, topic, level, q, options }) => ({ id, section, topic, level, q, options });

function grade(answers) {
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const details = [];
  let score = 0;
  const seen = new Set();
  for (const a of Array.isArray(answers) ? answers : []) {
    const q = byId[a && a.id];
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    const choice = Number.isInteger(a.choice) ? a.choice : -1;
    const correct = choice === q.answer;
    if (correct) score++;
    const timeSec = Math.max(0, Math.min(600, Math.round(Number(a.timeSec) || 0)));
    details.push({ id: q.id, section: q.section, topic: q.topic, level: q.level, q: q.q, options: q.options, choice, answer: q.answer, correct, explain: q.explain, timeSec });
  }
  return { score, total: details.length, details };
}

module.exports = { QUESTIONS, SECTIONS, LEVELS, LEVEL_NAME, topicsOf, pickQuestions, publicQuestion, grade };
