import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionGuard } from '../desktop/auth.mjs';

function request(guard, url, headers = {}, method = 'GET') {
  const response = { code: 200, headers: {}, writeHead(code, h) { this.code = code; this.headers = h || {}; return this; }, end() {} };
  const allowed = guard.handle({ url, method, headers: { host: '127.0.0.1:43210', ...headers } }, response, 43210);
  return { allowed, ...response };
}

test('bootstrap is origin bound, one use, and protects reads and mutations', () => {
  const guard = createSessionGuard('a'.repeat(64));
  assert.equal(request(guard, '/api/settings').code, 401);
  assert.equal(request(guard, '/api/settings', { host: 'evil.test' }).code, 403);
  assert.equal(request(guard, '/__oopsie/bootstrap', { 'x-oopsie-bootstrap': 'a'.repeat(64) }, 'POST').code, 403);
  const headers = { origin: 'http://127.0.0.1:43210', 'x-oopsie-bootstrap': 'a'.repeat(64) };
  const result = request(guard, '/__oopsie/bootstrap', headers, 'POST');
  assert.equal(result.code, 204);
  assert.match(result.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/);
  assert.equal(request(guard, '/__oopsie/bootstrap', headers, 'POST').code, 403);
  const cookie = result.headers['Set-Cookie'].split(';')[0];
  assert.equal(request(guard, '/api/settings', { cookie }).allowed, true);
  assert.equal(request(guard, '/api/settings', { cookie }, 'POST').code, 403);
  assert.equal(request(guard, '/api/settings', { cookie, origin: 'https://evil.test' }).code, 403);
  assert.equal(request(guard, '/api/settings', { cookie, origin: headers.origin }, 'POST').allowed, true);
});
