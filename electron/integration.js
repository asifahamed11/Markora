import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
export const contextKeys = [
  'HKCU\\Software\\Classes\\Directory\\shell\\EasyWebAIBot',
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\EasyWebAIBot',
];
export function contextCommand(executable, placeholder) {
  if (/["\r\n]/.test(executable) || !['%1', '%V'].includes(placeholder)) throw new Error('Invalid Explorer command.');
  return `"${executable}" --folder "${placeholder}\\."`;
}
export async function setIntegration(enabled, executable, runner = run) {
  if (process.platform !== 'win32') throw new Error('Explorer integration is available on Windows.');
  for (let index = 0; index < contextKeys.length; index++) {
    const key = contextKeys[index];
    if (!enabled) { try { await runner('reg.exe', ['delete', key, '/f'], { windowsHide: true }); } catch { /* Already absent. */ } continue; }
    await runner('reg.exe', ['add', key, '/ve', '/t', 'REG_SZ', '/d', 'Open with Markora', '/f'], { windowsHide: true });
    await runner('reg.exe', ['add', key, '/v', 'Icon', '/t', 'REG_SZ', '/d', executable, '/f'], { windowsHide: true });
    await runner('reg.exe', ['add', `${key}\\command`, '/ve', '/t', 'REG_SZ', '/d', contextCommand(executable, index === 0 ? '%1' : '%V'), '/f'], { windowsHide: true });
  }
}
