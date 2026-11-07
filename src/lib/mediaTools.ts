import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { realpath } from 'node:fs/promises';

export const runMedia = promisify(execFile);
export const mediaTool = (name: 'ffmpeg' | 'ffprobe') => process.env.OOPSIE_MEDIA_BIN ? path.join(process.env.OOPSIE_MEDIA_BIN, name) : name;
export async function publicMediaPath(value: string) {
  if (typeof value !== 'string' || /^\w+:/.test(value) || value.includes('\0')) throw new Error('A local media path is required');
  const root = await realpath(path.join(process.cwd(), 'public'));
  const file = await realpath(path.resolve(root, value.replace(/^\/+/, '')));
  if (!file.startsWith(root + path.sep)) throw new Error('Media path is outside the library');
  return file;
}
