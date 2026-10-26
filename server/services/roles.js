// Target roles: required skills (an inner array means "any one of these"), nice-to-haves and a learning roadmap.
// Roadmap links are well-known free resources; they are suggestions, not endorsements.

const ROLES = {
  fullstack: {
    id: 'fullstack', title: 'Full Stack (MERN) Developer',
    description: 'Build complete web apps with React, Node.js, Express and MongoDB.',
    required: ['JavaScript', 'HTML', 'CSS', 'React', 'Node.js', 'Express', 'MongoDB', 'REST API', 'Git'],
    nice: ['TypeScript', 'Redux', 'JWT', 'SQL', 'DSA', 'Docker', 'AWS', 'Jest'],
    phases: [
      { title: 'Web foundations', weeks: 4, skills: ['HTML', 'CSS', 'JavaScript', 'Git'],
        topics: ['Semantic HTML, forms, accessibility basics', 'Flexbox, Grid, responsive layouts', 'Modern JavaScript: closures, promises, async/await, modules', 'DOM manipulation and fetch API', 'Git & GitHub workflow (branches, pull requests)'],
        resources: [{ name: 'MDN Learn Web Development', url: 'https://developer.mozilla.org/en-US/docs/Learn' }, { name: 'javascript.info', url: 'https://javascript.info' }] },
      { title: 'React', weeks: 3, skills: ['React'],
        topics: ['Components, props, state', 'Hooks: useState, useEffect, useRef, custom hooks', 'Routing with React Router', 'Forms, controlled inputs, data fetching', 'Context API / Redux basics'],
        resources: [{ name: 'react.dev - Learn React', url: 'https://react.dev/learn' }] },
      { title: 'Node, Express & REST', weeks: 3, skills: ['Node.js', 'Express', 'REST API', 'JWT'],
        topics: ['Node.js modules and the event loop', 'Express routing and middleware', 'REST API design and status codes', 'Authentication with JWT and bcrypt', 'Validation, error handling, environment variables'],
        resources: [{ name: 'Node.js Learn', url: 'https://nodejs.org/en/learn' }, { name: 'Express guide', url: 'https://expressjs.com/en/guide/routing.html' }] },
      { title: 'MongoDB & data modeling', weeks: 2, skills: ['MongoDB', 'SQL'],
        topics: ['CRUD, filters, projections', 'Mongoose schemas, validation, populate', 'Indexes and aggregation pipeline', 'Embedding vs referencing', 'Basic SQL joins (interviews often ask)'],
        resources: [{ name: 'MongoDB University', url: 'https://learn.mongodb.com' }, { name: 'MongoDB docs', url: 'https://www.mongodb.com/docs/' }] },
      { title: 'DSA & core CS for interviews', weeks: 5, skills: ['DSA', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks'],
        topics: ['Arrays, strings, hash maps, two pointers, sliding window', 'Recursion, trees, graphs basics, sorting/searching', 'Solve 150+ problems (easy -> medium)', 'OOP, DBMS, OS, CN revision notes', 'Time and space complexity'],
        resources: [{ name: 'NeetCode roadmap', url: 'https://neetcode.io' }, { name: 'roadmap.sh - Full Stack', url: 'https://roadmap.sh/full-stack' }] },
      { title: 'Projects, deployment & polish', weeks: 2, skills: ['Docker', 'AWS', 'TypeScript', 'Jest'],
        topics: ['Deploy 2 projects (Render / Vercel / Atlas) with live links', 'Write a README with screenshots and features', 'Optional: TypeScript, Docker, basic tests', 'Update resume and LinkedIn with project links'],
        resources: [{ name: 'roadmap.sh - Frontend', url: 'https://roadmap.sh/frontend' }] }
    ]
  },
  frontend: {
    id: 'frontend', title: 'Frontend Developer',
    description: 'Create fast, accessible and beautiful user interfaces.',
    required: ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'Responsive Design'],
    nice: ['TypeScript', 'Redux', 'Tailwind CSS', 'Next.js', 'Figma', 'Jest', 'REST API'],
    phases: [
      { title: 'HTML, CSS & responsive design', weeks: 3, skills: ['HTML', 'CSS', 'Responsive Design', 'Tailwind CSS'],
        topics: ['Semantic HTML and accessibility', 'Flexbox and Grid', 'Responsive layouts, media queries', 'CSS variables, animations'],
        resources: [{ name: 'MDN Learn Web Development', url: 'https://developer.mozilla.org/en-US/docs/Learn' }, { name: 'roadmap.sh - Frontend', url: 'https://roadmap.sh/frontend' }] },
      { title: 'JavaScript deep dive', weeks: 4, skills: ['JavaScript', 'Git'],
        topics: ['ES6+, closures, this, prototypes', 'Promises, async/await, fetch', 'DOM events and performance basics', 'Git workflow'],
        resources: [{ name: 'javascript.info', url: 'https://javascript.info' }] },
      { title: 'React & state management', weeks: 4, skills: ['React', 'Redux', 'TypeScript', 'Next.js'],
        topics: ['Hooks and component design', 'Routing, forms, data fetching', 'Redux Toolkit or Context', 'TypeScript basics, Next.js intro'],
        resources: [{ name: 'react.dev - Learn React', url: 'https://react.dev/learn' }] },
      { title: 'Portfolio & interview prep', weeks: 3, skills: ['Figma', 'Jest', 'DSA'],
        topics: ['Build 3 polished projects with live demos', 'Lighthouse performance & accessibility checks', 'Frontend interview questions (event loop, CSS, React)', 'Basic DSA practice'],
        resources: [{ name: 'NeetCode roadmap', url: 'https://neetcode.io' }] }
    ]
  },
  backend: {
    id: 'backend', title: 'Backend Developer',
    description: 'Design APIs, databases and server-side systems.',
    required: ['Node.js', 'Express', 'REST API', 'SQL', 'MongoDB', 'Git', 'Authentication'],
    nice: ['Docker', 'Redis', 'AWS', 'System Design', 'GraphQL', 'Microservices', 'Jest', 'Linux'],
    phases: [
      { title: 'Server fundamentals', weeks: 3, skills: ['Node.js', 'Express', 'REST API', 'Git'],
        topics: ['HTTP, status codes, REST principles', 'Express routing, middleware, error handling', 'Environment config, logging', 'Git workflow'],
        resources: [{ name: 'Node.js Learn', url: 'https://nodejs.org/en/learn' }, { name: 'roadmap.sh - Backend', url: 'https://roadmap.sh/backend' }] },
      { title: 'Databases', weeks: 4, skills: ['SQL', 'MongoDB', 'DBMS', 'Redis'],
        topics: ['SQL: joins, group by, indexes, transactions', 'Normalization, ACID', 'MongoDB schemas and aggregation', 'Caching with Redis'],
        resources: [{ name: 'MongoDB University', url: 'https://learn.mongodb.com' }] },
      { title: 'Security & auth', weeks: 2, skills: ['Authentication', 'JWT'],
        topics: ['Password hashing, JWT, sessions', 'OWASP top 10 basics (injection, XSS, CSRF)', 'Rate limiting, validation'],
        resources: [{ name: 'OWASP Cheat Sheets', url: 'https://cheatsheetseries.owasp.org' }] },
      { title: 'Scale, deploy & design', weeks: 4, skills: ['Docker', 'AWS', 'System Design', 'Microservices', 'Linux'],
        topics: ['Docker basics, deployment', 'Linux commands', 'Intro system design: caching, queues, load balancing', 'Design a URL shortener, rate limiter'],
        resources: [{ name: 'roadmap.sh - DevOps', url: 'https://roadmap.sh/devops' }] }
    ]
  },
  sde: {
    id: 'sde', title: 'Software Engineer (DSA-focused)',
    description: 'Crack coding rounds at service and product companies.',
    required: ['DSA', ['Java', 'Python', 'C++'], 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks', 'SQL', 'Problem Solving', 'Git'],
    nice: ['System Design', 'Linux', 'Testing', 'Agile'],
    phases: [
      { title: 'Pick a language & basics', weeks: 3, skills: ['Java', 'Python', 'C++', 'OOP', 'Git'],
        topics: ['Syntax, collections / STL / built-ins', 'OOP: encapsulation, inheritance, polymorphism, abstraction', 'Time and space complexity', 'Git basics'],
        resources: [{ name: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org' }] },
      { title: 'Core data structures & algorithms', weeks: 8, skills: ['DSA', 'Problem Solving'],
        topics: ['Arrays, strings, hashing, two pointers, sliding window', 'Linked lists, stacks, queues', 'Recursion, backtracking, binary search', 'Trees, heaps, graphs (BFS/DFS)', 'Dynamic programming basics, greedy', 'Aim: 200 problems with revision notes'],
        resources: [{ name: 'NeetCode roadmap', url: 'https://neetcode.io' }, { name: 'LeetCode', url: 'https://leetcode.com' }] },
      { title: 'CS fundamentals', weeks: 4, skills: ['DBMS', 'Operating Systems', 'Computer Networks', 'SQL'],
        topics: ['DBMS: normalization, ACID, indexing, SQL queries', 'OS: processes/threads, scheduling, deadlocks, memory', 'CN: OSI/TCP-IP, TCP vs UDP, HTTP/DNS', 'Make one-page revision sheets'],
        resources: [{ name: 'GeeksforGeeks CS subjects', url: 'https://www.geeksforgeeks.org' }] },
      { title: 'Interview readiness', weeks: 3, skills: ['System Design', 'Communication'],
        topics: ['Mock interviews with timer (use the Mock Interview page)', 'HR answers using the STAR method', 'Aptitude practice (quant, logical, verbal)', 'Intro to system design'],
        resources: [] }
    ]
  },
  data: {
    id: 'data', title: 'Data Analyst',
    description: 'Turn data into insight with SQL, Excel, Python and dashboards.',
    required: ['SQL', 'Excel', 'Python', 'Pandas', 'Statistics', 'Data Visualization'],
    nice: ['Power BI', 'Tableau', 'NumPy', 'Matplotlib', 'Machine Learning', 'Data Analysis'],
    phases: [
      { title: 'SQL & Excel', weeks: 3, skills: ['SQL', 'Excel'], topics: ['SELECT, joins, group by, window functions', 'Excel formulas, pivot tables, charts', 'Clean and reshape messy data'], resources: [{ name: 'roadmap.sh - Data Analyst', url: 'https://roadmap.sh/data-analyst' }] },
      { title: 'Python for data', weeks: 4, skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib'], topics: ['Python basics', 'Pandas: cleaning, groupby, merge', 'NumPy basics', 'Plots with Matplotlib / Seaborn'], resources: [] },
      { title: 'Statistics & visualization', weeks: 3, skills: ['Statistics', 'Data Visualization', 'Power BI', 'Tableau', 'Data Analysis'], topics: ['Descriptive stats, distributions, hypothesis testing', 'Dashboards in Power BI or Tableau', 'Tell a story with data; build 3 portfolio projects'], resources: [] }
    ]
  },
  ml: {
    id: 'ml', title: 'ML / AI Engineer',
    description: 'Build and ship machine-learning models.',
    required: ['Python', 'NumPy', 'Pandas', 'Machine Learning', 'Scikit-learn', 'Statistics'],
    nice: [['TensorFlow', 'PyTorch'], 'Deep Learning', 'NLP', 'SQL', 'Docker', 'Computer Vision'],
    phases: [
      { title: 'Python & math basics', weeks: 4, skills: ['Python', 'NumPy', 'Pandas', 'Statistics'], topics: ['Python, NumPy, Pandas', 'Probability, statistics, linear algebra basics'], resources: [{ name: 'roadmap.sh - AI & Data Scientist', url: 'https://roadmap.sh/ai-data-scientist' }] },
      { title: 'Classical ML', weeks: 4, skills: ['Machine Learning', 'Scikit-learn'], topics: ['Regression, classification, trees, ensembles', 'Evaluation: cross-validation, precision/recall', 'Feature engineering; 2 Kaggle-style projects'], resources: [{ name: 'Kaggle Learn', url: 'https://www.kaggle.com/learn' }] },
      { title: 'Deep learning & deployment', weeks: 5, skills: ['Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Docker'], topics: ['Neural networks, CNNs, transformers basics', 'One NLP or vision project', 'Serve a model behind an API; Docker basics'], resources: [] }
    ]
  },
  devops: {
    id: 'devops', title: 'DevOps / Cloud Engineer',
    description: 'Automate builds, deployments and infrastructure.',
    required: ['Linux', 'Git', 'Docker', 'CI/CD', ['AWS', 'Azure', 'GCP'], 'Kubernetes'],
    nice: ['Terraform', 'Jenkins', 'Python', 'Computer Networks'],
    phases: [
      { title: 'Linux, networking & Git', weeks: 3, skills: ['Linux', 'Git', 'Computer Networks'], topics: ['Shell commands, permissions, processes', 'Networking basics (DNS, TCP, HTTP)', 'Git branching strategies'], resources: [{ name: 'roadmap.sh - DevOps', url: 'https://roadmap.sh/devops' }] },
      { title: 'Containers & CI/CD', weeks: 4, skills: ['Docker', 'CI/CD', 'Jenkins'], topics: ['Docker images, volumes, compose', 'GitHub Actions / Jenkins pipelines', 'Build, test, deploy automation'], resources: [] },
      { title: 'Cloud & orchestration', weeks: 5, skills: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Terraform'], topics: ['One cloud: compute, storage, IAM, networking', 'Kubernetes basics', 'Infrastructure as code with Terraform'], resources: [] }
    ]
  },
  qa: {
    id: 'qa', title: 'QA / Automation Tester',
    description: 'Ensure software quality with manual and automated testing.',
    required: ['Testing', 'Selenium', ['Java', 'Python'], 'SQL', 'Postman', 'Agile'],
    nice: ['JUnit', 'CI/CD', 'Jira', 'Git'],
    phases: [
      { title: 'Testing fundamentals', weeks: 2, skills: ['Testing', 'Agile', 'Jira'], topics: ['Test cases, test plans, bug reports', 'SDLC and STLC, Agile ceremonies'], resources: [{ name: 'roadmap.sh - QA', url: 'https://roadmap.sh/qa' }] },
      { title: 'Programming & SQL', weeks: 4, skills: ['Java', 'Python', 'SQL'], topics: ['One language well (Java or Python)', 'SQL queries for data validation'], resources: [] },
      { title: 'Automation & API testing', weeks: 4, skills: ['Selenium', 'Postman', 'JUnit', 'CI/CD', 'Git'], topics: ['Selenium WebDriver framework', 'API testing with Postman', 'Run tests in a CI pipeline'], resources: [] }
    ]
  }
};

const labelOf = (item) => (Array.isArray(item) ? item.join(' / ') : item);
const hasItem = (item, set) => (Array.isArray(item) ? item.some((x) => set.has(x)) : set.has(item));

// Compare a user's skills with a role.
function evaluateRole(role, skillSet) {
  const have = [], missing = [];
  for (const item of role.required) (hasItem(item, skillSet) ? have : missing).push(labelOf(item));
  const niceHave = [], niceMissing = [];
  for (const item of role.nice) (hasItem(item, skillSet) ? niceHave : niceMissing).push(labelOf(item));
  const percent = role.required.length ? Math.round((have.length / role.required.length) * 100) : 0;
  return { have, missing, niceHave, niceMissing, percent };
}

// Personalize the roadmap: skip/shorten phases you already know and scale by weekly study hours (base = 10 h/week).
function buildRoadmap(role, skillSet, hoursPerWeek = 10) {
  const factor = 10 / Math.max(2, Math.min(60, hoursPerWeek));
  return role.phases.map((p) => {
    const known = p.skills.filter((s) => skillSet.has(s));
    const coverage = known.length / p.skills.length;
    const status = coverage >= 0.8 ? 'revise' : coverage > 0 ? 'partial' : 'learn';
    const baseWeeks = status === 'revise' ? Math.max(1, Math.ceil(p.weeks * 0.25)) : status === 'partial' ? Math.max(1, Math.ceil(p.weeks * 0.6)) : p.weeks;
    return { title: p.title, status, weeks: Math.max(1, Math.round(baseWeeks * factor)), knownSkills: known, toLearn: p.skills.filter((s) => !skillSet.has(s)), topics: p.topics, resources: p.resources };
  });
}

module.exports = { ROLES, evaluateRole, buildRoadmap };
