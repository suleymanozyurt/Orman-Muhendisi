// Mono PCM16 at 16 kHz, aggregated in 40 ms packets. No microphone audio is
// connected to the speaker; the node emits silence to keep the graph running.
class LensMicrophone extends AudioWorkletProcessor {
  packet = new ArrayBuffer(1280);
  index = 0;
  phase = 0;
  sum = 0;
  count = 0;
  process(inputs) {
    const channel=inputs[0]?.[0];
    if(!channel)return true;
    for(const sample of channel){
      this.sum+=sample;
      this.count++;
      this.phase+=16000;
      if(this.phase<sampleRate)continue;
      this.phase-=sampleRate;
      const value=Math.max(-1,Math.min(1,this.sum/this.count));
      this.sum=0;
      this.count=0;
      new DataView(this.packet).setInt16(this.index++*2,Math.round(value*(value<0?32768:32767)),true);
      if(this.index===640){
        this.port.postMessage(this.packet,[this.packet]);
        this.packet=new ArrayBuffer(1280);
        this.index=0;
      }
    }
    return true;
  }
}
registerProcessor("lens-microphone",LensMicrophone);
