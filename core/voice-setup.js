import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const assets = {
  runtime: { url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.0/whisper-bin-x64.zip', hash: '00c4304b6be363a224a4b69829df49009f74131df8c3ce6a5878b89a11cd26ef', limit: 20 * 1024 * 1024 },
  model: { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin', hash: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe', limit: 147951465 },
  small: { url:'https://huggingface.co/ggerganov/whisper.cpp/resolve/90a64d80ea254cf67575b41a5971f972c79f7b45/ggml-small.bin', hash:'1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',limit:488000000 },
  turbo:{url:'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',hash:'394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',limit:574041195},
  bangla:{url:'https://huggingface.co/bhaskaro/ainotes-whisper-bengali-q5_1/resolve/cc65d3bb6d2999ce935fa0c61367de1fee77e04f/ggml-model.bin',hash:'a5a806b5832c18d0763d897ba01b1c3679910876417b4f7f2e3818d8eed85bde',limit:190085487},
  vad: {url:'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin',hash:'2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987',limit:885098},
};
async function hashFile(file) { const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex'); }
export async function downloadVerified(asset, file, signal, progress=()=>{}) {
  try { if(await hashFile(file)===asset.hash)return; } catch(error) { if(error.code!=='ENOENT')throw error; }
  const partial=`${file}.${randomUUID()}.partial`;let handle;
  try {
    const response=await fetch(asset.url,{signal});if(!response.ok||!response.body)throw new Error(`Voice download failed (HTTP ${response.status}). Please try again.`);
    await fs.mkdir(path.dirname(file),{recursive:true});handle=await fs.open(partial,'wx',0o600);
    const hash=createHash('sha256');let size=0,last=-1;const total=Number(response.headers.get('content-length'))||asset.limit;
    for await(const chunk of response.body){signal?.throwIfAborted();size+=chunk.length;if(size>asset.limit)throw new Error('Voice download exceeds its expected size.');hash.update(chunk);await handle.write(chunk);const percent=Math.min(99,Math.floor(size/total*100));if(percent!==last){last=percent;progress(percent);}}
    if(hash.digest('hex')!==asset.hash)throw new Error('Voice download could not be verified. Please retry.');
    await handle.close();handle=undefined;await fs.rename(partial,file);progress(100);
  }finally{await handle?.close();await fs.rm(partial,{force:true});}
}
async function findCLI(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isFile()&&entry.name==='whisper-cli.exe')return file;if(entry.isDirectory()){const result=await findCLI(file);if(result)return result;}}}
export async function installVoice(data,emit,signal,quality='base'){
  if(!['base','small','turbo','bangla'].includes(quality))throw new Error('Set up local voice in Settings.');
  if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Automatic voice setup supports Windows x64. Use Advanced voice settings to select your Whisper files.');
  const directory=path.join(data,'voice'),archive=path.join(directory,'whisper-v1.9.0.zip'),runtime=path.join(directory,'whisper-v1.9.0'),model=path.join(directory,quality==='turbo'?'ggml-large-v3-turbo-q5_0.bin':quality==='bangla'?'ggml-base.bin':`ggml-${quality}.bin`),vad=path.join(directory,'ggml-silero-v6.2.0.bin');
  const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(900000)]):AbortSignal.timeout(900000);
  await downloadVerified(assets.runtime,archive,combined,p=>emit({phase:'voice-setup',message:`Installing voice engine… ${p}%`,progress:Math.round(p*.1)}));
  let binary;try{binary=await findCLI(runtime);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!binary){await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath $env:EASY_VOICE_ARCHIVE -DestinationPath $env:EASY_VOICE_OUTPUT -Force'],{windowsHide:true,signal:combined,timeout:60000,env:{...process.env,EASY_VOICE_ARCHIVE:archive,EASY_VOICE_OUTPUT:runtime}});binary=await findCLI(runtime);}
  if(!binary)throw new Error('Voice engine was not found after installation.');
  const modelAsset={base:assets.model,small:assets.small,turbo:assets.turbo,bangla:assets.model}[quality];
  await downloadVerified(modelAsset,model,combined,p=>emit({phase:'voice-setup',message:`Downloading ${quality==='turbo'?'Bengali / mixed':quality==='small'?'balanced':'fast'} voice… ${p}% (${Math.round(modelAsset.limit/1000000)} MB, once)`,progress:10+Math.round(p*.85)}));
  await downloadVerified(assets.vad,vad,combined,p=>emit({phase:'voice-setup',message:`Installing speech filter… ${p}%`,progress:95+Math.round(p*.05)}));
  let bengaliModel;
  if(quality==='bangla'){bengaliModel=path.join(directory,'ggml-bangla-q5_1.bin');await downloadVerified(assets.bangla,bengaliModel,combined,p=>emit({phase:'voice-setup',message:`Installing Bengali specialist… ${p}% (190 MB, once)`,progress:p}));}
  await exec(binary,['--help'],{windowsHide:true,timeout:20000,signal:combined});
  return {whisperBinary:binary,whisperModel:model,whisperVad:vad,voiceQuality:quality,whisperBengaliModel:bengaliModel||''};
}
