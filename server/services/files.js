// Turn uploaded files into something the chatbot / resume analyzer can read.
const TEXT_EXT = /\.(txt|md|csv|json|js|jsx|ts|tsx|py|java|c|cpp|h|cs|go|php|rb|html|css|sql|xml|yml|yaml|log)$/i;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const clean = (t) => String(t || '').replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function kindOf(file) {
  const name = (file.originalname || '').toLowerCase();
  const type = file.mimetype || '';
  if (IMAGE_TYPES.has(type)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (type.startsWith('text/') || TEXT_EXT.test(name)) return 'text';
  return 'unsupported';
}

// Check the real file content, not just the name/MIME type the browser claimed.
function signatureOk(file, kind) {
  const b = file.buffer;
  if (!b || b.length < 4) return false;
  if (kind === 'pdf') return b.slice(0, 1024).toString('latin1').includes('%PDF-');
  if (kind === 'docx') return b[0] === 0x50 && b[1] === 0x4b;                                   // "PK" (zip container)
  if (kind === 'image') {
    const t = file.mimetype;
    if (t === 'image/png') return b[0] === 0x89 && b.slice(1, 4).toString() === 'PNG';
    if (t === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8;
    if (t === 'image/gif') return b.slice(0, 3).toString() === 'GIF';
    if (t === 'image/webp') return b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP';
    return false;
  }
  if (kind === 'text') return !b.slice(0, 2000).includes(0);                                      // no binary bytes in "text" files
  return false;
}

const withTimeout = (promise, ms, msg) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

async function extractText(file) {
  const kind = kindOf(file);
  if (kind === 'pdf') {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // the lib path avoids a debug-mode quirk in pdf-parse's index.js
    const data = await withTimeout(pdfParse(file.buffer, { max: 25 }), 20000, 'The PDF took too long to read');   // first 25 pages only
    return clean(data.text);
  }
  if (kind === 'docx') {
    const mammoth = require('mammoth');
    const result = await withTimeout(mammoth.extractRawText({ buffer: file.buffer }), 20000, 'The document took too long to read');
    return clean(result.value);
  }
  if (kind === 'text') return clean(file.buffer.toString('utf8'));
  return null;
}

module.exports = { kindOf, extractText, clean, signatureOk };
