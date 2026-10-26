// Question bank for mock interviews.
// `keywords` are concepts a strong answer usually mentions (used by the live analyzer).
module.exports = [
  // ---------- HR / Behavioral ----------
  { id: 1, category: 'HR', q: 'Tell me about yourself.', keywords: ['experience', 'project', 'skills', 'college', 'passion', 'goal'] },
  { id: 2, category: 'HR', q: 'What are your greatest strengths and weaknesses?', keywords: ['strength', 'weakness', 'improve', 'learn', 'example'] },
  { id: 3, category: 'HR', q: 'Why do you want to work for our company?', keywords: ['company', 'product', 'culture', 'growth', 'values', 'contribute'] },
  { id: 4, category: 'HR', q: 'Where do you see yourself in five years?', keywords: ['grow', 'skills', 'lead', 'contribute', 'learn'] },
  { id: 5, category: 'HR', q: 'Describe a time you faced a conflict in a team and how you resolved it.', keywords: ['team', 'conflict', 'listen', 'resolve', 'outcome', 'communication'] },
  { id: 6, category: 'HR', q: 'Tell me about a time you failed. What did you learn?', keywords: ['failed', 'mistake', 'learned', 'improve', 'next time'] },
  { id: 7, category: 'HR', q: 'Describe a challenging project you worked on and your specific role in it.', keywords: ['project', 'challenge', 'role', 'solution', 'result', 'team'] },
  { id: 8, category: 'HR', q: 'How do you handle tight deadlines and pressure?', keywords: ['prioritize', 'plan', 'time', 'communicate', 'deadline', 'focus'] },
  { id: 9, category: 'HR', q: 'Why should we hire you?', keywords: ['skills', 'value', 'fit', 'contribute', 'quick learner', 'project'] },
  { id: 10, category: 'HR', q: 'Do you have any questions for us?', keywords: ['team', 'culture', 'growth', 'tech stack', 'mentorship'] },

  // ---------- Web / JavaScript ----------
  { id: 11, category: 'Web', q: 'Explain the difference between var, let and const in JavaScript.', keywords: ['scope', 'hoisting', 'block', 'function', 'reassign', 'temporal dead zone'] },
  { id: 12, category: 'Web', q: 'What is a closure in JavaScript? Give a use case.', keywords: ['function', 'scope', 'lexical', 'private', 'variable', 'outer'] },
  { id: 13, category: 'Web', q: 'Explain how the event loop works in JavaScript.', keywords: ['call stack', 'callback', 'queue', 'microtask', 'async', 'single-threaded'] },
  { id: 14, category: 'Web', q: 'What is the difference between REST and GraphQL?', keywords: ['endpoint', 'over-fetching', 'query', 'schema', 'http', 'flexible'] },
  { id: 15, category: 'Web', q: 'What happens when you type a URL in the browser and press enter?', keywords: ['dns', 'tcp', 'http', 'server', 'render', 'request', 'response'] },
  { id: 16, category: 'Web', q: 'Explain the CSS box model and the difference between flexbox and grid.', keywords: ['margin', 'padding', 'border', 'content', 'one-dimensional', 'two-dimensional'] },
  { id: 17, category: 'Web', q: 'How does authentication with JWT work?', keywords: ['token', 'signature', 'header', 'payload', 'stateless', 'expire', 'secret'] },

  // ---------- DBMS ----------
  { id: 18, category: 'DBMS', q: 'What is normalization? Explain 1NF, 2NF and 3NF.', keywords: ['redundancy', 'atomic', 'dependency', 'primary key', 'anomaly', 'transitive'] },
  { id: 19, category: 'DBMS', q: 'Explain ACID properties in databases.', keywords: ['atomicity', 'consistency', 'isolation', 'durability', 'transaction'] },
  { id: 20, category: 'DBMS', q: 'What is the difference between SQL and NoSQL databases?', keywords: ['schema', 'scale', 'relational', 'document', 'join', 'flexible'] },
  { id: 21, category: 'DBMS', q: 'What are indexes and when should you avoid them?', keywords: ['b-tree', 'query', 'speed', 'write', 'storage', 'lookup'] },
  { id: 22, category: 'DBMS', q: 'Explain the different types of SQL joins.', keywords: ['inner', 'left', 'right', 'full', 'outer', 'matching'] },

  // ---------- OS / Networks ----------
  { id: 23, category: 'CS Core', q: 'What is the difference between a process and a thread?', keywords: ['memory', 'share', 'context switch', 'lightweight', 'address space'] },
  { id: 24, category: 'CS Core', q: 'What is a deadlock and how can it be prevented?', keywords: ['mutual exclusion', 'hold and wait', 'circular wait', 'no preemption', 'resource'] },
  { id: 25, category: 'CS Core', q: 'Explain the difference between TCP and UDP.', keywords: ['reliable', 'connection', 'handshake', 'order', 'speed', 'streaming'] },
  { id: 26, category: 'CS Core', q: 'What is virtual memory and paging?', keywords: ['page', 'frame', 'disk', 'ram', 'page fault', 'address'] },
  { id: 27, category: 'CS Core', q: 'Explain the four pillars of Object-Oriented Programming.', keywords: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'class', 'object'] },

  // ---------- DSA ----------
  { id: 28, category: 'DSA', q: 'Explain the difference between an array and a linked list.', keywords: ['contiguous', 'pointer', 'index', 'insertion', 'o(1)', 'o(n)', 'memory'] },
  { id: 29, category: 'DSA', q: 'How does a hash map work internally?', keywords: ['hash function', 'bucket', 'collision', 'chaining', 'o(1)', 'resize'] },
  { id: 30, category: 'DSA', q: 'Compare quicksort and mergesort.', keywords: ['pivot', 'divide', 'o(n log n)', 'stable', 'in-place', 'worst case'] },
  { id: 31, category: 'DSA', q: 'What is the difference between a stack and a queue? Where is each used?', keywords: ['lifo', 'fifo', 'push', 'pop', 'enqueue', 'dequeue', 'undo', 'bfs'] },
  { id: 32, category: 'DSA', q: 'Explain BFS vs DFS and when you would use each.', keywords: ['queue', 'stack', 'level', 'shortest path', 'recursion', 'graph', 'visited'] },
  { id: 33, category: 'DSA', q: 'What is dynamic programming? Explain with an example.', keywords: ['overlapping', 'subproblem', 'memoization', 'optimal', 'table', 'fibonacci'] },
  { id: 34, category: 'DSA', q: 'Explain time and space complexity with Big-O notation.', keywords: ['worst case', 'growth', 'input', 'o(n)', 'o(1)', 'scale'] },

  // ---------- Backend ----------
  { id: 35, category: 'Backend', q: 'What is middleware in Express / Node.js?', keywords: ['request', 'response', 'next', 'function', 'authentication', 'logging', 'pipeline'] },
  { id: 36, category: 'Backend', q: 'Explain the difference between authentication and authorization.', keywords: ['identity', 'permission', 'role', 'login', 'access', 'verify'] },
  { id: 37, category: 'Backend', q: 'How would you design a URL shortener?', keywords: ['hash', 'database', 'redirect', 'collision', 'cache', 'scale', 'id'] },
  { id: 38, category: 'Backend', q: 'What is caching and where would you use it?', keywords: ['redis', 'latency', 'ttl', 'invalidate', 'memory', 'cdn', 'database'] },
  { id: 39, category: 'Backend', q: 'Explain how HTTP status codes are grouped, with examples.', keywords: ['200', '404', '500', '301', 'client', 'server', 'success'] },
  { id: 40, category: 'Backend', q: 'What is the difference between SQL injection and XSS, and how do you prevent them?', keywords: ['sanitize', 'parameterized', 'escape', 'input', 'validation', 'script'] }
];
