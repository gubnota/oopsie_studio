import { timingSafeEqual, randomBytes } from 'node:crypto';

const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function createSessionGuard(bootstrapSecret) {
  const session = randomBytes(32).toString('hex');
  let bootstrapped = false;
  return {
    session,
    handle(req, res, port) {
      const host = `127.0.0.1:${port}`;
      const origin = `http://${host}`;
      const deny = (code = 403) => { res.writeHead(code, { 'Cache-Control': 'no-store' }); res.end('Request denied'); return false; };
      if (req.headers.host !== host || req.headers['sec-fetch-site'] === 'cross-site') return deny();
      if (req.headers.origin && req.headers.origin !== origin) return deny();
      const url = new URL(req.url, origin);
      if (url.pathname === '/__oopsie/bootstrap') {
        if (req.method !== 'POST' || req.headers.origin !== origin || bootstrapped || !equal(req.headers['x-oopsie-bootstrap'], bootstrapSecret)) return deny();
        bootstrapped = true;
        res.writeHead(204, { 'Set-Cookie': `oopsie_session=${session}; HttpOnly; SameSite=Strict; Path=/`, 'Cache-Control': 'no-store' });
        res.end(); return false;
      }
      const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('oopsie_session='))?.slice(15);
      if (!equal(cookie, session)) {
        if (req.method === 'GET' && url.pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; connect-src 'self'; style-src 'unsafe-inline'" });
          res.end('<html><meta name="color-scheme" content="dark"><title>Oopsie Studio</title><body style="background:#0a0a14;color:#c3c3d6;font:14px system-ui;padding:40px">Starting Oopsie Studio…</body></html>');
          return false;
        }
        return deny(401);
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin && !equal(req.headers['x-oopsie-internal'], session)) return deny();
      return true;
    },
  };
}
