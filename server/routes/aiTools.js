const express = require('express');
const ai = require('../services/ai');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ enabled: ai.isAIEnabled(), model: ai.isAIEnabled() ? ai.modelName() : null });
});

// Rewrite resume text (summary, a bullet, a project description) to be stronger.
router.post('/improve', wrap(async (req, res) => {
  const text = str(req.body.text, 1500);
  const kind = ['summary', 'bullet', 'project'].includes(req.body.kind) ? req.body.kind : 'bullet';
  const target = str(req.body.target, 200);
  if (text.length < 5) throw new HttpError(400, 'Write something first');
  if (!ai.isAIEnabled()) return res.json(ai.improveFallback(text, kind));

  const rules = {
    summary: 'Rewrite as a 2-3 sentence professional summary for a fresher resume (max 50 words).',
    bullet: 'Rewrite as ONE concise resume bullet point starting with a strong action verb.',
    project: 'Rewrite as 2-4 resume bullet points, each on its own line starting with "- " and a strong action verb.'
  }[kind];
  const out = await ai.complete({
    maxTokens: 400,
    system: `You are an expert resume coach for college students. ${rules} Keep every fact the student gave. Do NOT invent numbers, tools or achievements; if a metric would help but is missing, add a placeholder like [add %] or [add number of users]. Return ONLY the rewritten text with no preface or explanation.${target ? ` Tailor wording for this target role: ${target}.` : ''}`,
    messages: [{ role: 'user', content: text }]
  });
  res.json({ text: out.trim(), ai: true, tips: [] });
}));

module.exports = router;
