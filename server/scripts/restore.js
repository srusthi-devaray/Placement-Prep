// Restore a backup made by backup.js:   node scripts/restore.js backups/2026-10-22T10-00-00 --confirm
// Safe by default: refuses to touch a collection that already has data unless you add --force (which replaces its contents).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

(async () => {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir) || !process.argv.includes('--confirm')) { console.error('Usage: node scripts/restore.js <backup-folder> --confirm [--force]'); process.exit(1); }
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is missing'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const { EJSON } = mongoose.mongo.BSON;
  const force = process.argv.includes('--force');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const name = path.basename(f, '.json');
    const col = mongoose.connection.db.collection(name);
    const existing = await col.countDocuments();
    if (existing && !force) { console.log(`  ${name}: skipped (already has ${existing} documents; use --force to replace)`); continue; }
    const docs = EJSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (existing) await col.deleteMany({});
    if (docs.length) await col.insertMany(docs);
    console.log(`  ${name}: restored ${docs.length} documents`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Restore failed:', e.message); process.exit(1); });
