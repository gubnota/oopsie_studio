import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const {version} = JSON.parse(await readFile('package.json', 'utf8'));
const config = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8'));
if (config.version !== version) throw new Error('Desktop/package version mismatch');
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Release packaging requires macOS arm64');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${version}`) throw new Error('Release tag must match package version');
const app = path.resolve('src-tauri/target/release/bundle/macos/Oopsie Studio.app');
execFileSync(process.execPath, ['scripts/audit-desktop.mjs', app], {stdio:'inherit'});
await mkdir('release', {recursive:true});
const filename = `Oopsie-Studio-${version}-macOS-arm64.zip`;
execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, path.resolve('release', filename)]);
const checksum = createHash('sha256').update(await readFile(path.join('release', filename))).digest('hex');
await writeFile('release/SHA256SUMS.txt', `${checksum}  ${filename}\n`);
console.log(`Packaged release/${filename}`);
