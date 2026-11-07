import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PREFIX = 'oopsie:v1:';
let cachedKey: Buffer | undefined;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  if (process.env.OOPSIE_MASTER_KEY) {
    const key = Buffer.from(process.env.OOPSIE_MASTER_KEY, 'base64');
    if (key.length !== 32) throw new Error('Invalid credential encryption key');
    return cachedKey = key;
  }
  // Native launcher supplies a Keychain key through its private stdin pipe.
  // This fallback supports browser development without global services.
  const dir = process.env.OOPSIE_DATA_DIR || join(homedir(), 'Library', 'Application Support', 'Oopsie Studio');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, 'browser-credential.key');
  try { writeFileSync(file, randomBytes(32), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const key = readFileSync(file);
  if (key.length !== 32) throw new Error('Invalid credential key file');
  return cachedKey = key;
}

export default class EncryptionService {
  encrypt(text: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', masterKey(), nonce);
    cipher.setAAD(Buffer.from(PREFIX));
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return PREFIX + Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  decrypt(data: string): string {
    if (!this.isEncrypted(data)) throw new Error('Unsupported credential encryption format');
    const bytes = Buffer.from(data.slice(PREFIX.length), 'base64');
    if (bytes.length < 28) throw new Error('Invalid encrypted credential');
    const decipher = createDecipheriv('aes-256-gcm', masterKey(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(PREFIX));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  }

  isEncrypted(data: string): boolean { return data.startsWith(PREFIX); }
  maskSensitiveData(data: string): string { return data ? '••••••••' : ''; }
}
