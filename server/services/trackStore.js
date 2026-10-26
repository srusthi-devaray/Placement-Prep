// Company tracks are stored in MongoDB (CompanyTrack). The file companyTracks.js is only the SEED: it is copied into the database
// when a track is missing or the seed version is newer. After that the database is the source of truth, so a maintainer can edit tracks
// and mark them verified without a code change.
//
// HONESTY: seeded tracks are "app guidance". `verifiedAt` stays null until a maintainer (ADMIN_EMAILS) checks a track against the
// company's official pages and marks it verified. The UI shows this plainly.
const { CompanyTrack } = require('../models');
const seed = require('./companyTracks');

const SEED_VERSION = 1;
const AUTHORED = '2026-10-23';
let cache = null, cacheAt = 0;

const meta = (d) => ({
  authoredAt: d.authoredAt || AUTHORED,
  verifiedAt: d.verifiedAt || null,
  verifiedBy: d.verifiedBy || '',
  sourceNote: d.sourceNote || '',
  verification: d.verifiedAt
    ? `Checked against the company's official pages by ${d.verifiedBy || 'a maintainer'} on ${d.verifiedAt}.`
    : `Written for this app on ${d.authoredAt || AUTHORED}. Not verified against the company. Hiring processes change often, so confirm on the official careers page.`
});

async function ensureSeeded() {
  for (const t of seed.TRACKS) {
    const row = await CompanyTrack.findOne({ trackId: t.id });
    if (!row) await CompanyTrack.create({ trackId: t.id, name: t.name, data: t, seedVersion: SEED_VERSION, authoredAt: AUTHORED });
    else if ((row.seedVersion || 0) < SEED_VERSION && !row.verifiedAt) { row.data = t; row.name = t.name; row.seedVersion = SEED_VERSION; await row.save(); }
  }
  cache = null;
}

async function all() {
  if (cache && Date.now() - cacheAt < 30000) return cache;
  let rows = await CompanyTrack.find({}).sort({ name: 1 }).lean();
  if (!rows.length) { await ensureSeeded(); rows = await CompanyTrack.find({}).sort({ name: 1 }).lean(); }
  cache = rows.map((r) => ({ ...r.data, id: r.trackId, name: r.name, _meta: meta(r) }));
  cacheAt = Date.now();
  return cache;
}
const byId = async (id) => (await all()).find((t) => t.id === id) || null;
const invalidate = () => { cache = null; };

module.exports = { ensureSeeded, all, byId, invalidate, meta, SOURCE: seed.SOURCE, publicTrack: seed.publicTrack };
