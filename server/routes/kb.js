// Search the knowledge base + the student's notes (the same retrieval the chatbot uses).
const express = require('express');
const { Note } = require('../models');
const kb = require('../services/kb');
const { wrap, str } = require('../utils');

const router = express.Router();

router.get('/topics', (req, res) => {
  res.json(kb.DOCS.map(({ id, title, tags, text }) => ({ id, title, tags, text, source: 'kb' })));
});

router.get('/search', wrap(async (req, res) => {
  const q = str(req.query.q, 200);
  if (!q) return res.json([]);
  const notes = (await Note.find({ user: req.user.id }).select('title content category').limit(150).lean())
    .map((n) => ({ id: String(n._id), title: n.title, text: n.content || '', tags: [n.category], source: 'note' }));
  res.json(kb.search(q, notes, 8));
}));

module.exports = router;
