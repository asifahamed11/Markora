import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
// A narrow Windows fallback for transparent-window stacking. Only the HWND
// belonging to our pet is accepted; this helper never locates other windows.
export async function pinFloatingWindow(window){
  window.setAlwaysOnTop(false);window.setAlwaysOnTop(true,'floating');
  if(window.isAlwaysOnTop()||process.platform!=='win32')return window.isAlwaysOnTop();
  const handle=window.getNativeWindowHandle();const hwnd=handle.length===8?handle.readBigUInt64LE().toString():String(handle.readUInt32LE());
  const script=`Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class EasyWebFloat { [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags); [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr Style(IntPtr h, int index); }'; $h=[IntPtr]::new([long]$env:EASY_WEB_PET_HWND); if(-not [EasyWebFloat]::SetWindowPos($h,[IntPtr]::new(-1),0,0,0,0,19)){throw 'Could not keep the pet above other windows.'}; if(([EasyWebFloat]::Style($h,-20).ToInt64() -band 8) -eq 0){throw 'The desktop did not apply the floating style.'}`;
  await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:15000,env:{...process.env,EASY_WEB_PET_HWND:hwnd}});
  return true;
}
