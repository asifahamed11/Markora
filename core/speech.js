import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
import { SpeechWorker } from './speech-worker.js';
import {recognitionLanguage} from './speech-language.js';
export const speechWorker=new SpeechWorker();
export const bengaliWorker=new SpeechWorker();
export async function closeSpeech(){await Promise.all([speechWorker.close(),bengaliWorker.close()]);}
export async function warmSpeech(config,signal){await speechWorker.ready(config,signal);if(config.whisperBengaliModel)await bengaliWorker.ready({...config,whisperModel:config.whisperBengaliModel},signal);}
export function splitSpeech(audio){
  // Bounded overlapping PCM chunks keep long commands within decoder context.
  // Twelve seconds preserves short sentences without cutting them into words.
  if(audio.readUInt16LE(20)!==1||audio.readUInt16LE(22)!==1||audio.readUInt32LE(24)!==16000||audio.readUInt16LE(34)!==16)return [audio];
  let position=12,pcm;while(position+8<=audio.length){const size=audio.readUInt32LE(position+4);if(audio.toString('ascii',position,position+4)==='data'){pcm=audio.subarray(position+8,Math.min(audio.length,position+8+size));break;}position+=8+size+(size%2);}
  if(!pcm)return [audio];
  // Long leading/trailing digital silence shifts the specialist's chunk cuts
  // into words and can cause repetition. Retain 200 ms of quiet context.
  let first=0,last=pcm.length;while(first+2<last&&Math.abs(pcm.readInt16LE(first))<8)first+=2;while(last-2>first&&Math.abs(pcm.readInt16LE(last-2))<8)last-=2;
  const padding=16000*2*.2;pcm=pcm.subarray(Math.max(0,first-padding),Math.min(pcm.length,last+padding));
  const chunks=[],length=16000*2*12,overlap=16000*2*.4;
  for(let from=0;from<pcm.length;from+=length-overlap){const part=pcm.subarray(from,Math.min(pcm.length,from+length)),header=Buffer.from(audio.subarray(0,44));header.writeUInt32LE(36+part.length,4);header.write('data',36);header.writeUInt32LE(part.length,40);chunks.push(Buffer.concat([header,part]));if(from+length>=pcm.length)break;}
  return chunks;
}
export function joinSpeech(previous,next){
  const left=previous.trim().split(/\s+/).filter(Boolean),right=next.trim().split(/\s+/).filter(Boolean),clean=word=>word.normalize('NFC').replace(/[\p{P}\p{S}]/gu,'').toLowerCase();
  let overlap=0;for(let n=1;n<=Math.min(8,left.length,right.length);n++)if(left.slice(-n).map(clean).join(' ')===right.slice(0,n).map(clean).join(' '))overlap=n;
  return [...left,...right.slice(overlap)].join(' ');
}
export function speechResult(data,elapsedMs=0){
  const text=String(data.text||'').trim(),segments=data.segments||[];
  const words=segments.flatMap(s=>s.words||[]).map(w=>w.probability).filter(Number.isFinite);
  const letters=[...text].filter(c=>/\p{L}/u.test(c)),bengaliLetters=letters.filter(c=>/[\u0980-\u09ff]/.test(c));
  const wrongScript=data.language==='bengali'&&letters.length>0&&bengaliLetters.length/letters.length<.4;
  const tokens=text.toLowerCase().split(/\s+/).filter(Boolean),repetitive=tokens.length>=12&&new Set(tokens).size/tokens.length<.3;
  const uncertain=!text||text.includes('\uFFFD')||wrongScript||repetitive||segments.some(s=>s.avg_logprob < -.7||s.no_speech_prob>.65)||(words.length>0&&words.filter(p=>p<.35).length/words.length>.3);
  return {text,uncertain,language:data.language||'',elapsedMs};
}
export async function transcribe(bytes, config, key, signal, detailed=false) {
  const audio = Buffer.from(bytes);
  if (audio.length < 44 || audio.length > 4 * 1024 * 1024 || audio.toString('ascii',0,4) !== 'RIFF' || audio.toString('ascii',8,12) !== 'WAVE') throw new Error('Record a WAV voice command of up to 90 seconds.');
  const started=Date.now();
  if (config.speech === 'openai') {
    if (!key) throw new Error('Save an OpenAI transcription key in Settings.');
    const form = new FormData(); form.append('file', new Blob([audio], { type: 'audio/wav' }), 'command.wav'); form.append('model', 'whisper-1');
    const language=recognitionLanguage(config.speechLanguage);if(language!=='auto')form.append('language',language);
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Transcription returned HTTP ${response.status}. Check your OpenAI key and quota.`);
    const result=speechResult(await response.json(),Date.now()-started);return detailed?{...result,uncertain:true}:result.text;
  }
  if (!config.whisperBinary || !config.whisperModel) throw new Error('Set up local voice in Settings, then retry.');
  const serverBinary=path.join(path.dirname(config.whisperBinary),process.platform==='win32'?'whisper-server.exe':'whisper-server');
  let hasServer=false;try{await fs.access(serverBinary);hasServer=true;}catch{}
  if(hasServer){
    let data;
    if(config.whisperBengaliModel){
      let language=recognitionLanguage(config.speechLanguage);
      if(language==='auto'){const detected=await speechWorker.infer(audio,{...config,speechLanguage:'auto',detectOnly:true},signal);language=detected.language==='bengali'?'bn':detected.language==='english'?'en':'auto';}
      if(language==='bn'){
        data={text:'',segments:[],language:'bengali'};
        for(const chunk of splitSpeech(audio)){signal?.throwIfAborted();const part=await bengaliWorker.infer(chunk,{...config,whisperModel:config.whisperBengaliModel,speechLanguage:'bn',bengaliSpecialist:true},signal);data.text=joinSpeech(data.text,part.text||'');data.segments.push(...(part.segments||[]));}
      }else data=await speechWorker.infer(audio,{...config,speechLanguage:language},signal);
    }else data=await speechWorker.infer(audio,config,signal);
    const result=speechResult(data,Date.now()-started);return detailed?result:result.text;
  }
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'easy-web-ai-voice-'));
  try {
    const file = path.join(directory, 'command.wav'), output = path.join(directory, 'result');
    await fs.writeFile(file, audio, { mode: 0o600 });
    await exec(config.whisperBinary, ['-m', config.whisperModel, '-f', file, '-otxt', '-of', output, '-l', recognitionLanguage(config.speechLanguage), '-np', '-ng', '-t', '4'], { windowsHide: true, timeout: 120000, signal, maxBuffer: 2 * 1024 * 1024 });
    const text=(await fs.readFile(`${output}.txt`, 'utf8')).trim();return detailed?{text,uncertain:true,elapsedMs:Date.now()-started,language:''}:text;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Local transcription failed. Check whisper-cli, its model, and microphone audio.');
  } finally {
    const resolved = await fs.realpath(directory), parent = await fs.realpath(os.tmpdir());
    if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('easy-web-ai-voice-')) throw new Error('Invalid temporary audio directory.');
    await fs.rm(resolved, { recursive: true, force: true });
  }
}
