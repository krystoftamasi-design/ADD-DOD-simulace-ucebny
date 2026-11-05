import {createBubbleCueTracker,bubbleSoundMode} from './bubble-sound-model.js';

export function setupBubbleAudio({frame}){
  const button=document.createElement('button');button.id='bubble-sound';button.type='button';
  (document.querySelector('.voice-top')||document.querySelector('.controls-panel'))?.append(button);
  let muted=false;try{muted=localStorage.getItem('dod-bubble-sounds')==='off';}catch{}
  let context,master,buffers,loading,owner=false,requesting=false,release,disposed=false,microphone=false,lastGain=-1,errorText='',played=0;
  const sources=new Set(),tracker=createBubbleCueTracker();
  function label(){
    const active=!muted&&owner&&context?.state==='running'&&buffers;
    button.textContent=active?'Ztišit zvuky':'Zapnout zvuky';button.setAttribute('aria-pressed',String(!!active));
    button.title=errorText||(!muted&&requesting&&!owner?'Zvuky přehrává jiné okno simulátoru.':'Zvuky zelených kuliček');
  }
  function stop(){for(const source of sources)try{source.stop();}catch{}sources.clear();}
  function claim(){
    if(requesting||owner)return;
    if(!navigator.locks){owner=true;label();return;}
    requesting=true;
    navigator.locks.request('dod-bubble-sounds',{ifAvailable:true},async lock=>{
      if(!lock||muted||disposed)return;
      owner=true;label();await new Promise(resolve=>release=resolve);owner=false;
    }).catch(error=>console.warn('Zvuky bublinek:',error.message)).finally(()=>{requesting=false;label();});
  }
  async function enable(){
    errorText='';
    muted=false;try{localStorage.setItem('dod-bubble-sounds','on');}catch{}
    try{
      if(!context){context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);}
      await context.resume();
      if(!loading)loading=Promise.all([1,2,3,4].map(async n=>{
        const response=await fetch(new URL(`../assets/audio/bubble-0${n}.wav`,import.meta.url));
        if(!response.ok)throw new Error('Zvuk se nepodařilo načíst.');
        return context.decodeAudioData(await response.arrayBuffer());
      })).then(result=>buffers=result).catch(error=>{loading=null;throw error;});
      await loading;if(disposed||muted)return;claim();label();
    }catch(error){errorText=error.message;label();}
  }
  button.onclick=()=>{
    if(!muted&&owner&&context?.state==='running'&&buffers){muted=true;stop();release?.();release=null;try{localStorage.setItem('dod-bubble-sounds','off');}catch{}label();}
    else enable();
  };
  const unlock=event=>{if(event.isTrusted&&!muted&&event.target!==button&&context?.state!=='running')enable();};
  document.addEventListener('pointerdown',unlock,{capture:true});
  function update(current=frame()){
    if(!current||current.time===null)return;
    const mode=bubbleSoundMode(current.state),recording=mode==='silent';
    if(recording&&!microphone)stop();microphone=recording;
    const ready=!muted&&owner&&context?.state==='running'&&buffers;
    const level=ready&&!recording ? .32 : 0;
    if(master&&level!==lastGain){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(level,context.currentTime,.015);lastGain=level;}
    const cues=tracker.update(current.state,current.time,window.DodGuide?.audioModel);
    if(!ready||recording)return;
    for(const cue of cues){
      if(sources.size>=3)break;
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[cue.variant];source.playbackRate.value=cue.rate;gain.gain.value=cue.gain;
      source.connect(gain);
      const pan=context.createStereoPanner?.();
      if(pan){pan.pan.value=cue.pan;gain.connect(pan);pan.connect(master);}else gain.connect(master);
      sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();pan?.disconnect();};source.start();
      button.dataset.soundPlayed=String(++played);button.dataset.soundVariant=String(cue.variant+1);
    }
  }
  const timer=setInterval(()=>update(),80);label();
  addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);document.removeEventListener('pointerdown',unlock,{capture:true});stop();release?.();context?.close();},{once:true});
  return {update};
}
