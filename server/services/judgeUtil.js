// Output comparison shared by the judge and the problem build script.
// Ignores trailing spaces on each line and blank lines at the end; everything else must match exactly.
const normalize = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
module.exports = { normalize };
