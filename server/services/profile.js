// Gathers what we know about the user's skills (profile + latest analyzed resume).
const { User, ResumeAnalysis, Project } = require('../models');
const { ALL_SKILLS } = require('./skills');

async function getUserSkillSet(userId) {
  const [user, latest, projects] = await Promise.all([
    User.findById(userId).lean(),
    ResumeAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).select('result.parsed.skills score createdAt').lean(),
    Project.find({ user: userId }).select('techStack').lean()
  ]);
  const fromResume = (latest && latest.result && latest.result.parsed && latest.result.parsed.skills) || [];
  const skills = new Set([...(user ? user.skills : []), ...fromResume]);
  // Technologies named in the student's own saved projects count as skills they have used (matched to the known skill names).
  const canon = new Map(ALL_SKILLS.map((x) => [String(x).toLowerCase(), x]));
  const fromProjects = [];
  for (const p of projects || []) for (const t of p.techStack || []) { const c = canon.get(String(t).toLowerCase()); if (c) { skills.add(c); fromProjects.push(c); } }
  return { user, latest, skills, fromProjects: [...new Set(fromProjects)] };
}

module.exports = { getUserSkillSet };
