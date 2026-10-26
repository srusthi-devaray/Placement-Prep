// Placement knowledge base + a small BM25 search engine (the "retrieval" part of RAG).
// The chatbot retrieves the best passages from here AND from the user's own notes, then gives them to the AI as context.

const DOCS = [
  { id: 'hr-tell-me', title: 'Tell me about yourself (HR answer)', tags: ['hr', 'introduction'],
    text: 'Use the present-past-future formula in 60-90 seconds. Present: your degree, college and what you are focused on now. Past: one or two projects or internships with a measurable result. Future: the role you want and why this company. Example: "I am a final-year CSE student who enjoys building full-stack web apps. I built a MERN interview tracker used by 40 classmates and solved 200 DSA problems. I am looking for a software developer role where I can keep learning and contribute to real products." Do not recite your resume line by line, do not mention family or hobbies unless asked.' },
  { id: 'hr-star', title: 'STAR method for behavioral questions', tags: ['hr', 'behavioral', 'star'],
    text: 'STAR stands for Situation, Task, Action, Result. Situation: set the scene in one sentence. Task: what you were responsible for. Action: what YOU did, step by step - use "I", not "we". Result: the outcome with numbers if possible, plus what you learned. Use it for questions like conflict in a team, a failure, a tight deadline, leadership. Keep the answer between 90 and 150 seconds and prepare 4-5 stories (a project, a conflict, a failure, a leadership moment, a deadline) that you can adapt.' },
  { id: 'hr-strengths', title: 'Strengths and weaknesses', tags: ['hr', 'strengths', 'weakness'],
    text: 'Pick 2-3 strengths relevant to the job and back each with an example (quick learner - learned React in 3 weeks and shipped a project). For weakness, choose a real but non-critical one, explain what you are doing to improve, and show progress (I used to hesitate to ask for help; now I set a 30-minute limit before asking my team). Avoid cliches like "I am a perfectionist" and never say you have no weakness.' },
  { id: 'hr-why-company', title: 'Why do you want to join this company?', tags: ['hr', 'company'],
    text: 'Research before the interview: the products, recent news, tech stack, values and the job description. Structure: one thing you admire about the company, how your skills match the role, what you hope to learn. Example: "Your engineering blog on scaling payments interested me, and my MERN project taught me API design, so I want to grow in a team that builds reliable products." Avoid answering only with salary, brand name or location.' },
  { id: 'hr-questions-for-them', title: 'Questions to ask the interviewer', tags: ['hr', 'closing'],
    text: 'Always ask 2-3 questions. Good ones: What does a successful first 90 days look like? What technologies does the team use day to day? How do freshers get mentored? What is the biggest challenge the team faces right now? Avoid asking about salary, leave or work-from-home in the first round.' },
  { id: 'hr-salary', title: 'Salary and offer negotiation for freshers', tags: ['hr', 'salary', 'offer'],
    text: 'At campus drives the package is usually fixed per role, so negotiation is limited. For off-campus offers: research the typical range for the role and city, let the company give a number first if possible, and if asked say "I am open to a fair package based on the role and company standards." Compare the full offer: fixed vs variable pay, joining bonus conditions, bond or service agreement, notice and location. Get the offer in writing before resigning or declining others.' },
  { id: 'resume-tips', title: 'Fresher resume checklist', tags: ['resume', 'cv'],
    text: 'One page. Order: header with name, email, phone, LinkedIn, GitHub; summary (2-3 lines); education with CGPA; skills grouped by type; projects; internships; certifications; achievements. For each project write 2-3 bullets starting with an action verb and include numbers (reduced load time by 30 percent, 500+ users). Use a single-column simple template, standard fonts, no photos, tables or icons. Save as PDF named FirstName_LastName_Role.pdf. Match keywords from the job description.' },
  { id: 'resume-ats', title: 'How ATS (applicant tracking systems) read resumes', tags: ['resume', 'ats'],
    text: 'An ATS parses your resume into fields and ranks it by keyword match with the job description. Use standard headings (Education, Skills, Projects, Experience). Avoid text inside images, columns, tables and headers/footers. Spell out skills the way the job post does (JavaScript, not only JS). Do not stuff keywords - a human reads it next. Tailor the skills and project order for every application.' },
  { id: 'project-explain', title: 'How to explain your project in an interview', tags: ['project', 'interview'],
    text: 'Use this order: problem it solves, who uses it, tech stack and why you chose it, your exact role, architecture in one minute (frontend, API, database), the hardest bug or challenge and how you solved it, results or metrics, and what you would improve. Be ready for: Why MongoDB and not SQL? How does authentication work? How would you scale it? What happens if two users edit at once?' },
  { id: 'dsa-complexity', title: 'Big-O complexity cheat sheet', tags: ['dsa', 'complexity'],
    text: 'Array access O(1), search O(n), insert/delete in the middle O(n). Hash map average O(1) lookup and insert, worst case O(n). Binary search O(log n) on sorted data. Sorting: merge sort O(n log n) stable, quick sort average O(n log n) worst O(n^2), heap sort O(n log n). BFS and DFS O(V+E). Balanced BST operations O(log n). Heap insert O(log n), peek O(1). Space complexity counts extra memory, including recursion stack.' },
  { id: 'dsa-patterns', title: 'Common DSA problem patterns', tags: ['dsa', 'patterns', 'coding'],
    text: 'Learn patterns instead of memorizing problems: two pointers (sorted arrays, pairs), sliding window (subarrays/substrings), hash map for counting and lookups, binary search (including search on answer), stack (parentheses, next greater element), BFS/DFS (grids, graphs, trees), recursion plus backtracking (subsets, permutations), dynamic programming (knapsack, LIS, grid paths), greedy (intervals), heap (top-k). Practice 5-8 problems per pattern, then revise your notes weekly.' },
  { id: 'oop', title: 'OOP concepts with examples', tags: ['oop', 'cs-core'],
    text: 'Four pillars. Encapsulation: bundle data and methods and hide internals using private fields and getters/setters. Inheritance: a child class reuses a parent class (Dog extends Animal). Polymorphism: one interface, many forms - compile-time (overloading) and run-time (overriding). Abstraction: expose what an object does, hide how (abstract classes, interfaces). Also know: constructor, static, interface vs abstract class, composition over inheritance, SOLID principles.' },
  { id: 'dbms', title: 'DBMS: normalization, ACID, indexing, joins', tags: ['dbms', 'sql', 'cs-core'],
    text: 'Normalization removes redundancy: 1NF atomic values, 2NF no partial dependency on a composite key, 3NF no transitive dependency, BCNF every determinant is a candidate key. ACID: Atomicity (all or nothing), Consistency (valid state to valid state), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes). Index: a B-tree structure that speeds reads but slows writes and uses space. Joins: INNER (matching rows), LEFT (all left plus matches), RIGHT, FULL OUTER. Know primary vs foreign key, DELETE vs TRUNCATE vs DROP, WHERE vs HAVING.' },
  { id: 'sql-queries', title: 'SQL queries asked in interviews', tags: ['sql', 'dbms', 'coding'],
    text: 'Second highest salary: SELECT MAX(salary) FROM emp WHERE salary < (SELECT MAX(salary) FROM emp); or use DENSE_RANK() OVER (ORDER BY salary DESC). Duplicates: SELECT name, COUNT(*) FROM t GROUP BY name HAVING COUNT(*) > 1. Department-wise count: SELECT dept, COUNT(*) FROM emp GROUP BY dept. Employees with no orders: LEFT JOIN and WHERE orders.id IS NULL. Practice window functions (ROW_NUMBER, RANK), subqueries and self joins.' },
  { id: 'os', title: 'Operating system essentials', tags: ['os', 'cs-core'],
    text: 'Process vs thread: a process has its own memory space; threads of one process share memory and are lighter. Deadlock needs four conditions: mutual exclusion, hold and wait, no preemption, circular wait; prevent by breaking one. Scheduling: FCFS, SJF, Round Robin, Priority. Memory: paging splits memory into fixed-size pages, segmentation into logical segments, virtual memory uses disk to extend RAM, a page fault occurs when a page is not in RAM. Know semaphore vs mutex, context switch, and thrashing.' },
  { id: 'cn', title: 'Computer networks essentials', tags: ['cn', 'networks', 'cs-core'],
    text: 'OSI has 7 layers (Physical, Data link, Network, Transport, Session, Presentation, Application); TCP/IP has 4. TCP is connection-oriented, reliable and ordered (three-way handshake); UDP is connectionless and faster (streaming, DNS, gaming). HTTP is stateless; HTTPS adds TLS encryption. DNS maps names to IP addresses. Know IP vs MAC, subnetting basics, what happens when you type a URL (DNS lookup, TCP connection, TLS, HTTP request, server response, rendering).' },
  { id: 'js-core', title: 'JavaScript interview essentials', tags: ['javascript', 'web'],
    text: 'var is function-scoped and hoisted; let and const are block-scoped (temporal dead zone); const prevents reassignment, not mutation. A closure is a function that remembers variables from its outer scope. The event loop runs the call stack, then microtasks (promises), then macrotasks (setTimeout). == compares with type coercion, === does not. Know this binding, arrow functions, prototypes, promises vs async/await, map/filter/reduce, debounce vs throttle, shallow vs deep copy.' },
  { id: 'react-core', title: 'React interview essentials', tags: ['react', 'web'],
    text: 'React renders UI from state and props. Hooks: useState for local state, useEffect for side effects (the dependency array controls when it runs), useRef for mutable values and DOM access, useMemo/useCallback for memoization, useContext for shared state. Keys help React identify list items. Controlled inputs keep form values in state. Virtual DOM diffing updates only what changed. Know lifting state up, prop drilling vs context/Redux, and why not to mutate state directly.' },
  { id: 'node-express', title: 'Node.js and Express essentials', tags: ['node', 'express', 'backend'],
    text: 'Node.js runs JavaScript on the server using a single-threaded event loop with non-blocking I/O. Express is a minimal web framework: routes map URL and method to handlers; middleware are functions (req, res, next) that run in order for logging, parsing, authentication and errors. Know REST conventions (GET read, POST create, PUT/PATCH update, DELETE), status codes (200, 201, 400, 401, 403, 404, 500), JWT authentication, password hashing with bcrypt, CORS and environment variables.' },
  { id: 'mongodb', title: 'MongoDB and Mongoose essentials', tags: ['mongodb', 'database', 'backend'],
    text: 'MongoDB stores JSON-like documents in collections; no fixed schema, flexible and horizontally scalable. Mongoose adds schemas, validation and models. Use embedding for data read together and references (populate) for large or shared data. Indexes speed up queries; the aggregation pipeline ($match, $group, $sort, $lookup) does analytics. SQL vs MongoDB: SQL has fixed schema, joins and strong ACID; MongoDB has flexible documents and easy scaling, and supports multi-document transactions too.' },
  { id: 'rest-auth', title: 'Authentication vs authorization, JWT, sessions', tags: ['auth', 'jwt', 'backend', 'security'],
    text: 'Authentication verifies who you are; authorization decides what you can do. JWT: the server signs a token (header.payload.signature) after login; the client sends it in the Authorization header; the server verifies the signature - stateless but hard to revoke, so use short expiry. Sessions store state on the server with a cookie id. Hash passwords with bcrypt, never store plain text, use HTTPS, rate-limit login, and validate all input to prevent injection and XSS.' },
  { id: 'system-design', title: 'System design basics for freshers', tags: ['system-design', 'backend'],
    text: 'Clarify requirements first (users, read/write ratio, scale). Core building blocks: load balancer, stateless app servers, database (SQL vs NoSQL), cache (Redis), CDN, message queue, and database replication/sharding. URL shortener: generate a unique short id (base62 of a counter or hash), store mapping in a database, cache hot links, redirect with 301/302. Talk about trade-offs and bottlenecks instead of memorizing a single answer.' },
  { id: 'aptitude-quant', title: 'Aptitude formulas for placement tests', tags: ['aptitude', 'quant'],
    text: 'Percentage change = (new - old) / old x 100. Profit% = profit / cost price x 100. Simple interest = PRT/100; compound amount = P(1 + R/100)^T. Speed = distance/time; km/h to m/s multiply by 5/18. Average speed for equal distances = 2xy/(x+y). Work: if A takes a days and B takes b days, together ab/(a+b) days. Ratio and proportion, mixtures and alligation, permutations nPr = n!/(n-r)!, combinations nCr = n!/(r!(n-r)!), probability = favourable/total outcomes.' },
  { id: 'aptitude-logical', title: 'Logical reasoning tips', tags: ['aptitude', 'logical'],
    text: 'Number series: check differences, second differences, squares, cubes, primes and alternating patterns. Coding-decoding: map letters to positions (A=1 ... Z=26). Blood relations: draw a family tree. Directions: draw a compass sketch and use Pythagoras for the shortest distance. Syllogisms: use Venn diagrams. Seating arrangements: fix the one definite clue first. Practice 15-20 minutes daily and learn to skip time-consuming questions.' },
  { id: 'service-process', title: 'Typical hiring process: service-based companies', tags: ['company', 'service', 'placement'],
    text: 'Mass recruiters usually run: online assessment (aptitude, verbal, basic coding), technical interview (projects, one language, DBMS, OS basics, simple coding), HR interview (communication, relocation, bond, strengths). The rounds and cut-offs change every year, so confirm on the company career page or your placement cell. Prepare aptitude speed, one programming language well, basic SQL and a clear project explanation.' },
  { id: 'product-process', title: 'Typical hiring process: product-based companies', tags: ['company', 'product', 'placement'],
    text: 'Product companies usually test DSA heavily: an online coding round (2-3 problems, medium difficulty), then 2-4 interview rounds covering data structures, algorithms, problem solving, CS fundamentals, sometimes system design and a project discussion, plus a behavioral round. Practice daily on LeetCode-style problems, think aloud, state complexity, and test your code with edge cases. Rounds and difficulty vary by company and year.' },
  { id: 'group-discussion', title: 'Group discussion tips', tags: ['gd', 'communication'],
    text: 'Start with a short definition or fact, or summarize near the end. Speak in 20-30 second points, listen, build on others ("To add to Rahul\'s point..."), stay calm with aggressive speakers, and never interrupt rudely. Use structure: introduction, pros, cons, examples with data, conclusion. Evaluators look at clarity, content, teamwork and leadership, not at who talks the most.' },
  { id: 'email-etiquette', title: 'Professional email and LinkedIn outreach', tags: ['communication', 'networking'],
    text: 'Subject: clear and specific ("Application for Frontend Intern - Priya S"). Greeting with the name, 3-4 short lines: who you are, why you are writing, one proof (project link), and a polite ask. Attach resume as PDF. Follow up once after 5-7 days. On LinkedIn, personalize connection notes in under 300 characters and never ask for a job in the first message; ask for advice or a referral after a genuine conversation.' },
  { id: 'prep-plan', title: '4-week placement preparation plan', tags: ['plan', 'preparation', 'placement'],
    text: 'Week 1: fix your resume, choose one language, revise OOP and arrays/strings problems (2 per day). Week 2: hashing, two pointers, linked lists, stacks and queues; DBMS and SQL notes; start aptitude (30 min daily). Week 3: trees, recursion, binary search, graphs basics; OS and CN notes; first mock interview. Week 4: mixed timed problem sets, 3-4 mock interviews, HR answers with STAR, project explanation, company research. Track hours and a daily streak.' }
];

const STOP = new Set('a an the is are was were be been of to in on for and or with from at by as it this that these those what which who how why do does did can could should would will my your i you me we our us about into than then so if not no yes please explain tell give'.split(' '));
const tokenize = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).map((w) => w.replace(/^\.+|\.+$/g, '')).filter((w) => w && !STOP.has(w) && w.length > 1);

function bm25Search(query, docs, k = 4) {
  const qTokens = [...new Set(tokenize(query))];
  if (!qTokens.length || !docs.length) return [];
  const tokenized = docs.map((d) => tokenize(`${d.title} ${d.title} ${(d.tags || []).join(' ')} ${d.text}`));
  const N = docs.length, avgLen = tokenized.reduce((s, t) => s + t.length, 0) / N || 1;
  const df = {};
  for (const toks of tokenized) for (const t of new Set(toks)) df[t] = (df[t] || 0) + 1;
  const k1 = 1.4, b = 0.75;
  const scored = docs.map((doc, i) => {
    const toks = tokenized[i], tf = {};
    for (const t of toks) tf[t] = (tf[t] || 0) + 1;
    let score = 0;
    for (const q of qTokens) {
      if (!tf[q]) continue;
      const idf = Math.log(1 + (N - df[q] + 0.5) / (df[q] + 0.5));
      score += idf * ((tf[q] * (k1 + 1)) / (tf[q] + k1 * (1 - b + b * (toks.length / avgLen))));
    }
    return { doc, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, c) => c.score - a.score).slice(0, k).map((s) => ({ ...s.doc, score: +s.score.toFixed(2) }));
}

// extraDocs: the user's own notes -> [{ id, title, text, source: 'note' }]
function search(query, extraDocs = [], k = 4) {
  const all = [...DOCS.map((d) => ({ ...d, source: 'kb' })), ...extraDocs];
  return bm25Search(query, all, k);
}

module.exports = { DOCS, search, tokenize };
