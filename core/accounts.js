import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {jsonResponse} from './schemas.js';
import {imageBytes} from './visual-context.js';
import {requestImages,inputImageBytes} from './input-images.js';
export const accountProviders=['chatgpt','claude-code','google-account'];
const definitions={chatgpt:{command:'codex',package:'@openai/codex',entry:'bin/codex.js',docs:'https://developers.openai.com/codex/cli/'},'claude-code':{command:'claude',package:'@anthropic-ai/claude-code',entry:'cli.js',docs:'https://code.claude.com/docs/en/setup'},'google-account':{command:'agy',docs:'https://www.antigravity.google/docs/cli/install/'}};
async function exists(file){try{return (await fs.stat(file)).isFile();}catch{return false;}}
// Resolve native binaries or their real Node entry points. Never run a .cmd
// shim via a command shell with a user/model supplied prompt.
export async function resolveAccountTool(provider,env=process.env){
 const spec=definitions[provider];if(!spec)throw new Error('Unsupported account provider.');
 const dirs=(env.PATH||env.Path||'').split(path.delimiter).filter(Boolean);
 if(process.platform==='win32'){
  if(provider==='google-account'&&env.LOCALAPPDATA)dirs.unshift(path.join(env.LOCALAPPDATA,'agy','bin'));
  if(provider==='claude-code')dirs.unshift(path.join(os.homedir(),'.local','bin'));
  for(const dir of dirs){const file=path.join(dir,`${spec.command}.exe`);if(await exists(file))return {file,args:[]};}
  // Codex installed by the official IDE extension also ships a native CLI.
  if(provider==='chatgpt')try{const base=path.join(os.homedir(),'.vscode','extensions'),entries=await fs.readdir(base);for(const name of entries.filter(n=>/^openai\.chatgpt-[\w.-]+$/.test(n)).sort().reverse()){const file=path.join(base,name,'bin','windows-x86_64','codex.exe');if(await exists(file))return {file,args:[]};}}catch{}
  const prefixes=spec.package?[env.APPDATA&&path.join(env.APPDATA,'npm'),...dirs].filter(Boolean):[];
  for(const dir of prefixes){const entry=path.join(dir,'node_modules',spec.package,spec.entry);if(await exists(entry)){for(const nodeDir of dirs){const node=path.join(nodeDir,'node.exe');if(await exists(node))return {file:node,args:[entry]};}}}
 }else for(const dir of dirs){const file=path.join(dir,spec.command);if(await exists(file))return {file,args:[]};}
 throw new Error(`Install the official ${spec.command} tool first, then click Check connection.`);
}
export function accountEnvironment(provider,directory,base=process.env){
 const env={...base};for(const key of Object.keys(env))if(/(?:API_KEY|AUTH_TOKEN|ACCESS_TOKEN|SECRET|PASSWORD|PRIVATE_KEY)$/i.test(key)||/^(CLAUDE_CODE_USE_.*|GOOGLE_GENAI_USE_VERTEXAI|GOOGLE_APPLICATION_CREDENTIALS|ELECTRON_RUN_AS_NODE|CLAUDECODE)$/i.test(key))delete env[key];
 if(provider==='chatgpt')env.CODEX_HOME=path.join(directory,'accounts','codex');
 if(provider==='google-account'){
  // Native keyring credentials belong to the OS user. Isolate CLI settings,
  // hooks, plugins and context without copying any authentication material.
  env.USERPROFILE=path.join(directory,'accounts','antigravity');
  env.HOME=env.USERPROFILE;
  for(const key of Object.keys(env))if(/^(GEMINI_CLI_|AGY_|ANTIGRAVITY_|GOOGLE_GEMINI_BASE_URL|GOOGLE_CLOUD_PROJECT|CLOUD_CODE_URL)/i.test(key))delete env[key];
  env.AGY_CLI_NONINTERACTIVE_HEADLESS='1';
 }
 return env;
}
export function runTool(tool,args,{cwd,env,signal,timeout=600000,visible=false,input='',onOutput}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason);return;}
  const child=spawn(tool.file,[...tool.args,...args],{cwd,env,windowsHide:!visible,stdio:['pipe','pipe','pipe'],shell:false});let out='',err='',finished=false;
  const timer=setTimeout(()=>stop(new Error('The provider took too long. Cancelled; try again.')),timeout);
  function stop(error){if(finished)return;child.kill();if(process.platform==='win32'&&child.pid)spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});finish(error);}
  const abort=()=>stop(signal.reason||new Error('Cancelled.'));signal?.addEventListener('abort',abort,{once:true});
  function finish(error,value){if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);}
  child.on('error',()=>finish(new Error('The official provider tool could not start. Check its installation.')));
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>{out+=chunk;onOutput?.(chunk);if(Buffer.byteLength(out)>2000000)stop(new Error('The provider response is too large. Ask for a smaller task.'));});
  child.stderr.on('data',chunk=>{if(err.length<100000)err+=chunk;onOutput?.(chunk);});
  child.on('close',code=>finish(null,{code,out,err}));child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
export function accountFailure(details='',provider){
 if(provider==='google-account'&&/UNSUPPORTED_CLIENT|client is no longer supported|migrate.*Antigravity/i.test(details))return 'Google rejected the retired Gemini CLI client. Google personal accounts now require Antigravity CLI (agy). Update Markora and use Connect Google; repeating the old sign-in will not fix it. Your active AI has not changed.';
 if(provider==='google-account'&&/authentication required|not authenticated|not logged in|manual authorization is required|authentication consent could not be obtained|invalid_grant|invalid_rapt|reauth|Error authenticating|FatalAuthenticationError/i.test(details))return 'Google sign-in is required in Antigravity CLI. Click Connect Google (or Reconnect Google), finish the official sign-in, then Test model. Your active AI has not changed.';
 if(/429|quota|rate.?limit|usage limit|capacity|exhausted/i.test(details))return 'Provider quota or capacity reached. Wait, or choose another model/account. No files were changed by this request.';
 if(/model.*(?:not supported|not found|unavailable|does not exist|access)|unsupported.*model/i.test(details))return 'This account cannot use the selected model. Choose Default or test another model in Settings.';
 if(/401|403|unauthorized|authenticat|sign.?in|login|expired.*token|authorization.*required/i.test(details))return 'Provider authentication or access failed. Reconnect your account in Settings, then test the model.';
 if(/unexpected argument|unknown option|unrecognized.*(?:argument|option)/i.test(details))return 'The installed provider tool is incompatible. Update it using Install / setup guide, then retry.';
 if(/ENOTFOUND|ECONN|network|fetch failed|timed? out/i.test(details))return 'The provider could not connect. Check your internet connection and retry.';
 return 'Provider request failed. Test this model in Settings to check account access and quota.';
}
export function decodeAccountResult(provider,out){
 if(provider==='chatgpt'){let final;for(const line of out.split(/\r?\n/)){let event;try{event=JSON.parse(line);}catch{continue;}if(event.type==='item.completed'&&event.item?.type==='agent_message')final=event.item.text;else if(event.type==='error'||event.type==='turn.failed')throw new Error(accountFailure(JSON.stringify(event)));}if(!final)throw new Error('The provider returned no completed response.');return jsonResponse(final);}
 const envelope=jsonResponse(out);if(envelope.is_error||envelope.error||(provider==='google-account'&&envelope.status&&envelope.status!=='SUCCESS'))throw new Error(accountFailure(JSON.stringify(envelope.error||envelope.result||envelope.status||''),provider));
 return envelope.structured_output||jsonResponse(provider==='claude-code'?envelope.result||'':envelope.response||'');
}
// A catalog is a model suggestion, never proof of subscription entitlement.
const googleCatalogs=new Map();
export function googleModelCatalog(output=''){
 const models=[{id:'gemini-3.1-pro-high',label:'Gemini 3.1 Pro (High)'}];
 try{const value=JSON.parse(output),model=value.command?.data;if(value.status==='SUCCESS'&&typeof model?.id==='string'&&/^[a-zA-Z0-9][\w.:-]{0,149}$/.test(model.id)&&!models.some(item=>item.id===model.id))models.unshift({id:model.id,label:String(model.label||model.id).slice(0,100)});}catch{}
 return {source:'Official Antigravity model suggestions; Test model verifies your account access',models};
}
export async function accountModels(provider,directory){
 if(provider==='chatgpt')try{const cache=JSON.parse(await fs.readFile(path.join(directory,'accounts','codex','models_cache.json'),'utf8'));return {source:'Official Codex cached catalog',models:(cache.models||[]).filter(m=>m.visibility!=='hide'&&!/review|reserve/i.test(m.slug||'')&&/^[a-zA-Z0-9][\w.:-]{0,149}$/.test(m.slug||'')).slice(0,24).map(m=>({id:m.slug,label:String(m.display_name||m.slug).slice(0,100)}))};}catch{}
 if(provider==='google-account'){
  const cached=googleCatalogs.get(directory);if(cached&&Date.now()-cached.at<120000)return cached.value;
  let value=googleModelCatalog();try{const tool=await resolveAccountTool(provider),env=await initializeAccount(provider,directory),result=await runTool(tool,['-p','/model','--output-format','json','--print-timeout','15s'],{cwd:directory,env,timeout:20000});if(result.code===0)value=googleModelCatalog(result.out);}catch{}
  googleCatalogs.set(directory,{at:Date.now(),value});return value;
 }
 return {source:'Provider default; use Advanced for a supported model ID',models:[]};
}
export async function accountStatus(provider,directory){
 if(!definitions[provider])throw new Error('Unsupported account provider.');const docs=definitions[provider].docs;
 let tool;try{tool=await resolveAccountTool(provider);}catch{return {installed:false,connected:false,message:provider==='google-account'?'Install the official Antigravity CLI (agy) using the setup guide. The retired Gemini CLI cannot sign in personal Google accounts.':'Official tool not installed.',docs};}
 if(provider==='google-account'){
  return {installed:true,connected:false,canTest:true,source:'antigravity-cli',message:'Antigravity CLI installed. Connect Google, then Test model to verify access. Browser sign-in success alone does not verify model access.',docs};
 }
 const result=await runTool(tool,provider==='chatgpt'?['-c','cli_auth_credentials_store="keyring"','login','status']:['--safe-mode','auth','status','--json'],{env:accountEnvironment(provider,directory),timeout:20000,cwd:directory});
 let connected=false;if(provider==='chatgpt')connected=result.code===0&&/ChatGPT/i.test(result.out+result.err);else try{const value=JSON.parse(result.out);connected=value.loggedIn===true&&/claude[._-]?ai|oauth/i.test(value.authMethod||'');}catch{}
 return {installed:true,connected,message:connected?'Official tool signed in. Test a model, then use this account.':provider==='claude-code'?'Claude Code is signed out. Click Connect account to sign in with a supported Claude subscription.':'Codex is signed out for this app. Click Connect account to sign in with ChatGPT.',docs};
}
export async function initializeAccount(provider,directory){
 const env=accountEnvironment(provider,directory);await fs.mkdir(directory,{recursive:true});
 if(provider==='chatgpt')await fs.mkdir(env.CODEX_HOME,{recursive:true});
 if(provider==='google-account'){
  const base=path.join(env.USERPROFILE,'.gemini','antigravity-cli');await fs.mkdir(base,{recursive:true});
  await fs.writeFile(path.join(base,'settings.json'),JSON.stringify({toolPermission:'strict',allowNonWorkspaceAccess:false,permissions:{allow:[],ask:[],deny:['read_file(*)','write_file(*)','command(*)','unsandboxed(*)','read_url(*)','execute_url(*)','mcp(*)']},hooks:{},plugins:[],skills:[]}));
 }
 return env;
}
// A new console must own real console handles. Giving a detached process NUL
// stdin/stdout makes the provider's interactive login non-interactive.
export async function launchGoogleConsole(tool,env,directory,{run=runTool,windowStyle='Normal'}={}){
 if(!['Normal','Hidden'].includes(windowStyle))throw new Error('Invalid sign-in window style.');
 const quote=value=>`'${value.replaceAll("'","''")}'`;
 const command=`Write-Host 'Complete Sign in with Google. After signing in, return to Markora and Test model.'; & ${quote(tool.file)} ${tool.args.map(quote).join(' ')}; Write-Host 'Return to Markora and click Test model.'`;
 const encoded=Buffer.from(command,'utf16le').toString('base64');
 const launcher=`$ErrorActionPreference='Stop'; ${windowStyle==='Normal'?"if([Diagnostics.Process]::GetCurrentProcess().SessionId -eq 0){throw 'Interactive desktop session required'}; ":''}$markoraLogin=Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-NoExit','-EncodedCommand',${quote(encoded)}) -WorkingDirectory ${quote(directory)} -WindowStyle ${windowStyle} -PassThru; Write-Output $markoraLogin.Id`;
 const result=await run({file:'powershell.exe',args:[]},['-NoProfile','-EncodedCommand',Buffer.from(launcher,'utf16le').toString('base64')],{cwd:directory,env,timeout:20000});
 if(result.code!==0&&/Interactive desktop session required/.test(result.err))throw new Error('Open Markora on your desktop, then Settings > Google account > Reconnect Google. Sign-in cannot be displayed from a background Windows session.');
 const pid=Number(result.out.trim());if(result.code!==0||!Number.isSafeInteger(pid)||pid<=0)throw new Error('Google sign-in window could not open. Retry Connect Google.');
 return pid;
}
// Browser authentication is handled by the original provider programs, never
// by a copied token, a cookie scraper, or an OAuth-to-API proxy.
export async function loginAccount(provider,directory,signal,onAuthURL){
 const tool=await resolveAccountTool(provider),env=await initializeAccount(provider,directory);
 delete env.NO_BROWSER;
 if(provider==='google-account'){
  delete env.AGY_CLI_NONINTERACTIVE_HEADLESS;
  if(process.platform!=='win32')throw new Error('Start agy interactively and sign in with Google.');
  const loginDirectory=path.join(directory,'accounts','google-signin');await fs.mkdir(loginDirectory,{recursive:true});
  const startedAt=Date.now();await launchGoogleConsole(tool,env,loginDirectory);
  return {pending:true,startedAt,message:'Finish Google sign-in in the Antigravity CLI window. Return here, then click Test model.'};
 }
 const args=provider==='chatgpt'?['-c','cli_auth_credentials_store="keyring"','login']:['--safe-mode','auth','login'];
 const seen=new Set();let pending='';
 const onOutput=chunk=>{pending=(pending+chunk).slice(-16000);for(const match of pending.matchAll(/https:\/\/[^\s<>"']+/g)){try{const url=new URL(match[0]);const allowed=provider==='chatgpt'?['auth.openai.com','chatgpt.com']:['claude.ai','platform.claude.com'];if(allowed.includes(url.hostname)&&/auth|oauth|authorize/i.test(url.pathname)&&!seen.has(url.href)){seen.add(url.href);onAuthURL?.(url.href);}}catch{}}};
 const result=await runTool(tool,args,{cwd:directory,env,signal,timeout:180000,onOutput});if(result.code!==0)throw new Error('Sign-in was cancelled or failed. Retry in Settings.');return accountStatus(provider,directory);
}
export async function requestAccountJSON(config,system,input,signal,dependencies={}){
 const images=requestImages(config);if(images.length&&config.provider!=='chatgpt')throw new Error('This account needs local OCR before reading document images.');
 const provider=config.provider,directory=config.accountDirectory;if(!directory)throw new Error('Open Settings and connect your account first.');
 const status=await (dependencies.status||accountStatus)(provider,directory);if(!status.connected&&!status.canTest)throw new Error(status.message);
 const tool=await (dependencies.resolve||resolveAccountTool)(provider),env=await initializeAccount(provider,directory),jobs=path.join(directory,'account-jobs');await fs.mkdir(jobs,{recursive:true});const job=await fs.mkdtemp(path.join(jobs,'request-'));
 try{
  const prompt=`${system}\nDo not use tools or execute commands. Return only the requested JSON.\nInput data:\n${JSON.stringify(input)}`;let args;
  if(provider==='chatgpt')args=['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--json','--color','never','-c','cli_auth_credentials_store="keyring"','-c','forced_login_method="chatgpt"','-c','model_reasoning_effort="low"','-c','features.shell_tool=false','-c','web_search="disabled"','-'];
  else if(provider==='claude-code')args=['-p','--safe-mode','--tools','','--no-chrome','--no-session-persistence','--disable-slash-commands','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--setting-sources','','--output-format','json'];
  else{
   const agents=path.join(job,'.agents','agents');await fs.mkdir(agents,{recursive:true});
   await fs.writeFile(path.join(agents,'markora-json.md'),'---\nname: markora-json\ndescription: Return requested JSON without tools\nmainAgent: true\nsubagent: false\ntools: []\nskills: []\nplugins: []\nmcpServers: []\ncommandExecutionPolicy: off\n---\nReturn only the JSON requested in the user message. Do not use tools, execute commands or delegate tasks.\n');
   args=['--input-format','stream-json','--output-format','stream-json','--mode','plan','--agent','markora-json','--disable-slash-commands','--print-timeout','5m'];
  }
  if(config.visualImage&&provider==='chatgpt'){const image=path.join(job,'marked-preview.png');await fs.writeFile(image,imageBytes(config.visualImage),{mode:0o600});args.push('--image',image);}
  for(const [index,image] of images.entries()){const filename=`document-${index+1}.${image.mime==='image/jpeg'?'jpg':image.mime==='image/png'?'png':'webp'}`;await fs.writeFile(path.join(job,filename),inputImageBytes(image),{mode:0o600});args.push('--image',filename);}
  if(config.model&&config.model!=='default'){if(!/^[a-zA-Z0-9][\w.:-]{0,149}$/.test(config.model))throw new Error('Use a model name, without command flags or spaces.');args.push('--model',config.model);}
  const stdin=provider==='google-account'?JSON.stringify({event:'user',message:{content:prompt}})+'\n':prompt;
  const result=await (dependencies.run||runTool)(tool,args,{cwd:job,env,signal,input:stdin});if(result.code!==0)throw new Error(accountFailure(result.err+'\n'+result.out,provider));
  if(provider==='google-account'){
   let final;for(const line of result.out.split(/\r?\n/)){if(!line.trim())continue;let event;try{event=JSON.parse(line);}catch{continue;}if(event.event==='result')final=event.result;}
   if(final)return decodeAccountResult(provider,JSON.stringify(final));
  }
  return decodeAccountResult(provider,result.out);
 }finally{const resolved=await fs.realpath(job),parent=await fs.realpath(jobs);if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('request-'))throw new Error('Invalid request directory.');await fs.rm(resolved,{recursive:true,force:true,maxRetries:12,retryDelay:75});}
}
