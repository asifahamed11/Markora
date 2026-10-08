import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function inputImageBytes(image){
  if(!image||!['image/png','image/jpeg','image/webp'].includes(image.mime)||typeof image.data!=='string'||image.data.length>6000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))throw new Error('Invalid document image.');
  const bytes=Buffer.from(image.data,'base64');
  const valid=image.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:image.mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid||bytes.length<12||bytes.length>4*1024*1024)throw new Error('Document image exceeds the supported format or size.');
  return bytes;
}
export function requestImages(config){
  const images=config.documentImages||[];
  if(!Array.isArray(images)||images.length>20)throw new Error('Use at most 20 image pages per analysis.');
  let total=0;for(const image of images)total+=inputImageBytes(image).length;
  if(total>16*1024*1024)throw new Error('Image pages exceed the 16 MB analysis budget. Remove some pages.');
  return images;
}
export function usesVision(config){
  // Text-only CLI connections and the default local coder use local OCR.
  return ['chatgpt','openai','anthropic','gemini'].includes(config.provider)||config.provider==='openrouter'&&config.model!=='openrouter/free'||config.provider==='ollama'&&/llava|vision|gemma3|qwen.*vl|pixtral|moondream/i.test(config.model);
}
export async function readImageSource(doc){
  const stat=await fs.lstat(doc.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>15*1024*1024)throw new Error(`${doc.name}: image changed or is too large. Reopen the folder.`);
  const bytes=await fs.readFile(doc.file);return {bytes,fingerprint:createHash('sha256').update(bytes).digest('hex')};
}
