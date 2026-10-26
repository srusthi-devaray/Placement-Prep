// Live job / internship feed from OFFICIAL, documented APIs only (no scraping).
//
//  - Remotive  (https://remotive.com/api/remote-jobs): free, no key. Remote jobs only. Their rules: the data is delayed ~24h,
//    request it at most ~4 times a day, show the Remotive link + name them as the source. We cache for 8 hours (3 calls/day max).
//  - Adzuna    (https://developer.adzuna.com): free key (app id + app key) from their website. Optional - enabled only when
//    ADZUNA_APP_ID and ADZUNA_APP_KEY are set. Free allowance is shown in your Adzuna account (about 250 calls/day at time of writing).
//    Their terms allow personal job search / research; read https://developer.adzuna.com/docs/terms_of_service before a public launch.
//
// Nothing here is invented: every job comes from a provider response, and is labelled with its source and fetch time.
// Neither provider publishes an application deadline or a reliable "closed" flag, so we never claim a job is open or closed.
const { JobCache } = require('../models');
const { extractSkills } = require('./skills');

const REMOTIVE_TTL_MS = 8 * 60 * 60 * 1000;
const ADZUNA_TTL_MS = 3 * 60 * 60 * 1000;
const TECH_CATEGORIES = new Set(['software-dev', 'software development', 'data', 'devops', 'devops / sysadmin', 'qa', 'product', 'all other remote']);

const stripHtml = (h) => String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

function jobTypeOf(title, raw) {
  const t = `${title} ${raw || ''}`.toLowerCase();
  if (/intern(ship)?\b|trainee|apprentice/.test(t)) return 'internship';
  if (/part[_ -]?time/.test(t)) return 'part-time';
  if (/contract|freelance/.test(t)) return 'contract';
  if (/full[_ -]?time|permanent/.test(t)) return 'full-time';
  return 'unknown';
}

// Only reports what the text actually says. "Not stated" otherwise.
function experienceOf(title, text) {
  const t = `${title}\n${text}`;
  const m = t.match(/(\d{1,2})\s*(?:\+|-|to|–)?\s*(\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b[^.\n]{0,40}(?:experience|exp)?/i);
  if (/\b(intern(ship)?|fresher|entry[- ]level|graduate|new grad|trainee)\b/i.test(t.slice(0, 600))) return { label: 'Entry level / fresher (as written in the listing)', minYears: 0 };
  if (/\b(senior|sr\.?|lead|principal|staff|architect|manager)\b/i.test(title)) return { label: 'Senior (from the job title)', minYears: 5 };
  if (m) { const lo = Number(m[1]); return { label: `${m[0].replace(/\s+/g, ' ').trim().slice(0, 60)} (as written in the listing)`, minYears: lo > 30 ? 0 : lo }; }
  return { label: 'Not stated', minYears: null };
}

function eligibilityOf(text) {
  const sentences = String(text).split(/(?<=[.!?\n])\s+/);
  const hit = sentences.find((s) => /\b(b\.?tech|b\.?e\b|bachelor|degree|graduat|computer science|batch of|pursuing|final[- ]year|master)/i.test(s));
  return hit ? hit.replace(/\s+/g, ' ').trim().slice(0, 240) : 'Not stated';
}

function normalize(source, raw) {
  const description = stripHtml(raw.description).slice(0, 3000);
  const exp = experienceOf(raw.title, description);
  const jobType = jobTypeOf(raw.title, raw.jobTypeRaw);
  return {
    source, externalId: String(raw.id),
    title: String(raw.title || '').slice(0, 160), company: String(raw.company || '').slice(0, 120),
    location: String(raw.location || 'Not stated').slice(0, 160), remote: !!raw.remote,
    jobType, experience: exp.label, minYears: exp.minYears,
    eligibility: eligibilityOf(description),
    deadline: '',                                   // neither provider supplies this; the UI says "not provided by source"
    postedAt: raw.postedAt || null, url: raw.url,
    salary: raw.salary ? String(raw.salary).slice(0, 80) : '',
    skills: extractSkills(`${raw.title}\n${description}`),
    description: description.slice(0, 1800)
  };
}

async function getJson(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'placement-prep-tracker/1.0', ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

const PROVIDERS = {
  remotive: {
    label: 'Remotive', home: 'https://remotive.com', ttl: REMOTIVE_TTL_MS, completeFeed: true,
    note: 'Remote jobs worldwide. Remotive delays listings by about 24 hours. Source: remotive.com',
    enabled: () => process.env.REMOTIVE_DISABLED !== '1',
    async fetch() {
      const data = await getJson('https://remotive.com/api/remote-jobs?limit=400');
      return (data.jobs || []).filter((j) => TECH_CATEGORIES.has(String(j.category || '').toLowerCase())).map((j) => normalize('remotive', {
        id: j.id, title: j.title, company: j.company_name, location: j.candidate_required_location ? `Remote - ${j.candidate_required_location}` : 'Remote',
        remote: true, jobTypeRaw: j.job_type, postedAt: j.publication_date ? new Date(j.publication_date) : null, url: j.url, salary: j.salary, description: j.description
      }));
    }
  },
  adzuna: {
    label: 'Adzuna', home: 'https://www.adzuna.in', ttl: ADZUNA_TTL_MS, completeFeed: false,
    note: 'Job ads aggregated by Adzuna (adzuna.in). Source: Adzuna',
    enabled: () => !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    async fetch() {
      const country = (process.env.ADZUNA_COUNTRY || 'in').toLowerCase();
      const queries = ['software engineer', 'software developer intern', 'web developer', 'data analyst', 'graduate trainee engineer'];
      const out = new Map();
      for (const what of queries) {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(process.env.ADZUNA_APP_ID)}&app_key=${encodeURIComponent(process.env.ADZUNA_APP_KEY)}&results_per_page=30&what=${encodeURIComponent(what)}&content-type=application/json`;
        const data = await getJson(url);
        for (const j of data.results || []) {
          if (out.has(j.id)) continue;
          const salary = j.salary_min ? `${Math.round(j.salary_min)}${j.salary_max ? '-' + Math.round(j.salary_max) : ''}${j.salary_is_predicted === '1' ? ' (estimated by Adzuna)' : ''}` : '';
          out.set(j.id, normalize('adzuna', {
            id: j.id, title: j.title, company: j.company && j.company.display_name, location: j.location && j.location.display_name, remote: /remote/i.test(`${j.title} ${j.description}`),
            jobTypeRaw: `${j.contract_time || ''} ${j.contract_type || ''}`, postedAt: j.created ? new Date(j.created) : null, url: j.redirect_url, salary, description: j.description
          }));
        }
      }
      return [...out.values()];
    }
  }
};

// Returns cached items; refreshes from the provider only when the cache is older than its allowed interval.
// A failed refresh keeps the old items and records the error, and it is not retried until a short cool-down passes.
async function loadProvider(name, { force = false } = {}) {
  const p = PROVIDERS[name];
  let doc = await JobCache.findOne({ key: name });
  const tried = doc ? (doc.triedAt || doc.fetchedAt).getTime() : 0;
  const age = Date.now() - tried;
  const limit = doc && !doc.ok ? 30 * 60 * 1000 : p.ttl;
  if (!doc || age > limit || (force && age > 15 * 60 * 1000)) {
    const now = new Date();
    try {
      const items = await p.fetch();
      doc = await JobCache.findOneAndUpdate({ key: name }, { key: name, fetchedAt: now, triedAt: now, ok: true, error: '', items }, { upsert: true, new: true });
    } catch (e) {
      // keep the previous items and their real fetch time; only record that we tried
      doc = await JobCache.findOneAndUpdate({ key: name }, { $set: { triedAt: now, ok: false, error: String(e.message || e).slice(0, 200) }, $setOnInsert: { fetchedAt: new Date(0), items: [] } }, { upsert: true, new: true });
    }
  }
  return doc;
}

async function getAllJobs() {
  const sources = [], items = [];
  for (const [name, p] of Object.entries(PROVIDERS)) {
    if (!p.enabled()) { sources.push({ id: name, label: p.label, enabled: false, note: name === 'adzuna' ? 'Not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY on the server to enable India-focused listings.' : 'Disabled' }); continue; }
    const doc = await loadProvider(name);
    sources.push({ id: name, label: p.label, enabled: true, ok: doc.ok, error: doc.ok ? '' : doc.error, fetchedAt: doc.items.length ? doc.fetchedAt : null, count: doc.items.length, note: p.note, home: p.home });
    items.push(...doc.items.map((j) => ({ ...j, fetchedAt: doc.fetchedAt })));
  }
  return { sources, items };
}

// Match one job against the student's skill set.
function matchJob(job, skillSet) {
  const required = job.skills || [];
  const matched = required.filter((s) => skillSet.has(s));
  const missing = required.filter((s) => !skillSet.has(s));
  return { matchPercent: required.length ? Math.round((matched.length / required.length) * 100) : null, matchedSkills: matched, missingSkills: missing };
}

function filterJobs(items, f, skillSet) {
  const q = String(f.q || '').toLowerCase().trim();
  const loc = String(f.location || '').toLowerCase().trim();
  const want = String(f.skills || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return items.filter((j) => {
    if (f.type && f.type !== 'all' && j.jobType !== f.type) return false;
    if (f.source && f.source !== 'all' && j.source !== f.source) return false;
    if (q && !`${j.title} ${j.company}`.toLowerCase().includes(q)) return false;
    if (loc && !j.location.toLowerCase().includes(loc) && !(loc === 'remote' && j.remote)) return false;
    if (want.length && !want.every((w) => j.skills.some((s) => s.toLowerCase() === w))) return false;
    if (f.exp === 'fresher' && j.minYears !== null && j.minYears > 1) return false;
    if (f.exp === 'junior' && (j.minYears === null || j.minYears < 1 || j.minYears > 3)) return false;
    if (f.exp === 'experienced' && (j.minYears === null || j.minYears < 3)) return false;
    return true;
  }).map((j) => ({ ...j, ...matchJob(j, skillSet) }));
}

// Is a saved listing still in the provider's latest feed? Only meaningful for providers that return their whole feed (Remotive).
// The answer is always phrased as "listed / not listed in the feed", never "open / closed".
function listingStatus(saved, cacheBySource) {
  const p = PROVIDERS[saved.source];
  if (!p) return { text: 'Added manually - status unknown', known: false };
  const doc = cacheBySource[saved.source];
  if (!p.completeFeed) return { text: 'This source cannot confirm whether a listing is still open. Check the original link.', known: false };
  if (!doc || !doc.ok || !doc.items.length) return { text: 'Could not check right now (the source did not respond). Check the original link.', known: false };
  const listed = doc.items.some((j) => j.externalId === saved.externalId);
  return listed
    ? { text: `Still listed by ${p.label} as of ${doc.fetchedAt.toISOString().slice(0, 10)}. Confirm on the original page before applying.`, known: true, listed: true }
    : { text: `No longer in ${p.label}'s feed (checked ${doc.fetchedAt.toISOString().slice(0, 10)}). It may have closed or been removed.`, known: true, listed: false };
}

module.exports = { PROVIDERS, getAllJobs, filterJobs, matchJob, listingStatus, loadProvider, normalize, stripHtml, jobTypeOf, experienceOf, eligibilityOf };
