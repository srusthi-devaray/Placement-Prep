// Small shared helpers.

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Express 4 does not catch errors thrown inside async handlers - this wrapper forwards them to the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Copy only whitelisted keys (prevents users from setting fields like "user" or "_id" themselves).
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

// Always turn user input into a trimmed string (also blocks NoSQL operator objects like {"$gt": ""}).
const str = (v, max = 5000) => (v === undefined || v === null || typeof v === 'object' ? '' : String(v).trim().slice(0, max));

const todayUTC = () => new Date().toISOString().slice(0, 10);
const validDay = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? String(s) : null);

// Accepts only http(s) links (blocks javascript:, data:, file: ...). Returns '' for empty input, throws a 400 for anything invalid.
const safeUrl = (v, label = 'Link') => {
  const t = str(v, 300);
  if (!t) return '';
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`); } catch { throw new HttpError(400, `${label} is not a valid web address`); }
  if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new HttpError(400, `${label} must be a normal http(s) web address`);
  return u.toString();
};

module.exports = { safeUrl, HttpError, wrap, pick, str, todayUTC, validDay };
