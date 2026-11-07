import http from 'node:http';
import { readFile, mkdir, stat, realpath, chmod } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import next from 'next';
import { createSessionGuard } from './auth.mjs';

const rl = readline.createInterface({ input: process.stdin, terminal: false });
const bootstrap = await Promise.race([
  new Promise(resolve => rl.once('line', line => resolve(JSON.parse(line)))),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Native bootstrap timed out')), 15000).unref()),
]);
rl.close();
if (!/^[a-f0-9]{64}$/.test(bootstrap.secret) || Buffer.from(bootstrap.masterKey || '', 'base64').length !== 32) throw new Error('Invalid bootstrap');
process.env.OOPSIE_MASTER_KEY = bootstrap.masterKey;
process.env.OOPSIE_DATA_DIR = bootstrap.dataDir;
process.env.DATABASE_URL = `file:${path.join(bootstrap.dataDir, 'studio.db')}`;
process.env.NEXT_TELEMETRY_DISABLED = '1';
const appDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
await mkdir(path.join(bootstrap.dataDir, 'public'), { recursive: true, mode: 0o700 });
await chmod(bootstrap.dataDir, 0o700);
const database = new DatabaseSync(path.join(bootstrap.dataDir, 'studio.db'));
database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS desktop_migrations (version INTEGER PRIMARY KEY);');
if (!database.prepare('SELECT version FROM desktop_migrations WHERE version=1').get()) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  database.exec('BEGIN IMMEDIATE;');
  try { database.exec(schema); database.exec('INSERT INTO desktop_migrations VALUES (1); COMMIT;'); }
  catch (error) { database.exec('ROLLBACK;'); throw error; }
}
if (!database.prepare('SELECT version FROM desktop_migrations WHERE version=2').get()) {
  database.exec('BEGIN IMMEDIATE;');
  try { database.exec(await readFile(new URL('./002-registries.sql', import.meta.url), 'utf8')); database.exec('INSERT INTO desktop_migrations VALUES (2); COMMIT;'); }
  catch (error) { database.exec('ROLLBACK;'); throw error; }
}
database.close();
await chmod(path.join(bootstrap.dataDir, 'studio.db'), 0o600);
process.chdir(bootstrap.dataDir);
// Prisma and API routes retain their writable cwd, while Next assets come from the bundle.
const app = next({ dev: false, dir: appDir, hostname: '127.0.0.1', port: 0 });
await app.prepare();
const handler = app.getRequestHandler();
const auth = createSessionGuard(bootstrap.secret);
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webm':'video/webm', '.flac':'audio/flac', '.m4a':'audio/mp4' };
const server = http.createServer(async (req, res) => {
  try {
    if (!auth.handle(req, res, server.address().port)) return;
    const url = new URL(req.url, 'http://127.0.0.1');
    // Existing editors write these directories; never serve arbitrary Application Support files.
    if (/^\/(results|exports|downloads|thumbnails|audio|upload|generations)\//.test(url.pathname)) {
      const publicDir = path.join(bootstrap.dataDir, 'public');
      const file = await realpath(path.resolve(publicDir, '.' + decodeURIComponent(url.pathname)));
      if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404).end(); return; }
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      res.writeHead(range ? 206 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': end - start + 1, 'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}) });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
      return;
    }
    await handler(req, res);
  } catch { if (!res.headersSent) res.writeHead(500); res.end('Local request failed'); }
});
server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`OOPSIE_READY ${JSON.stringify({ port: server.address().port })}\n`);
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
