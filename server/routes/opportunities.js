// Job / internship matcher: paste a job description and see how well you fit; save it to track later.
const express = require('express');
const { Opportunity } = require('../models');
const crud = require('./crud');
const { extractSkills } = require('../services/skills');
const { getUserSkillSet } = require('../services/profile');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();

router.post('/analyze', wrap(async (req, res) => {
  const jd = str(req.body.jd, 10000);
  if (jd.length < 40) throw new HttpError(400, 'Paste the full job description (at least a few lines).');
  const required = extractSkills(jd);
  const { skills } = await getUserSkillSet(req.user.id);
  const matched = required.filter((s) => skills.has(s));
  const missing = required.filter((s) => !skills.has(s));
  const percent = required.length ? Math.round((matched.length / required.length) * 100) : 0;

  const advice = [];
  if (!required.length) advice.push('I could not recognize specific technical skills in this description. Check that you pasted the requirements section.');
  else {
    if (percent >= 75) advice.push('Strong match. Apply soon, and tailor your resume summary and project order to this description.');
    else if (percent >= 40) advice.push('Decent match. Highlight your closest projects and make sure the matching skills are visible in your resume\'s skills section.');
    else advice.push('Low match right now. Consider it a stretch role, or build the missing skills first (see the Roadmap page).');
    if (missing.length) advice.push(`If you have used ${missing.slice(0, 3).join(', ')} even in a small project, add it to your resume. Otherwise learn the basics of the top two missing skills first.`);
    if (!skills.size) advice.push('Analyze your resume first (Resume Analyzer) so matching uses your real skills.');
  }
  res.json({ required, matched, missing, percent, advice, hasResumeSkills: skills.size > 0 });
}));

router.use('/', crud(Opportunity, ['title', 'company', 'link', 'jd', 'matchPercent', 'matchedSkills', 'missingSkills', 'status'], { sort: { createdAt: -1 } }));

module.exports = router;
