import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requestImages,usesVision,readImageSource} from './input-images.js';
import {documentContext} from './documents.js';
import {runTool} from './accounts.js';
import {atomicWrite} from './project.js';

// Image data is transient: never stored in preferences, history or UI state.
export async function prepareDocuments(documents,{config,directory,signal,emit=()=>{},encode,run=runTool}){
 const imageDocs=documents.filter(doc=>doc.kind==='image');
 if(imageDocs.length>20)throw new Error('This folder has more than 20 image pages. Remove some inputs before planning.');
 if(!imageDocs.length)return {documents,documentImages:[],method:'text'};
 const images=[],fingerprints=[];
 for(const [index,doc] of imageDocs.entries()){
  signal?.throwIfAborted();emit({phase:'reading',message:`Preparing image ${index+1}/${imageDocs.length}: ${doc.name}`,progress:7});
  const source=await readImageSource(doc);images.push({name:doc.name,...await encode(source.bytes,doc.name)});fingerprints.push(source.fingerprint);
 }
 requestImages({documentImages:images});signal?.throwIfAborted();
 if(usesVision(config))return {documents,documentImages:images,method:'vision'};
 const cachePath=path.join(directory,'ocr'),results=new Map(),missing=[];
 await fs.mkdir(cachePath,{recursive:true});
 for(const [index,fingerprint] of fingerprints.entries()){
  try{const cached=JSON.parse(await fs.readFile(path.join(cachePath,`eng-ben-v2-oriented-${fingerprint}.json`),'utf8'));if(typeof cached.text!=='string'||!cached.text.trim())throw new Error();results.set(index,cached);}catch{missing.push(index);}
 }
 if(missing.length){
  emit({phase:'reading',message:'Reading images locally. English/Bengali OCR models download once, then stay on this PC.',progress:8});
  let pending='';
  const result=await run({file:process.execPath,args:[]},[fileURLToPath(new URL('./ocr-worker.cjs',import.meta.url))],{cwd:directory,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},signal,timeout:600000,input:JSON.stringify({images:missing.map(index=>images[index]),cachePath}),onOutput:chunk=>{
   pending+=chunk;let newline;
   while((newline=pending.indexOf('\n'))>=0){const line=pending.slice(0,newline);pending=pending.slice(newline+1);try{const event=JSON.parse(line);if(event.phase==='page')emit({phase:'reading',message:`Reading image ${missing[event.index]+1}/${images.length} locally…`,progress:9});}catch{}}
  }});
  if(result.code!==0)throw new Error('Local image reading failed. Check internet access for the first OCR model download, or select a vision-capable AI.');
  for(const line of result.out.split('\n')){let event;try{event=JSON.parse(line);}catch{continue;}if(event.phase!=='result'||!Number.isInteger(event.index)||missing[event.index]===undefined)continue;const index=missing[event.index];if(!event.text?.trim())throw new Error(`${imageDocs[index].name}: no readable text found. Use a clearer scan or a vision-capable AI.`);const value={text:event.text,confidence:event.confidence};results.set(index,value);await atomicWrite(path.join(cachePath,`eng-ben-v2-oriented-${fingerprints[index]}.json`),JSON.stringify(value));}
 }
 signal?.throwIfAborted();
 const prepared=documents.map(doc=>{if(doc.kind!=='image')return doc;const index=imageDocs.indexOf(doc),result=results.get(index);if(!result)throw new Error(`${doc.name}: image reading did not finish.`);return {...doc,text:result.text,chars:result.text.length,reading:'local-ocr'};});
 documentContext(prepared);return {documents:prepared,documentImages:[],method:'local-ocr'};
}
