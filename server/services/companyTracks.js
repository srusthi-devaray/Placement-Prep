// Company preparation tracks.
//
// HONESTY RULES for this file:
//  * Nothing here is a list of "real interview questions". Companies do not publish them and unofficial lists go stale or are wrong.
//  * Every block carries a `source` label:  official  = published by the company itself (we only link its top-level careers page)
//                                           editorial = written for this app from general knowledge of common interview topics
//                                           reported  = commonly reported by candidates (unverified, can change every year)
//  * The practice prompts are written by this app. They are practice material, not leaked or guaranteed questions.
// Always check the company's official careers page for the current process.

const SOURCE = {
  official: { label: 'Official', note: 'Published by the company.' },
  editorial: { label: 'App guidance', note: 'Written for this app from general knowledge. Not company data.' },
  reported: { label: 'Candidate-reported', note: 'Commonly reported by candidates. Unverified and may be outdated.' }
};

const AMAZON_LPS = ['Customer Obsession', 'Ownership', 'Invent and Simplify', 'Are Right, A Lot', 'Learn and Be Curious', 'Hire and Develop the Best', 'Insist on the Highest Standards', 'Think Big', 'Bias for Action', 'Frugality', 'Earn Trust', 'Dive Deep', 'Have Backbone; Disagree and Commit', 'Deliver Results', 'Strive to be Earth\'s Best Employer', 'Success and Scale Bring Broad Responsibility'];

const STAR = [
  'Tell me about a time you had a deadline you were worried about missing. What did you do?',
  'Describe a project where you had to learn something new quickly.',
  'Tell me about a disagreement in a team project and how it was resolved.',
  'Describe a bug or failure you caused or found. What did you learn?',
  'Tell me about something you built that you are proud of, and what you would change.'
];

const base = (o) => ({ disclaimer: 'This track is preparation guidance, not an official syllabus. Hiring processes change every year and differ by role and campus. Check the company\'s official careers page for the current process.', ...o });

const TRACKS = [
  base({
    id: 'amazon', name: 'Amazon', kind: 'product',
    summary: 'Product company. Usually an online assessment (coding + work-style) followed by interviews that mix coding with Leadership Principles questions.',
    official: [{ label: 'Amazon Jobs (official careers site)', url: 'https://www.amazon.jobs' }, { label: 'Leadership Principles (official)', url: 'https://www.amazon.jobs/en/principles' }],
    stages: { source: 'reported', items: ['Online assessment: coding problems, sometimes a work-style questionnaire', 'Technical interview rounds: data structures, algorithms, problem solving', 'Behavioural questions based on Leadership Principles in most rounds'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Trees', 'Graphs', 'Heaps', 'Dynamic Programming', 'Linked Lists'], note: 'Medium-level problems across these patterns are a sound base for most product-company coding rounds.' },
    cs: { source: 'editorial', topics: ['OOP and low-level design basics', 'DBMS and SQL basics', 'Operating systems: processes, threads, deadlocks', 'Basic system design ideas (for experienced roles)'] },
    aptitude: { source: 'editorial', topics: ['Number Series', 'Ranking', 'Probability'] },
    behavioral: { source: 'official', title: 'Amazon Leadership Principles (official names)', principles: AMAZON_LPS, prompts: STAR, promptSource: 'editorial', tip: 'Prepare 6-8 stories from projects, internships or college teams. Each story should be adaptable to several principles. Use the STAR format.' },
    mock: ['DSA', 'HR', 'CS Core']
  }),
  base({
    id: 'google', name: 'Google', kind: 'product',
    summary: 'Product company with a strong focus on algorithms, problem solving and clear communication.',
    official: [{ label: 'Google Careers (official)', url: 'https://www.google.com/about/careers/applications/' }],
    stages: { source: 'reported', items: ['Resume screen', 'Online or phone technical screen (coding)', 'Several coding / problem-solving interviews', 'A behavioural or "Googleyness" style conversation'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Hashing', 'Binary Search', 'Trees', 'BSTs', 'Graphs', 'Dynamic Programming', 'Backtracking', 'Heaps', 'Recursion'], note: 'Expect to explain your thinking, compare approaches and discuss complexity out loud.' },
    cs: { source: 'editorial', topics: ['Complexity analysis', 'Core data structures and when to use each', 'OS and networks fundamentals', 'Clean, testable code'] },
    aptitude: { source: 'editorial', topics: ['Probability', 'Number Series'] },
    behavioral: { source: 'editorial', title: 'Behavioural preparation', prompts: STAR, promptSource: 'editorial', tip: 'Practise showing how you handle ambiguity, learn from feedback and work with others.' },
    mock: ['DSA', 'CS Core', 'HR']
  }),
  base({
    id: 'microsoft', name: 'Microsoft', kind: 'product',
    summary: 'Product company. Typically coding rounds on data structures plus design/OOP discussion and a behavioural round.',
    official: [{ label: 'Microsoft Careers (official)', url: 'https://careers.microsoft.com' }],
    stages: { source: 'reported', items: ['Online coding assessment', 'Technical interviews: data structures and problem solving', 'Design / OOP discussion for some roles', 'Behavioural round with a hiring manager'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'BSTs', 'Stacks', 'Queues', 'Graphs', 'Dynamic Programming', 'Recursion'], note: 'Linked lists, trees and string manipulation are commonly practised for campus roles.' },
    cs: { source: 'editorial', topics: ['OOP principles and design patterns basics', 'DBMS: normalization, transactions, SQL', 'Operating systems', 'Computer networks basics'] },
    aptitude: { source: 'editorial', topics: ['Number Series', 'Probability', 'Averages'] },
    behavioral: { source: 'editorial', title: 'Behavioural preparation', prompts: STAR, promptSource: 'editorial', tip: 'Be ready to discuss one project deeply: your role, decisions, trade-offs and what you would improve.' },
    mock: ['DSA', 'CS Core', 'DBMS', 'HR']
  }),
  base({
    id: 'infosys', name: 'Infosys', kind: 'service',
    summary: 'IT services company. Campus hiring usually tests aptitude, reasoning, verbal ability and basic programming, followed by a technical and HR interview.',
    official: [{ label: 'Infosys Careers (official)', url: 'https://www.infosys.com/careers/' }],
    stages: { source: 'reported', items: ['Online test: quantitative, logical and verbal sections plus basic programming', 'Technical interview on your projects and fundamentals', 'HR interview'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Hashing', 'Recursion', 'Linked Lists'], note: 'Easy to medium problems. Accuracy and clean code matter more than exotic algorithms.' },
    cs: { source: 'editorial', topics: ['OOP concepts (very common)', 'DBMS and SQL queries', 'Basics of OS and networks', 'Your project: explain it end to end'] },
    aptitude: { source: 'editorial', topics: ['Percentages', 'Profit & Loss', 'Time & Work', 'Time, Speed & Distance', 'Number Series', 'Coding-Decoding', 'Blood Relations', 'Grammar', 'Vocabulary'], note: 'Aptitude is usually the main filter. Practise timed tests.' },
    behavioral: { source: 'editorial', title: 'HR preparation', prompts: ['Tell me about yourself.', 'Why do you want to join an IT services company?', 'Are you comfortable relocating and learning new technologies?', ...STAR.slice(0, 2)], promptSource: 'editorial', tip: 'Be clear and honest about your strengths, projects and willingness to learn.' },
    mock: ['HR', 'CS Core', 'DBMS']
  }),
  base({
    id: 'tcs', name: 'TCS', kind: 'service',
    summary: 'IT services company. Campus hiring commonly uses a national-level online test (aptitude + coding) followed by technical and HR interviews.',
    official: [{ label: 'TCS Careers (official)', url: 'https://www.tcs.com/careers' }],
    stages: { source: 'reported', items: ['Online test: numerical, verbal and reasoning ability plus programming/coding', 'Technical interview', 'Managerial and HR interviews'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Hashing', 'Recursion', 'Greedy'], note: 'Focus on solving easy to medium problems quickly and correctly in your chosen language.' },
    cs: { source: 'editorial', topics: ['Programming basics in one language', 'OOP, DBMS and SQL', 'Basics of OS and networks', 'Projects and internships'] },
    aptitude: { source: 'editorial', topics: ['Percentages', 'Ratio & Proportion', 'Averages', 'Time & Work', 'Number System', 'Number Series', 'Syllogisms', 'Grammar', 'Vocabulary'], note: 'Speed matters. Use timed mixed mock tests.' },
    behavioral: { source: 'editorial', title: 'HR preparation', prompts: ['Tell me about yourself.', 'What are your strengths and weaknesses?', 'Where do you see yourself in five years?', ...STAR.slice(0, 2)], promptSource: 'editorial', tip: 'Keep answers short, honest and structured.' },
    mock: ['HR', 'CS Core', 'DBMS']
  }),
  base({
    id: 'accenture', name: 'Accenture', kind: 'service',
    summary: 'Consulting and IT services company. Hiring often includes a cognitive and technical assessment, a coding section and an interview.',
    official: [{ label: 'Accenture Careers (official)', url: 'https://www.accenture.com/in-en/careers' }],
    stages: { source: 'reported', items: ['Online assessment: cognitive/aptitude and technical MCQs, sometimes coding', 'Communication assessment for some roles', 'Technical + HR interview'] },
    dsa: { source: 'editorial', topics: ['Arrays', 'Strings', 'Hashing', 'Sliding Window'], note: 'Easy to medium coding problems.' },
    cs: { source: 'editorial', topics: ['Cloud and DevOps basics', 'OOP and DBMS', 'Networking basics', 'Your project'] },
    aptitude: { source: 'editorial', topics: ['Percentages', 'Averages', 'Probability', 'Number Series', 'Blood Relations', 'Directions', 'Grammar', 'Sentence Completion'] },
    behavioral: { source: 'editorial', title: 'HR preparation', prompts: ['Tell me about yourself.', 'Why consulting / IT services?', ...STAR.slice(0, 3)], promptSource: 'editorial', tip: 'Communication is assessed. Practise speaking clearly and concisely.' },
    mock: ['HR', 'CS Core']
  })
];

function publicTrack(t, solvedByTopic = {}, totalByTopic = {}) {
  return {
    ...t,
    sourceKey: SOURCE,
    dsa: { ...t.dsa, items: t.dsa.topics.map((topic) => ({ topic, solved: solvedByTopic[topic] || 0, total: totalByTopic[topic] || 0 })) }
  };
}

module.exports = { TRACKS, SOURCE, publicTrack, byId: (id) => TRACKS.find((t) => t.id === id) };
