// Loads the generated problem library (server/data/problems.json). Hidden tests and editorials stay on the server.
const fs = require('fs');
const path = require('path');

let cache = null;
function load() {
  if (cache) return cache;
  const file = path.join(__dirname, '../data/problems.json');
  if (!fs.existsSync(file)) throw new Error('data/problems.json is missing. Run: node scripts/buildProblems.js (needs python3)');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache = { ...data, byId: new Map(data.problems.map((p) => [p.id, p])) };
  return cache;
}
const get = (id) => load().byId.get(id) || null;
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// What the list page needs (no statement, no tests).
const summary = (p) => ({ id: p.id, title: p.title, topic: p.topic, level: p.level, collections: p.collections });
// What the problem page needs: statement + visible examples only.
const publicView = (p) => ({
  id: p.id, title: p.title, topic: p.topic, level: p.level, collections: p.collections, description: p.description,
  inputFormat: p.inputFormat, outputFormat: p.outputFormat, constraints: p.constraints, examples: p.examples,
  starter: p.starter, hintCount: p.hints.length, hiddenTestCount: p.tests.filter((t) => !t.visible).length, source: p.source
});

module.exports = { load, get, summary, publicView, LEVELS };
