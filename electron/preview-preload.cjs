const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('magicPen', {
  select: id => ipcRenderer.send('preview:select', id),
  state: () => ipcRenderer.invoke('preview:state'),
  action: payload=>ipcRenderer.send('preview:voice-action',payload),
  onState: callback => { const listener = (_, enabled) => callback(enabled); ipcRenderer.on('preview:pen', listener); return () => ipcRenderer.removeListener('preview:pen', listener); },
});
