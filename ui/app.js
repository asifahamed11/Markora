import './projects.css';
import {projectControls} from './project-controls.js';
import {workbench} from './workbench.js';
import {toolkitSettings} from './toolkit.js';
import './style.css';
import './settings.css';
import {designControls} from './design-controls.js';
import {guidanceView} from './guidance.js';
import './studio.css';
import {installIcons,icon} from './icons.js';
import { VoiceRecorder } from './voice.js';
const $ = id => document.getElementById(id);
const api = window.builder;
const names = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', openrouter:'OpenRouter',ollama:'Ollama · local', demo: 'Offline demo',chatgpt:'ChatGPT account','claude-code':'Claude Code','google-account':'Google account' };
const selectedProvider=()=> $('provider').value;
const providerHelp=document.createElement('p');providerHelp.id='provider-help';providerHelp.className='card-description';providerHelp.style.fontSize='10px';$('settings-form').querySelector('.form-row').after(providerHelp);
const accountNames=['chatgpt','google-account'];
function accountDescription(provider){return provider==='claude-code'?'Uses the unmodified Claude Code installation and its own authentication. Markora never receives your Claude login tokens.':provider==='google-account'?'Uses the official Antigravity CLI and its secure Google sign-in. Model access and quotas depend on your Google account.':'Sign in with ChatGPT through Codex. Login is stored in the Windows credential store.';}
const accountCard=document.createElement('div');accountCard.id='account-card';accountCard.className='account-card';accountCard.hidden=true;
accountCard.innerHTML='<strong>Sign in, then test</strong><p>Use the provider sign-in window. Test connection confirms this account can build.</p><div id="account-status" role="status">Check your connection to begin.</div><label>Choose a model<select id="account-model-picker"><option value="default">Default · recommended by the provider</option></select><small id="account-model-note">A connection test confirms access to the selected model.</small></label><div class="account-actions"><button type="button" id="connect-account" class="outline-button">Connect account</button><button type="button" id="check-account" class="outline-button">Check connection</button><button type="button" id="account-guide" class="text-button">Install / setup guide</button><button type="button" id="cancel-account" class="text-button" hidden>Cancel sign-in</button></div><button type="button" id="test-account" class="primary-button">Test connection &amp; use account</button><small id="account-detail"></small>';
providerHelp.after(accountCard);
const activeAccount=document.createElement('p');activeAccount.id='account-active';activeAccount.className='card-description';accountCard.prepend(activeAccount);
const connectionHelp=document.createElement('details');connectionHelp.id='connection-help';connectionHelp.className='advanced-settings';connectionHelp.innerHTML='<summary>Connection help</summary>';
const helpActions=document.createElement('div');helpActions.className='account-actions';helpActions.append($('check-account'),$('account-guide'));connectionHelp.append(helpActions);accountCard.append(connectionHelp);
const accountPrimary=document.createElement('div');accountPrimary.className='account-primary';accountPrimary.append($('connect-account'),$('test-account'));accountCard.querySelector('strong').after(accountPrimary);connectionHelp.append($('account-detail'));accountCard.querySelector('strong').nextElementSibling.nextElementSibling.hidden=true;
const modelOptions=$('model').closest('details');modelOptions.id='model-options';modelOptions.querySelector('summary').textContent='Model options';modelOptions.querySelector('summary').after($('account-model-picker').closest('label'));accountCard.after(modelOptions);
const settingsSummary=document.createElement('div');settingsSummary.id='settings-summary';settingsSummary.className='settings-summary';settingsSummary.innerHTML='<button type="button" id="settings-ai-shortcut"><small>Current AI</small><span></span></button><button type="button" id="settings-voice-shortcut"><small>Voice</small><span></span></button>';document.querySelector('.settings-tabs').after(settingsSummary);
$('settings-ai-shortcut').onclick=()=>settingsTab('ai');$('settings-voice-shortcut').onclick=()=>settingsTab('voice');
const toolkitGuidance=document.createElement('details');toolkitGuidance.id='settings-guidance';toolkitGuidance.className='guidance';toolkitGuidance.hidden=true;toolkitGuidance.innerHTML='<summary>Latest AI guidance</summary><p></p><div class="guidance-items"></div>';
let accountCheck=0,pendingGoogleLogin;
async function checkAccount(){const provider=selectedProvider();if(!accountNames.includes(provider))return;const generation=++accountCheck;try{const result=await api.accountStatus(provider);if(generation!==accountCheck||selectedProvider()!==provider)return;$('account-status').textContent=result.message;$('connect-account').disabled=!result.installed;$('connect-account').textContent=provider==='google-account'?(result.connected?'Reconnect Google':'Connect Google'):result.connected?'Reconnect account':provider==='claude-code'?'Open Claude Code sign-in':'Connect account';if(provider==='google-account'&&pendingGoogleLogin)$('account-status').textContent='Finish sign-in in the Antigravity CLI window, then click Test model. Browser success alone does not verify model access.';$('account-detail').textContent=provider==='claude-code'?'Uses the unmodified Claude Code installation and its own authentication. Markora never receives your Claude login tokens.':provider==='google-account'?'Uses the official Antigravity CLI and its secure Google sign-in. Model access and quotas depend on your Google account.':'Sign in with ChatGPT through Codex. Login is stored in the Windows credential store.';}catch(error){if(generation===accountCheck)$('account-status').textContent=error.message;}}
$('check-account').onclick=()=>run(checkAccount);
window.addEventListener('focus',()=>{if(pendingGoogleLogin&&$('settings-dialog').open&&selectedProvider()==='google-account'&&!state?.busy)run(checkAccount);});
$('account-guide').onclick=()=>run(()=>api.accountGuide(selectedProvider()));
$('cancel-account').onclick=()=>run(()=>api.cancel());
$('connect-account').onclick=()=>run(async()=>{const provider=selectedProvider();$('account-status').textContent='Opening the provider sign-in. Finish it in your browser.';for(const id of ['connect-account','check-account','account-guide','provider','test-account'])$(id).disabled=true;$('cancel-account').hidden=false;try{const result=await api.accountLogin(provider);$('account-status').textContent=result.message||'Account connected.';if(provider==='google-account'&&result.pending)pendingGoogleLogin=result.startedAt;if(!result.pending)await checkAccount();}catch(error){$('account-status').textContent=error.message;throw error;}finally{for(const id of ['connect-account','check-account','account-guide','provider','test-account'])$(id).disabled=false;$('cancel-account').hidden=true;}});
$('account-model-picker').onchange=()=>{$('model').value=$('account-model-picker').value;};
async function loadAccountModels(){const provider=selectedProvider();if(!accountNames.includes(provider))return;const catalog=await api.accountModels(provider);if(selectedProvider()!==provider)return;$('account-model-picker').replaceChildren(new Option('Default · recommended by the provider','default'),...catalog.models.map(m=>new Option(m.label,m.id)));const current=$('model').value;if(current!=='default'&&![...$('account-model-picker').options].some(o=>o.value===current))$('account-model-picker').add(new Option(current,current));$('account-model-picker').value=current;$('account-model-note').textContent=`${catalog.source}. Test verifies access for this request; quota may change.`;}
$('test-account').onclick=async()=>{accountCheck++;const provider=selectedProvider(),model=$('model').value||'default';for(const id of ['test-account','connect-account','check-account','account-guide','provider','model','account-model-picker'])$(id).disabled=true;$('cancel-account').hidden=false;$('account-status').textContent=`Testing ${model} with a small real request…`;try{const result=await api.accountTest({provider,model});if(provider==='google-account')pendingGoogleLogin=undefined;$('account-status').textContent=result.message;await refresh();await loadAccountModels();toast('Model verified. This account is now active for builds.');}catch(error){$('account-status').textContent=error.message;toast(error.message,true);}finally{for(const id of ['test-account','connect-account','check-account','account-guide','provider','model','account-model-picker'])$(id).disabled=false;$('cancel-account').hidden=true;}};
const integrationBox=document.createElement('div');integrationBox.className='integration-box';
integrationBox.innerHTML='<small>Windows Explorer · The installer adds “Open with Markora” to folder menus.</small><div><button type="button" id="enable-integration" class="outline-button">Enable folder menu</button><button type="button" id="remove-integration" class="text-button">Remove menu</button></div>';
$('integration-setting-slot').append(integrationBox);
const browserLabel=document.createElement('label');browserLabel.textContent='Open my website in';const browserSelect=document.createElement('select');browserSelect.id='preview-browser';browserSelect.innerHTML='<option value="system">My default browser</option><option value="embedded">A separate built-in browser window</option>';browserLabel.append(browserSelect);$('preview-setting-slot').append(browserLabel);
const workspaceButton=document.createElement('button');workspaceButton.id='choose-workspace';workspaceButton.className='text-button';workspaceButton.textContent='Choose folder';document.querySelector('.breadcrumb').append(' · ',workspaceButton);
const projectFiles=document.createElement('section');projectFiles.className='project-files';projectFiles.id='project-files';projectFiles.hidden=true;projectFiles.innerHTML='<strong>Your project files</strong><div id="file-list" class="file-list"></div><p id="project-instructions" class="project-instructions"></p><button id="open-project-folder" class="outline-button">Open project folder</button><details id="source-details" class="source-details" hidden><summary id="source-title">Inspect file</summary><pre id="source-preview" class="source-preview"></pre></details>';
$('open-preview').before(projectFiles);
$('open-project-folder').onclick=()=>run(()=>api.openProjectFolder());
function renderProjectFiles(){
 const general=state.config.projectMode==='project';projectFiles.hidden=!(general||['existing','react'].includes(state.project?.kind));document.querySelector('.preview-card .card-kicker').textContent=general?'YOUR PROJECT':'YOUR WEBSITE';
 $('open-preview').hidden=general;$('preview-nav').title=general?'Open project files':'Live preview';document.querySelector('.preview-card .live-label').lastChild.textContent=general?'LOCAL FILES':'LIVE CANVAS';$('project-instructions').textContent=state.project?.instructions||'Your generated files and setup instructions will appear here.';
 $('file-list').replaceChildren(...(state.project?.files||[]).map(file=>{const button=document.createElement('button'),label=document.createElement('span'),meta=document.createElement('small');button.type='button';label.textContent=file.path;meta.textContent=`${file.chars.toLocaleString()} chars`;button.append(label,meta);button.onclick=()=>run(async()=>{const value=await api.projectFile(file.path);$('source-title').textContent=value.path;$('source-preview').textContent=value.content;$('source-details').hidden=false;$('source-details').open=true;});return button;}));
 $('open-project-folder').disabled=!state.project||state.busy;document.querySelector('.page-heading .eyebrow').textContent=general?'YOUR NEXT PROJECT':'YOUR NEXT WEBSITE';document.querySelector('.page-footer>span').textContent='Build and refine projects on your PC.';
}
installIcons();
const modeContainer=document.createElement('div');document.querySelector('.command-card .card-header').after(modeContainer);const updateProjectControls=projectControls(modeContainer,()=>run(async()=>{await api.newProject();await refresh();}),style=>run(async()=>{await api.designStyle(style);await refresh();}));
let state, recording = false, recorder, toastTimer;
const updateWorkbench=workbench(document.querySelector('.right-column'),api,run,refresh);
const extensionsTab=document.createElement('button');extensionsTab.id='tab-extensions';extensionsTab.type='button';extensionsTab.setAttribute('role','tab');extensionsTab.setAttribute('aria-controls','settings-extensions');extensionsTab.setAttribute('aria-selected','false');extensionsTab.textContent='Toolkit';document.querySelector('.settings-tabs').append(extensionsTab);
const extensions=toolkitSettings($('settings-form'),api,run);$('settings-extensions').querySelector('.setup-card').append(toolkitGuidance);
const log = [];
function toast(message, error = false) { $('toast').textContent=message; $('toast').classList.toggle('error',error); $('toast').hidden=false; clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?9000:6000); }
async function run(action) { try { return await action(); } catch(error) { if(error.message!=='Cancelled.') toast(error.message,true); return undefined; } }
function updateControls() {
  if (!state) return;
  document.querySelector('#settings-form button[type=submit]').disabled=state.busy;
  const blocked=state.busy||recording;const general=state.config.projectMode==='project';updateProjectControls({...state,busy:blocked});$('build').textContent=general?'Build this project':'Build this website';document.querySelector('.browser-mock').hidden=general||['existing','react'].includes(state.project?.kind);
  updateWorkbench({...state,busy:blocked});
  for (const id of ['send','attach','build','settings-nav','provider-badge']) $(id).disabled=blocked;
  $('record').disabled=state.busy;
  $('cancel').hidden=!state.busy;
  $('open-preview').disabled=!state.project;
  $('preview-nav').disabled=!state.project;
  $('pen').disabled=general||!state.project||blocked;
  $('export').disabled=!state.project||blocked;
  $('undo').disabled=!state.history?.undo||blocked;
  $('redo').disabled=!state.history?.redo||blocked;
  $('pen').classList.toggle('enabled',!!state.penEnabled);
  $('pen-label').textContent=state.penEnabled?'Pen is on':'Magic pen';
  $('send').textContent=general&&state.project?'Update project':state.selected?'Apply edit ↗':'Create a plan ↗';
  $('command-heading').textContent=state.selected?'Edit your selection':state.project?'Update your project':'What would you like to build?';
  $('command-description').textContent=state.selected?'Describe the change for your selected element.':'Describe what you want to make, or speak it aloud.';
  $('command').placeholder=general?'Build a desktop app, Python script, developer tool or documentation project...':state.selected?'Make this button green, or make this section bigger…':'Build a portfolio from my resume, with my projects and contact details.';
  $('selection').hidden=!state.selected;
  if(state.selected){$('selection-label').textContent=state.selected.label||state.selected.id;$('selection-source').textContent=`${state.selected.file} · ${state.selected.id}`;}
  renderProjectFiles();if(state.project){$('preview-title').textContent=state.project.title;$('preview-description').textContent=general?'Files and history stay on this PC. Follow the run instructions below.':state.project.complete?'Your website is ready. Select an element in the preview and make it yours.':'Your website takes shape in the live browser window.';}else{$('preview-title').textContent=general?'Your project':'Your preview';$('preview-description').textContent=general?'Apps, scripts, tools and documentation. Start with a plan, then create and refine your files.':'Your site opens in a real browser window. Watch every section take shape as we build.';$('source-details').hidden=true;}
}
function renderDocuments() {
  document.querySelector('.version span').textContent='v'+state.version;
  $('documents').replaceChildren();
  for(const doc of state.documents||[]) {
    const li=document.createElement('li'),name=document.createElement('span'),meta=document.createElement('small'),remove=document.createElement('button');
    name.textContent=doc.name;meta.textContent=doc.kind==='image'?(doc.reading==='local-ocr'?'Read with local OCR':doc.reading==='vision'?'Read by vision AI':'Image: read during planning'):`${doc.chars.toLocaleString()} chars`;remove.textContent='×';remove.setAttribute('aria-label',`Remove ${doc.name}`);
    remove.disabled=state.busy;remove.onclick=()=>run(async()=>{await api.removeDocument(doc.name);await refresh();});li.append(name,meta,remove);$('documents').append(li);
  }
  $('document-count').textContent=state.documents?.length?`${state.documents.length} attached`:'Optional';
}
const updateDesign=designControls($('plan-panel').parentElement,api,run,refresh);
function renderPlan() {
  updateDesign(state);
  const analysis=state.analysis;$('plan-panel').hidden=!analysis;
  if(!analysis)return;
  $('plan-title').textContent=analysis.plan.title;$('plan-summary').textContent=analysis.plan.summary;
  $('plan-sections').replaceChildren(...analysis.plan.sections.map(section=>{const el=document.createElement('span');el.textContent=section.title;el.title=section.purpose;return el;}));
  $('palette').replaceChildren(...analysis.plan.palette.map(color=>{const el=document.createElement('span');el.style.backgroundColor=color;el.title=color;return el;}));
  document.querySelectorAll('.plan-details .detail-label')[0].textContent=state.config.projectMode==='project'?'IMPLEMENTATION STEPS':'SECTIONS';document.querySelectorAll('.plan-details .detail-label')[1].textContent=state.config.projectMode==='project'?'STACK & SETUP':'VISUAL DIRECTION';$('plan-layout').textContent=analysis.plan.layout;$('plan-type').textContent=analysis.plan.typography;
  const direction=analysis.plan.artDirection;$('art-direction-details').hidden=!direction;
  if(direction){$('art-direction-title').textContent='React ? '+direction.candidates[direction.chosen].name;$('art-direction-concepts').replaceChildren(...direction.candidates.map((concept,index)=>{const block=document.createElement('p'),name=document.createElement('strong'),description=document.createElement('span');name.textContent=(index===direction.chosen?'Selected: ':'')+concept.name;description.textContent=concept.composition+' '+concept.fit;block.append(name,document.createElement('br'),description);return block;}));}
  $('profile-details').replaceChildren();
  for(const key of ['name','headline','bio','tone','skills','projects','education','experience','publications','contacts','missing']) {
    const value=analysis.profile[key];if(!value||Array.isArray(value)&&!value.length)continue;
    const block=document.createElement('div'),label=document.createElement('strong'),text=document.createElement('p');label.textContent=key[0].toUpperCase()+key.slice(1);
    text.textContent=Array.isArray(value)?value.map(item=>typeof item==='string'?item:Object.values(item).filter(Boolean).join(' — ')).join('; '):value;block.append(label,text);$('profile-details').append(block);
  }
}
function status(event) {
  const title={idle:'Ready',reading:'Reading your documents',analyzing:'Reviewing your content',planning:'Preparing your plan',planned:'Your plan is ready',building:'Building your website',reviewing:'Reviewing the design',editing:'Updating your selection',complete:'Website ready',cancelled:'Stopped',error:'Something needs your attention',transcribing:'Recognizing your speech'}[event.phase]||'Working on it';
  $('status-title').textContent=state?.config.projectMode==='project'&&event.phase==='complete'?'Project ready':state?.config.projectMode==='project'&&event.phase==='building'?'Building your project':title;$('status-message').textContent=event.message;
  $('status-symbol').innerHTML=icon(event.phase==='complete'?'check':event.phase==='error'?'stop':'browser');
  $('progress-fill').style.width=`${event.progress||0}%`;
  if(event.phase!=='idle' && log.at(-1)!==event.message){log.push(event.message);if(log.length>5)log.shift();$('activity').replaceChildren(...log.map(message=>{const el=document.createElement('li');el.textContent=message;return el;}));}
}
async function refresh() {
  state=await api.state();
  $('provider-label').textContent=accountNames.includes(state.config.provider)?`${names[state.config.provider]}${state.accounts?.[state.config.provider]?.tested?' · last test passed':state.accounts?.[state.config.provider]?.connected?' · signed in':' · test connection'}`:state.config.provider==='demo'?'Offline demo':state.config.provider==='ollama'?'Ollama · local':state.keySaved?`${names[state.config.provider]} ? key saved`:'Connect your AI';
  activeAccount.textContent=`Current model: ${state.config.model}. Test before switching accounts.`;
  $('provider-badge').classList.toggle('connected',state.keySaved||['demo','ollama'].includes(state.config.provider)||!!state.accounts?.[state.config.provider]?.connected);
  $('demo-banner').hidden=state.config.provider!=='demo';renderDocuments();renderPlan();updateControls();if(state.status)status(state.status);
}
let micTester,micTestTimer,sampleRecorder,sampleRecording=false,sampleProcessing=false,sampleAudio,sampleGeneration=0;
const micBlock=document.querySelector('.microphone-setup'),micLabel=$('microphone-device').closest('label'),voiceCard=$('settings-voice').querySelector('.setup-card');
voiceCard.querySelector('.setup-card-heading').after(micLabel,micBlock);
const tuning=document.createElement('details');tuning.className='advanced-settings';tuning.innerHTML='<summary>Listening pace &amp; edit review</summary>';tuning.append($('speech-pause').closest('label'),$('voice-review').closest('label'));voiceCard.append(tuning);
const engineStep=document.createElement('div');engineStep.className='engine-step';engineStep.append($('local-voice-setup'));voiceCard.querySelector('.setup-card-heading').after(engineStep);const recognitionOptions=document.createElement('details');recognitionOptions.className='advanced-settings';recognitionOptions.innerHTML='<summary>Speech service and language</summary>';recognitionOptions.append($('speech').closest('label'),$('speech-language').closest('label'),$('speech-key-field'));voiceCard.append(recognitionOptions);
const sampleStep=document.querySelector('.sample-setup');micBlock.after(sampleStep);
async function refreshMicrophones(){const value=$('microphone-device').value||state.config.microphoneId||'';const devices=await navigator.mediaDevices.enumerateDevices();$('microphone-device').replaceChildren(new Option('Windows default microphone',''),...devices.filter(d=>d.kind==='audioinput'&&d.deviceId&&d.deviceId!=='default'&&d.deviceId!=='communications').map((d,i)=>new Option(d.label||`Microphone ${i+1}`,d.deviceId)));if([...$('microphone-device').options].some(o=>o.value===value))$('microphone-device').value=value;else if(value){$('microphone-device').add(new Option('Saved microphone · reconnect or choose another',value));$('microphone-device').value=value;}}
$('refresh-mics').onclick=()=>run(refreshMicrophones);
async function stopMicTest(){clearTimeout(micTestTimer);await micTester?.cancel();micTester=undefined;$('mic-meter').value=0;$('enable-mic').textContent='Test microphone';}
function settingsTab(tab){if(tab!=='voice')run(async()=>{await stopMicTest();await stopSample();});for(const name of ['ai','voice','preferences','extensions']){$(`settings-${name}`).hidden=name!==tab;$(`tab-${name}`).setAttribute('aria-selected',String(name===tab));$(`tab-${name}`).tabIndex=name===tab?0:-1;}$(`settings-${tab}`).scrollTop=0;settingsVisibility();}
for(const tab of ['ai','voice','preferences','extensions'])$(`tab-${tab}`).onclick=()=>settingsTab(tab);
document.querySelector('.settings-tabs').addEventListener('keydown',event=>{const tabs=['ai','voice','preferences','extensions'];let at=tabs.findIndex(name=>$(`tab-${name}`)===event.target);if(at<0)return;if(event.key==='ArrowRight')at=(at+1)%4;else if(event.key==='ArrowLeft')at=(at+3)%4;else if(event.key==='Home')at=0;else if(event.key==='End')at=3;else return;event.preventDefault();settingsTab(tabs[at]);$(`tab-${tabs[at]}`).focus();});
function voiceSetupState(){const ready=!!state.config.whisperBinary&&!!state.config.whisperModel;$('voice-ready-title').textContent=ready?'Local voice is ready':'Set up local voice';$('voice-ready-description').textContent=ready?'Languages are detected automatically. Your audio stays on this PC. Try a command below.':'Download multilingual recognition and a Bengali specialist once (about 339 MB, plus the speech engine). Your audio then stays on this PC.';$('install-voice').hidden=ready;$('install-voice').textContent='Set up voice';}
function settingsVisibility(){const provider=selectedProvider();$('account-model-picker').closest('label').hidden=!accountNames.includes(provider);$('settings-ai-shortcut').querySelector('span').textContent=names[state.config.provider]||'Choose a service';$('settings-voice-shortcut').querySelector('span').textContent=state.config.speech==='local'?(state.config.whisperBinary&&state.config.whisperModel?'Ready ? automatic language':'One-time setup needed'):'Cloud recognition';guidanceView(toolkitGuidance,state.toolkit?.guidance);const keyless=['demo','ollama','chatgpt','claude-code','google-account'].includes(provider),local=$('speech').value==='local';$('key-field').hidden=keyless;$('forget-key').hidden=keyless||$('tab-ai').getAttribute('aria-selected')!=='true';$('whisper-fields').hidden=true;$('local-voice-setup').hidden=!local;$('speech-key-field').hidden=local;$('provider-help').textContent={chatgpt:'Use ChatGPT plan access through the official Codex tool. No API key needed.', 'claude-code':'Run the installed, unmodified Claude Code tool using its own account authentication.', 'google-account':'Use your Google account through Antigravity. No API key needed.',gemini:'Free tier is available with your Google AI Studio key. Quotas apply.',openrouter:'Use your OpenRouter key. The free router is the default; model availability and limits apply.',ollama:'Install Ollama and download qwen2.5-coder:7b once. The model then runs on this PC without an API key.',demo:'Try the complete workflow with sample content and preset edits. No account needed.'}[provider]||'Use the API key from your provider account.';document.querySelector('.connection-note').textContent=accountNames.includes(provider)?'Authentication stays with the official provider tool. No password or browser cookie is copied into Markora.':'Your API key is encrypted on this PC. It stays out of your website.';$('account-card').hidden=!accountNames.includes(provider);if(accountNames.includes(provider))checkAccount().catch(()=>{});voiceSetupState();}
function showSettings(tab='ai') {
  extensions.fill(state);
  if(state.desktopMode==='bot')document.body.classList.add('settings-only');
  $('provider').value=['chatgpt','google-account','openrouter'].includes(state.config.provider)?state.config.provider:'google-account';$('model').value=selectedProvider()===state.config.provider?state.config.model:state.models[selectedProvider()];$('speech').value=state.config.speech;$('auto-build').checked=state.config.autoBuild;
  $('preview-browser').value=state.config.previewBrowser||'system';
  $('speech-language').value=['en','bn'].includes(state.config.speechLanguage)?state.config.speechLanguage:'auto';
  $('speech-pause').value=String(state.config.speechPause??2200);$('voice-review').checked=!!state.config.voiceReview;run(refreshMicrophones);
  $('api-key').value='';$('speech-key').value='';$('key-state').textContent=state.keySaved?'A key is saved. Leave blank to keep it.':'No key saved yet.';
  $('speech-key-state').textContent=state.speechKeySaved?'A separate speech key is saved.':'Cloud transcription needs an OpenAI API key. A ChatGPT subscription does not cover API usage.';
  $('binary-path').textContent=state.config.whisperBinary||'No executable selected';$('model-path').textContent=state.config.whisperModel||'No model selected';
  $('settings-error').hidden=true;settingsTab(typeof tab==='string'?tab:'ai');run(loadAccountModels);if(!$('settings-dialog').open)$('settings-dialog').showModal();
}
async function stopSample(){sampleGeneration++;sampleRecording=false;await sampleRecorder?.cancel();if(sampleProcessing)await api.cancel();$('test-command').textContent='Speak a sample';$('stop-sample').hidden=true;}
async function closeSettings(){await stopMicTest();await stopSample();sampleAudio=undefined;$('settings-dialog').close();if(state.desktopMode==='bot')await api.studio('hide');}
$('settings-nav').onclick=()=>showSettings();$('provider-badge').onclick=()=>showSettings();$('close-settings').onclick=()=>run(closeSettings);$('settings-dialog').addEventListener('cancel',event=>{event.preventDefault();run(closeSettings);});
$('enable-integration').onclick=()=>run(async()=>{await api.integration(true);toast('Folder right-click menu enabled.');});
$('remove-integration').onclick=()=>run(async()=>{await api.integration(false);toast('Folder right-click menu removed.');});
$('choose-workspace').onclick=()=>run(async()=>{await api.chooseFolder();await refresh();});
$('provider').onchange=()=>{$('model').value=state.models[selectedProvider()];$('api-key').value='';$('key-state').textContent='Leave blank to keep a previously saved key for this provider.';if(accountNames.includes(selectedProvider())){$('account-status').textContent='Checking the official tool…';$('account-detail').textContent=accountDescription(selectedProvider());}settingsVisibility();run(loadAccountModels);};$('speech').onchange=settingsVisibility;
$('settings-form').onsubmit=async event=>{
  event.preventDefault();$('settings-error').hidden=true;
  try{
    await api.settings({provider:selectedProvider(),model:$('model').value,key:$('api-key').value,speechKey:$('speech-key').value,speech:$('speech').value,speechLanguage:$('speech-language').value,microphoneId:$('microphone-device').value,speechPause:Number($('speech-pause').value),voiceReview:$('voice-review').checked,autoBuild:$('auto-build').checked,previewBrowser:$('preview-browser').value,toolkit:extensions.read()});
    $('api-key').value='';$('speech-key').value='';await closeSettings();await refresh();toast('Settings saved. You’re ready to build.');
  }catch(error){$('settings-error').textContent=error.message;$('settings-error').hidden=false;}
};
$('forget-key').onclick=()=>run(async()=>{await api.forgetKey(selectedProvider());await refresh();$('key-state').textContent='Saved key removed.';toast('Saved AI key removed.');});
for(const [id,kind] of [['choose-binary','binary'],['choose-model','model']])$(id).onclick=()=>run(async()=>{const next=await api.chooseWhisper(kind);state.config.whisperBinary=next.config.whisperBinary;state.config.whisperModel=next.config.whisperModel;$('binary-path').textContent=state.config.whisperBinary||'No executable selected';$('model-path').textContent=state.config.whisperModel||'No model selected';});
$('enable-mic').onclick=async()=>{
  try{if(micTester){await stopMicTest();$('mic-state').textContent='Microphone check finished.';return;}
    await stopSample();micTester=new VoiceRecorder();await micTester.start(()=>run(stopMicTest),{deviceId:$('microphone-device').value,onLevel:level=>$('mic-meter').value=Math.min(1,level*10)});await refreshMicrophones();$('enable-mic').textContent='Stop microphone check';$('mic-state').textContent='Listening for 10 seconds. Speak and watch the green meter.';micTestTimer=setTimeout(()=>run(async()=>{await stopMicTest();$('mic-state').textContent='Check complete. Try a real command below.';}),10000);
  }catch(error){await stopMicTest();$('mic-state').textContent=error.name==='NotAllowedError'?'Access blocked. Enable desktop microphone access in Windows Settings, then retry.':`Microphone could not start: ${error.message}`;}
};
$('install-voice').onclick=async()=>{await stopMicTest();await stopSample();$('install-voice').disabled=true;$('voice-download').hidden=false;$('settings-error').hidden=true;try{const next=await api.installVoice();state=next;$('speech').value='local';$('binary-path').textContent=next.config.whisperBinary;$('model-path').textContent=next.config.whisperModel;settingsVisibility();$('voice-download-label').textContent='Voice is ready ✓';}catch(error){$('settings-error').textContent=error.message;$('settings-error').hidden=false;}finally{$('install-voice').disabled=false;$('voice-download').hidden=true;}};
async function finishSample(){
  if(!sampleRecording)return;sampleRecording=false;const current=sampleGeneration;sampleProcessing=true;$('test-command').disabled=true;$('sample-result').textContent='Recognizing your sample…';
  try{sampleAudio=await sampleRecorder.stop();if(current!==sampleGeneration)return;if(sampleRecorder.detector.voicedMs<240)throw new Error('No speech heard. Check your microphone and retry.');const result=await api.testVoice({audio:sampleAudio,language:$('speech-language').value,speech:$('speech').value});if(current!==sampleGeneration)return;$('sample-result').textContent=result.text?`Heard: ${result.text} · ${(result.elapsedMs/1000).toFixed(1)} seconds${result.uncertain?' · Please check these words':''}`:'No speech recognized. Check your microphone, then retry.';}
  catch(error){if(current===sampleGeneration)$('sample-result').textContent=error.message;}finally{sampleProcessing=false;$('test-command').disabled=false;$('test-command').textContent='Speak a sample';$('stop-sample').hidden=true;}
}
$('test-command').onclick=async()=>{if(sampleRecording)return finishSample();await stopMicTest();await stopSample();const current=sampleGeneration;try{sampleRecorder=new VoiceRecorder();await sampleRecorder.start(finishSample,{deviceId:$('microphone-device').value,autoStop:true,pauseMs:Number($('speech-pause').value)||2200,onLevel:level=>$('mic-meter').value=Math.min(1,level*10)});if(current!==sampleGeneration){await sampleRecorder.cancel();return;}sampleRecording=true;$('test-command').textContent='Finish sample';$('stop-sample').hidden=false;$('sample-result').textContent='Listening… Say your command, then pause.';}catch(error){$('sample-result').textContent=`Microphone could not start: ${error.message}`;}};
$('stop-sample').onclick=()=>run(stopSample);
$('cancel-voice-download').onclick=()=>run(()=>api.cancel());
$('attach').onclick=()=>run(async()=>{await api.attach();await refresh();});
async function send(voice=false){
  if(['existing','react'].includes(state.project?.kind)&&!state.selected){await api.pen(true);toast('Mark an element in the preview, then speak your fix.');return;}
  const command=$('command').value.trim();if(!command){toast('Tell us what you’d like to create.',true);return;}
  if(!state.selected && voice && state.analysis && /^(yes[,.! ]*)?(build( it| this| the website| this website)?|start|go ahead|approve|confirm)[.! ]*$/i.test(command)){await api.build();await refresh();return;}
  if(state.project?.kind==='project'){await api.projectEdit(command);$('command').value='';}else if(state.selected){await api.edit(command);$('command').value='';await refresh();}
  else{await api.analyze(command);await refresh();if(state.analysis&&!state.config.autoBuild)$('plan-panel').scrollIntoView({behavior:'smooth',block:'center'});}
}
$('send').onclick=()=>run(()=>send());$('command').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!state.busy&&!recording){event.preventDefault();run(()=>send());}});
$('build').onclick=()=>run(async()=>{await api.build();$('command').value='';await refresh();});
async function toggleRecording(){
  if(recording){
    recording=false;$('record').closest('.voice-zone').classList.remove('recording');$('record-label').textContent='Transcribing…';$('record-hint').textContent='Finding the words.';updateControls();
    try{const bytes=await recorder.stop();const result=await api.transcribeDetailed(bytes);$('command').value=result.text;if(result.uncertain||state.config.voiceReview)toast('Check the recognized words, then press Create.',true);else{toast(`Heard: ${result.text}`);await send(true);}}
    finally{$('record-label').textContent='Tap to speak';$('record-hint').textContent='Speak naturally. Pause when you finish.';await refresh();}
  }else{
    if(state.config.speech==='local'&&(!state.config.whisperBinary||!state.config.whisperModel)){showSettings();toast('Set up local Whisper, or choose OpenAI transcription.',true);return;}
    recorder=new VoiceRecorder();await recorder.start(()=>run(toggleRecording),{deviceId:state.config.microphoneId,autoStop:state.config.speechPause!==0,pauseMs:state.config.speechPause||2200});recording=true;
    $('record').closest('.voice-zone').classList.add('recording');$('record-label').textContent='Listening. Tap to finish.';$('record-hint').textContent='Up to 90 seconds · your microphone is on';updateControls();
  }
}
$('record').onclick=()=>run(toggleRecording);
$('cancel').onclick=()=>run(()=>api.cancel());
async function openPreview(){const url=await api.preview();$('preview-address').textContent=state.project?.kind==='project'?'Local project files':new URL(url).host;renderProjectFiles();}
$('open-preview').onclick=()=>run(openPreview);$('preview-nav').onclick=()=>run(openPreview);
$('workspace-nav').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
$('pen').onclick=()=>run(async()=>{state.penEnabled=await api.pen(!state.penEnabled);await api.startPenVoice(state.penEnabled);updateControls();});
$('clear-selection').onclick=()=>run(async()=>{await api.clearSelection();state.selected=null;updateControls();});
for(const id of ['undo','redo'])$(id).onclick=()=>run(async()=>{await api[id]();await refresh();toast(id==='undo'?'Change undone.':'Change restored.');});
$('export').onclick=()=>run(async()=>{const folder=await api.export();if(folder)toast(`Website saved to ${folder}`);});
$('complete-close').onclick=()=>$('complete-dialog').close();
api.onEvent(event=>{
  if(!state){run(refresh);return;}
  if(event.kind==='skills-used'||event.kind==='guidance-local'){state.toolkit.guidance={mode:event.kind==='guidance-local'?'local':'ai',ids:event.skills||[],budget:event.budget};guidanceView(toolkitGuidance,state.toolkit.guidance);return;}
  if(event.kind==='operation-progress'){$('status-message').textContent=event.message;if($('settings-dialog').open&&!$('cancel-account').hidden)$('account-status').textContent=event.message;return;}
  if(event.kind==='quality-updated'){run(refresh);return;}
  if(event.kind==='settings-hidden'){run(async()=>{await stopMicTest();await stopSample();sampleAudio=undefined;if($('settings-dialog').open)$('settings-dialog').close();});return;}
  if(event.kind==='project-files'){document.body.classList.remove('settings-only');run(refresh);return;}
  if(event.kind==='studio-page'){if(event.page!=='hide'&&$('complete-dialog').open)$('complete-dialog').close();if(['workspace','checkup'].includes(event.page)){document.body.classList.remove('settings-only');if($('settings-dialog').open)$('settings-dialog').close();run(async()=>{await refresh();if(event.page==='checkup')$('workbench').scrollIntoView({behavior:'smooth',block:'start'});});}if(event.page?.startsWith('settings'))showSettings(event.page==='settings-voice'?'voice':'ai');return;}
  if(['settings-updated','workspace','quality-updated','toolkit-updated'].includes(event.kind)){run(async()=>{await refresh();if($('settings-dialog').open)voiceSetupState();});return;}
  if(event.phase==='voice-setup'){$('voice-download-label').textContent=event.message;$('voice-download-progress').value=event.progress;}
  if(event.kind==='busy'){state.busy=event.busy;updateControls();renderDocuments();}
  if(event.phase){status(event);if(event.phase==='planned'){state.analysis={command:$('command').value,profile:event.profile,plan:event.plan};renderPlan();}}
  if(event.kind==='history'){state.history=event;updateControls();if(state.config.projectMode==='project'){$('source-details').hidden=true;run(refresh);}}
  if(event.kind==='selected'){state.selected=event.selected;updateControls();if(event.selected){$('command').value='';$('command').placeholder='Make this button green, or make this section bigger…';$('command').focus();}}
  if(event.kind==='built'){$('complete-dialog').querySelector('.eyebrow').textContent=event.project.kind==='project'?'Project ready':'Website ready';$('complete-dialog').querySelector('p').textContent=event.project.kind==='project'?'Your project files are ready. Follow the run instructions, then refine with voice or text.':'Your website is ready in the live preview. Use the magic pen to refine it.';run(refresh);if(!$('complete-dialog').open)$('complete-dialog').showModal();}
  if(event.kind==='notice')toast(event.message,true);
});
if(api){await refresh();if(!state.keySaved&&!['demo','ollama','chatgpt','claude-code','google-account'].includes(state.config.provider))showSettings();}
