import { safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite } from '../core/project.js';
export class Vault {
  constructor(directory) { this.directory = directory; }
  available() { return safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'); }
  file(name) {
    if (!['openai', 'anthropic', 'gemini', 'openrouter', 'speech'].includes(name)) throw new Error('Invalid key slot.');
    return path.join(this.directory, `${name}.secret`);
  }
  async put(name, key) {
    if (!this.available()) throw new Error('The OS secure store is unavailable. Configure a system keychain before saving API keys.');
    if (typeof key !== 'string' || key.length > 2000) throw new Error('Invalid API key.');
    await atomicWrite(this.file(name), safeStorage.encryptString(key.trim()));
  }
  async get(name) {
    if (!this.available()) throw new Error('The OS secure store is unavailable.');
    try { return safeStorage.decryptString(await fs.readFile(this.file(name))); }
    catch (e) { if (e.code === 'ENOENT') return ''; throw new Error('Could not unlock the saved API key. Re-enter it in Settings.'); }
  }
  async has(name) { try { await fs.access(this.file(name)); return true; } catch { return false; } }
  async remove(name) { await fs.rm(this.file(name), { force: true }); }
}
