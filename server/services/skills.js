// Skill dictionary + extractor used by the resume analyzer, job matcher and roadmap.
// Format: [canonical name, category, [lowercase aliases that may appear in a resume]]
const SKILL_DEFS = [
  // Languages
  ['JavaScript', 'Language', ['javascript', 'js', 'ecmascript', 'es6']],
  ['TypeScript', 'Language', ['typescript']],
  ['Python', 'Language', ['python']],
  ['Java', 'Language', ['java', 'core java']],
  ['C++', 'Language', ['c++', 'c/c++', 'cpp']],
  ['C', 'Language', ['c programming', 'c language']],
  ['C#', 'Language', ['c#', 'csharp']],
  ['Go', 'Language', ['golang']],
  ['Kotlin', 'Language', ['kotlin']],
  ['PHP', 'Language', ['php']],
  ['R', 'Language', ['r programming', 'rstudio']],
  // Web
  ['HTML', 'Web', ['html', 'html5']],
  ['CSS', 'Web', ['css', 'css3']],
  ['Tailwind CSS', 'Web', ['tailwind', 'tailwindcss', 'tailwind css']],
  ['Bootstrap', 'Web', ['bootstrap']],
  ['Sass', 'Web', ['sass', 'scss']],
  ['Responsive Design', 'Web', ['responsive design', 'responsive web', 'mobile-first']],
  ['React', 'Web', ['react', 'reactjs', 'react.js']],
  ['Redux', 'Web', ['redux', 'redux toolkit']],
  ['Next.js', 'Web', ['next.js', 'nextjs']],
  ['Angular', 'Web', ['angular', 'angularjs']],
  ['Vue', 'Web', ['vue', 'vue.js', 'vuejs']],
  ['jQuery', 'Web', ['jquery']],
  ['Node.js', 'Backend', ['node.js', 'nodejs', 'node js']],
  ['Express', 'Backend', ['express', 'express.js', 'expressjs', 'express js']],
  ['REST API', 'Backend', ['rest', 'restful', 'rest api', 'rest apis', 'restful api', 'restful apis', 'api development']],
  ['GraphQL', 'Backend', ['graphql']],
  ['JWT', 'Backend', ['jwt', 'json web token', 'json web tokens']],
  ['Authentication', 'Backend', ['authentication', 'oauth', 'authorization']],
  ['Socket.io', 'Backend', ['socket.io', 'websocket', 'websockets']],
  ['Django', 'Backend', ['django']],
  ['Flask', 'Backend', ['flask']],
  ['Spring Boot', 'Backend', ['spring boot', 'springboot', 'spring']],
  ['Hibernate', 'Backend', ['hibernate']],
  ['Microservices', 'Backend', ['microservices', 'microservice']],
  ['System Design', 'Backend', ['system design', 'low level design', 'high level design']],
  // Databases
  ['MongoDB', 'Database', ['mongodb', 'mongo', 'mongoose']],
  ['SQL', 'Database', ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'sql server', 'oracle sql', 'pl/sql']],
  ['Redis', 'Database', ['redis']],
  ['Firebase', 'Database', ['firebase', 'firestore']],
  ['DBMS', 'CS Core', ['dbms', 'database management', 'normalization']],
  // CS core
  ['DSA', 'CS Core', ['dsa', 'data structures', 'data structure', 'algorithms', 'data structures and algorithms']],
  ['OOP', 'CS Core', ['oop', 'oops', 'object oriented', 'object-oriented']],
  ['Operating Systems', 'CS Core', ['operating system', 'operating systems', 'os concepts']],
  ['Computer Networks', 'CS Core', ['computer networks', 'computer networking', 'networking', 'tcp/ip']],
  ['Problem Solving', 'CS Core', ['problem solving', 'problem-solving', 'competitive programming', 'leetcode', 'codeforces', 'codechef']],
  // Tools & DevOps
  ['Git', 'Tools', ['git', 'github', 'gitlab', 'bitbucket', 'version control']],
  ['Docker', 'DevOps', ['docker', 'containers', 'containerization']],
  ['Kubernetes', 'DevOps', ['kubernetes', 'k8s']],
  ['AWS', 'Cloud', ['aws', 'amazon web services', 'ec2', 's3']],
  ['Azure', 'Cloud', ['azure']],
  ['GCP', 'Cloud', ['gcp', 'google cloud']],
  ['Linux', 'DevOps', ['linux', 'unix', 'bash', 'shell scripting']],
  ['CI/CD', 'DevOps', ['ci/cd', 'cicd', 'github actions', 'continuous integration']],
  ['Jenkins', 'DevOps', ['jenkins']],
  ['Terraform', 'DevOps', ['terraform']],
  ['Postman', 'Tools', ['postman']],
  ['Figma', 'Tools', ['figma']],
  ['Jira', 'Tools', ['jira']],
  ['Agile', 'Process', ['agile', 'scrum', 'kanban']],
  // Testing
  ['Testing', 'Testing', ['testing', 'unit testing', 'test cases', 'manual testing', 'qa']],
  ['Jest', 'Testing', ['jest', 'mocha', 'chai', 'react testing library', 'cypress']],
  ['Selenium', 'Testing', ['selenium', 'webdriver']],
  ['JUnit', 'Testing', ['junit', 'testng']],
  // Data / AI
  ['Machine Learning', 'AI/Data', ['machine learning', 'ml']],
  ['Deep Learning', 'AI/Data', ['deep learning', 'neural networks', 'cnn', 'rnn']],
  ['NLP', 'AI/Data', ['nlp', 'natural language processing']],
  ['Computer Vision', 'AI/Data', ['computer vision', 'opencv']],
  ['TensorFlow', 'AI/Data', ['tensorflow', 'keras']],
  ['PyTorch', 'AI/Data', ['pytorch']],
  ['Scikit-learn', 'AI/Data', ['scikit-learn', 'sklearn', 'scikit learn']],
  ['Pandas', 'AI/Data', ['pandas']],
  ['NumPy', 'AI/Data', ['numpy']],
  ['Matplotlib', 'AI/Data', ['matplotlib', 'seaborn']],
  ['Statistics', 'AI/Data', ['statistics', 'statistical analysis', 'hypothesis testing']],
  ['Data Visualization', 'AI/Data', ['data visualization', 'data visualisation', 'dashboards']],
  ['Power BI', 'AI/Data', ['power bi', 'powerbi']],
  ['Tableau', 'AI/Data', ['tableau']],
  ['Excel', 'AI/Data', ['excel', 'advanced excel', 'spreadsheets', 'vlookup', 'pivot tables']],
  ['Data Analysis', 'AI/Data', ['data analysis', 'data analytics', 'eda']],
  // Mobile
  ['Android', 'Mobile', ['android', 'android studio']],
  ['Flutter', 'Mobile', ['flutter', 'dart']],
  ['React Native', 'Mobile', ['react native']],
  // Soft skills
  ['Communication', 'Soft', ['communication', 'public speaking', 'presentation skills']],
  ['Teamwork', 'Soft', ['teamwork', 'team player', 'collaboration']],
  ['Leadership', 'Soft', ['leadership', 'team lead', 'led a team']]
];

const SKILL_CATEGORY = Object.fromEntries(SKILL_DEFS.map(([name, cat]) => [name, cat]));
const ALL_SKILLS = SKILL_DEFS.map(([name]) => name);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// An alias matches only when it is not glued to other letters/digits: "java" must not match inside "javascript".
const COMPILED = SKILL_DEFS.map(([name, , aliases]) => ({
  name,
  re: new RegExp(`(?<![a-z0-9+#.])(?:${aliases.map(escapeRe).join('|')})(?![a-z0-9+#]|\\.[a-z])`, 'i')
}));

function extractSkills(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  return COMPILED.filter((s) => s.re.test(t)).map((s) => s.name);
}

module.exports = { SKILL_DEFS, SKILL_CATEGORY, ALL_SKILLS, extractSkills };
