import {workspaceDesign} from '../core/design-context.js';
import {petPosition} from '../core/pet-position.js';
import { app, BrowserWindow, dialog, ipcMain, session, screen, shell, nativeImage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createServer,loadConfigFromFile } from 'vite';
import { z } from 'zod';
import { Vault } from './vault.js';
import { Project, atomicWrite } from '../core/project.js';
import { Engine } from '../core/engine.js';
import {ReactProject} from '../core/react-project.js';
import {ReactEngine} from '../core/react-engine.js';
import {reactRuntime,previewCache} from '../core/react-runtime.js';
import { parseDocument, documentContext } from '../core/documents.js';
import { providerModels } from '../core/providers.js';
import { transcribe, closeSpeech, warmSpeech } from '../core/speech.js';
import { installVoice } from '../core/voice-setup.js';
import { folderArgument, readWorkspace } from '../core/workspace.js';
import { setIntegration } from './integration.js';
import { pinFloatingWindow } from './floating.js';
import {TextRange} from '../core/schemas.js';
import {validateTextRange} from '../core/text-selection.js';
import {FileProject} from '../core/file-project.js';
import {GeneralEngine} from '../core/general-engine.js';
import {detectWorkspaceKind,analyzeAutomatically} from '../core/auto-intent.js';
import {prepareDocuments} from '../core/document-input.js';
import {accountProviders,accountStatus,loginAccount,accountModels,requestAccountJSON} from '../core/accounts.js';
import {assertAccountActivation,mergeAccountStatus,savedAccountChecks,restoreAccountChecks} from '../core/account-activation.js';
import {checkProject,revisionChanges,compactDiff} from '../core/quality.js';
import {validateCSS,replaceTarget} from '../core/content.js';
import {VisualContext} from '../core/visual-context.js';
import {ExistingProject,ExistingEngine,detectExisting} from '../core/existing-project.js';
import {integrationCatalog,toolkitDefaults} from '../core/skill-pack.js';
import {afterChangeHook,hookCatalog} from '../core/toolkit-hooks.js';
import {runBrowserHarness} from '../core/browser-harness.js';
import {themes} from '../core/theme.js';
import {knowledgeManifest} from '../core/knowledge.js';
import {optimizeLocalImages} from '../core/local-assets.js';
import {previewPolicy,generatedRequestAllowed} from '../core/preview-policy.js';
import {reviewDesign} from '../core/design-review.js';
import {componentEvidence} from '../core/component-pack.js';
import {normalizedNativeImage} from '../core/image-orientation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiFile = path.join(root, 'ui', 'dist', 'index.html');
const uiURL = pathToFileURL(uiFile).href;
const botFile = path.join(root, 'ui', 'dist', 'bot.html');
const botURL = pathToFileURL(botFile).href;
// Keep the original encrypted vault, account tool homes and downloaded voice files.
// This storage identifier is stable across the public-name change.
app.setPath('userData', path.join(app.getPath('appData'), 'easy-web-ai'));
app.setName('Markora');
const customData = app.commandLine.getSwitchValue('data-dir');
if (customData) app.setPath('userData', path.resolve(customData));
const isTest = process.env.EASY_WEB_AI_TEST === '1' && !app.isPackaged;
if (isTest && process.env.EASY_WEB_AI_DATA) app.setPath('userData', path.resolve(process.env.EASY_WEB_AI_DATA));
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
// The pet's transparent native window does not need GPU rendering; software
// rendering also avoids driver resets while mapping its floating window.
app.disableHardwareAcceleration();
const studioMode = app.commandLine.hasSwitch('studio');
let pendingFolder = folderArgument(process.argv), workspaceFolder, workspaceWarnings = [], workspaceInventory;
let mainWindow, botWindow, previewWindow, server, project, vault, config, quitting = false;
let requestMetrics=[];
let documents = [], analysis, selected, busy = false, controller, penEnabled = false, lastStatus = { phase: 'idle', message: 'Ready when you are.', progress: 0 };
let bridgeToken, penVersion=0, selectionMode='auto';
let botMode='closed';
const accountConnections={};
let qualityReport,repairProposal,browserReport,hookResult,skillUsage;
let voiceFeedback={phase:'off',message:'Mark a part of the page.',transcript:''};
const voiceLifetime=new AbortController();
function previewState(){return {enabled:penEnabled,version:penVersion,busy,selectionMode:project?.kind==='existing'?'element':selectionMode,sourceMode:['existing','react'].includes(project?.kind),textSource:project?.kind==='react',voice:voiceFeedback,selectedId:selected?.id||null,selection:selected||null,history:project?.history};}
function previewUpdate(){penVersion++;if(previewWindow&&!previewWindow.isDestroyed())previewWindow.webContents.send('preview:pen',previewState());}
const feedbackSchema=z.object({phase:z.enum(['off','starting','listening','transcribing','review','editing','ready','error','cancelled']),message:z.string().max(500),transcript:z.string().max(6000),autoApply:z.boolean().optional()});
const voiceActionSchema=z.object({action:z.enum(['finish','retry','stop','apply','correct','undo','redo','browse','clear','speak','fix']),text:z.string().max(6000).optional(),targetKey:z.string().max(100).optional()});
async function previewAction(payload){
  const action=voiceActionSchema.parse(payload);
  if(action.action==='fix'){
    if(!selected||!action.targetKey||action.targetKey!==selected.key)throw new Error('Your selection changed. Mark it again.');
    if(['listening','starting','transcribing','editing'].includes(voiceFeedback.phase))throw new Error('Stop voice capture before using a quick action.');
    try{const result=await operation(signal=>applySelected({command:action.text,targetId:selected.id,targetKey:action.targetKey},signal));voiceFeedback={phase:'ready',message:result,transcript:''};previewUpdate();return result;}
    catch(error){voiceFeedback={phase:'error',message:error.message.slice(0,500),transcript:''};previewUpdate();throw error;}
  }
  if(!botWindow||botWindow.isDestroyed())return;botWindow.webContents.send('builder:event',{kind:'voice-action',...action});
}
const configSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'openrouter', 'ollama', 'demo','chatgpt','claude-code','google-account']), model: z.string().min(1).max(150),
  projectMode:z.enum(['auto','website','react','project','existing']).optional(),websiteStyle:z.enum(['auto','editorial','studio','technical']).optional(),
  speech: z.enum(['local', 'openai']), autoBuild: z.boolean(),
  speechLanguage: z.enum(['auto','en','bn','mixed']).optional(),
  microphoneId:z.string().max(200).optional(),speechPause:z.union([z.literal(1600),z.literal(2200),z.literal(3200),z.literal(0)]).optional(),voiceReview:z.boolean().optional(),
  previewBrowser: z.enum(['system','embedded']).optional(),
  toolkit:z.object({design:z.boolean(),react:z.boolean(),testing:z.boolean(),autoCheck:z.boolean()}).optional(),
  key: z.string().max(2000).optional(), speechKey: z.string().max(2000).optional(),
});
const defaults = { toolkit:toolkitDefaults, provider: 'google-account', model: providerModels['google-account'], speech: 'local',speechLanguage:'auto',voiceQuality:'bangla',speechPause:2200,voiceReview:false, autoBuild: false, previewBrowser:'system',whisperBinary: '', whisperModel: '' };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
async function persistSettings() { await atomicWrite(settingsFile(), JSON.stringify(config, null, 2)); }
function emit(event) {
  if(event.kind==='request-measured'){requestMetrics.push({...event,at:Date.now()});requestMetrics=requestMetrics.slice(-40);}
  if(event.kind==='skills-used')skillUsage={mode:'ai',ids:event.skills,phase:lastStatus.phase,at:new Date().toISOString(),budget:event.budget};
  if(event.kind==='guidance-local')skillUsage={mode:'local',ids:[],phase:lastStatus.phase,at:new Date().toISOString()};
  if(event.kind==='busy'&&event.busy){skillUsage=undefined;}

  if (event.phase) lastStatus = { ...event, busy };
  if(['selected','busy'].includes(event.kind))previewUpdate();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('builder:event', event);
  if (botWindow && !botWindow.isDestroyed()) botWindow.webContents.send('builder:event', event);
}
function trustedUI(event) { return [[mainWindow, uiURL], [botWindow, botURL]].some(([win,url]) => win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && event.senderFrame.url === url); }
function trustedPreview(event) { try{return previewWindow && !previewWindow.isDestroyed() && event.sender === previewWindow.webContents && event.senderFrame === previewWindow.webContents.mainFrame && new URL(event.senderFrame.url).origin === new URL(server?.resolvedUrls?.local?.[0]).origin;}catch{return false;} }
function idle() { if (busy) throw new Error('Wait for the current step to finish, or cancel it.'); }
async function operation(fn) {
  idle(); busy = true; controller = new AbortController(); emit({ kind: 'busy', busy });
  const began=Date.now(),heartbeat=setInterval(()=>emit({kind:'operation-progress',elapsedSeconds:Math.round((Date.now()-began)/1000),message:`${lastStatus.message} · ${Math.round((Date.now()-began)/1000)}s elapsed`}),5000);
  try { return await fn(controller.signal); }
  catch (error) {
    const cancelled = controller.signal.aborted;
    emit({ phase: cancelled ? 'cancelled' : 'error', message: cancelled ? 'Cancelled. Your existing files are saved.' : error.message, progress: 0 });
    throw new Error(cancelled ? 'Cancelled.' : error.message);
  } finally { clearInterval(heartbeat);busy = false; controller = undefined; emit({ kind: 'busy', busy }); }
}
async function engineOptions(signal,extra={}) {return {config:{...config,designDocument:await workspaceDesign(workspaceFolder),accountDirectory:app.getPath('userData'),...extra},key:['demo','ollama',...accountProviders].includes(config.provider)?'':await vault.get(config.provider),emit,signal};}
async function engine(signal,captureVisual) { const Constructor=['existing','react'].includes(project?.kind)?ExistingEngine:project?.kind==='project'||config.projectMode==='project'?GeneralEngine:Engine;return new Constructor({...await engineOptions(signal),captureVisual}); }
async function captureSelection() {
  if(selected?.captureSource!=='embedded'||!['chatgpt','openai'].includes(config.provider)||!previewWindow||previewWindow.isDestroyed())return undefined;
  const wc=previewWindow.webContents;
  try {
    await wc.executeJavaScript(`(()=>{const host=document.getElementById('__magic_pen_host');if(host){host.dataset.captureDisplay=host.style.display;host.style.display='none';}})()`);
    const image=await wc.capturePage();if(image.isEmpty())return undefined;
    const size=image.getSize(),factor=Math.min(1,1280/size.width,900/size.height),resized=image.resize({width:Math.round(size.width*factor),height:Math.round(size.height*factor)});
    emit({kind:'visual-context',message:'Preview image and selected layout attached automatically.'});return {mime:'image/png',data:resized.toPNG().toString('base64')};
  } catch { return undefined; }
  finally { if(!wc.isDestroyed())await wc.executeJavaScript(`(()=>{const host=document.getElementById('__magic_pen_host');if(host){host.style.display=host.dataset.captureDisplay||'';delete host.dataset.captureDisplay;}})()`).catch(()=>{}); }
}
function expandBot(value) {
  if (!botWindow || botWindow.isDestroyed()) return;
  const mode=typeof value==='boolean'?(value?'tools':'closed'):value;
  if(!['tools','input','voice','closed'].includes(mode))throw new Error('Invalid bot view.');
  botMode=mode;const expanded=mode!=='closed';
  const old = botWindow.getBounds(), area = screen.getDisplayMatching(old).workArea;
  const width = mode==='input'?362:mode==='voice'?352:mode==='tools'?332:156, height = mode==='input'?Math.min(670,area.height-24):mode==='voice'?Math.min(580,area.height-24):mode==='tools'?440:182;
  botWindow.setBounds({x:Math.max(area.x,Math.min(old.x+old.width-width,area.x+area.width-width)),y:Math.max(area.y,Math.min(old.y+old.height-height,area.y+area.height-height)),width,height});
  emit({kind:'bot-expanded',expanded,mode});
}
function showStudio(page) {
  if(page==='hide'){if(!studioMode)mainWindow.hide();return;}
  if(!studioMode&&page?.startsWith('settings')){const area=screen.getPrimaryDisplay().workArea;mainWindow.setMinimumSize(640,620);mainWindow.setSize(Math.min(780,area.width-48),Math.min(820,area.height-48));mainWindow.center();}
  mainWindow.show();mainWindow.focus();emit({kind:'studio-page',page});
}
async function openWorkspace(directory, signal) {
  const input = await readWorkspace(directory, emit, signal); signal?.throwIfAborted();
  if (server) { await server.close(); server = undefined; }
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
  workspaceFolder=input.folder; documents=input.documents; workspaceWarnings=input.warnings;workspaceInventory=input.inventory;
  analysis=undefined; selected=undefined; project=undefined; penEnabled=false;selectionMode='auto';
  config.projectMode=await detectWorkspaceKind(workspaceFolder,config);
  if(config.projectMode==='react'){
    project=await new ReactProject(workspaceFolder,historyEvent,{inPlace:true}).init();
    config.workspaceFolder=workspaceFolder;await persistSettings();
    emit({kind:'workspace',workspaceFolder,documents:documents.map(({name,chars,kind})=>({name,chars,kind})),inventory:workspaceInventory,warnings:workspaceWarnings});
    emit({phase:'idle',message:'Your React website is ready. Open preview to mark and edit.',progress:0});return publicState();
  }
  if(config.projectMode==='existing'){
    project=await new ExistingProject(workspaceFolder,historyEvent).init();
    config.workspaceFolder=workspaceFolder;await persistSettings();
    emit({kind:'workspace',workspaceFolder,documents:[],warnings:workspaceWarnings});
    emit({phase:'idle',message:'Existing React/Vite source loaded. Open preview, choose Element, then mark and speak your fix.',progress:0});return publicState();
  }
  const general=config.projectMode==='project',saved=(general?config.workspaceGeneralProjects:config.workspaceProjects)?.[workspaceFolder];
  const rootHistory=path.join(workspaceFolder,'.easy-web-ai',general?'project-history.json':'website-history.json');
  let inPlace=false;try{await fs.access(rootHistory);inPlace=true;}catch{}
  if (inPlace || saved && /^easy-web-ai-(website|project)-[a-f0-9-]{36}$/.test(saved)) {
    try { project=await new (general?FileProject:Project)(inPlace?workspaceFolder:path.join(workspaceFolder,saved),historyEvent,{inPlace}).init(); } catch (error) { workspaceWarnings.push(`Previous project could not be restored: ${error.message}`); }
  }
  config.workspaceFolder=workspaceFolder; await persistSettings();
  emit({kind:'workspace',workspaceFolder,documents:documents.map(({name,chars,kind})=>({name,chars,kind})),inventory:workspaceInventory,warnings:workspaceWarnings});
  emit({phase:'idle',message:documents.length?`${documents.length} inputs found${documents.some(doc=>doc.kind==='image')?' (including images, read during planning)':''}. Tell me what to create.`:workspaceInventory?.files?`${workspaceInventory.files} files found. Tell me what to create or change.`:'This folder is empty. Tell me what to create.',progress:0});
  return publicState();
}
app.on('second-instance', (_event, args) => {
  const folder=folderArgument(args);
  if (!config) { if(folder)pendingFolder=folder; return; }
  botWindow?.show(); expandBot(true);
  if(folder)operation(signal=>openWorkspace(folder,signal)).catch(error=>emit({kind:'notice',message:error.message}));
  else if(studioMode)showStudio('workspace');
});
async function startPreview() {
  if (!project) throw new Error('Create a plan and build a website first.');
  if(project.kind==='project'){showStudio('workspace');emit({kind:'project-files'});return project.public;}
  if (!server) {
    bridgeToken=randomUUID();
    const penScript = await fs.readFile(path.join(root, 'preview', 'pen.js'), 'utf8');
    const penStyle = await fs.readFile(path.join(root, 'preview', 'pen.css'), 'utf8');
    const selectionScript = await fs.readFile(path.join(root, 'preview', 'selection.js'), 'utf8');
    const existing=project.kind==='existing',react=project.kind==='react',source=existing||react;let originalConfig={},runtime;
    if(react){runtime=await reactRuntime(app.getPath('userData'));originalConfig={envDir:false,cacheDir:path.join(runtime.cacheDir,previewCache(project.public)),resolve:{alias:runtime.aliases},optimizeDeps:{include:['react','react/jsx-runtime','react/jsx-dev-runtime','react-dom/client','scheduler']},oxc:{jsx:{runtime:'automatic'}}};}
    if(existing){
      try{await fs.access(path.join(project.directory,'node_modules','react'));}catch{throw new Error('Install this project dependencies first (npm install in its folder), then open preview.');}
      for(const name of ['vite.config.ts','vite.config.js','vite.config.mts','vite.config.mjs','vite.config.cjs','vite.config.cts']){
        const file=path.join(project.directory,name);if(await fs.access(file).then(()=>true,()=>false)){originalConfig=(await loadConfigFromFile({command:'serve',mode:'development'},file,project.directory))?.config||{};break;}
      }
    }
    server = await createServer({
      ...originalConfig,
      root: existing?path.resolve(project.directory,originalConfig.root||'.'):project.previewRoot||project.public, configFile: false, logLevel: 'error', clearScreen: false,
      // Revisions trigger one explicit reload after publication; filesystem events
      // would also reload intermediate files and race that completed revision.
      server: { host: '127.0.0.1', port: 0, strictPort: false, cors: false, watch: { ignored: source?[]:['**/index.html', '**/styles.css'] }, fs: { strict: true, allow: [project.previewRoot||project.public,...(runtime?[runtime.root]:[])] }, headers: { 'Content-Security-Policy': source ? "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:*; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'" : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:*; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'" } },
      plugins: [...(source?[project.mappingPlugin(),...(originalConfig.plugins||[])]:[]),{ name: 'magic-pen', hotUpdate(){if(react&&project.publication)return [];}, configureServer(vite) {
        if(react)vite.middlewares.use((req,res,next)=>{res.setHeader('Content-Security-Policy',previewPolicy(vite.resolvedUrls?.local?.[0]||'http://127.0.0.1:5173'));Promise.resolve(project.publication).then(()=>{if(!generatedRequestAllowed(req.url,project.state.files,runtime)){res.statusCode=404;res.end('This file is not part of the website preview.');return;}next();},next);});
        vite.middlewares.use('/__builder_pen.js', (_req, res) => { res.setHeader('Content-Type', 'text/javascript'); res.end(penScript); });
        vite.middlewares.use('/__builder_pen.css', (_req, res) => { res.setHeader('Content-Type', 'text/css'); res.end(penStyle); });
        vite.middlewares.use('/__builder_selection.js', (_req, res) => { res.setHeader('Content-Type', 'text/javascript'); res.end(selectionScript); });
        vite.middlewares.use('/__builder_bridge', (req,res) => {
          const url=new URL(req.url,'http://127.0.0.1');
          const origin=server?.resolvedUrls?.local?.[0];
          res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
          if(url.searchParams.get('token')!==bridgeToken||!origin||(req.headers.origin&&req.headers.origin!==new URL(origin).origin)){res.statusCode=403;res.end('{"error":"Unauthorized preview"}');return;}
          if(req.method==='GET'&&url.pathname==='/state'){res.end(JSON.stringify(previewState()));return;}
          if(req.method!=='POST'||!['/select','/voice-action'].includes(url.pathname)){res.statusCode=404;res.end('{}');return;}
          void(async()=>{
            req.setEncoding('utf8');
            let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536){res.statusCode=413;res.end('{}');return;}}
            const payload=JSON.parse(body);if(url.pathname==='/select')chooseElement(payload);else await previewAction(payload);res.end('{"ok":true}');
          })().catch(error=>{res.statusCode=400;res.end(JSON.stringify({error:error.message||'Invalid selection'}));});
        });
      }, transformIndexHtml() { return [{ tag: 'script', attrs: { type: 'module', src: '/__builder_pen.js' }, injectTo: 'body' }]; } }],
    });
    await server.listen();
  }
  if(config.previewBrowser==='system'){
    const url=`${server.resolvedUrls.local[0]}?__builder=${bridgeToken}`;
    await shell.openExternal(url);return url;
  }
  if (!previewWindow || previewWindow.isDestroyed()) {
    // Requests/navigation can finish after a folder switch or shutdown clears
    // the current server. Keep this window's allowed address immutable.
    const previewOrigin=server.resolvedUrls.local[0];
    previewWindow = new BrowserWindow({ width: 1120, height: 820, title: 'Your website · Markora', backgroundColor: '#f6f6ee', webPreferences: { preload: path.join(root, 'electron', 'preview-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, partition: 'preview' } });
    previewWindow.setMenuBarVisibility(false);
    previewWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    previewWindow.webContents.on('will-navigate', (event, url) => { try{if (new URL(url).origin !== new URL(previewOrigin).origin) event.preventDefault();}catch{event.preventDefault();} });
    previewWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    previewWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const allowed = details.url.startsWith(previewOrigin) || details.url.startsWith(previewOrigin.replace('http:', 'ws:'));
      callback({ cancel: !allowed });
    });
    await previewWindow.loadURL(previewOrigin);
  }
  previewWindow.show(); return server.resolvedUrls.local[0];
}
function historyEvent(history) { emit({ kind: 'history', ...history }); previewUpdate();if (server) { server.environments.client.moduleGraph.invalidateAll(); server.ws.send({ type: 'full-reload', path: '*' }); } }
async function publicState() {
  const catalog=await integrationCatalog();
  const toolkit={guidance:skillUsage,knowledge:await knowledgeManifest(),requestMetrics,skills:catalog.skills.map(({id,source,license,ref})=>({id,source,license,ref})),packages:catalog.packages,hooks:hookCatalog,hookResult:hookResult&&project&&hookResult.directory===project.directory?hookResult:null,browser:browserReport&&project&&browserReport.directory===project.directory?{...browserReport,stale:browserReport.revision!==project.history.cursor||browserReport.revisionAt!==project.history.versions[project.history.cursor].at}:null};
  return { version:app.getVersion(),config,inventory:workspaceInventory,toolkit,accounts:accountConnections,quality:qualityReport&&project&&qualityReport.directory===project.directory?{...qualityReport,stale:qualityReport.revision!==project.history.cursor}:null,repair:repairProposal&&project&&repairProposal.directory===project.directory&&repairProposal.revision===project.history.cursor?{id:repairProposal.id,summary:repairProposal.patch.summary,changes:repairProposal.changes}:null, desktopMode:studioMode?'studio':'bot', models: providerModels, secureStore: vault.available(), keySaved: ['demo','ollama',...accountProviders].includes(config.provider)?false:await vault.has(config.provider), speechKeySaved: await vault.has('speech'), documents: documents.map(({ name, chars,kind,reading }) => ({ name, chars,kind,reading })), botMode,selectionMode:project?.kind==='existing'?'element':selectionMode,workspaceFolder, workspaceWarnings, analysis, selected, busy, penEnabled, project: project ? { kind:project.kind||'website',title: project.state.title, complete: project.state.complete, design:project.state.design, components:project.kind==='react'?componentEvidence(project.state.files):[], componentPolicy:project.state.componentPolicy, contentAudit:project.state.brief?.contentAudit, directory: project.directory, site:project.public,...(project.state.files?{files:project.state.files.map(f=>({path:f.path,chars:f.content.length})),instructions:project.state.instructions}:{}) } : null, history: project?.history, status: lastStatus };
}
function handle(name, fn) {
  ipcMain.handle(`builder:${name}`, async (event, payload) => {
    try { if (!trustedUI(event)) throw new Error('Unauthorized window.'); return { ok: true, value: await fn(payload,event) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
}
async function doBuild(signal) {
  if (!analysis) throw new Error('Analyze your request first.');
  if (server) { await server.close(); server = undefined; }
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.close();
  const id = randomUUID();
  const general=analysis.kind==='project',react=analysis.kind==='react';
  const directory=workspaceFolder||path.join(app.getPath('userData'),'projects',id);
  const resume=project&&project.directory===directory&&!project.state.complete&&project.state.title===analysis.plan.title;
  if(!resume){
    if(workspaceFolder&&await fs.access(path.join(directory,'.easy-web-ai',react?'react-history.json':general?'project-history.json':'website-history.json')).then(()=>true,()=>false))throw new Error('This folder already has a project. Open it to edit, or choose a different folder for a new build.');
    project = await new (react?ReactProject:general?FileProject:Project)(directory, historyEvent,{inPlace:!!workspaceFolder}).init(analysis.plan.title);
  }
  if(workspaceFolder){const map=general?'workspaceGeneralProjects':'workspaceProjects';config[map]={...config[map],[workspaceFolder]:'.'};}
  else {config.lastProject = id;config.lastProjectKind=react?'react':general?'project':'website';}
  await persistSettings(); selected = undefined; penEnabled = false;
  if(!general)await startPreview();
  if(react){
    if(!project.state.assetPipeline)await project.prepareAssets(await optimizeLocalImages(analysis.plan,documents,nativeImage,signal),{bengali:/[\u0980-\u09ff]/.test(JSON.stringify(analysis.profile)+analysis.command)});
    let reviewImage;const builder=new ReactEngine({...await engineOptions(signal),captureVisual:()=>reviewImage});await builder.build(project,analysis);
    const inspect=async()=>{try{return {...await runBrowserHarness({url:server.resolvedUrls.local[0],signal,emit,...(config.provider==='chatgpt'?{onScreenshot:bytes=>{reviewImage={mime:'image/png',data:bytes.toString('base64')};}}:{})}),directory:project.directory};}catch(error){if(signal.aborted)throw error;return {directory:project.directory,skipped:error.message,views:[],runtimeErrors:[],scope:'Browser inspection unavailable; no rendered-page checks claimed.'};}};
    browserReport=await inspect();
    let review;try{review=await builder.refine(project,analysis,browserReport);}catch(error){if(signal.aborted)throw error;review={changed:false,skipped:error.message,summary:'AI refinement did not finish. The generated website remains saved.'};emit({kind:'notice',message:review.summary+' '+error.message});}
    const sourceCheck=await checkProject(project,signal);if(sourceCheck.errors)throw new Error('The React source still needs a repair. Open Project checkup; your files are saved.');
    if(review.changed)browserReport=await inspect();
    if(browserReport.runtimeErrors?.some(error=>error.type==='exception'||/failed to resolve|syntaxerror|transform failed|status of 500/i.test(error.message))||!browserReport.skipped&&browserReport.views.every(view=>!view.composition?.length))throw new Error('The preview still has a rendering error after review. Your files are saved; check the browser report before retrying.');
    await project.complete(review);browserReport={...browserReport,refinement:review,revision:project.history.cursor,revisionAt:project.history.versions[project.history.cursor].at};
    emit({kind:'toolkit-updated'});emit({phase:'complete',message:review.skipped?'Complete. Website saved; AI refinement was unavailable.':'Complete. Your React website is ready to edit.',progress:100});
  }else await (await engine(signal)).build(project, analysis);
  penEnabled = !general;previewUpdate();
  analysis=undefined;
  emit({ kind: 'built', project: { kind:project.kind,title: project.state.title, directory: project.directory } });
  if(botWindow)expandBot('input'); else mainWindow.show();
  await afterSourceChange(signal);
}
async function afterSourceChange(signal){
  const result=await afterChangeHook(project,config,signal);if(!result)return;
  hookResult={...result,directory:project.directory};
  if(result.status==='checked')qualityReport={...result.report,directory:project.directory};
  emit({kind:'quality-updated'});emit({kind:'toolkit-updated'});
}
function registerIPC() {
  handle('design-review',()=>operation(async signal=>{if(project?.kind!=='react'||!project.state.complete)throw new Error('Finish a generated React website first.');if(!browserReport||browserReport.skipped||browserReport.directory!==project.directory||browserReport.revision!==project.history.cursor||browserReport.revisionAt!==project.history.versions[project.history.cursor].at)throw new Error('Run a fresh live page check before asking for an AI review.');const review=await reviewDesign(await engineOptions(signal),project,browserReport);browserReport={...browserReport,designReview:review};emit({kind:'toolkit-updated'});return review;}));
  handle('toolkit-source',async id=>{idle();const catalog=await integrationCatalog(),entry=catalog.skills.find(skill=>skill.id===id);if(!entry)throw new Error('Unknown bundled skill.');await shell.openExternal(entry.source);});
  handle('toolkit-check',()=>operation(async signal=>{
    if(!project||project.kind==='project')throw new Error('Open a website or React/Vite preview first.');
    if(!server)await startPreview();
    const revision=project.history.cursor,revisionAt=project.history.versions[revision].at;
    await checkProject(project,signal);
    browserReport={...await runBrowserHarness({url:server.resolvedUrls.local[0],signal,emit}),directory:project.directory,revision,revisionAt};
    emit({kind:'toolkit-updated'});return browserReport;
  }));
  handle('toolkit-select',async id=>{
    idle();if(!project||!browserReport||browserReport.directory!==project.directory||browserReport.revision!==project.history.cursor||browserReport.revisionAt!==project.history.versions[project.history.cursor].at)throw new Error('Run a fresh live page check before selecting a finding.');
    const value=z.string().regex(/^[a-z][a-z0-9-]{0,79}$/).parse(id);
    const nodes=browserReport.views.flatMap(view=>[...view.findings.flatMap(finding=>finding.nodes),...view.overflowTargets]);
    if(!nodes.some(node=>node.targetId===value))throw new Error('Choose an element reported by the current check.');
    await startPreview();penEnabled=true;previewUpdate();chooseElement({id:value,revision:project.history.cursor},previewWindow&&!previewWindow.isDestroyed()?'embedded':'browser');
    selected.inspection=browserReport.views.flatMap(view=>[...view.findings.filter(finding=>finding.nodes.some(node=>node.targetId===value)).map(finding=>({viewport:view.name,rule:finding.rule,message:finding.message})),...(view.overflowTargets.some(node=>node.targetId===value)?[{viewport:view.name,rule:'horizontal-overflow',message:'The element extends beyond this viewport.'}]:[])]);return publicState();
  });
  handle('toolkit-export',async()=>{
    idle();if(!browserReport||browserReport.directory!==project?.directory)throw new Error('Run a live page check first.');
    const result=await dialog.showSaveDialog(mainWindow,{title:'Save browser check report',defaultPath:'markora-check-report.json',filters:[{name:'JSON report',extensions:['json']}]});
    if(result.canceled)return null;await atomicWrite(result.filePath,JSON.stringify(browserReport,null,2));return result.filePath;
  });
  handle('quality-check',()=>operation(async signal=>{if(!project)throw new Error('Build a project first.');emit({phase:'validating',message:'Checking structure, links and source syntax locally…',progress:40});qualityReport={...await checkProject(project,signal),directory:project.directory};repairProposal=undefined;emit({kind:'quality-updated'});return qualityReport;}));
  handle('revision-review',index=>{idle();if(!project)throw new Error('Build a project first.');return revisionChanges(project,z.number().int().nonnegative().parse(index));});
  handle('restore-revision',index=>operation(async()=>{if(!project)throw new Error('Build a project first.');const value=z.number().int().min(0).max(project.record.versions.length-1).parse(index);selected=undefined;repairProposal=undefined;await project.move(value-project.history.cursor);emit({kind:'selected',selected:null});return publicState();}));
  handle('repair-propose',id=>operation(async signal=>{
   if(!project||qualityReport?.directory!==project.directory||qualityReport.revision!==project.history.cursor)throw new Error('Run a fresh check before proposing a repair.');
   const finding=qualityReport.findings.find(f=>f.id===id);if(!finding)throw new Error('Choose a current finding.');
   emit({phase:'editing',message:'Preparing a focused repair for your review…',progress:45});const patch=await (await engine(signal)).proposeRepair(project,project.state.files?[finding]:finding);signal.throwIfAborted();
   let changes;if(project.state.files){project.preparePatch(patch);changes=patch.files.map(f=>({path:f.path,kind:f.before===null?'added':f.content===null?'deleted':'modified',diff:compactDiff(f.before||'',f.content||'')}));}
   else{validateCSS(patch.css,patch.targetId);replaceTarget(project.selection(patch.targetId).html,patch.targetId,patch.before,patch.after);changes=[{path:project.selection(patch.targetId).file,kind:'modified',diff:compactDiff(patch.before,patch.after)},...(patch.css?[{path:'styles.css',kind:'modified',diff:compactDiff('',patch.css)}]:[])];}
   repairProposal={id:randomUUID(),directory:project.directory,revision:project.history.cursor,patch,changes:changes.slice(0,40)};emit({kind:'quality-updated'});return publicState();
  }));
  handle('repair-apply',id=>operation(async signal=>{
   const proposal=repairProposal;if(!project||!proposal||proposal.id!==id||proposal.directory!==project.directory||proposal.revision!==project.history.cursor)throw new Error('This repair is stale. Run a check and prepare it again.');
   signal.throwIfAborted();if(project.state.files)await project.apply(proposal.patch);else await project.applyPatch(proposal.patch);
   repairProposal=undefined;selected=undefined;emit({kind:'selected',selected:null});qualityReport={...await checkProject(project,signal),directory:project.directory};emit({kind:'quality-updated'});emit({phase:'complete',message:'Repair applied. Local checks ran again; undo is available.',progress:100});return publicState();
  }));
  handle('repair-discard',()=>{idle();repairProposal=undefined;emit({kind:'quality-updated'});});
  handle('account-status',async provider=>{idle();if(!accountProviders.includes(provider))throw new Error('Unsupported account.');const result=mergeAccountStatus(await accountStatus(provider,app.getPath('userData')),accountConnections[provider]);accountConnections[provider]=result;return result;});
  handle('account-login',provider=>operation(async signal=>{if(!accountProviders.includes(provider))throw new Error('Unsupported account.');delete accountConnections[provider];config.accountChecks=savedAccountChecks(accountConnections);await persistSettings();const result=await loginAccount(provider,app.getPath('userData'),signal,url=>{shell.openExternal(url).catch(()=>{});});if(!result.pending)accountConnections[provider]=result;emit({kind:'settings-updated'});return result;}));
  handle('account-models',provider=>{if(!accountProviders.includes(provider))throw new Error('Unsupported account.');return accountModels(provider,app.getPath('userData'));});
  handle('account-test',payload=>operation(async signal=>{
   const {provider,model}=z.object({provider:z.enum(['chatgpt','claude-code','google-account']),model:z.string().regex(/^(default|[a-zA-Z0-9][\w.:-]{0,149})$/)}).parse(payload),started=Date.now();
   emit({phase:'connecting',message:`Testing ${provider} / ${model} with a small real request…`,progress:20});
   try{const result=await requestAccountJSON({provider,model,accountDirectory:app.getPath('userData')},'Return exactly a JSON object with ok set to true. Do not use tools.',{purpose:'Model connection test; no user documents'},signal);if(result.ok!==true)throw new Error('The model did not return the expected test response. Try Default or another model.');}
   catch(error){accountConnections[provider]={installed:true,connected:false,tested:false,model,testedAt:new Date().toISOString(),message:error.message};config.accountChecks=savedAccountChecks(accountConnections);await persistSettings();emit({kind:'settings-updated'});throw error;}
   const result={installed:true,connected:true,tested:true,model,testedAt:new Date().toISOString(),elapsedMs:Date.now()-started,message:`Test passed: ${model} · ${((Date.now()-started)/1000).toFixed(1)}s. This account is now active for builds.`};accountConnections[provider]=result;
   config.accountChecks=savedAccountChecks(accountConnections);
   config={...config,provider,model};analysis=undefined;await persistSettings();emit({kind:'settings-updated'});emit({phase:'idle',message:result.message,progress:100});return result;
  }));
  handle('account-guide',async provider=>{if(!accountProviders.includes(provider))throw new Error('Unsupported account.');const result=await accountStatus(provider,app.getPath('userData'));await shell.openExternal(result.docs);});
  handle('design-style',async style=>{idle();config.websiteStyle=z.enum(['auto','editorial','studio','technical',...Object.keys(themes)]).parse(style);analysis=undefined;await persistSettings();emit({kind:'settings-updated'});return publicState();});
  handle('new-project',()=>operation(async signal=>{
    if(workspaceFolder&&project){const result=await dialog.showOpenDialog(mainWindow,{title:'Choose a folder for the new project',properties:['openDirectory','createDirectory']});if(result.canceled)return publicState();return openWorkspace(result.filePaths[0],signal);}
    if(server){await server.close();server=undefined;}if(previewWindow&&!previewWindow.isDestroyed())previewWindow.close();project=undefined;analysis=undefined;selected=undefined;penEnabled=false;config.projectMode='auto';delete config.lastProject;delete config.lastProjectKind;await persistSettings();emit({kind:'settings-updated'});return publicState();
  }));
  handle('open-project-folder',async()=>{if(!project)throw new Error('Build a project first.');const error=await shell.openPath(project.public);if(error)throw new Error(error);});
  handle('project-file',name=>{if(!project?.state.files)throw new Error('Open a source project first.');const file=project.state.files.find(f=>f.path===name);if(!file)throw new Error('File not found.');return file;});
  handle('project-edit',command=>operation(async signal=>{if(project?.kind!=='project'||config.projectMode!=='project')throw new Error('Open a general project first.');const result=await (await engine(signal)).edit(project,z.string().trim().min(1).max(6000).parse(command));await afterSourceChange(signal);return result;}));
  handle('state', publicState);
  handle('studio', page => showStudio(page));
  handle('bot-expand', expandBot);
  let dragOrigin;
  handle('bot-move', (payload,event) => {
    if(event.sender!==botWindow?.webContents)throw new Error('Only the companion can move itself.');
    if(!botWindow || botWindow.isDestroyed()) return;
    const point=z.object({phase:z.enum(['start','move','end']),startX:z.number().finite(),startY:z.number().finite(),x:z.number().finite(),y:z.number().finite()}).parse(payload);
    if(point.phase==='start') dragOrigin={...botWindow.getBounds(),startX:point.startX,startY:point.startY};
    if(!dragOrigin || dragOrigin.startX!==point.startX || dragOrigin.startY!==point.startY) return;
    const area=screen.getDisplayNearestPoint({x:Math.round(point.x),y:Math.round(point.y)}).workArea;
    botWindow.setPosition(...Object.values(petPosition(dragOrigin,point,area)));
    if(point.phase==='end') dragOrigin=undefined;
  });
  handle('quit', () => { setTimeout(()=>app.quit(),0); });
  handle('choose-folder', () => operation(async signal => {
    const result=await dialog.showOpenDialog(botWindow||mainWindow,{title:'Choose your project workspace',properties:['openDirectory','createDirectory']});
    return result.canceled?publicState():openWorkspace(result.filePaths[0],signal);
  }));
  handle('integration', async enabled => {
    idle(); if(typeof enabled!=='boolean')throw new Error('Invalid integration option.');
    if(!app.isPackaged)throw new Error('Install the packaged app to add its Explorer menu.');
    await setIntegration(enabled,process.env.PORTABLE_EXECUTABLE_FILE||process.execPath);return enabled;
  });
  handle('settings', async payload => {
    idle(); const next = configSchema.parse(payload);
    assertAccountActivation(config,next,accountConnections);
    if (!['demo','ollama',...accountProviders].includes(next.provider) && next.key?.trim()) await vault.put(next.provider, next.key);
    if (next.speechKey?.trim()) await vault.put('speech', next.speechKey);
    const { key: _key, speechKey: _speechKey, ...preferences } = next;
    config = { ...config, ...preferences }; analysis = undefined; await persistSettings(); emit({kind:'settings-updated'});return publicState();
  });
  handle('forget-key', async slot => { idle(); await vault.remove(slot); return publicState(); });
  handle('install-voice',quality=>operation(async signal=>{await closeSpeech();const installed=await installVoice(app.getPath('userData'),emit,signal,quality||'bangla');config={...config,...installed,speech:'local'};await persistSettings();emit({kind:'settings-updated'});emit({phase:'idle',message:'Free voice is ready. Select Magic pen and speak.',progress:100});return publicState();}));
  handle('voice-feedback',payload=>{voiceFeedback=feedbackSchema.parse(payload);previewUpdate();});
  handle('warm-voice',async()=>{if(config.speech==='local'&&config.whisperBinary&&config.whisperModel)await warmSpeech({...config},voiceLifetime.signal);});
  handle('choose-whisper', async kind => {
    idle(); if (!['binary', 'model'].includes(kind)) throw new Error('Invalid Whisper file kind.');
    const result = await dialog.showOpenDialog(mainWindow, { title: kind === 'binary' ? 'Choose whisper-cli.exe' : 'Choose a Whisper GGML model', properties: ['openFile'], filters: kind === 'binary' ? [{ name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }] : [{ name: 'GGML model', extensions: ['bin'] }] });
    if (!result.canceled) { config[kind === 'binary' ? 'whisperBinary' : 'whisperModel'] = result.filePaths[0]; await persistSettings(); }
    return publicState();
  });
  handle('attach', () => operation(async signal => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md','jpg','jpeg','png','webp'] }] });
    if (result.canceled) return documents.map(({name,chars,kind}) => ({name,chars,kind}));
    const incoming = [];
    for (const file of result.filePaths) { signal.throwIfAborted(); emit({ phase: 'reading', message: `Reading ${path.basename(file)}…`, progress: 5 }); incoming.push(await parseDocument(file)); }
    const merged = new Map(documents.map(doc => [doc.name, doc])); for (const doc of incoming) merged.set(doc.name, doc);
    documentContext([...merged.values()]); documents = [...merged.values()]; analysis = undefined;
    emit({ phase: 'idle', message: 'Inputs attached. Tell me what you want to create.', progress: 0 });
    return documents.map(({name,chars,kind}) => ({name,chars,kind}));
  }));
  handle('remove-document', name => { idle(); documents = documents.filter(d => d.name !== name); analysis = undefined; });
  handle('analyze', command => operation(async signal => {
    if(project?.kind==='existing')throw new Error('Your existing source is ready. Open preview, choose Element, then mark and speak your fix.');
    const text = z.string().trim().min(1).max(6000).parse(command);
    analysis = undefined; selected = undefined;
    const prepared=await prepareDocuments(documents,{config,directory:app.getPath('userData'),signal,emit,encode:async(bytes,name)=>{
      const image=normalizedNativeImage(bytes,nativeImage);
      const size=image.getSize();if(size.width*size.height>60000000)throw new Error(`${name}: image dimensions are too large. Use a smaller scan.`);
      const factor=Math.min(1,2400/Math.max(size.width,size.height)),resized=factor<1?image.resize({width:Math.round(size.width*factor),height:Math.round(size.height*factor),quality:'best'}):image;
      return {mime:'image/jpeg',data:resized.toJPEG(86).toString('base64')};
    }});
    const result=await analyzeAutomatically(await engineOptions(signal,{documentImages:prepared.documentImages}),text,prepared.documents,workspaceInventory);
    config.projectMode=result.kind;await persistSettings();
    documents=prepared.documents.map(doc=>doc.kind==='image'?{...doc,reading:prepared.method}:doc);
    signal.throwIfAborted();
    analysis = result;
    if (config.autoBuild) await doBuild(signal);
    return analysis;
  }));
  handle('design-concept', request=>operation(async signal=>{const pick=z.object({index:z.number().int().min(0).max(2),revision:z.number().int().optional()}).parse(request);const builder=new ReactEngine(await engineOptions(signal));if(analysis?.kind==='react'){analysis=await builder.chooseConcept(analysis,pick.index);emit({phase:'planned',message:'Composition selected. Review the plan, then build.',progress:30,plan:analysis.plan,profile:analysis.profile});}else{if(project?.kind!=='react'||!project.state.complete)throw new Error('Finish a React website before recomposing.');if(pick.revision!==project.history.cursor)throw new Error('The project changed. Reopen design choices.');await builder.recompose(project,pick.index);selected=undefined;previewUpdate();await afterSourceChange(signal);emit({phase:'complete',message:'Composition updated. Undo restores the previous page. Run Live page check for fresh rendered evidence.',progress:100});}return publicState();}));
  handle('theme', request=>operation(async signal=>{const pick=z.object({id:z.string(),revision:z.number().int()}).parse(request);if(project?.kind!=='react'||!project.state.complete)throw new Error('Finish a React website before changing its theme.');if(pick.revision!==project.history.cursor)throw new Error('The project changed. Reopen design choices.');const message=await project.changeTheme(pick.id);selected=undefined;previewUpdate();await afterSourceChange(signal);emit({phase:'complete',message,progress:100});return publicState();}));
  handle('toolkit-notices',async()=>{idle();return fs.readFile(path.join(root,'knowledge','THIRD_PARTY_NOTICES.md'),'utf8');});
  handle('build', () => operation(doBuild));
  handle('edit', command => operation(signal=>applySelected(command,signal)));
  handle('cancel', () => { controller?.abort(); });
  handle('selection-mode', async mode => { idle(); selectionMode=z.enum(['auto','text','element']).parse(mode); if(project?.kind==='existing')selectionMode='element'; previewUpdate();emit({kind:'selection-mode',mode:selectionMode});return publicState(); });
  handle('start-pen-voice', async enabled => { idle();await previewAction({action:z.boolean().parse(enabled)?'speak':'browse'}); });
  handle('clear-selection', () => { idle(); selected = undefined; emit({ kind: 'selected', selected: null }); });
  handle('preview', startPreview);
  handle('pen', async enabled => { if (typeof enabled !== 'boolean') throw new Error('Invalid pen state.'); if (!project||project.kind==='project') throw new Error('Magic pen selects elements in a website preview. Use voice or text for project files.'); if(!server)await startPreview();penEnabled = enabled;previewUpdate();emit({kind:'pen-state',enabled});return enabled; });
  for (const [name, delta] of [['undo', -1], ['redo', 1]]) handle(name, () => operation(async () => { if (!project) return; selected = undefined; await project.move(delta); emit({ kind: 'selected', selected: null }); }));
  handle('export', async () => {
    idle(); if (!project||(project.state.files?!project.state.files.length:!project.state.sections.length)) throw new Error('Build a project first.');
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Save website in a new folder', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null; return project.exportTo(result.filePaths[0]);
  });
  const transcription=(bytes,detailed=false)=>operation(async signal => {
    emit({ phase: 'transcribing', message: config.speech === 'local' ? 'Transcribing on your computer…' : 'Transcribing with OpenAI…', progress: 10 });
    const key = config.speech === 'openai' ? await vault.get('speech') || (config.provider === 'openai' ? await vault.get('openai') : '') : '';
    const result = await transcribe(bytes, config, key, signal,detailed);
    signal.throwIfAborted(); if (!(detailed?result.text:result)) throw new Error('No speech was detected. Try again.');
    emit({ phase: 'idle', message: 'Voice command ready.', progress: 0 }); return result;
  });
  handle('transcribe', bytes=>transcription(bytes));handle('transcribe-detailed',bytes=>transcription(bytes,true));
  handle('test-voice',payload=>operation(async signal=>{
    const options=z.object({language:z.enum(['auto','en','bn','mixed']),quality:z.enum(['base','small','turbo','bangla']).optional(),speech:z.enum(['local','openai']).optional()}).parse(payload);
    const testConfig={...config,speech:options.speech||config.speech,speechLanguage:options.language};
    if(options.quality){
      const configured=options.quality===config.voiceQuality&&config.whisperModel&&(options.quality!=='bangla'||config.whisperBengaliModel);
      testConfig.voiceQuality=options.quality;
      if(!configured){testConfig.whisperModel=path.join(app.getPath('userData'),'voice',options.quality==='turbo'?'ggml-large-v3-turbo-q5_0.bin':options.quality==='bangla'?'ggml-base.bin':`ggml-${options.quality}.bin`);testConfig.whisperBengaliModel=options.quality==='bangla'?path.join(app.getPath('userData'),'voice','ggml-bangla-q5_1.bin'):'';}
      try{await fs.access(testConfig.whisperModel);if(testConfig.whisperBengaliModel)await fs.access(testConfig.whisperBengaliModel);}catch{throw new Error('Set up local voice in Settings, then retry this sample.');}
    }
    const key=testConfig.speech==='openai'?await vault.get('speech')||(config.provider==='openai'?await vault.get('openai'):''):'';
    return transcribe(payload.audio,testConfig,key,signal,true);
  }));
  ipcMain.handle('preview:state', event => trustedPreview(event) ? previewState() : {enabled:false});
  ipcMain.on('preview:voice-action',(event,payload)=>{if(trustedPreview(event))void previewAction(payload).catch(error=>emit({kind:'notice',message:error.message}));});
  ipcMain.on('preview:select', (event, id) => { if(trustedPreview(event))try{chooseElement(id,'embedded');}catch(error){emit({kind:'notice',message:error.message});} });
}
function chooseElement(input,captureSource='browser'){
  if(busy||!penEnabled||!project)return;
  if(input===null||input?.id===null){selected=undefined;emit({kind:'selected',selected:null});return;}
  try{
  const pick=z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),textSelection:TextRange.optional(),revision:z.number().int().min(0).optional(),visualContext:VisualContext.optional()}).parse(typeof input==='string'?{id:input}:input);
  if(pick.revision!==undefined&&pick.revision!==project.history.cursor)throw new Error('The page changed. Mark it again.');
  if(project.kind==='existing'&&pick.textSelection)throw new Error('Choose Element mode for existing React source. Letter-level source mapping is available on generated websites.');
  const source=project.selection(pick.id),range=pick.textSelection?(project.kind==='react'?project.validateTextSelection(pick.id,pick.textSelection):validateTextRange(source.html,pick.id,pick.textSelection)):undefined;
  selected={id:pick.id,key:randomUUID(),file:source.file,kind:range?'text':'element',...(range?{textSelection:range}:{}),visualContext:pick.visualContext,captureSource,line:source.line,label:range?range.parts.map(p=>p.text).join(''):(pick.visualContext?.text||source.html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim().slice(0,140)};
  previewUpdate();emit({kind:'selected',selected});if(botWindow){if(botMode!=='voice')expandBot('input');}else mainWindow.show();
  }catch(error){selected=undefined;emit({kind:'selected',selected:null});throw error;}
}
async function applySelected(command,signal){
  if(!project||!selected)throw new Error('Mark an element with the magic pen first.');
  const request=typeof command==='string'?{command}:z.object({command:z.string(),targetId:z.string(),targetKey:z.string().max(100).optional()}).parse(command);
  if(request.targetId&&request.targetId!==selected.id||request.targetKey&&request.targetKey!==selected.key)throw new Error('Your selection changed. Mark it again before applying.');
  const text=z.string().trim().min(1).max(6000).parse(request.command);
  const result=await(await engine(signal,captureSelection)).edit(project,selected.id,text,selected.textSelection,selected.inspection?{...selected.visualContext,reportedFindings:selected.inspection}:selected.visualContext);
  selected=undefined;emit({kind:'selected',selected:null});await afterSourceChange(signal);return result;
}
if(hasLock)app.whenReady().then(async () => {
app.setAppUserModelId('com.easywebai.desktop');
await fs.mkdir(app.getPath('userData'), { recursive: true });
try { config = { ...defaults, ...JSON.parse(await fs.readFile(settingsFile(), 'utf8')) }; } catch (e) { if (e.code !== 'ENOENT') console.error('Settings could not be read; using defaults.'); config = { ...defaults }; }
Object.assign(accountConnections,restoreAccountChecks(config.accountChecks));
vault = new Vault(path.join(app.getPath('userData'), 'vault'));
if (!pendingFolder && !config.workspaceFolder && config.lastProject && /^[a-f0-9-]{36}$/.test(config.lastProject)) {
  try { project = await new (config.lastProjectKind==='react'?ReactProject:config.lastProjectKind==='project'?FileProject:Project)(path.join(app.getPath('userData'), 'projects', config.lastProject), historyEvent,{inPlace:false}).init();config.projectMode=project.kind; }
  catch { lastStatus = { phase: 'error', message: 'The previous project could not be opened. Start a new build.', progress: 0 }; }
}
registerIPC();
mainWindow = new BrowserWindow({ show:studioMode,width: 1280, height: 900, minWidth: 880, minHeight: 680, title: 'Markora', icon:path.join(root,'assets','icon.png'), backgroundColor: '#f4f4ef', webPreferences: { preload: path.join(root, 'electron', 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
mainWindow.setMenuBarVisibility(false);
mainWindow.on('hide',()=>emit({kind:'settings-hidden'}));
mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
mainWindow.webContents.on('will-navigate', (event, url) => { if (url !== uiURL) event.preventDefault(); });
const trustedMedia=wc=>[[mainWindow,uiURL],[botWindow,botURL]].some(([win,url])=>win&&!win.isDestroyed()&&wc===win.webContents&&wc.getURL()===url);
session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => callback(trustedMedia(wc) && permission === 'media' && details.mediaTypes?.every(type => type === 'audio')));
session.defaultSession.setPermissionCheckHandler((wc, permission) => trustedMedia(wc) && ['media', 'microphone'].includes(permission));
await mainWindow.loadFile(uiFile);
if(!studioMode){
  const area=screen.getPrimaryDisplay().workArea;
  botWindow=new BrowserWindow({show:false,width:156,height:182,x:area.x+area.width-176,y:area.y+area.height-202,frame:false,transparent:true,backgroundColor:'#00000000',alwaysOnTop:true,skipTaskbar:true,resizable:false,title:'Markora',icon:path.join(root,'assets','icon.png'),webPreferences:{preload:path.join(root,'electron','preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const petReady=new Promise(resolve=>botWindow.once('ready-to-show',resolve));
  botWindow.setMenuBarVisibility(false);botWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  botWindow.webContents.on('will-navigate',(event,url)=>{if(url!==botURL)event.preventDefault();});
  await botWindow.loadFile(botFile);
  await petReady;botWindow.show();
  // Apply the native stacking level after the transparent window is mapped.
  await pinFloatingWindow(botWindow);
  botWindow.on('show',()=>pinFloatingWindow(botWindow).catch(error=>emit({kind:'notice',message:error.message})));
  mainWindow.on('close',event=>{if(!quitting&&botWindow&&!botWindow.isDestroyed()){event.preventDefault();mainWindow.hide();}});
  botWindow.on('close',()=>{if(!quitting)app.quit();});
}
const folder=pendingFolder||config.workspaceFolder;
if(folder){try{await operation(signal=>openWorkspace(folder,signal));}catch(error){emit({kind:'notice',message:error.message});}}
let closing = false;
app.on('before-quit', event => {
  quitting=true;controller?.abort();voiceLifetime.abort();
  if (!closing) { event.preventDefault(); closing = true;const current=server;server=undefined;Promise.allSettled([current?.close(),closeSpeech()]).finally(()=>app.quit()); }
});
app.on('window-all-closed', () => app.quit());
}).catch(error => { console.error('Startup failed:', error); app.quit(); });
