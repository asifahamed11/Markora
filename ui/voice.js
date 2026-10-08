export class VoiceRecorder {
  async start(onLimit, options = {}) {
    this.chunks = []; this.finishing=false; this.cancelled=false;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, ...(options.deviceId?{deviceId:{exact:options.deviceId}}:{}) }, video: false });
    if(this.cancelled){this.stream.getTracks().forEach(track=>track.stop());return;}
    try {
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule(new URL('./audio-worklet.js', import.meta.url));
      this.source = this.context.createMediaStreamSource(this.stream);
      this.worklet = new AudioWorkletNode(this.context, 'voice-recorder');
      this.detector = new SpeechEndDetector({pauseMs:options.pauseMs});
      this.sampleCount=0;
      this.worklet.port.onmessage = event => {
        this.chunks.push(event.data);
        this.sampleCount+=event.data.length;
        const {level,ended}=this.detector.push(event.data,this.sampleCount/this.context.sampleRate*1000);
        options.onLevel?.(level);
        if(options.autoStop && ended && (options.canFinish?.() ?? true) && !this.finishing){this.finishing=true;onLimit();}
      };
      const mute = this.context.createGain(); mute.gain.value = 0;
      this.source.connect(this.worklet).connect(mute).connect(this.context.destination);
      await this.context.resume(); this.timer = setTimeout(()=>{if(!this.finishing){this.finishing=true;onLimit();}}, 90000);
    } catch (error) { this.stream.getTracks().forEach(track => track.stop()); await this.context?.close(); throw error; }
  }
  async stop() {
    clearTimeout(this.timer); this.stream.getTracks().forEach(track => track.stop());
    this.worklet.port.onmessage = null; this.source.disconnect(); this.worklet.disconnect();
    const rate = this.context.sampleRate; await this.context.close();
    const size = this.chunks.reduce((sum, c) => sum + c.length, 0), samples = new Float32Array(size);
    let offset = 0; for (const chunk of this.chunks) { samples.set(chunk,offset); offset+=chunk.length; }
    this.chunks = [];
    // Keep 450 ms before the first sound and 350 ms after the last sound.
    // Waiting to mark the page no longer sends minutes of silence to Whisper.
    const from=Math.max(0,Math.floor(((this.detector.startedAt??0)-450)*rate/1000));
    const to=Math.min(size,Math.ceil(((this.detector.lastLoud??size/rate*1000)+350)*rate/1000));
    const targetRate = 16000, length = Math.floor(Math.max(0,to-from) * targetRate / rate), bytes = new Uint8Array(44 + length * 2), view = new DataView(bytes.buffer);
    const write = (position,text) => [...text].forEach((char,index)=>view.setUint8(position+index,char.charCodeAt(0)));
    write(0,'RIFF');view.setUint32(4,36+length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,length*2,true);
    for(let i=0;i<length;i++) {
      const start=from+Math.floor(i*rate/targetRate),end=Math.max(start+1,from+Math.floor((i+1)*rate/targetRate));
      let sum=0;for(let j=start;j<end && j<size;j++)sum+=samples[j];
      const sample=Math.max(-1,Math.min(1,sum/(end-start)));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);
    }
    return bytes;
  }
  async cancel(){this.cancelled=true;clearTimeout(this.timer);if(this.worklet)this.worklet.port.onmessage=null;this.stream?.getTracks().forEach(track=>track.stop());this.source?.disconnect();this.worklet?.disconnect();if(this.context?.state!=='closed')await this.context?.close();this.chunks=[];}
}
export class SpeechEndDetector {
  constructor({pauseMs=2200}={}){this.pauseMs=pauseMs??2200;this.startedAt=undefined;this.lastLoud=undefined;this.voicedMs=0;this.previous=undefined;this.noise=0.002;this.loudRun=0;}
  push(samples,now){
    let power=0;for(const sample of samples)power+=sample*sample;const level=Math.sqrt(power/Math.max(1,samples.length));
    const elapsed=this.previous===undefined?0:Math.min(100,now-this.previous);this.previous=now;
    const threshold=Math.max(.007,this.noise*3);
    if(level>threshold){this.loudRun+=elapsed;if(this.loudRun>=80){this.startedAt??=now-this.loudRun;this.lastLoud=now;this.voicedMs+=elapsed;}}
    else{this.loudRun=0;this.noise=this.noise*.98+Math.min(level,.02)*.02;}
    return {level,ended:this.voicedMs>=240 && now-this.lastLoud>=this.pauseMs};
  }
}
