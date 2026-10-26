// Sends email through an HTTPS email API (works on hosts that block SMTP ports, such as Render's free plan).
// Supported: Brevo (BREVO_API_KEY) or Resend (RESEND_API_KEY). Set MAIL_FROM to an address you verified with the provider.
// If neither key is set, email features are simply switched off.
const isConfigured = () => !!((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.MAIL_FROM);

const fromParts = () => {
  const m = String(process.env.MAIL_FROM || '').match(/^(.*)<([^>]+)>\s*$/);
  return m ? { name: m[1].trim().replace(/^"|"$/g, '') || 'Placement Prep', email: m[2].trim() } : { name: 'Placement Prep', email: String(process.env.MAIL_FROM).trim() };
};

async function send({ to, subject, html }) {
  if (!isConfigured()) throw new Error('Email is not configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res;
    if (process.env.BREVO_API_KEY) {
      const f = fromParts();
      res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: f, to: [{ email: to }], subject, htmlContent: html })
      });
    } else {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: ctrl.signal,
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html })
      });
    }
    if (!res.ok) throw new Error(`Email provider error (${res.status})`);
  } finally { clearTimeout(timer); }
}

module.exports = { isConfigured, send };
