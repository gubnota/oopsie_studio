import {readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const app = path.resolve(process.argv[2] || 'src-tauri/target/release/bundle/macos/Oopsie Studio.app');
let bytes = 0, files = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    if (/^(node|node_modules|\.next|ffmpeg|ffprobe|chrome.*|chromium.*)$/i.test(entry.name)) throw new Error(`Forbidden bundled runtime: ${entry.name}`);
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else { bytes += (await stat(file)).size; files++; }
  }
}
await walk(app);
if (bytes > 50 * 1024 * 1024) throw new Error(`Bundle exceeds 50 MiB: ${bytes}`);
execFileSync('codesign', ['--verify', '--deep', '--strict', app]);
console.log(JSON.stringify({app, bytes, MiB: +(bytes/1024/1024).toFixed(2), files, codesign:'valid ad-hoc', bundledNode:false}));
