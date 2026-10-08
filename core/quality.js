import {parseFragment} from 'parse5';
import postcss from 'postcss';
import {createHash} from 'node:crypto';
import {walk,getId} from './content.js';
import {runTool} from './accounts.js';
import {parse} from '@babel/parser';
import {lintDesign} from './design-lint.js';

const identity=(rule,file,target='')=>createHash('sha256').update(`${rule}:${file}:${target}`).digest('hex').slice(0,16);
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value||'';
export async function checkProject(project,signal){
 const findings=[],checks=[],skipped=[];
 const add=(rule,file,message,{severity='warning',targetId,line}={})=>findings.push({id:identity(rule,file,targetId||line||''),rule,file,message,severity,targetId,line});
 if(!!project.state.files){
  await project.checkDisk(project.state.files);
  const files=project.state.files;
  if(!files.some(f=>/^readme\./i.test(f.path)))add('readme','README.md','Add setup and usage instructions so another person can run this project.');
  if(!files.some(f=>/(^|\/)(test[^/]*|[^/]+[._]test|[^/]+[._]spec)\.(py|[cm]?js|tsx?|jsx)$/.test(f.path)))add('tests','Project','No recognized test file was found. Add meaningful tests for the core behavior.');
  checks.push({name:'Tracked files match disk',passed:true});
  for(const file of files){
   signal?.throwIfAborted();
   if(['existing','react'].includes(project.kind)&&/\.[jt]sx?$/.test(file.path)){
    try{parse(file.content,{sourceType:'unambiguous',plugins:['jsx','typescript']});checks.push({name:`JSX/TypeScript syntax · ${file.path}`,passed:true});}
    catch(error){add('code-syntax',file.path,'JSX/TypeScript syntax error: '+error.message.slice(0,180),{severity:'error',line:error.loc?.line});checks.push({name:`JSX/TypeScript syntax · ${file.path}`,passed:false});}
   }
   else if(file.path.endsWith('.css')){try{postcss.parse(file.content);checks.push({name:`CSS syntax · ${file.path}`,passed:true});}catch{add('css-syntax',file.path,'CSS could not be parsed.',{severity:'error'});}}
   else if(file.path.endsWith('.json')){try{JSON.parse(file.content);checks.push({name:`JSON syntax · ${file.path}`,passed:true});}catch{add('json-syntax',file.path,'This file is not valid JSON.',{severity:'error'});checks.push({name:`JSON syntax · ${file.path}`,passed:false});}}
   else if(/\.(py|[cm]?js)$/.test(file.path)){
    const python=file.path.endsWith('.py');
    const tool={file:python?'python':process.execPath,args:[]};
    const args=python?['-I','-S','-c','import ast,json,sys\nd=json.load(sys.stdin)\ntry: ast.parse(d["content"],filename=d["path"]); print(json.dumps({"ok":True}))\nexcept SyntaxError as e: print(json.dumps({"ok":False,"line":e.lineno,"message":e.msg}))']:['--input-type='+ (file.path.endsWith('.cjs')?'commonjs':'module'),'--check'];
    const env={...process.env,ELECTRON_RUN_AS_NODE:'1'};delete env.NODE_OPTIONS;delete env.PYTHONPATH;delete env.PYTHONSTARTUP;
    let result;try{result=await runTool(tool,args,{env,signal,timeout:10000,input:python?JSON.stringify(file):file.content});}
    catch(error){if(signal?.aborted)throw error;skipped.push(`${file.path}: syntax checker unavailable or timed out`);continue;}
    let parsed;try{parsed=python?JSON.parse(result.out):{ok:result.code===0};}catch{skipped.push(`${file.path}: syntax checker did not return a result`);continue;}
    const passed=parsed.ok===true;checks.push({name:`${python?'Python':'JavaScript'} syntax · ${file.path}`,passed});
    if(!passed)add('code-syntax',file.path,python?`Syntax error${parsed.line?` at line ${parsed.line}`:''}: ${String(parsed.message).slice(0,180)}`:'JavaScript syntax could not be parsed. Review this file.',{severity:'error',line:parsed.line});
   }
  }
 }else{
  const roots=project.state.sections.map(s=>({section:s,root:parseFragment(s.html)})),ids=new Set();let hasH1=false;
  for(const {root} of roots)walk(root,node=>{if(attr(node,'id'))ids.add(attr(node,'id'));if(node.tagName==='h1')hasH1=true;});
  if(!hasH1&&roots.length)add('heading','sections/'+roots[0].section.id+'.html','Add a main heading to explain the purpose of this page.',{targetId:roots[0].section.id});
  for(const {section,root} of roots)walk(root,node=>{
   const file=`sections/${section.id}.html`,targetId=getId(node);if(!targetId)return;
   if(['a','button','summary'].includes(node.tagName)&&!text(node).trim()&&!attr(node,'aria-label').trim())add('empty-control',file,'This interactive element has no readable label.',{severity:'error',targetId});
   const href=attr(node,'href');if(node.tagName==='a'&&href.startsWith('#')&&href.length>1&&!ids.has(href.slice(1)))add('broken-anchor',file,'This link points to a section that does not exist.',{severity:'error',targetId});
  });
  checks.push({name:'Page structure and local links inspected',passed:!findings.some(f=>f.severity==='error')});
  try{postcss.parse(project.state.css);checks.push({name:'CSS syntax',passed:true});}catch{add('css-syntax','styles.css','CSS could not be parsed.',{severity:'error'});checks.push({name:'CSS syntax',passed:false});}
 }
 const design=lintDesign(project.state.files||[]);for(const finding of design.findings)add(finding.rule,finding.file,finding.message,{severity:finding.severity});
 return {revision:project.history.cursor,checkedAt:Date.now(),checks,design,findings:findings.slice(0,80),skipped,errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length,scope:'Static checks only. Generated programs and tests are not executed; accessibility, security and runtime behavior are not fully audited.'};
}

function snapshot(project,index){const state=project.record.versions[index].state;return !!project.state.files?state.files:[...state.sections.map(s=>({path:`sections/${s.id}.html`,content:s.html})),{path:'styles.css',content:state.css}];}
export function revisionChanges(project,index=project.history.cursor){
 if(!Number.isInteger(index)||index<0||index>=project.record.versions.length)throw new Error('Choose an existing revision.');
 const before=new Map((index?snapshot(project,index-1):[]).map(f=>[f.path,f.content])),after=new Map(snapshot(project,index).map(f=>[f.path,f.content]));const changes=[];
 for(const name of new Set([...before.keys(),...after.keys()])){
  if(before.get(name)===after.get(name))continue;
  const old=before.get(name),next=after.get(name);changes.push({path:name,kind:old===undefined?'added':next===undefined?'deleted':'modified',diff:compactDiff(old||'',next||'')});
 }
 return {index,label:project.record.versions[index].label,total:changes.length,changes:changes.slice(0,12),truncated:changes.length>12};
}
export function compactDiff(before,after){
 const a=before.split('\n'),b=after.split('\n');let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
 const lines=[`@@ line ${start+1} @@`,...a.slice(Math.max(0,start-2),start).map(s=>'  '+s),...a.slice(start,a.length-end).map(s=>'- '+s),...b.slice(start,b.length-end).map(s=>'+ '+s),...b.slice(b.length-end,Math.min(b.length,b.length-end+2)).map(s=>'  '+s)];
 const source=lines.join('\n');return source.length>12000?source.slice(0,12000)+'\n… Diff truncated; inspect the full file before applying.':source;
}
