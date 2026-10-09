import {rmsToOpenness} from './face-performance.js';
/** A permission-gated local microphone volume tracker. No stream is uploaded. */
export class MicrophoneMouth {
  constructor(){this.ctx=null;this.stream=null;this.analyser=null;this.buffer=null;this.level=0;}
  get active(){return Boolean(this.stream);}
  async start(){
    if(this.stream)return;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('需要 localhost 或 HTTPS，以及支持麦克风的浏览器。');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    try{
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)throw new Error('此浏览器不支持 AudioContext。');
      this.ctx=new Context();await this.ctx.resume();
      const source=this.ctx.createMediaStreamSource(stream);
      this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=1024;
      source.connect(this.analyser);
      this.buffer=new Float32Array(this.analyser.fftSize);
      this.stream=stream;
    }catch(error){stream.getTracks().forEach(track=>track.stop());if(this.ctx)await this.ctx.close();this.ctx=null;throw error;}
  }
  sample(){
    if(!this.analyser)return 0;
    this.analyser.getFloatTimeDomainData(this.buffer);
    let sum=0;for(const n of this.buffer)sum+=n*n;
    const target=rmsToOpenness(Math.sqrt(sum/this.buffer.length));
    this.level+=(target-this.level)*(target>this.level?.42:.19);
    return this.level;
  }
  async stop(){
    this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
    if(this.ctx){await this.ctx.close();this.ctx=null;}
    this.analyser=null;this.buffer=null;this.level=0;
  }
}
