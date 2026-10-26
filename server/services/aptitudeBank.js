// Extra aptitude questions + topic/difficulty labels for the original ones.
// E = Easy, M = Medium, H = Hard. Written for this app (practice material, not real company papers).
const META = {
  q1: ['Time, Speed & Distance', 'E'], q2: ['Percentages', 'M'], q3: ['Time & Work', 'E'], q4: ['Simple & Compound Interest', 'E'], q5: ['Averages', 'E'],
  q6: ['Ratio & Proportion', 'E'], q7: ['Time & Work', 'E'], q8: ['Simple & Compound Interest', 'M'], q9: ['Probability', 'M'], q10: ['Boats & Streams', 'M'],
  l1: ['Number Series', 'E'], l2: ['Number Series', 'M'], l3: ['Coding-Decoding', 'E'], l4: ['Blood Relations', 'M'], l5: ['Directions', 'E'], l6: ['Syllogisms', 'E'], l7: ['Odd One Out', 'E'],
  v1: ['Grammar', 'E'], v2: ['Vocabulary', 'E'], v3: ['Vocabulary', 'E'], v4: ['Grammar', 'E'], v5: ['Spelling', 'M']
};

const Q = (id, section, topic, level, q, options, answer, explain) => ({ id, section, topic, level, q, options, answer, explain });

const EXTRA = [
  Q('x1', 'Quantitative', 'Percentages', 'E', 'What is 35% of 240?', ['72', '84', '96', '80'], 1, '35% of 240 = 0.35 x 240 = 84.'),
  Q('x2', 'Quantitative', 'Profit & Loss', 'E', 'An article bought for Rs 400 is sold for Rs 500. What is the profit percentage?', ['20%', '25%', '30%', '15%'], 1, 'Profit = 100. Profit % = 100/400 x 100 = 25%.'),
  Q('x3', 'Quantitative', 'Profit & Loss', 'M', 'After a 10% discount on the marked price, an item sells for Rs 720. What is the marked price?', ['Rs 780', 'Rs 800', 'Rs 820', 'Rs 792'], 1, 'Selling price = 90% of marked price, so marked = 720 / 0.9 = Rs 800.'),
  Q('x4', 'Quantitative', 'Ratio & Proportion', 'E', 'Rs 1,200 is divided between A and B in the ratio 2:3. How much does A get?', ['Rs 400', 'Rs 480', 'Rs 600', 'Rs 720'], 1, 'Total parts = 5, one part = 240. A gets 2 x 240 = Rs 480.'),
  Q('x5', 'Quantitative', 'Number System', 'E', 'What is the LCM of 12 and 18?', ['24', '36', '48', '72'], 1, '12 = 2^2 x 3 and 18 = 2 x 3^2. LCM = 2^2 x 3^2 = 36.'),
  Q('x6', 'Quantitative', 'Number System', 'M', 'What is the remainder when 2^10 is divided by 7?', ['1', '2', '4', '6'], 1, '2^3 = 8 leaves remainder 1. So 2^9 = (2^3)^3 leaves 1, and 2^10 = 2^9 x 2 leaves 2.'),
  Q('x7', 'Quantitative', 'Averages', 'M', 'The average of 6 numbers is 15. When one number, 25, is removed, what is the average of the remaining 5?', ['12', '13', '14', '15'], 1, 'Total = 6 x 15 = 90. Remaining total = 90 - 25 = 65. Average = 65/5 = 13.'),
  Q('x8', 'Quantitative', 'Time, Speed & Distance', 'M', 'A car travels at 60 km/h for 2 hours and then at 40 km/h for 3 hours. What is its average speed for the whole trip?', ['48 km/h', '50 km/h', '46 km/h', '52 km/h'], 0, 'Distance = 120 + 120 = 240 km. Time = 5 h. Average speed = 240/5 = 48 km/h (not the simple average of 60 and 40).'),
  Q('x9', 'Quantitative', 'Permutation & Combination', 'E', 'In how many ways can 4 different people stand in a row?', ['12', '16', '24', '48'], 2, '4! = 4 x 3 x 2 x 1 = 24.'),
  Q('x10', 'Quantitative', 'Permutation & Combination', 'E', 'In how many ways can a team of 2 be chosen from 6 people?', ['12', '15', '30', '36'], 1, '6C2 = (6 x 5)/(2 x 1) = 15.'),
  Q('x11', 'Quantitative', 'Probability', 'E', 'A bag has 3 red and 2 blue balls. One ball is drawn at random. What is the probability it is red?', ['2/5', '3/5', '1/3', '3/10'], 1, 'Favourable = 3, total = 5, so the probability is 3/5.'),
  Q('x12', 'Quantitative', 'Algebra', 'M', 'If x + 1/x = 3, what is x^2 + 1/x^2?', ['5', '7', '9', '11'], 1, 'Square both sides: x^2 + 2 + 1/x^2 = 9, so x^2 + 1/x^2 = 7.'),
  Q('x13', 'Quantitative', 'Mensuration', 'E', 'What is the area of a circle of radius 7 cm? (use pi = 22/7)', ['144 sq cm', '154 sq cm', '164 sq cm', '44 sq cm'], 1, 'Area = pi x r^2 = 22/7 x 49 = 154 sq cm.'),
  Q('x14', 'Quantitative', 'Mensuration', 'M', 'The total surface area of a cube is 150 sq cm. What is its volume?', ['100 cu cm', '125 cu cm', '150 cu cm', '216 cu cm'], 1, '6a^2 = 150 so a^2 = 25 and a = 5. Volume = 5^3 = 125 cu cm.'),
  Q('x15', 'Quantitative', 'Time & Work', 'M', 'A can do a job in 12 days, B in 18 days and C in 36 days. Working together, how many days do they need?', ['5', '6', '8', '9'], 1, 'Per day: 1/12 + 1/18 + 1/36 = 3/36 + 2/36 + 1/36 = 6/36 = 1/6. So 6 days.'),
  Q('x16', 'Quantitative', 'Percentages', 'M', 'A town has 20,000 people. If the population grows 10% each year, what is it after 2 years?', ['24,000', '24,200', '24,400', '22,000'], 1, '20,000 x 1.1 x 1.1 = 24,200.'),
  Q('x17', 'Quantitative', 'Boats & Streams', 'H', 'A boat goes 12 km upstream in 3 hours and 12 km downstream in 1.5 hours. What is the speed of the stream?', ['1 km/h', '2 km/h', '3 km/h', '4 km/h'], 1, 'Upstream speed = 4 km/h, downstream = 8 km/h. Stream = (8 - 4)/2 = 2 km/h (boat in still water = 6 km/h).'),
  Q('x18', 'Quantitative', 'Simple & Compound Interest', 'H', 'What is the difference between compound and simple interest on Rs 5,000 at 10% per annum for 2 years?', ['Rs 25', 'Rs 50', 'Rs 75', 'Rs 100'], 1, 'SI = 1,000. CI = 5,000 x (1.21 - 1) = 1,050. Difference = Rs 50. (Shortcut: P x (r/100)^2 = 5000 x 0.01 = 50.)'),
  Q('x19', 'Quantitative', 'Time, Speed & Distance', 'H', 'A 200 m long train crosses a 300 m long platform in 25 seconds. What is its speed?', ['60 km/h', '72 km/h', '80 km/h', '90 km/h'], 1, 'Distance covered = 200 + 300 = 500 m in 25 s = 20 m/s. 20 x 18/5 = 72 km/h.'),
  Q('x20', 'Quantitative', 'Ratio & Proportion', 'H', 'The ages of A and B are in the ratio 3:4. After 6 years the ratio will be 4:5. What is A\'s present age?', ['12', '15', '18', '24'], 2, 'Let ages be 3k and 4k. (3k + 6)/(4k + 6) = 4/5, so 15k + 30 = 16k + 24, k = 6. A = 18.'),

  Q('l8', 'Logical', 'Number Series', 'E', 'Find the next number: 1, 4, 9, 16, 25, ?', ['30', '34', '36', '49'], 2, 'These are perfect squares: 1^2, 2^2, 3^2, 4^2, 5^2, so the next is 6^2 = 36.'),
  Q('l9', 'Logical', 'Number Series', 'M', 'Find the next number: 2, 3, 5, 8, 13, ?', ['18', '20', '21', '24'], 2, 'Each term is the sum of the previous two (Fibonacci-style): 8 + 13 = 21.'),
  Q('l10', 'Logical', 'Number Series', 'M', 'Find the next number: 1, 2, 6, 24, 120, ?', ['240', '600', '720', '840'], 2, 'Multipliers go x2, x3, x4, x5, so the next is x6: 120 x 6 = 720 (factorials).'),
  Q('l11', 'Logical', 'Coding-Decoding', 'E', 'If MANGO is written as NBOHP (each letter moved one step forward), how is APPLE written?', ['BQQMF', 'BPQMF', 'AQQMF', 'BQQLF'], 0, 'A->B, P->Q, P->Q, L->M, E->F, giving BQQMF.'),
  Q('l12', 'Logical', 'Blood Relations', 'E', 'A is B\'s sister. C is B\'s mother. D is C\'s father. How is A related to D?', ['Granddaughter', 'Daughter', 'Niece', 'Grandmother'], 0, 'D is the father of C, and C is the mother of A (A and B are siblings). So A is D\'s granddaughter.'),
  Q('l13', 'Logical', 'Directions', 'M', 'Rahul faces north. He turns right, then left, then left (each turn 90 degrees). Which direction does he face now?', ['North', 'South', 'East', 'West'], 3, 'North -> right -> East -> left -> North -> left -> West.'),
  Q('l14', 'Logical', 'Syllogisms', 'M', 'Statements: Some doctors are teachers. All teachers are writers. Which conclusion definitely follows?', ['Some doctors are writers', 'All doctors are writers', 'No doctor is a writer', 'All writers are doctors'], 0, 'The doctors who are teachers are also writers (all teachers are writers), so at least some doctors are writers. The others do not necessarily follow.'),
  Q('l15', 'Logical', 'Ranking', 'E', 'In a row of 40 students, Anil is 15th from the left. What is his position from the right?', ['24th', '25th', '26th', '27th'], 2, 'Position from the right = 40 - 15 + 1 = 26.'),
  Q('l16', 'Logical', 'Ranking', 'M', 'P is taller than Q, Q is taller than R, S is shorter than R, and T is taller than P. Who is the shortest?', ['P', 'Q', 'R', 'S'], 3, 'Order from tallest: T > P > Q > R > S. So S is the shortest.'),
  Q('l17', 'Logical', 'Clocks', 'E', 'What is the angle between the hour and minute hands at 3:00?', ['60 degrees', '75 degrees', '90 degrees', '120 degrees'], 2, 'At 3:00 the minute hand is on 12 and the hour hand on 3: 3 x 30 = 90 degrees.'),
  Q('l18', 'Logical', 'Calendars', 'M', 'If 5 September 2025 is a Friday, what day is 5 October 2025?', ['Saturday', 'Sunday', 'Monday', 'Friday'], 1, 'September has 30 days. 30 mod 7 = 2, so the day moves forward by 2: Friday -> Sunday.'),
  Q('l19', 'Logical', 'Analogies', 'E', 'Book : Reading :: Fork : ?', ['Drinking', 'Eating', 'Cooking', 'Writing'], 1, 'A book is used for reading; a fork is used for eating.'),
  Q('l20', 'Logical', 'Analogies', 'E', 'Doctor : Hospital :: Teacher : ?', ['School', 'Student', 'Book', 'Class'], 0, 'A doctor works in a hospital; a teacher works in a school.'),
  Q('l21', 'Logical', 'Number Series', 'H', 'Find the next number: 4, 9, 19, 39, 79, ?', ['119', '149', '159', '169'], 2, 'Each term = previous x 2 + 1: 79 x 2 + 1 = 159.'),

  Q('v6', 'Verbal', 'Grammar', 'E', 'Choose the correct sentence.', ['Each of the players have received a medal.', 'Each of the players has received a medal.', 'Each of the players are received a medal.', 'Each of the player have received a medal.'], 1, '"Each" is singular, so it takes "has".'),
  Q('v7', 'Verbal', 'Vocabulary', 'M', 'Choose the synonym of "candid".', ['Frank', 'Secretive', 'Rude', 'Hesitant'], 0, '"Candid" means honest and straightforward, the same as "frank".'),
  Q('v8', 'Verbal', 'Vocabulary', 'M', 'Choose the antonym of "benevolent".', ['Kind', 'Generous', 'Cruel', 'Gentle'], 2, '"Benevolent" means kind and well-meaning; "cruel" is the opposite.'),
  Q('v9', 'Verbal', 'Idioms', 'E', 'What does the idiom "to break the ice" mean?', ['To start a friendly conversation', 'To break something frozen', 'To stop a conversation', 'To get angry'], 0, 'It means to ease the tension and start a conversation in an awkward situation.'),
  Q('v10', 'Verbal', 'Idioms', 'E', '"Once in a blue moon" means:', ['Very rarely', 'Every month', 'At night', 'Very quickly'], 0, 'The idiom means something that happens very rarely.'),
  Q('v11', 'Verbal', 'Grammar', 'M', 'Fill in the blank: "If I ___ you, I would apologise."', ['was', 'were', 'am', 'be'], 1, 'Unreal (hypothetical) conditions use the subjunctive "were": "If I were you...".'),
  Q('v12', 'Verbal', 'Spelling', 'E', 'Which spelling is correct?', ['Recieve', 'Receive', 'Receeve', 'Receve'], 1, '"i before e, except after c": receive.'),
  Q('v13', 'Verbal', 'Sentence Completion', 'M', 'Despite the heavy rain, the match ___ as scheduled.', ['was cancelled', 'went ahead', 'got postponed', 'will stop'], 1, '"Despite" signals contrast with the rain, so the match still took place: "went ahead".'),
  Q('v14', 'Verbal', 'Grammar', 'E', 'Fill in the blank: "She is ___ honest woman."', ['a', 'an', 'the', 'no article'], 1, '"Honest" starts with a vowel sound (the h is silent), so we use "an".'),
  Q('v15', 'Verbal', 'Grammar', 'M', 'By the time we reached the cinema, the film ___.', ['started', 'has started', 'had started', 'was starting'], 2, 'The film started before we reached: use the past perfect "had started".'),
  Q('v16', 'Verbal', 'Vocabulary', 'H', 'Choose the synonym of "ephemeral".', ['Eternal', 'Short-lived', 'Fragile', 'Obvious'], 1, '"Ephemeral" means lasting a very short time.'),
  Q('v17', 'Verbal', 'Grammar', 'H', 'Choose the correct option: "Neither the manager nor the employees ___ aware of the change."', ['was', 'were', 'is', 'has been'], 1, 'With "neither...nor" the verb agrees with the nearer subject, "employees" (plural), so "were".'),
  Q('v18', 'Verbal', 'Vocabulary', 'M', 'One word for "a person who speaks many languages":', ['Linguist', 'Polyglot', 'Orator', 'Grammarian'], 1, 'A polyglot is someone who knows several languages.')
];

module.exports = { META, EXTRA };
