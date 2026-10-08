import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicWrite} from './project.js';
import {z} from 'zod';
export const GeneralPlan=z.object({title:z.string().min(1).max(120),summary:z.string().min(1).max(2000),stack:z.string().min(1).max(300),steps:z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),title:z.string().max(100),purpose:z.string().max(600)})).min(1).max(8),instructions:z.string().max(4000),sourceNotes:z.array(z.string().max(4000)).max(20).optional()});
export const FilePatch=z.object({summary:z.string().min(1).max(500),files:z.array(z.object({path:z.string().min(1).max(180),before:z.string().max(100000).nullable(),content:z.string().max(100000).nullable()})).min(1).max(40),instructions:z.string().max(4000)});
export function safeFilePath(value){
 if(typeof value!=='string'||value.includes('\\')||value.startsWith('/')||!value||value.length>180)throw new Error('Use a relative file path inside the project.');
 const parts=value.split('/');for(const part of parts)if(!/^[a-zA-Z0-9_ .@()-]+$/.test(part)||part==='.'||part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)||/^(\.env(?:\..*)?|\.git|\.easy-web-ai|credentials|auth|secrets)(?:\.|$)/i.test(part))throw new Error('That file path is reserved or unsafe.');
 return parts.join('/');
}
export function fileBytes(file){if(file.encoding!=='base64')return Buffer.from(file.content,'utf8');if(!/\.(?:jpe?g|png|webp|woff2)$/i.test(file.path)||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.content))throw new Error('Invalid local asset.');const bytes=Buffer.from(file.content,'base64');if(!bytes.length||bytes.toString('base64')!==file.content||bytes.length>1500000)throw new Error('Local asset is invalid or exceeds 1.5 MB.');return bytes;}
function checkedFiles(files,patch=false){const names=new Set();let size=0,assets=0;for(const file of files){safeFilePath(file.path);const key=file.path.toLowerCase();if(names.has(key))throw new Error('Duplicate or conflicting file paths.');for(const seen of names)if(key.startsWith(`${seen}/`)||seen.startsWith(`${key}/`))throw new Error('A file cannot also be a directory.');names.add(key);if(file.content===null&&patch)continue;if(typeof file.content!=='string')throw new Error('File content must be text.');if(file.encoding==='base64')assets+=fileBytes(file).length;else size+=Buffer.byteLength(file.content);if(size>1500000||assets>12000000)throw new Error('Project exceeds the 1.5 MB text or 12 MB local asset limit.');}return files;}
export class FileProject{
 constructor(directory,notify=()=>{},{inPlace=false}={}){this.directory=directory;this.inPlace=inPlace;this.public=inPlace?directory:path.join(directory,'files');this.notify=notify;this.kind='project';}
 get state(){return this.record.versions[this.record.cursor].state;}
 get history(){return {cursor:this.record.cursor,undo:this.record.cursor>0,redo:this.record.cursor<this.record.versions.length-1,versions:this.record.versions.map(({label,at})=>({label,at}))};}
 async init(title='Your project'){
  await fs.mkdir(this.public,{recursive:true});this.historyFile=path.join(this.directory,'.easy-web-ai',this.historyName||(this.inPlace?'project-history.json':'history.json'));
  await this.checkHistory();
  let historyLoaded=false;
  try{this.record=JSON.parse(await fs.readFile(this.historyFile,'utf8'));historyLoaded=true;if(!Array.isArray(this.state.files))throw new Error('Invalid project history.');const cache=new Map();for(const revision of this.record.versions)for(const file of revision.state.files)if(file.assetHash){const hash=file.assetHash;if(!cache.has(hash)){const bytes=await fs.readFile(await this.assetObject(hash));if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('A history asset changed.');cache.set(hash,bytes.toString('base64'));}file.content=cache.get(hash);delete file.assetHash;}checkedFiles(this.state.files);}
  catch(e){if(e.code!=='ENOENT'||historyLoaded)throw e;this.record={cursor:0,versions:[{label:'New project',at:Date.now(),state:{title,files:[],instructions:'',complete:false}}]};await this.persist();}
  // Reopening never silently overwrites changes made outside the companion.
  await this.checkDisk(this.state.files,true);await this.publish([],this.state.files,true);return this;
 }
 async checkHistory(){const root=await fs.realpath(this.directory);for(const file of [path.dirname(this.historyFile),this.historyFile])try{const stat=await fs.lstat(file),actual=await fs.realpath(file);if(stat.isSymbolicLink()||!actual.startsWith(`${root}${path.sep}`))throw new Error('Linked project history is not accessible.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 async assetObject(hash){if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid asset history reference.');await this.checkHistory();const directory=path.join(path.dirname(this.historyFile),'asset-objects');try{if((await fs.lstat(directory)).isSymbolicLink())throw new Error('Linked asset history is not accessible.');}catch(error){if(error.code!=='ENOENT')throw error;}await fs.mkdir(directory,{recursive:true});const real=await fs.realpath(directory),root=await fs.realpath(this.directory);if(!real.startsWith(root+path.sep))throw new Error('Asset history would leave the project.');const file=path.join(real,hash);try{if((await fs.lstat(file)).isSymbolicLink())throw new Error('Linked asset history is not accessible.');}catch(error){if(error.code!=='ENOENT')throw error;}return file;}
 async persist(){await this.checkHistory();const assets=new Map(),payloads=new Map(),record={...this.record,versions:this.record.versions.map(revision=>({...revision,state:{...revision.state,files:revision.state.files.map(file=>{if(file.encoding!=='base64')return file;let assetHash=payloads.get(file.content);if(!assetHash){const bytes=fileBytes(file);assetHash=createHash('sha256').update(bytes).digest('hex');payloads.set(file.content,assetHash);assets.set(assetHash,bytes);}const {content,...metadata}=file;return {...metadata,assetHash};})}}))};for(const [hash,bytes]of assets){const file=await this.assetObject(hash);try{const existing=await fs.readFile(file);if(!existing.equals(bytes))throw new Error('A history asset changed.');}catch(error){if(error.code!=='ENOENT')throw error;await atomicWrite(file,bytes);}}await atomicWrite(this.historyFile,JSON.stringify(record));}
 async destination(name){
  const clean=safeFilePath(name),root=await fs.realpath(this.directory),base=await fs.realpath(this.public),target=path.resolve(base,...clean.split('/'));
  if((await fs.lstat(this.public)).isSymbolicLink()||!(base===root&&this.inPlace||base.startsWith(`${root}${path.sep}`)))throw new Error('Linked project folders are not editable.');
  if(!target.startsWith(`${base}${path.sep}`))throw new Error('File would leave the project.');
  let cursor=base;for(const part of clean.split('/')){cursor=path.join(cursor,part);try{const stat=await fs.lstat(cursor);if(stat.isSymbolicLink())throw new Error('Linked paths are not editable.');const actual=await fs.realpath(cursor);if(actual!==base&&!actual.startsWith(`${base}${path.sep}`))throw new Error('File would leave the project.');}catch(e){if(e.code!=='ENOENT')throw e;}}
  return target;
 }
 async checkDisk(files,allowMissing=false){for(const file of files){const dest=await this.destination(file.path);let content;try{content=await fs.readFile(dest);}catch(e){if(e.code==='ENOENT'&&allowMissing)continue;throw e;}if(!content.equals(fileBytes(file)))throw new Error(`Changed outside the bot: ${file.path}. Keep a copy before restoring or editing.`);}}
 async publish(previous,next,allowExisting=false){
  const nextNames=new Set(next.map(f=>f.path.toLowerCase())),previousNames=new Set(previous.map(f=>f.path.toLowerCase()));
  for(const file of next){const dest=await this.destination(file.path);if(!previousNames.has(file.path.toLowerCase())&&!allowExisting)try{await fs.access(dest);throw new Error(`An untracked file already exists: ${file.path}.`);}catch(e){if(e.code!=='ENOENT')throw e;}if(previous.some(old=>old.path===file.path&&old.content===file.content&&old.encoding===file.encoding))continue;await atomicWrite(dest,fileBytes(file));}
  for(const file of previous)if(!nextNames.has(file.path.toLowerCase()))await fs.rm(await this.destination(file.path),{force:true});
  this.notify(this.history);
 }
 async commit(label,state){
  checkedFiles(state.files);await this.checkDisk(this.state.files);const old=this.record,previous=old.versions[old.cursor].state.files;
  // Preflight every destination before any writes, including untracked files.
  for(const file of state.files){const dest=await this.destination(file.path);if(!previous.some(p=>p.path.toLowerCase()===file.path.toLowerCase()))try{await fs.access(dest);throw new Error(`An untracked file already exists: ${file.path}.`);}catch(e){if(e.code!=='ENOENT')throw e;}}
  this.record={cursor:old.cursor+1,versions:[...old.versions.slice(0,old.cursor+1),{label,at:Date.now(),state:structuredClone(state)}]};
  try{await this.persist();await this.publish(previous,state.files);}catch(error){this.record=old;await this.persist();await this.publish(state.files,previous,true);throw error;}
 }
 preparePatch(input){
  const patch=FilePatch.parse(input),files=this.state.files.map(f=>({...f}));checkedFiles(patch.files,true);
  for(const file of patch.files){const existing=files.find(f=>f.path.toLowerCase()===file.path.toLowerCase());if(existing){if(existing.path!==file.path||file.before!==existing.content)throw new Error(`Stale source for ${file.path}. Retry from the current revision.`);if(file.content===null)files.splice(files.indexOf(existing),1);else existing.content=file.content;}else{if(file.before!==null||file.content===null)throw new Error(`New file ${file.path} must have before:null and text content.`);files.push({path:file.path,content:file.content});}}
  checkedFiles(files);return {patch,state:{...this.state,files,instructions:patch.instructions||this.state.instructions}};
 }
 async apply(input){const {patch,state}=this.preparePatch(input);await this.commit(patch.summary,state);}
 async move(delta){const cursor=this.record.cursor+delta;if(cursor<0||cursor>=this.record.versions.length)return;await this.checkDisk(this.state.files);const previous=this.state.files,next=this.record.versions[cursor].state.files;for(const f of next){const dest=await this.destination(f.path);if(!previous.some(p=>p.path.toLowerCase()===f.path.toLowerCase()))try{await fs.access(dest);throw new Error(`An untracked file already exists: ${f.path}.`);}catch(e){if(e.code!=='ENOENT')throw e;}}const old=this.record.cursor;this.record.cursor=cursor;try{await this.persist();await this.publish(previous,next);}catch(error){this.record.cursor=old;await this.persist();await this.publish(next,previous,true);throw error;}}
 async exportTo(parent){const dest=path.join(parent,`easy-ai-project-${randomUUID().slice(0,8)}`);await fs.mkdir(dest);for(const file of this.state.files){const target=path.join(dest,...safeFilePath(file.path).split('/'));await atomicWrite(target,fileBytes(file));}return dest;}
}
