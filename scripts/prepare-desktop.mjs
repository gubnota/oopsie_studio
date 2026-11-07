import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import sharp from 'sharp';
const icons = 'src-tauri/icons';
const iconset = `${icons}/Oopsie.iconset`;
await mkdir(iconset, { recursive: true });
const svg = await readFile('public/oopsie.svg');
for (const size of [16, 32, 128, 256, 512]) for (const scale of [1, 2]) await sharp(svg).resize(size * scale).png().toFile(`${iconset}/icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`);
const chunks = [];
for (const [type, size] of [['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]]) {
  const png = await sharp(svg).resize(size).png().toBuffer();
  const header = Buffer.alloc(8); header.write(type); header.writeUInt32BE(png.length + 8, 4);
  chunks.push(header, png);
}
const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(chunks.reduce((n, c) => n + c.length, 8), 4);
await writeFile(`${icons}/icon.icns`, Buffer.concat([header, ...chunks]));
for (const [name, size] of [['32x32.png', 32], ['128x128.png', 128], ['128x128@2x.png', 256]]) await sharp(svg).resize(size).png().toFile(`${icons}/${name}`);
await rm(iconset, { recursive: true, force: true });
console.log('Prepared desktop icons; no runtime is bundled.');
