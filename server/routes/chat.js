// PlaceBot: streaming chat that accepts text, images (also video frames from the browser) and documents.
const express = require('express');
const { ChatThread, Note } = require('../models');
const upload = require('../middleware/upload');
const kb = require('../services/kb');
const ai = require('../services/ai');
const { kindOf, extractText, signatureOk } = require('../services/files');
const { parseResume, analyzeResume } = require('../services/ats');
const { getUserSkillSet } = require('../services/profile');
const { ROLES } = require('../services/roles');
const { wrap, str, HttpError } = require('../utils');

const router = express.Router();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // the AI API accepts up to 5 MB per image (the browser already shrinks images)
const MAX_DOC_BYTES = 10 * 1024 * 1024;   // documents: 10 MB each (the upload limit itself is 15 MB)
const VIDEO_FRAME = /-frame\d+\.jpe?g$/i;   // the browser names video stills like "clip-frame2.jpg"
const MAX_FILE_CHARS = 12000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const looksLikeResume = (text) => {
  const p = parseResume(text);
  return p.sectionNames.includes('education') && (p.sectionNames.includes('skills') || p.sectionNames.includes('projects')) && !!p.email;
};

router.get('/threads', wrap(async (req, res) => {
  res.json(await ChatThread.find({ user: req.user.id }).sort({ updatedAt: -1 }).limit(50).select('title updatedAt'));
}));

router.get('/threads/:id', wrap(async (req, res) => {
  const t = await ChatThread.findOne({ _id: req.params.id, user: req.user.id });
  if (!t) throw new HttpError(404, 'Chat not found');
  res.json(t);
}));

router.delete('/threads/:id', wrap(async (req, res) => {
  const t = await ChatThread.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!t) throw new HttpError(404, 'Chat not found');
  res.json({ ok: true });
}));

router.delete('/threads', wrap(async (req, res) => {
  const r = await ChatThread.deleteMany({ user: req.user.id });
  res.json({ ok: true, deleted: r.deletedCount || 0 });
}));

router.post('/', upload.array('files', 6), wrap(async (req, res) => {
  const message = str(req.body.message, 4000);
  const files = req.files || [];
  if (!message && !files.length) throw new HttpError(400, 'Type a message or attach a file');

  // ---- 1. Read attachments ----
  const imageBlocks = [], attachments = [], fileTexts = [], notes = [], videoFrames = [];
  let totalChars = 0;
  for (const f of files) {
    const kind = kindOf(f);
    if (kind !== 'unsupported' && !signatureOk(f, kind)) { notes.push(`"${f.originalname}" does not look like a real ${kind === 'text' ? 'text' : kind.toUpperCase()} file and was skipped.`); continue; }
    if (kind !== 'image' && kind !== 'unsupported' && f.size > MAX_DOC_BYTES) { notes.push(`"${f.originalname}" is larger than 10 MB and was skipped.`); continue; }
    if (kind === 'image') {
      if (f.size > MAX_IMAGE_BYTES) { notes.push(`"${f.originalname}" is larger than 5 MB and was skipped.`); continue; }
      imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: f.mimetype, data: f.buffer.toString('base64') } });
      if (VIDEO_FRAME.test(f.originalname)) videoFrames.push(f.originalname.replace(/-frame\d+\.jpe?g$/i, ''));
      attachments.push({ name: f.originalname, kind: VIDEO_FRAME.test(f.originalname) ? 'video-frame' : 'image', size: f.size });
    } else if (kind === 'unsupported') {
      notes.push(`"${f.originalname}" has an unsupported type. Use images, PDF, DOCX or text files.`);
    } else {
      let text = '';
      try { text = (await extractText(f)) || ''; } catch { notes.push(`Could not read "${f.originalname}".`); continue; }
      if (text.length < 5) { notes.push(`"${f.originalname}" has no readable text (is it a scanned PDF? Try uploading a screenshot instead).`); continue; }
      if (text.length > MAX_FILE_CHARS) notes.push(`"${f.originalname}" is long, so only the first ${MAX_FILE_CHARS.toLocaleString()} characters were used.`);
      text = text.slice(0, MAX_FILE_CHARS);
      if (totalChars + text.length > 30000) { notes.push(`"${f.originalname}" was skipped (too much text in one message).`); continue; }
      totalChars += text.length;
      fileTexts.push({ name: f.originalname, text });
      attachments.push({ name: f.originalname, kind, size: f.size });
    }
  }
  if (!message && !attachments.length) throw new HttpError(400, notes.join(' ') || 'Nothing readable was attached');

  // ---- 2. Find the conversation ----
  let thread = null;
  if (req.body.threadId) {
    thread = await ChatThread.findOne({ _id: str(req.body.threadId, 40), user: req.user.id });
    if (!thread) throw new HttpError(404, 'Chat not found');
  }

  // ---- 3. Retrieval (RAG): knowledge base + the student's own notes ----
  const noteDocs = (await Note.find({ user: req.user.id }).select('title content category').limit(150).lean())
    .map((n) => ({ id: String(n._id), title: n.title, text: n.content || '', tags: [n.category], source: 'note' }));
  const query = message || (fileTexts[0] ? fileTexts[0].text.slice(0, 300) : '');
  const hits = kb.search(query, noteDocs, 4);
  const sources = hits.map((h) => `${h.source === 'note' ? 'Your note' : 'Knowledge base'}: ${h.title}`);

  // ---- 4. Start the streamed (server-sent events) response ----
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (obj) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`); };
  const ac = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ac.abort(); });
  if (notes.length) send({ notice: notes.join(' ') });

  const basicAnswer = async (why) => {
    let resumeSummary = '';
    const resumeFile = fileTexts.find((f) => looksLikeResume(f.text));
    if (resumeFile) {
      const r = analyzeResume(resumeFile.text, {});
      resumeSummary = `### Resume check: ${resumeFile.name}\n**ATS score: ${r.score}/100 (${r.label})**\n\n` +
        (r.issues.length ? '**Top fixes**\n' + r.issues.slice(0, 5).map((i) => `- ${i.text}`).join('\n') : 'No major issues found.') +
        '\n\nOpen **Resume Analyzer** in the sidebar for the full breakdown and keyword match.';
    }
    const reply = ai.basicReply({
      message, hits, imageCount: imageBlocks.length, resumeSummary,
      fileSummaries: fileTexts.map((f) => ({ name: f.name, words: f.text.split(/\s+/).length }))
    });
    const text = why ? reply.replace(/^> \*\*Basic mode\*\*[^\n]*\n/, `> **Basic mode** - ${why}\n`) : reply;
    const chunks = text.match(/\S+\s*/g) || [text];
    for (let i = 0; i < chunks.length && !ac.signal.aborted; i += 3) {
      const piece = chunks.slice(i, i + 3).join('');
      full += piece;
      send({ t: piece });
      await sleep(12);
    }
  };

  let full = '';
  let failed = false;     // nothing useful was produced -> nothing is saved
  let interrupted = false; // some text arrived, then the AI stream broke -> the partial answer is saved and marked
  let mode = 'basic';
  try {
    if (ai.isAIEnabled()) {
      const { user, skills } = await getUserSkillSet(req.user.id);
      const role = ROLES[user && user.targetRole] || ROLES.fullstack;
      const profile = `Student profile: target role "${role.title}"; known skills: ${[...skills].slice(0, 25).join(', ') || 'not provided yet'}.`;
      const context = hits.length
        ? ai.untrusted('context', 'note="the student\'s notes and the placement knowledge base; use only if relevant and name the source"', hits.map((h, i) => `[${i + 1}] (${h.source === 'note' ? 'student note' : 'knowledge base'}) ${h.title}: ${h.text.slice(0, 900)}`).join('\n')) + '\n\n'
        : '';
      const filePart = fileTexts.map((f) => ai.untrusted('document', `name="${f.name.replace(/"/g, '')}" trust="untrusted-data"`, f.text)).join('\n\n');
      const frameNote = videoFrames.length ? `\n\n(System note: ${imageBlocks.length} attached image(s) are still frames sampled from ${[...new Set(videoFrames)].join(', ')}. They are not the whole video and have no audio.)` : '';
      const question = message || (imageBlocks.length ? 'Please look at the attached image(s) and help me with whatever they show.' : 'Please review the attached file(s) and give me the most useful feedback for a placement candidate.');
      const userContent = [...imageBlocks, { type: 'text', text: `${context}${filePart ? filePart + '\n\n' : ''}Student's message:\n${question}${frameNote}` }];

      const history = (thread ? thread.messages.slice(-10) : []).map((m) => ({ role: m.role, content: m.content || '(attachment)' }));
      while (history.length && history[0].role !== 'user') history.shift();

      mode = 'ai';
      send({ mode: 'ai', model: ai.modelName(), grounded: hits.length > 0 });
      try {
        for await (const piece of ai.streamText({ system: `${ai.PLACEBOT_SYSTEM}\n\n${profile}`, messages: [...history, { role: 'user', content: userContent }], signal: ac.signal })) {
          full += piece;
          send({ t: piece });
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        console.error('AI provider error:', e.message);
        if (!full) {
          // The AI service failed before any text arrived: fall back to Basic mode so the student still gets something useful.
          mode = 'basic-fallback';
          send({ mode: 'basic-fallback', notice: 'The AI service is not responding right now, so this answer comes from Basic mode (knowledge base and your notes only).' });
          await basicAnswer('the AI service is unavailable right now, so this answer comes from the built-in knowledge base and your notes only.');
        } else {
          interrupted = true;
          send({ error: 'The AI answer was cut off (connection problem). What you see is incomplete. You can press Retry.', partial: true });
        }
      }
    } else {
      send({ mode: 'basic' });
      await basicAnswer('');
    }
  } catch (e) {
    if (e.name !== 'AbortError') { failed = !full; interrupted = !!full; send({ error: e.message || 'Something went wrong. Please try again.', partial: !!full }); }
    else if (full) full += '\n\n*(stopped)*';
  }

  // ---- 5. Save the conversation ----
  if (!failed && full) {
    if (!thread) thread = new ChatThread({ user: req.user.id, title: (message || attachments[0].name).replace(/\s+/g, ' ').slice(0, 60) });
    thread.messages.push({ role: 'user', content: message, attachments });
    thread.messages.push({ role: 'assistant', content: interrupted ? `${full}\n\n*(incomplete - the connection broke)*` : full, sources, mode });
    try { await thread.save(); send({ done: true, threadId: thread.id, title: thread.title, sources, mode }); }
    catch (e) { console.error('Could not save chat', e.message); send({ done: true, sources, mode }); }
  } else if (!failed) {
    send({ done: true, sources, mode });
  }
  res.end();
}));

module.exports = router;
