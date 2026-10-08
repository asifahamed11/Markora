const { contextBridge, ipcRenderer } = require('electron');
const call = async (name, payload) => {
  const result = await ipcRenderer.invoke(`builder:${name}`, payload);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};
contextBridge.exposeInMainWorld('builder', {
  state: () => call('state'),
  chooseFolder: () => call('choose-folder'),
  studio: page => call('studio', page),
  botExpand: expanded => call('bot-expand', expanded),
  botMove: point => call('bot-move', point),
  quit: () => call('quit'),
  integration: enabled => call('integration', enabled),
  settings: data => call('settings', data),
  accountStatus:provider=>call('account-status',provider),accountLogin:provider=>call('account-login',provider),accountGuide:provider=>call('account-guide',provider),
  accountModels:provider=>call('account-models',provider),accountTest:data=>call('account-test',data),
  qualityCheck:()=>call('quality-check'),revisionReview:index=>call('revision-review',index),restoreRevision:index=>call('restore-revision',index),
  toolkitCheck:()=>call('toolkit-check'),toolkitSelect:id=>call('toolkit-select',id),toolkitExport:()=>call('toolkit-export'),toolkitSource:id=>call('toolkit-source',id),designReview:()=>call('design-review'),
  proposeRepair:id=>call('repair-propose',id),applyRepair:id=>call('repair-apply',id),discardRepair:()=>call('repair-discard'),
  projectEdit:command=>call('project-edit',command),projectFile:name=>call('project-file',name),openProjectFolder:()=>call('open-project-folder'),
  designConcept:data=>call('design-concept',data),theme:data=>call('theme',data),toolkitNotices:()=>call('toolkit-notices'),
  newProject:()=>call('new-project'),designStyle:style=>call('design-style',style),
  forgetKey: slot => call('forget-key', slot),
  chooseWhisper: kind => call('choose-whisper', kind),
  installVoice: quality => call('install-voice',quality),
  voiceFeedback: data=>call('voice-feedback',data),
  warmVoice: ()=>call('warm-voice'),testVoice: data=>call('test-voice',data),
  attach: () => call('attach'), removeDocument: name => call('remove-document', name),
  analyze: command => call('analyze', command), build: () => call('build'),
  edit: command => call('edit', command), cancel: () => call('cancel'),
  clearSelection: () => call('clear-selection'),
  selectionMode: mode => call('selection-mode', mode),
  startPenVoice: enabled => call('start-pen-voice', enabled),
  preview: () => call('preview'), pen: enabled => call('pen', enabled),
  undo: () => call('undo'), redo: () => call('redo'), export: () => call('export'),
  transcribe: bytes => call('transcribe', bytes),
  transcribeDetailed: bytes => call('transcribe-detailed',bytes),
  onEvent: callback => { const listener = (_, value) => callback(value); ipcRenderer.on('builder:event', listener); return () => ipcRenderer.removeListener('builder:event', listener); },
});
