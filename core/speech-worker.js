import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import {recognitionLanguage} from './speech-language.js';

// One resident model per app. Audio goes only to this owned loopback process.
export class SpeechWorker {
  async ready(config,signal) {
    while(this.starting)await this.starting;
    this.starting=this.start(config,signal);
    try{return await this.starting;}finally{this.starting=undefined;}
  }
  async start(config,signal) {
    const signature=JSON.stringify([config.whisperBinary,config.whisperModel,config.whisperVad]);
    if(this.signature===signature&&this.child?.exitCode===null&&!this.child.killed){await this.loading;signal?.throwIfAborted();return this.url;}
    await this.close();signal?.throwIfAborted();
    const binary=path.join(path.dirname(config.whisperBinary),process.platform==='win32'?'whisper-server.exe':'whisper-server');
    await fs.access(binary);
    const reservation=net.createServer();await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
    const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    this.directory=await fs.mkdtemp(path.join(os.tmpdir(),'easy-web-ai-speech-worker-'));
    if(signal?.aborted){await this.close();signal.throwIfAborted();}
    this.url=`http://127.0.0.1:${port}/${randomUUID()}`;this.signature=signature;
    const args=['-m',config.whisperModel,'--host','127.0.0.1','--port',String(port),'--request-path',new URL(this.url).pathname,'--public',this.directory,'--tmp-dir',this.directory,'-ng','-nlp','-t',String(Math.max(1,Math.min(6,os.availableParallelism()-1))),'-l','auto'];
    if(config.whisperVad)args.push('--vad','-vm',config.whisperVad,'-vt','.35','-vspd','180','-vsd','500','-vp','200');
    this.child=spawn(binary,args,{windowsHide:true,cwd:this.directory,stdio:['ignore','ignore','pipe']});
    const child=this.child;let failure;
    child.on('error',error=>{failure=error;});child.stderr.resume(); // Never log dictated content.
    this.loading=(async()=>{
      const deadline=Date.now()+60000;
      while(Date.now()<deadline){
        signal?.throwIfAborted();if(failure||child.exitCode!==null||child.killed)throw new Error('The local speech engine could not start. Reinstall free voice in Settings.');
        try{const response=await fetch(`${this.url}/health`,{signal:AbortSignal.timeout(1000)});if(response.ok&&(await response.json()).status==='ok')return;}catch{}
        await delay(150,undefined,{signal});
      }
      throw new Error('The speech engine took too long to load. Close other apps, then retry local voice.');
    })();
    try{await this.loading;return this.url;}catch(error){await this.close();throw error;}
  }
  async infer(audio,config,signal) {
    const url=await this.ready(config,signal),form=new FormData();
    form.append('file',new Blob([audio],{type:'audio/wav'}),'command.wav');
    form.append('response_format','verbose_json');form.append('language',recognitionLanguage(config.speechLanguage));
    form.append('detect_language',config.detectOnly?'true':'false');
    form.append('translate','false');form.append('temperature','0');form.append('temperature_inc','0');form.append('no_context','true');form.append('max_context','0');
    form.append('no_timestamps',config.bengaliSpecialist?'true':'false');form.append('token_timestamps','false');form.append('max_len','6000');
    form.append('beam_size',!config.bengaliSpecialist&&config.speechLanguage==='bn'?'5':'1');
    // Vocabulary, rather than an instruction or an example command to hallucinate.
    form.append('prompt',!config.bengaliSpecialist&&config.speechLanguage==='bn'?'এটি বাংলা ভাষায় লেখা একটি বাক্য। বাংলা ও ইংরেজি শব্দ।':'');
    form.append('carry_initial_prompt','false');
    const abort=()=>{void this.close();};signal?.addEventListener('abort',abort,{once:true});
    try{
      const response=await fetch(`${url}/inference`,{method:'POST',body:form,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)});
      if(!response.ok)throw new Error('Local voice recognition failed. Retry, or check your microphone in Settings.');
      const result=await response.json();
      // Auto language can hear Bengali but output a different Indic script.
      // Retry once with a Bengali writing primer, keeping the same resident model.
      if(!config.detectOnly&&config.voiceQuality!=='bangla'&&(!config.speechLanguage||config.speechLanguage==='auto')&&result.language==='bengali'&&!/[\u0980-\u09ff]/.test(result.text||''))return await this.infer(audio,{...config,speechLanguage:'bn'},signal);
      return result;
    }catch(error){await this.close();throw error;}finally{signal?.removeEventListener('abort',abort);}
  }
  async close() {
    if(this.closing)return this.closing;
    this.closing=this.dispose();
    try{await this.closing;}finally{this.closing=undefined;}
  }
  async dispose() {
    const child=this.child,directory=this.directory;this.child=undefined;this.directory=undefined;this.signature=undefined;
    if(child&&child.exitCode===null){const stopped=new Promise(resolve=>child.once('close',resolve));child.kill();await stopped;}
    if(directory){const resolved=await fs.realpath(directory),parent=await fs.realpath(os.tmpdir());if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('easy-web-ai-speech-worker-'))throw new Error('Invalid speech cache directory.');await fs.rm(resolved,{recursive:true,force:true});}
  }
}
