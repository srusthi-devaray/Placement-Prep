// Resume parsing + ATS (Applicant Tracking System) scoring. Pure functions, no network.
const { extractSkills } = require('./skills');
const { ROLES, evaluateRole } = require('./roles');

const ACTION_VERBS = new Set(['built', 'developed', 'designed', 'implemented', 'created', 'led', 'managed', 'improved', 'optimized', 'optimised', 'reduced', 'increased', 'launched', 'delivered', 'automated', 'analyzed', 'analysed', 'integrated', 'deployed', 'architected', 'engineered', 'collaborated', 'coordinated', 'organized', 'organised', 'mentored', 'resolved', 'tested', 'migrated', 'refactored', 'streamlined', 'established', 'spearheaded', 'initiated', 'achieved', 'won', 'secured', 'trained', 'presented', 'published', 'wrote', 'configured', 'maintained', 'scaled', 'enhanced', 'executed', 'drove', 'conducted', 'contributed', 'simplified', 'debugged', 'researched', 'validated', 'supported', 'participated', 'volunteered', 'founded', 'handled', 'applied', 'utilized', 'utilised', 'leveraged', 'secured', 'authored', 'crafted', 'revamped', 'ranked', 'solved']);

const SECTION_PATTERNS = {
  summary: /^(professional |career )?(summary|objective|profile|about me)$/,
  education: /^(education|academics?|academic (background|qualifications?)|qualifications?|educational qualifications?)$/,
  experience: /^((work|professional|internship) )?(experience|experiences|internships?|employment|employment history|work history)( & internships?)?$/,
  projects: /^((academic|personal|major|key) )?projects?( work)?$/,
  skills: /^((technical|key|core|it) )?(skills|technologies|competencies|skills & tools|technical proficiency|tech stack)$/,
  certifications: /^(certifications?|certificates?|courses|licenses?|certifications? & courses|courses & certifications?)$/,
  achievements: /^(achievements?|awards?|accomplishments?|honou?rs|awards? & achievements?|achievements? & awards?)$/,
  activities: /^(extra[- ]?curricular( activities)?|activities|positions? of responsibility|leadership|co-curricular activities)$/
};

const normalize = (t) => String(t || '').replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const wordsOf = (t) => t.match(/[A-Za-z0-9+#.'/-]+/g) || [];
const isBulletLine = (l) => /^\s*[•▪●◦‣\-–—*·➢✓>]\s*\S/.test(l);
const stripBullet = (l) => l.replace(/^\s*[•▪●◦‣\-–—*·➢✓>]\s*/, '').trim();

function detectSections(lines) {
  const sections = {};
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const norm = line.replace(/[^a-zA-Z& ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    let matched = null;
    if (norm && norm.split(' ').length <= 5 && line.length <= 45 && !isBulletLine(line)) {
      for (const [name, re] of Object.entries(SECTION_PATTERNS)) if (re.test(norm)) { matched = name; break; }
    }
    if (matched) { current = matched; sections[current] = sections[current] || []; continue; }
    const inline = line.match(/^(technical skills|skills|technologies|tech stack)\s*[:\-]\s*(.+)$/i);
    if (inline) { sections.skills = (sections.skills || []).concat(inline[2]); current = 'skills'; continue; }
    if (current) sections[current].push(line);
  }
  return sections;
}

function parseResume(rawText) {
  const text = normalize(rawText);
  const lines = text.split('\n');
  const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
  const phone = (text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/g) || []).find((p) => p.replace(/\D/g, '').length >= 10) || '';
  const linkedin = (text.match(/linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_%-]+/i) || [])[0] || '';
  const github = (text.match(/github\.com\/[A-Za-z0-9_-]+/i) || [])[0] || '';
  const firstLine = (lines.find((l) => l.trim()) || '').trim();
  const name = firstLine && firstLine.split(/\s+/).length <= 5 && !/[@\d]/.test(firstLine) ? firstLine : '';
  const sections = detectSections(lines);
  const sectionText = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join('\n')]));

  const descSections = ['experience', 'projects', 'activities'].filter((s) => sections[s]);
  const bullets = [];
  for (const s of descSections) {
    for (const l of sections[s]) {
      const body = stripBullet(l);
      if (isBulletLine(l) || wordsOf(body).length >= 7) bullets.push(body);
    }
  }
  const cgpa = (text.match(/(?:cgpa|gpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)/i) || text.match(/(\d{1,2}\.\d{1,2})\s*\/\s*10/) || [])[1] || '';
  const percentage = (text.match(/(\d{2}(?:\.\d+)?)\s*%/) || [])[1] || '';
  const skills = extractSkills(text);
  return { name, email, phone, linkedin, github, sections: sectionText, sectionNames: Object.keys(sections), bullets, cgpa, percentage, skills };
}

const startsWithVerb = (b) => ACTION_VERBS.has((b.match(/^[A-Za-z]+/) || [''])[0].toLowerCase());

function analyzeResume(rawText, { jd = '', role = 'fullstack' } = {}) {
  const text = normalize(rawText);
  const parsed = parseResume(text);
  const words = wordsOf(text);
  const wordCount = words.length;
  const has = (s) => parsed.sectionNames.includes(s);
  const issues = [], strengths = [];
  const add = (arr, severity, msg) => arr.push(severity ? { severity, text: msg } : msg);
  const breakdown = [];

  // 1. Contact & links (15)
  let contact = 0;
  if (parsed.email) contact += 5; else add(issues, 'high', 'No email address found. Recruiters and ATS need one at the top.');
  if (parsed.phone) contact += 4; else add(issues, 'high', 'No phone number found.');
  if (parsed.linkedin) contact += 3; else add(issues, 'medium', 'Add your LinkedIn profile link.');
  if (parsed.github) contact += 3; else add(issues, 'medium', 'Add your GitHub link - recruiters look at student projects.');
  if (contact >= 12) add(strengths, null, 'Complete contact details and professional links.');
  breakdown.push({ key: 'contact', label: 'Contact & links', score: contact, max: 15 });

  // 2. Sections (20)
  let sec = 0;
  const secRules = [['education', 5, 'Education'], ['skills', 5, 'Skills'], ['projects', 5, 'Projects']];
  for (const [k, pts, label] of secRules) { if (has(k)) sec += pts; else add(issues, 'high', `Missing "${label}" section (use a clear heading with that exact word).`); }
  if (has('experience')) sec += 3; else add(issues, 'medium', 'No Experience / Internship section. Add internships, training or freelance work if you have any.');
  if (has('summary')) sec += 1; else add(issues, 'low', 'Add a 2-3 line Summary at the top tailored to your target role.');
  if (has('certifications') || has('achievements')) sec += 1; else add(issues, 'low', 'Add Certifications or Achievements (courses, hackathons, coding ranks).');
  if (sec >= 16) add(strengths, null, 'Well-organized sections with standard headings.');
  breakdown.push({ key: 'sections', label: 'Sections & structure', score: sec, max: 20 });

  // 3. Skills (15)
  const skillScore = Math.min(15, Math.round(parsed.skills.length * 1.25));
  if (parsed.skills.length < 6) add(issues, 'high', `Only ${parsed.skills.length} recognizable skills found. List languages, frameworks, databases and tools.`);
  else if (parsed.skills.length >= 12) add(strengths, null, `${parsed.skills.length} relevant skills detected.`);
  breakdown.push({ key: 'skills', label: 'Skills coverage', score: skillScore, max: 15 });

  // 4. Impact of bullets (20)
  let impact = 0;
  const b = parsed.bullets;
  if (!b.length) {
    add(issues, 'high', 'No project/experience descriptions found. Describe each project in 2-3 bullet points.');
  } else {
    const verbRatio = b.filter(startsWithVerb).length / b.length;
    const quantified = b.filter((x) => /\d/.test(x)).length;
    impact += Math.round(10 * Math.min(1, verbRatio / 0.6));
    impact += Math.min(10, Math.round(quantified * 2.5));
    if (verbRatio < 0.4) add(issues, 'medium', `Start bullet points with strong action verbs (Built, Designed, Reduced...). Only ${Math.round(verbRatio * 100)}% do now.`);
    else add(strengths, null, 'Bullets start with action verbs.');
    if (quantified < 2) add(issues, 'high', 'Add numbers to show impact (e.g. "reduced load time by 30%", "used by 200+ students").');
    else if (quantified >= 4) add(strengths, null, 'Achievements are quantified with numbers.');
  }
  breakdown.push({ key: 'impact', label: 'Impact & action verbs', score: impact, max: 20 });

  // 5. Length & readability (10)
  let read = 0;
  if (wordCount >= 300 && wordCount <= 750) read += 6;
  else if ((wordCount >= 200 && wordCount < 300) || (wordCount > 750 && wordCount <= 950)) read += 4;
  else read += 1;
  if (wordCount < 200) add(issues, 'high', `Resume is very short (${wordCount} words). Aim for 300-700 words.`);
  else if (wordCount > 950) add(issues, 'medium', `Resume is long (${wordCount} words). Freshers should keep it to one page (about 450-650 words).`);
  else if (wordCount >= 300 && wordCount <= 750) add(strengths, null, 'Good length for a fresher resume.');
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  if (nonAscii / Math.max(1, text.length) < 0.03) read += 2; else add(issues, 'low', 'Many special symbols/icons detected. ATS parsers can mis-read them - prefer plain text bullets.');
  if (/(19|20)\d{2}/.test(text)) read += 2; else add(issues, 'medium', 'No dates/years found. Add graduation year and project/internship durations.');
  breakdown.push({ key: 'readability', label: 'Length & readability', score: Math.min(10, read), max: 10 });

  // 6. Keyword match (20) - against the job description if given, else the target role
  const resumeSkills = new Set(parsed.skills);
  let matched = [], missing = [], keywordScore = 0, keywordSource = 'role';
  const jdSkills = jd ? extractSkills(jd) : [];
  if (jdSkills.length >= 3) {
    keywordSource = 'job description';
    matched = jdSkills.filter((s) => resumeSkills.has(s));
    missing = jdSkills.filter((s) => !resumeSkills.has(s));
    keywordScore = Math.round(20 * (matched.length / jdSkills.length));
  } else {
    const r = ROLES[role] || ROLES.fullstack;
    const ev = evaluateRole(r, resumeSkills);
    matched = ev.have; missing = ev.missing;
    keywordScore = Math.round(20 * (ev.have.length / r.required.length));
    keywordSource = r.title;
  }
  if (missing.length) add(issues, matched.length ? 'medium' : 'high', `Missing keywords for ${keywordSource}: ${missing.slice(0, 8).join(', ')}.`);
  else add(strengths, null, `All key skills for ${keywordSource} are present.`);
  breakdown.push({ key: 'keywords', label: `Keyword match (${keywordSource})`, score: keywordScore, max: 20 });

  const score = breakdown.reduce((s, x) => s + x.score, 0);
  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, c) => severityOrder[a.severity] - severityOrder[c.severity]);
  return {
    score, label: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs work',
    breakdown, issues, strengths, keywords: { source: keywordSource, matched, missing },
    parsed: { name: parsed.name, email: parsed.email, phone: parsed.phone, linkedin: parsed.linkedin, github: parsed.github, cgpa: parsed.cgpa, percentage: parsed.percentage, skills: parsed.skills, sections: parsed.sectionNames, wordCount, bulletCount: b.length }
  };
}

module.exports = { parseResume, analyzeResume, normalize };
