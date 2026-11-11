export type LensMode = "search"|"translate"|"talk"|"create";
export type LensBlock={box:[number,number,number,number];text:string;original?:string};
export const lensModes:LensMode[]=["search","translate","talk","create"];

/** Standard mono 16 kHz PCM WAV understood by the photo conversation provider. */
export function lensPcmWav(samples:Float32Array,rate=16_000):Uint8Array{
 const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
 const stamp=(offset:number,word:string)=>Array.from(word).forEach((ch,i)=>view.setUint8(offset+i,ch.charCodeAt(0)));
 stamp(0,"RIFF");view.setUint32(4,bytes.length-8,true);stamp(8,"WAVE");stamp(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);stamp(36,"data");view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);}
 return bytes;
}
export async function lensAudioWav(blob:Blob){
 const decoder=new AudioContext();
 try{
  const audio=await decoder.decodeAudioData(await blob.arrayBuffer());
  const seconds=Math.min(audio.duration,25);
  if(seconds<.15)throw new Error("AUDIO_EMPTY");
  const mixer=new OfflineAudioContext(1,Math.ceil(seconds*16000),16000);
  const source=mixer.createBufferSource();source.buffer=audio;source.connect(mixer.destination);source.start(0,0,seconds);
  const data=lensPcmWav((await mixer.startRendering()).getChannelData(0));
  return new File([new Uint8Array(data)],"voice.wav",{type:"audio/wav"});
 }finally{await decoder.close().catch(()=>{});}
}
