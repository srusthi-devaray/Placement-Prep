// Free Atlas clusters (M0) have NO automatic backups. Run this regularly:   npm run backup
// It writes every collection to server/backups/<date>/<collection>.json (Extended JSON keeps ObjectIds and dates exact).
// Needs MONGODB_URI (from server/.env, or set in your shell). Keep the folder PRIVATE: it contains password hashes and user data.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is missing'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const { EJSON } = mongoose.mongo.BSON;
  const dir = path.join(__dirname, '..', 'backups', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  fs.mkdirSync(dir, { recursive: true });
  const cols = await mongoose.connection.db.listCollections().toArray();
  let total = 0;
  for (const c of cols) {
    if (c.name.startsWith('system.') || c.name === 'jobcaches') continue;      // the job cache is re-downloadable
    const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${c.name}.json`), EJSON.stringify(docs, null, 1));
    total += docs.length;
    console.log(`  ${c.name}: ${docs.length} documents`);
  }
  console.log(`\nBackup finished: ${total} documents saved in ${dir}`);
  await mongoose.disconnect();
})().catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
