// A small in-memory imitation of the Mongoose calls this project uses, so planner/share/jobs logic can be tested without MongoDB.
// It supports: equality, $gte $gt $lte $lt $ne $in $or, find/findOne/create/insertMany/update/delete/distinct/countDocuments/exists,
// and aggregate() with $match + $group ($sum / $avg).
let seq = 1;
class ObjectId { constructor(v) { this.v = String(v); } toString() { return this.v; } toJSON() { return this.v; } }

const eq = (a, b) => String(a) === String(b);
function matches(doc, q) {
  return Object.entries(q || {}).every(([k, cond]) => {
    if (k === '$or') return cond.some((c) => matches(doc, c));
    const v = doc[k];
    if (cond && typeof cond === 'object' && !(cond instanceof ObjectId) && !(cond instanceof Date) && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, x]) => {
        if (op === '$gte') return v !== undefined && v !== null && v >= x;
        if (op === '$gt') return v !== undefined && v !== null && v > x;
        if (op === '$lte') return v !== undefined && v !== null && v <= x;
        if (op === '$lt') return v !== undefined && v !== null && v < x;
        if (op === '$ne') return !eq(v, x) && !(v === null && x === null);
        if (op === '$in') return x.some((y) => eq(v, y));
        return true;
      });
    }
    return eq(v, cond);
  });
}

function makeModel(name, defaults = {}) {
  const rows = [];
  const clone = (o) => JSON.parse(JSON.stringify(o), (k, v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(v) && k !== 'date' ? new Date(v) : v));
  class M {
    constructor(d = {}) {
      Object.assign(this, clone(defaults), d);
      if (!this._id) this._id = new ObjectId('id' + seq++);
      if (!this.createdAt) this.createdAt = new Date(Date.now() + seq);
      Object.defineProperty(this, 'id', { value: String(this._id), enumerable: false });
    }
    async save() { if (!rows.includes(this)) rows.push(this); this.updatedAt = new Date(); return this; }
    markModified() {}
    toJSON() { return { ...this }; }
    static get rows() { return rows; }
    static _q(list) {
      let arr = list;
      const q = {
        sort(s) { const ks = Object.entries(s); arr = [...arr].sort((a, b) => { for (const [k, d] of ks) { if (a[k] < b[k]) return -d; if (a[k] > b[k]) return d; } return 0; }); return q; },
        limit(n) { arr = arr.slice(0, n); return q; }, select() { return q; },
        lean() { return Object.assign(Promise.resolve(arr.map((x) => ({ ...x }))), {}); },
        then(a, b) { return Promise.resolve(arr).then(a, b); }, catch(b) { return Promise.resolve(arr).catch(b); }
      };
      return q;
    }
    static find(q) { return M._q(rows.filter((r) => matches(r, q))); }
    static findOne(q) {
      const r = rows.find((x) => matches(x, q)) || null;
      const p = { sort() { return p; }, select() { return p; }, lean: () => Promise.resolve(r && { ...r }), then: (a, b) => Promise.resolve(r).then(a, b), catch: (b) => Promise.resolve(r).catch(b) };
      return p;
    }
    static findById(id) { return M.findOne({ _id: id }); }
    static async create(d) { if (Array.isArray(d)) return Promise.all(d.map((x) => M.create(x))); const m = new M(d); rows.push(m); return m; }
    static async insertMany(arr) { return Promise.all(arr.map((x) => M.create(x))); }
    static async countDocuments(q) { return rows.filter((r) => matches(r, q)).length; }
    static async exists(q) { return rows.some((r) => matches(r, q)) ? { _id: 1 } : null; }
    static async distinct(f, q) { return [...new Set(rows.filter((r) => matches(r, q)).map((r) => r[f]))]; }
    static async deleteMany(q) { let n = 0; for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], q)) { rows.splice(i, 1); n++; } return { deletedCount: n }; }
    static async deleteOne(q) { const i = rows.findIndex((r) => matches(r, q)); if (i >= 0) rows.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; }
    static async updateOne(q, u, o = {}) { let r = rows.find((x) => matches(x, q)); if (!r) { if (!o.upsert) return { matchedCount: 0 }; r = new M({ ...q, ...(u.$setOnInsert || {}) }); rows.push(r); } Object.assign(r, u.$set || {}); return { matchedCount: 1 }; }
    static async findOneAndDelete(q) { const i = rows.findIndex((r) => matches(r, q)); return i >= 0 ? rows.splice(i, 1)[0] : null; }
    static async findOneAndUpdate(q, u, o = {}) {
      let r = rows.find((x) => matches(x, q));
      const ops = Object.keys(u).some((k) => k.startsWith('$'));
      if (!r) { if (!o.upsert) return null; r = new M({ ...q, ...(u.$setOnInsert || {}) }); rows.push(r); }
      if (ops) Object.assign(r, u.$set || {}); else Object.assign(r, u);
      return r;
    }
    static async aggregate(pipe) {
      let docs = rows.map((r) => ({ ...r }));
      for (const st of pipe) {
        if (st.$match) docs = docs.filter((d) => matches(d, st.$match));
        if (st.$group) {
          const { _id, ...accs } = st.$group; const groups = new Map();
          for (const d of docs) { const key = _id === null ? 'null' : String(d[String(_id).slice(1)]); (groups.get(key) || groups.set(key, []).get(key)).push(d); }
          docs = [...groups.entries()].map(([k, list]) => {
            const out = { _id: k === 'null' ? null : k };
            for (const [f, spec] of Object.entries(accs)) {
              const [op, src] = Object.entries(spec)[0];
              const vals = list.map((d) => (typeof src === 'string' ? d[src.slice(1)] : 1));
              out[f] = op === '$sum' ? vals.reduce((a, b) => a + b, 0) : op === '$avg' ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : null;
            }
            return out;
          });
        }
      }
      return docs;
    }
  }
  Object.defineProperty(M, 'modelName', { value: name });
  M.schema = { path: (p) => (p === 'user' ? {} : null) };
  return M;
}

const DEFAULTS = {
  Assessment: { status: 'active', results: [], problemIds: [], score: 0, solved: 0, finishedAt: null }, DebugProgress: { attempts: 0, fixed: false, fixedAt: null, lastCode: '' },
  CsAttempt: { mode: 'lesson', lessonId: '', score: 0, total: 0, details: [] }, CsProgress: { read: false, readAt: null },
  Project: { description: '', role: '', techStack: [], highlights: [], githubUrl: '', liveUrl: '', status: 'completed', featured: false, showPublic: false },
  ResumeVersion: { name: '', template: 'modern', data: {} }, BuilderResume: { template: 'modern', data: {} },
  CompanyTrack: { seedVersion: 1, authoredAt: '', verifiedAt: null, verifiedBy: '', sourceNote: '' },
  StudySetting: { targetCompany: '', targetRole: '', hoursPerDay: 2, studyDays: [1, 2, 3, 4, 5, 6], placementDate: '', reminderEmail: false, lastReminderDay: '' },
  PlanTask: { kind: 'other', topic: '', minutes: 30, link: '', ref: '', step: 0, reason: '', auto: false, done: false, doneAt: null, movedFrom: '' },
  ShareSetting: { enabled: false, token: '', displayName: '', tagline: '', show: {} },
  JobCache: { ok: true, error: '', items: [], triedAt: null },
  Opportunity: { company: '', link: '', jd: '', matchPercent: 0, matchedSkills: [], missingSkills: [], status: 'Saved', source: '', externalId: '', location: '', jobType: '', experience: '', eligibility: '', deadline: '', postedAt: null, fetchedAt: null, listingCheck: '', listingCheckedAt: null },
  CodeProgress: { status: 'untouched', attempts: 0, wrongAttempts: 0, solvedAt: null, bookmarked: false, revise: false },
  CodeSubmission: {}, AptitudeResult: { mode: 'practice', details: [] }, MockSession: { avgScore: 0, category: '', answers: [], communication: null },
  Progress: { hours: 0, category: 'General', done: false }, Company: { status: 'Applied' }, ResumeAnalysis: {}, User: { targetRole: 'fullstack', skills: [], college: '' }, Goal: {}, Experience: {}, Note: { content: '' }, ChatThread: { messages: [], title: 'New chat' }
};

function makeModels() {
  const m = {};
  for (const [name, d] of Object.entries(DEFAULTS)) m[name] = makeModel(name, d);
  return m;
}

module.exports = { makeModels, ObjectId };
