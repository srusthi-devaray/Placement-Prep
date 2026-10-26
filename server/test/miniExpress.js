// Tiny Express stand-in for tests when the real package is not installed.
// ---- minimal stand-ins for express / express-rate-limit (used only when the real packages are not installed) ----
function tryReal(name) { try { return require(name); } catch { return null; } }
function miniExpress() {
  const compile = (path) => { if (process.env.DBG) console.error('compile', JSON.stringify(path)); const keys = []; const re = new RegExp('^' + path.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'); return { re, keys }; };
  const mkRouter = () => {
    const routes = []; const uses = [];
    const add = (method) => (path, ...h) => { routes.push({ method, ...compile(path), h }); };
    const r = (req, res, next) => {
      const base = req.url.split('?')[0];
      const hit = routes.find((x) => x.method === req.method && x.re.test(base));
      if (!hit) return next();
      const m = base.match(hit.re); req.params = Object.fromEntries(hit.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const q = req.url.split('?')[1]; req.query = Object.fromEntries(new URLSearchParams(q || ''));
      let i = 0; const step = (err) => { if (err) return next(err); const f = hit.h[i++]; if (!f) return next(); try { f(req, res, step); } catch (e) { next(e); } }; step();
    };
    r.get = add('GET'); r.post = add('POST'); r.put = add('PUT'); r.patch = add('PATCH'); r.delete = add('DELETE'); r.use = (f) => uses.push(f);
    return r;
  };
  const ex = () => {
    const stack = []; const app = (req, res) => {
      res.status = (c) => { res.statusCode = c; return res; };
      res.set = (k, v) => { if (typeof k === 'object') Object.entries(k).forEach(([a2, b2]) => res.setHeader(a2, b2)); else res.setHeader(k, v); return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      let i = 0; const next = (err) => { const f = stack[i++]; if (!f) return res.status(404).json({ error: 'nf' });
        try { if (f.length === 4) return err ? f(err, req, res, next) : next(); if (err) return next(err); f(req, res, next); } catch (e) { next(e); } }; next();
    };
    app.use = (a, b) => { if (typeof a === 'string') { const r = b; stack.push((req, res, next) => { if (req.url.startsWith(a)) { const o = req.url; req.url = req.url.slice(a.length) || '/'; if (req.url[0] === '?') req.url = '/' + req.url; r(req, res, (e) => { req.url = o; next(e); }); } else next(); }); } else stack.push(a); };
    app.listen = (port) => require('http').createServer(app).listen(port);
    return app;
  };
  ex.Router = mkRouter;
  ex.json = () => (req, res, next) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { try { req.body = b ? JSON.parse(b) : {}; next(); } catch { res.status(400).json({ error: 'bad json' }); } }); };
  return ex;
}

module.exports = { tryReal, miniExpress };
