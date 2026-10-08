import './projects.css';
import {projectControls} from './project-controls.js';
import './bot.css';
import './radial.css';
import './voice-feedback.css';
import './pet-motion.css';
import {installIcons,icon} from './icons.js';
import {petDrag} from './pet-drag.js';
import {designControls} from './design-controls.js';
import {guidanceView} from './guidance.js';
import {petInteraction} from './interaction.js';
import {VoiceRecorder} from './voice.js';
const $=id=>document.getElementById(id),api=window.builder;
const inputSummary=document.createElement('button');inputSummary.id='bot-input-summary';inputSummary.type='button';inputSummary.className='input-summary';inputSummary.title='View or manage input documents';$('folder-label').after(inputSummary);inputSummary.onclick=()=>run(()=>api.studio('workspace'));
const modeContainer=document.createElement('div');inputSummary.after(modeContainer);
const updateProjectControls=projectControls(modeContainer,()=>run(async()=>{await stop(true);await api.newProject();completing=false;await refresh();}),style=>run(async()=>{await api.designStyle(style);await refresh();}));
let state,mode='closed',recording=false,recorder,completing=false;
let armed=false,starting=false,processing=false,generation=0,resumeAfterSetup=false,draft=null,timer,celebrationTimer;
let feedback={phase:'off',message:'Mark a part of the page.',transcript:''};
$('radial-tools').append(document.querySelector('.tools'));
installIcons();petInteraction($('pet-button'));petDrag($('pet-button'),api,error=>notice(error.message));
const fileResult=document.createElement('div');fileResult.id='bot-project-files';fileResult.className='bot-project-files';fileResult.hidden=true;fileResult.innerHTML='<span id="bot-file-count"></span><button type="button" id="bot-view-files">View project files ↗</button>';$('bot-command-form').after(fileResult);$('bot-view-files').onclick=()=>run(()=>api.preview());
const checkup=document.createElement('button');checkup.id='bot-checkup';checkup.type='button';checkup.className='text-button';checkup.textContent='Project checkup & history ↗';checkup.hidden=true;fileResult.after(checkup);checkup.onclick=()=>run(()=>api.studio('checkup'));
const guidance=document.createElement('details');guidance.id='bot-guidance';guidance.className='guidance';guidance.hidden=true;guidance.innerHTML='<summary>AI guidance</summary><p></p><div class="guidance-items"></div>';$('tool-panel').querySelector('footer').before(guidance);
const updateDesign=designControls($('bot-plan').parentElement,api,run,refresh);
const names={openai:'OpenAI',anthropic:'Anthropic',gemini:'Gemini',openrouter:'OpenRouter',ollama:'Ollama · local',demo:'Offline demo',chatgpt:'ChatGPT account','claude-code':'Claude Code','google-account':'Google account'};
function notice(text){$('bot-notice').textContent=text;$('bot-notice').hidden=!text;}
const connectionFix=document.createElement('button');connectionFix.id='bot-fix-connection';connectionFix.type='button';connectionFix.className='outline-button';connectionFix.textContent='Open AI connection settings';connectionFix.hidden=true;$('bot-notice').after(connectionFix);connectionFix.onclick=()=>run(async()=>{await stop(true);await api.studio('settings');});
async function run(fn){try{return await fn();}catch(error){if(error.message!=='Cancelled.'){notice(error.message);await status('error',error.message);}await refresh();}}
async function status(phase,message,transcript=draft?.text||''){feedback={phase,message,transcript,autoApply:!!timer};renderVoice();await api.voiceFeedback(feedback);}
function setMode(value){mode=typeof value==='boolean'?(value?'tools':'closed'):value;$('tool-panel').hidden=mode!=='input';$('voice-panel').hidden=mode!=='voice';$('radial-menu').hidden=mode!=='tools';for(const name of ['tools','input','voice'])document.body.classList.toggle(`mode-${name}`,mode===name);renderPen();}
function renderPen(){
  if(!state)return;
  const controls=$('pen-controls'),parent=mode==='input'?$('tool-panel'):$('voice-panel');
  if(controls.parentElement!==parent){if(mode==='input')$('bot-selection').after(controls);else $('voice-panel').querySelector('header').after(controls);}
  controls.hidden=!state.project||state.project.kind==='project'||!state.penEnabled;
  for(const button of controls.querySelectorAll('[data-mode]')){button.setAttribute('aria-pressed',String(button.dataset.mode===state.selectionMode));button.disabled=state.busy||processing||(state.project?.kind==='existing'&&button.dataset.mode!=='element');}
  $('pen-clear').disabled=!state.selected||state.busy||processing;
  $('voice-selection').hidden=!state.selected;
  if(state.selected){$('voice-selection-label').textContent=state.selected.label||state.selected.id;const count=state.selected.visualContext?.instances||1;$('voice-selection-source').textContent=state.selected.file+(state.selected.line?':'+state.selected.line:'')+(count>1?` · shared by ${count} instances`:'');}
  $('pen-help').textContent=state.project?.kind==='existing'?'Element mode edits mapped JSX/TSX. Shared components update every instance.':state.project?.kind==='project'?'Describe your project change. Review the words before applying.':'Circle letters for a text edit, or use Element for a whole block. Esc to browse.';
  $('pen-help').hidden=!!state.selected||!!feedback.transcript||state.busy;
  if(guidance.parentElement!==parent){if(mode==='voice')$('pen-help').before(guidance);else $('tool-panel').querySelector('footer').before(guidance);}
  guidanceView(guidance,state.toolkit?.guidance);
}
async function expand(value){if(value==='closed'||value==='tools')await stop(true);setMode(value);await api.botExpand(value);}
function renderVoice(){
  document.body.dataset.voicePhase=feedback.phase;
  $('voice-phase').textContent={listening:'Microphone on',review:'Heard you',editing:'Updating your page',transcribing:'Recognizing speech',error:'Try again'}[feedback.phase]||'Pen + voice';
  $('voice-message').textContent=feedback.message;if(document.activeElement!==$('voice-transcript'))$('voice-transcript').value=feedback.transcript;
  $('voice-transcript').hidden=!feedback.transcript;$('voice-transcript').readOnly=feedback.phase!=='review';$('voice-finish').hidden=!recording;$('voice-apply').hidden=!draft||feedback.phase!=='review';$('voice-apply').disabled=processing||state?.busy||!draft?.text?.trim();$('voice-retry').disabled=starting||processing||state?.busy;$('voice-stop').disabled=!(recording||starting||processing||state?.busy||draft);
  $('voice-meter').hidden=!recording&&feedback.phase!=='starting';
  for(const action of ['undo','redo'])$(`voice-${action}`).disabled=!state?.history?.[action]||state?.busy||recording||processing;
}
function render(){
  const blocked=state.busy||recording||starting||processing;updateProjectControls({...state,busy:blocked});const general=state.config.projectMode==='project';
  fileResult.hidden=!(general||['existing','react'].includes(state.project?.kind))||!state.project;$('bot-file-count').textContent=`${state.project?.files?.length||0} files · saved locally`;$('bot-view-files').disabled=state.busy;
  checkup.hidden=!state.project;checkup.disabled=blocked;
  $('bot-provider').textContent=`${names[state.config.provider]}${!state.keySaved&&!['demo','ollama','chatgpt','claude-code','google-account'].includes(state.config.provider)?' · Set up your key':''}`;
  $('folder-name').textContent=state.workspaceFolder?.split(/[\\/]/).filter(Boolean).at(-1)||'Choose your project folder';$('folder-label').title=state.workspaceFolder||'Choose your project folder';
  const imageCount=state.documents?.filter(doc=>doc.kind==='image').length||0,textCount=(state.documents?.length||0)-imageCount;
  $('bot-doc-count').textContent=state.documents?.length?[textCount?`${textCount} text documents`:null,imageCount?`${imageCount} images`:null].filter(Boolean).join(' + '):state.inventory?.files?`${state.inventory.files} files found`:'Documents are optional.';
  inputSummary.textContent=$('bot-doc-count').textContent+(imageCount?(state.documents.some(doc=>doc.reading)?' - read for this plan':' - read during planning'):'');inputSummary.disabled=blocked;
  for(const id of ['folder-tool','folder-label','bot-send','bot-build','bot-clear'])$(id).disabled=blocked;
  $('bot-settings').disabled=state.busy;$('text-tool').disabled=state.busy||processing;$('magic-voice').disabled=state.busy||processing;$('bot-mic').disabled=state.busy||starting||processing;
  $('preview-tool').disabled=!state.project;$('preview-tool').querySelector('strong').textContent=general?'Project files':'Live preview';$('preview-tool').querySelector('small').textContent=general?'Inspect your project.':'Open your website.';$('magic-voice').querySelector('strong').textContent=general?'Voice command':'Pen + voice';$('bot-build').textContent=general?'Build this project':'Build this website';$('undo-tool').disabled=!state.history?.undo||blocked;$('bot-redo').disabled=!state.history?.redo||blocked;$('bot-export').disabled=!state.project||blocked;
  $('bot-cancel').hidden=!state.busy;$('bot-selection').hidden=!state.selected;if(state.selected)$('bot-selection-label').textContent=state.selected.label||state.selected.id;
  $('bot-prompt').textContent=general&&state.project?'What should change in your project?':state.selected?'What should change here?':'What should we create?';$('bot-send').textContent=general&&state.project?'Update project':state.selected?'Apply edit ↗':'Make a plan ↗';
  $('bot-command').placeholder=general?(state.project?'Describe the change to your project files...':'Build an app, script, tool or documentation project...'):state.selected?.kind==='text'?'Make the marked text green, or replace it…':state.selected?'Make this button green and bigger…':'Describe what to create from the files in this folder…';
  if(['existing','react'].includes(state.project?.kind)&&!state.selected){$('bot-prompt').textContent='Mark the part you want to fix.';$('bot-send').textContent='Open preview';$('bot-command').placeholder='Open preview, mark an element, then speak your fix.';}
  updateDesign(state);
  $('bot-plan').hidden=!state.analysis||completing;
  if(state.analysis){const p=state.analysis.plan;$('bot-plan-title').textContent=p.title;$('bot-plan-summary').textContent=p.summary;const direction=p.artDirection?.candidates[p.artDirection.chosen];$('bot-direction').hidden=!direction;$('bot-direction').textContent=direction?'React ? '+direction.name:'';$('bot-direction').title=p.artDirection?.signature||'';$('bot-sections').replaceChildren(...p.sections.map(s=>{const el=document.createElement('span');el.textContent=s.title;el.title=s.purpose;return el;}));}
  $('bot-root').classList.toggle('working',state.busy);$('bot-root').classList.toggle('magic-active',armed);
  $('pet-caption').textContent=recording?'Listening':feedback.phase==='editing'?'Updating selection':feedback.phase==='transcribing'?'Recognizing speech':state.busy?(general?'Working on your project':'Building your website'):state.selected?'Ready for your edit':state.project?.complete?(state.project.kind==='project'?'Project ready':'Website ready'):'Open workspace';
  $('bot-root').dataset.petState=recording?'listening':state.busy||processing?'thinking':feedback.phase==='error'?'error':'idle';renderPen();
  if(state.status){const connectionError=state.status.phase==='error'&&/authentication|account|provider|model.*test|signed out|connection/i.test(state.status.message);connectionFix.hidden=!connectionError;if(connectionError&&$('bot-notice').textContent===state.status.message)$('bot-notice').hidden=true;$('bot-status').textContent=state.status.message;$('bot-progress').style.width=`${state.status.progress||0}%`;$('bot-status-symbol').innerHTML=icon(state.status.phase==='complete'?'check':'browser');}renderVoice();
}
async function refresh(){state=await api.state();render();}
async function send(voice=false){
  if(['existing','react'].includes(state.project?.kind)&&!state.selected){await api.pen(true);notice('Mark an element in the preview, then speak or apply your fix.');return;}
  const command=$('bot-command').value.trim();if(!command){notice('Tell me what you want to build or change.');return;}notice('');
  if(voice&&!state.selected&&state.analysis&&/^(build( it| this| the website| this website)?|yes|approve|confirm|start|go ahead|বানাও|শুরু করো|বানিয়ে দাও|তৈরি করো|হ্যাঁ)[.!। ]*$/i.test(command)){await build();return;}
  if(state.project?.kind==='project'){await api.projectEdit(command);$('bot-command').value='';}else if(state.selected){await api.edit(command);$('bot-command').value='';}else{completing=false;await api.analyze(command);}await refresh();
}
async function build(){notice('');completing=true;render();try{await api.build();$('bot-command').value='';}finally{await refresh();completing=!!state.project?.complete;render();}}
async function stop(disarm=false,disablePen=true){
  clearTimeout(timer);timer=undefined;draft=null;generation++;resumeAfterSetup=false;recording=false;await recorder?.cancel();if(processing)await api.cancel();document.body.classList.remove('recording');$('mic-label').textContent='Speak';
  if(disarm){armed=false;if(disablePen&&state.project&&state.project.kind!=='project')await api.pen(false);}await status(disarm?'off':'cancelled',disarm?'Voice is off.':'Stopped. Retry when you are ready.','');render();
}
async function resume(){await refresh();const ready=state.config.speech==='local'?state.config.whisperBinary&&state.config.whisperModel:state.speechKeySaved||(state.config.provider==='openai'&&state.keySaved);if(resumeAfterSetup&&armed&&ready&&!state.busy){resumeAfterSetup=false;await voice();}}
async function apply(){
  if(!draft||processing||state.busy)return;clearTimeout(timer);timer=undefined;const request={...draft};if(!request.text.trim())return;
  if(request.project){if(request.directory!==state.project?.directory||request.cursor!==state.history?.cursor){await status('review','Project changed. Retry your command.');return;}processing=true;try{$('bot-command').value=request.text;await send(true);draft=null;await status('ready','Project updated. You can speak another command.');}finally{processing=false;await refresh();}return;}
  if(!request.targetId){await status('review','Mark an element to apply these words.');return;}
  if(request.targetId!==state.selected?.id||request.targetKey!==state.selected?.key){await status('review','Selection changed. Retry for the new selection.');return;}
  const current=generation;processing=true;const started=Date.now();
  const waiting=setInterval(()=>{if(processing&&current===generation)run(()=>status('editing',`Waiting for ${names[state.config.provider]}… ${Math.floor((Date.now()-started)/1000)}s. Stop to cancel.`,request.text));},4000);
  try{await status('editing','Updating your selection. You can stop while the AI is working.',request.text);await api.edit({command:request.text,targetId:request.targetId,targetKey:request.targetKey});if(current!==generation)return;draft=null;await status('ready','Updated ✓ Mark another part to speak again. Undo is nearby.',request.text);notice('Updated. Mark another part for your next change.');}
  finally{clearInterval(waiting);processing=false;await refresh();}
}
async function review(result,targetId,targetKey){
  draft={text:result.text,targetId,targetKey};$('bot-command').value=result.text;const manual=result.uncertain||state.config.voiceReview||!targetId;
  if(!manual)timer=setTimeout(()=>{timer=undefined;run(apply);},2500);
  await status('review',!targetId?'Heard you. Mark the page to choose where this change goes.':manual?'Check the words, then Apply. You can correct them here.':'Applying in 2.5 seconds… Click the words to correct or Stop to cancel.');
}
async function finish(){
  if(!recording||processing)return;const current=generation,targetId=state.selected?.id,targetKey=state.selected?.key;recording=false;processing=true;document.body.classList.remove('recording');$('mic-label').textContent='Working…';render();
  try{
    const audio=await recorder.stop();if(current!==generation)return;if(recorder.detector.voicedMs<240){await status('error','No speech heard. Retry, or type your change.','');return;}
    await status('transcribing',state.config.speech==='local'?'Turning your speech into words on this PC…':'Turning your speech into words with OpenAI…','');
    const result=await api.transcribeDetailed(audio);if(current!==generation)return;await refresh();
    if(armed&&state.config.projectMode==='project'){draft={text:result.text,project:true,directory:state.project?.directory,cursor:state.history?.cursor};await status('review','Check your command, then Apply. This updates the current project.');}
    else if(armed&&state.project)await review(result,targetId,targetKey);else{$('bot-command').value=result.text;if(result.uncertain||state.config.voiceReview){notice('Check the recognized words, then use the create or edit button.');await status('review','Check your words before sending this command.',result.text);}else{notice(`Heard: ${result.text}`);await send(true);await status('off','Voice command processed.','');}}
  }finally{processing=false;$('mic-label').textContent='Speak';await refresh();}
}
async function voice(){
  if(recording)return finish();if(starting||processing||state.busy)return;clearTimeout(timer);timer=undefined;draft=null;
  if(state.config.speech==='local'&&(!state.config.whisperBinary||!state.config.whisperModel)){resumeAfterSetup=armed;await status('error','Set up free voice once in Settings.','');await api.studio('settings-voice');return;}
  if(state.config.speech==='openai'&&!state.speechKeySaved&&!(state.config.provider==='openai'&&state.keySaved)){resumeAfterSetup=armed;notice('Choose free local voice or save a speech key. Your OpenRouter key is for website AI.');await api.studio('settings-voice');return;}
  const current=generation;starting=true;recorder=new VoiceRecorder();await status('starting','Opening your microphone…','');render();
  try{
    await recorder.start(()=>run(finish),{autoStop:state.config.speechPause!==0,deviceId:state.config.microphoneId,pauseMs:state.config.speechPause||2200,onLevel:level=>{const value=Math.min(1,level*12);$('bot-mic').style.setProperty('--voice-level',value);$('voice-meter').value=value;}});
    if(current!==generation){await recorder.cancel();return;}recording=true;document.body.classList.add('recording');$('mic-label').textContent='Finish';
    api.warmVoice().catch(()=>{});
    const message=state.config.projectMode==='project'?'Describe your software, script or project change in your preferred language. Pause when done.':armed&&state.project?(state.selected?'Selected. Say your change in your preferred language. Pause when done.':'Mic is on. Mark a part of the page, then say your change.'):'Speak naturally. Pause to finish, or press Finish.';await status('listening',message,'');notice(message);
  }catch(error){await status('error',error.name==='NotAllowedError'?'Microphone blocked. Enable desktop microphone access in Windows Settings.':`Microphone could not start: ${error.message}`,'');}
  finally{starting=false;render();}
}
async function action({action,text}){
  if(action==='speak'){await stop(true,false);await expand('voice');armed=true;if(state.project&&state.project.kind!=='project')await api.pen(true);await refresh();await voice();return;}
  if(action==='clear'){const voiceActive=armed||recording||!!draft;await stop();await refresh();if(!state.busy)await api.clearSelection();return status(voiceActive?'ready':'off','Selection cleared. Mark the text or element you want to change.','');}
  if(action==='finish')return finish();if(action==='stop')return stop();if(action==='browse')return expand('tools');
  if(action==='retry'){await stop();for(let i=0;i<100&&(processing||state.busy||starting);i++){await new Promise(r=>setTimeout(r,50));await refresh();}if(!state.busy&&!processing&&!starting)await voice();return;}
  if(action==='correct'){if(!draft||processing)return;clearTimeout(timer);timer=undefined;if(typeof text==='string')draft.text=text;return status('review','Correct the words, then Apply.');}
  if(action==='apply'){if(draft&&typeof text==='string')draft.text=text;return apply();}
  if(action==='undo'||action==='redo'){if(recording||processing)return;clearTimeout(timer);timer=undefined;draft=null;await api[action]();await refresh();return status('ready',action==='undo'?'Change undone. Mark a part to speak again.':'Change restored. Mark a part to speak again.','');}
}
$('pet-button').onclick=()=>run(()=>expand(mode==='closed'?'tools':'closed'));$('collapse').onclick=()=>run(()=>expand('closed'));$('bot-back').onclick=()=>run(()=>expand('tools'));
$('text-tool').onclick=()=>run(async()=>{await stop(true);await expand('input');if(state.project&&state.project.kind!=='project')await api.pen(true);render();$('bot-command').focus();});$('bot-command-form').onsubmit=event=>{event.preventDefault();run(()=>send());};
$('bot-command').onkeydown=event=>{if(event.ctrlKey&&event.key==='Enter'&&!state.busy&&!recording){event.preventDefault();run(()=>send());}};$('bot-mic').onclick=()=>run(voice);
$('magic-voice').onclick=()=>run(async()=>{await expand(state.project?'voice':'input');armed=true;if(state.project&&state.project.kind!=='project')await api.pen(true);await refresh();await voice();});
for(const id of ['folder-tool','folder-label'])$(id).onclick=()=>run(async()=>{await api.chooseFolder();await expand('input');completing=false;await refresh();if(state.workspaceWarnings.length)notice(state.workspaceWarnings.join(' '));});
$('preview-tool').onclick=()=>run(()=>api.preview());$('bot-build').onclick=()=>run(build);$('undo-tool').onclick=()=>run(async()=>{await api.undo();await refresh();});$('bot-redo').onclick=()=>run(async()=>{await api.redo();await refresh();});
$('bot-clear').onclick=()=>run(async()=>{await stop(true);await api.clearSelection();await refresh();});$('bot-settings').onclick=()=>run(async()=>{await stop(true);await api.studio('settings');});
$('bot-close').onclick=()=>run(()=>api.quit());$('bot-cancel').onclick=()=>run(()=>api.cancel());$('radial-close').onclick=()=>run(()=>api.quit());$('radial-settings').onclick=()=>run(()=>api.studio('settings'));
$('bot-export').onclick=()=>run(async()=>{const dest=await api.export();if(dest)notice(`Saved: ${dest}`);});$('voice-back').onclick=()=>run(()=>expand('tools'));
$('voice-settings').onclick=()=>run(async()=>{await stop(true);await api.studio('settings-voice');});
$('pen-clear').onclick=()=>run(()=>action({action:'clear'}));
for(const button of $('pen-controls').querySelectorAll('[data-mode]'))button.onclick=()=>run(async()=>{state=await api.selectionMode(button.dataset.mode);render();});
for(const name of ['finish','retry','stop','apply','undo','redo'])$(`voice-${name}`).onclick=()=>run(()=>action({action:name,text:$('voice-transcript').value}));
for(const event of ['focus','input'])$('voice-transcript').addEventListener(event,()=>run(()=>action({action:'correct',text:$('voice-transcript').value})));
api.onEvent(event=>{
  if(event.kind==='visual-context'){notice(event.message);return;}
  if(event.kind==='selection-mode'){state.selectionMode=event.mode;renderPen();return;}
  if(event.kind==='pen-state'){state.penEnabled=event.enabled;renderPen();return;}
  if(event.kind==='skills-used'||event.kind==='guidance-local'){state.toolkit.guidance={mode:event.kind==='guidance-local'?'local':'ai',ids:event.skills||[],budget:event.budget};renderPen();return;}
  if(!state){run(refresh);return;}if(event.kind==='voice-action'){run(()=>action(event));return;}if(event.kind==='bot-expanded'){setMode(event.mode||event.expanded);return;}if(event.kind==='notice'){notice(event.message);return;}
  if(event.kind==='busy'){state.busy=event.busy;if(event.busy)state.toolkit.guidance=undefined;render();if(!event.busy&&resumeAfterSetup)run(resume);return;}
  if(event.phase){state.status=event;if(event.phase==='planned'){completing=false;state.analysis={plan:event.plan,profile:event.profile};}render();}
  if(event.kind==='built'){completing=true;$('bot-root').classList.add('complete');clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>$('bot-root').classList.remove('complete'),1500);notice(event.project.kind==='project'?'Project ready. Use voice or text to make changes.':'Website ready. Mark a detail and say what to change.');run(refresh);}
  if(event.kind==='selected'){
    state.selected=event.selected;render();
    if(event.selected&&armed){
      if(draft){clearTimeout(timer);timer=undefined;if(!draft.targetId){draft.targetId=event.selected.id;draft.targetKey=event.selected.key;run(()=>status('review','Selection ready. Check your words, then Apply.'));}else if(draft.targetKey!==event.selected.key){draft=null;if(!processing&&!starting)run(voice);}}
      else if(recording)run(()=>status('listening','Selected. Say your change; pause when done.',''));else if(!processing&&!starting)run(voice);
    }else if(event.selected){$('bot-command').value='';if(mode==='input')$('bot-command').focus();}
    else if(draft&&!processing){clearTimeout(timer);timer=undefined;draft.targetId=undefined;draft.targetKey=undefined;run(()=>status('review','Selection cleared. Mark where these words should apply.'));}
  }
  if(event.kind==='workspace'){notice(event.warnings.join(' '));completing=false;run(async()=>{await stop(true,false);await refresh();});}
  if(['history','settings-updated'].includes(event.kind))run(async()=>{await refresh();if(event.kind==='settings-updated'&&resumeAfterSetup)await resume();});
});
await refresh();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();run(()=>expand(mode==='tools'?'closed':'tools'));}});
