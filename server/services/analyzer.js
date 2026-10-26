// Real-time answer analyzer for mock interviews.
// Pure heuristics (no external AI service), so it is instant, free and works offline.
// The frontend calls this endpoint while the user types/speaks, giving live feedback.

const FILLERS = ['um', 'uh', 'umm', 'uhh', 'like', 'basically', 'actually', 'literally', 'you know', 'i mean', 'kind of', 'sort of', 'so yeah', 'stuff like that'];
const HEDGES = ["i think maybe", "i guess", "probably", "not sure", "i don't know", "maybe", "kind of", "sort of"];
const STAR = {
  situation: ['situation', 'when i was', 'at my', 'during', 'in my project', 'in college', 'internship', 'we were', 'there was a', 'last year', 'once'],
  task: ['task', 'responsible', 'my role', 'goal was', 'needed to', 'had to', 'assigned', 'objective', 'my job'],
  action: ['i built', 'i created', 'i designed', 'i implemented', 'i decided', 'i led', 'i developed', 'i worked', 'i started', 'i organized', 'i fixed', 'i wrote', 'i took', 'i talked', 'i used', 'i proposed', 'i analyzed'],
  result: ['result', 'outcome', 'as a result', 'in the end', 'finally', 'improved', 'reduced', 'increased', 'achieved', 'learned', 'successfully', 'which led', 'saved', 'delivered']
};

const countOccurrences = (text, phrase) => {
  const re = new RegExp(`(^|[^a-z0-9'])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9'])`, 'g');
  return (text.match(re) || []).length;
};

function analyze({ question = '', answer = '', category = '', keywords = [], durationSec = 0 }) {
  const text = String(answer).toLowerCase();
  const words = text.match(/[a-z0-9']+/g) || [];
  const wordCount = words.length;
  const sentences = String(answer).split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const isBehavioral = category === 'HR';

  const tips = [];   // { type: 'good' | 'warn' | 'bad', text }
  const add = (type, t) => tips.push({ type, text: t });

  if (wordCount === 0) {
    return { score: 0, wordCount: 0, metrics: {}, tips: [{ type: 'warn', text: 'Start answering — take a breath, then give a one-line direct answer first.' }], star: null, keywordsHit: [], keywordsMissed: keywords };
  }

  // ---- Length ----
  let lengthScore;
  const idealMin = isBehavioral ? 90 : 60, idealMax = isBehavioral ? 220 : 180;
  if (wordCount < 20) { lengthScore = 20; add('bad', 'Too short. Aim for at least ' + idealMin + ' words — add an example or explanation.'); }
  else if (wordCount < idealMin) { lengthScore = 55; add('warn', `Add more detail (${wordCount} words so far, aim for ${idealMin}–${idealMax}).`); }
  else if (wordCount <= idealMax) { lengthScore = 100; add('good', 'Good answer length.'); }
  else if (wordCount <= idealMax + 80) { lengthScore = 75; add('warn', 'Getting long — wrap up with a one-line conclusion.'); }
  else { lengthScore = 45; add('bad', 'Too long. Interviewers lose focus after ~2 minutes; be more concise.'); }

  // ---- Filler words ----
  let fillerTotal = 0; const fillerFound = {};
  for (const f of FILLERS) { const c = countOccurrences(text, f); if (c) { fillerFound[f] = c; fillerTotal += c; } }
  const fillerRate = fillerTotal / wordCount;
  let fillerScore = Math.max(0, 100 - Math.round(fillerRate * 800));
  if (fillerTotal >= 3 && fillerRate > 0.03) add('bad', 'Too many filler words: ' + Object.entries(fillerFound).map(([k, v]) => `"${k}" ×${v}`).join(', ') + '. Pause silently instead.');
  else if (fillerTotal > 0) add('warn', 'Watch filler words: ' + Object.keys(fillerFound).map(k => `"${k}"`).join(', ') + '.');
  else if (wordCount > 25) add('good', 'No filler words — clean delivery.');

  // ---- Confidence / hedging ----
  let hedgeCount = 0; for (const h of HEDGES) hedgeCount += countOccurrences(text, h);
  const confScore = Math.max(0, 100 - hedgeCount * 18);
  if (hedgeCount >= 2) add('warn', 'You sound unsure ("maybe", "I guess"). Use direct statements: "I used…", "The reason is…".');

  // ---- Keyword coverage ----
  const hit = [], missed = [];
  for (const k of keywords) (text.includes(k.toLowerCase()) ? hit : missed).push(k);
  const kwScore = keywords.length ? Math.round((hit.length / keywords.length) * 100) : 70;
  if (keywords.length) {
    if (kwScore >= 70) add('good', `Covers key concepts (${hit.length}/${keywords.length}).`);
    else if (kwScore >= 35) add('warn', `Mention more key concepts. Missing: ${missed.slice(0, 3).join(', ')}.`);
    else if (wordCount > 15) add('bad', `Key concepts missing: ${missed.slice(0, 4).join(', ')}.`);
  }

  // ---- STAR structure (behavioral) ----
  let star = null, structureScore = 70;
  if (isBehavioral) {
    star = {};
    for (const [part, cues] of Object.entries(STAR)) star[part] = cues.some(c => text.includes(c));
    const covered = Object.values(star).filter(Boolean).length;
    structureScore = covered * 25;
    const lacking = Object.keys(star).filter(k => !star[k]);
    if (covered === 4) add('good', 'Great structure — Situation, Task, Action and Result all covered (STAR).');
    else if (wordCount > 40) add('warn', 'STAR structure: add ' + lacking.map(l => l.toUpperCase()).join(' & ') + '.');
  } else {
    // technical: reward examples and structure words
    const hasExample = /(for example|for instance|e\.g\.|such as|consider|suppose)/.test(text);
    const hasStructure = /(first|second|firstly|finally|in summary|to summarize|in short|therefore)/.test(text);
    structureScore = 40 + (hasExample ? 35 : 0) + (hasStructure ? 25 : 0);
    if (!hasExample && wordCount > 40) add('warn', 'Add a concrete example ("for example…") — it proves understanding.');
    if (hasExample) add('good', 'Nice — you backed it up with an example.');
  }

  // ---- Ownership / numbers (behavioral) ----
  const iCount = countOccurrences(text, 'i'), weCount = countOccurrences(text, 'we');
  if (isBehavioral && wordCount > 40 && weCount > iCount * 1.5) add('warn', 'Too much "we". Say what *you* specifically did.');
  const hasNumbers = /\b\d+(\.\d+)?\s?(%|percent|users|hours|days|weeks|months|x|times|members|people)?/.test(text);
  if (isBehavioral && wordCount > 40 && !hasNumbers) add('warn', 'Quantify impact if you can (e.g. "reduced load time by 30%").');

  // ---- Sentence length ----
  const avgSentence = sentences.length ? wordCount / sentences.length : wordCount;
  if (avgSentence > 32 && wordCount > 50) add('warn', 'Sentences are very long — break your thoughts into shorter ones.');

  // ---- Pace (only if we know speaking time) ----
  let wpm = null;
  if (durationSec >= 10) {
    wpm = Math.round(wordCount / (durationSec / 60));
    if (wpm > 180) add('warn', `Speaking fast (${wpm} wpm). Slow to ~130–160 wpm.`);
    else if (wpm < 90 && wordCount > 30) add('warn', `Pace is slow (${wpm} wpm). A bit more energy will help.`);
    else add('good', `Comfortable pace (${wpm} wpm).`);
  }

  // ---- Weighted score ----
  const w = isBehavioral
    ? { length: 0.2, filler: 0.15, conf: 0.1, kw: 0.1, structure: 0.45 }
    : { length: 0.2, filler: 0.1, conf: 0.1, kw: 0.45, structure: 0.15 };
  const score = Math.round(Math.min(100, Math.max(0,
    lengthScore * w.length + fillerScore * w.filler + confScore * w.conf + kwScore * w.kw + structureScore * w.structure)));

  return {
    score,
    wordCount,
    metrics: { length: lengthScore, fillers: fillerScore, confidence: confScore, content: kwScore, structure: structureScore, wpm, fillerCount: fillerTotal },
    tips,
    star,
    keywordsHit: hit,
    keywordsMissed: missed
  };
}

const verdict = (s) => s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 50 ? 'Needs work' : 'Keep practicing';

module.exports = { analyze, verdict };
