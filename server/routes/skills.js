// Skill-gap analysis + personalized learning roadmap.
const express = require('express');
const { ROLES, evaluateRole, buildRoadmap } = require('../services/roles');
const { ALL_SKILLS } = require('../services/skills');
const { getUserSkillSet } = require('../services/profile');
const planner = require('../services/planner');
const { User } = require('../models');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();

router.get('/roles', (req, res) => {
  res.json(Object.values(ROLES).map((r) => ({ id: r.id, title: r.title, description: r.description })));
});

router.get('/catalog', (req, res) => res.json(ALL_SKILLS));

router.post('/gap', wrap(async (req, res) => {
  const role = ROLES[req.body.roleId];
  if (!role) throw new HttpError(400, 'Choose a target role');
  const hours = Math.max(2, Math.min(60, Number(req.body.hoursPerWeek) || 10));
  const targetWeeks = Math.max(0, Math.min(104, Number(req.body.targetWeeks) || 0));

  const { skills, latest, fromProjects } = await getUserSkillSet(req.user.id);
  for (const s of Array.isArray(req.body.extraSkills) ? req.body.extraSkills.slice(0, 40) : []) skills.add(str(s, 40));
  await User.updateOne({ _id: req.user.id }, { $set: { targetRole: role.id } });

  const evaluation = evaluateRole(role, skills);
  const roadmap = buildRoadmap(role, skills, hours);
  const totalWeeks = roadmap.reduce((s, p) => s + p.weeks, 0);
  // What the student's real practice says they should work on (empty until they have practice data).
  const w = await planner.weakAreas(req.user.id);
  const practiceFocus = w.areas.slice(0, 5).map((a) => ({ area: a.area, topic: a.topic, reason: a.reason, link: a.area === 'coding' ? `/app/code?topic=${encodeURIComponent(a.topic)}` : a.area === 'cs' ? `/app/cs/${a.lessonId}` : a.area === 'mock' ? '/app/mock' : '/app/aptitude' }));
  res.json({
    practiceFocus, fromProjects,
    role: { id: role.id, title: role.title, description: role.description },
    ...evaluation, roadmap, totalWeeks, hoursPerWeek: hours,
    fitsDeadline: targetWeeks ? totalWeeks <= targetWeeks : null, targetWeeks: targetWeeks || null,
    knownSkills: [...skills].sort(), fromResume: !!latest
  });
}));

module.exports = router;
