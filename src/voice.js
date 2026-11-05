import {MIN_RECORDING_MS} from './listening.js';

const endpoint='http://127.0.0.1:8000';
export function recordingError({size,durationMs,heard}){
  if(!size||durationMs<MIN_RECORDING_MS)return 'Záznam skončil příliš brzy. Přidrž prst alespoň 2 sekundy.';
  if(!heard)return 'Nezachytil jsem řeč. Přilož prst a zkus to znovu.';
  return null;
}
export function setupVoice({room}){
  if(!['127.0.0.1','localhost'].includes(location.hostname))return {update(){}};
  const dock=document.createElement('section');dock.className='voice-dock';
  dock.innerHTML='<div class="voice-top"><button id="voice-enable">Povolit mikrofon</button><button id="voice-start" disabled>Mluvit teď</button><span id="voice-status" role="status">Připravuji hlasové příkazy…</span></div><p id="voice-transcript"></p><details><summary>Zadat požadavek textem</summary><form id="voice-form"><input id="voice-text" aria-label="Požadavek na studentskou práci" placeholder="Např. ukaž nejlepší animace z roku 2025" maxlength="2000" required><button>Vybrat práci</button></form></details><div class="voice-demos"><div class="voice-demo-heading"><span>Vyzkoušet animaci</span><span id="voice-demo-mode">Flick · automaticky</span></div><div id="voice-demo-buttons" role="group" aria-label="Ukázky stavů maskota"></div><p id="voice-demo-note" hidden></p></div>';
  document.querySelector('main').append(dock);
  const $=id=>dock.querySelector('#'+id),owner=crypto.randomUUID();
  let stream,context,analyser,recorder,recordSession=null,lastAttempted=null,timer,lastSpeech=0,heard=false,started=0,stoppedAt=null,busy=false;
  let ready=false,pendingPermission=false,demoBusy=false;
  const cancelled=new Set();
  async function request(path,body,raw=false){
    const response=await fetch(endpoint+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':raw?'application/octet-stream':'application/json'},body:body===undefined?undefined:raw?await body.arrayBuffer():JSON.stringify(body),signal:AbortSignal.timeout(150000)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Požadavek se nepodařil.');return result;
  }
  const show=message=>{$('voice-status').textContent=message;};
  function stopRecording(){if(recorder?.state==='recording'){stoppedAt=performance.now();recorder.stop();}clearInterval(timer);}
  async function begin(session){
    if(document.hidden||room.state()?.guide?.demo||!stream||busy||recorder?.state==='recording'||session===lastAttempted)return;
    lastAttempted=session;
    try{
      await context.resume();
      if(context.state!=='running')throw new Error('Mikrofon není aktivní. Zapni ho znovu v tomto okně.');
      await request('/api/voice/claim',{session,owner});
      if(room.state()?.guide?.session!==session||room.state()?.guide?.phase!=='listening')return;
      const chunks=[];
      const type=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(stream,type?{mimeType:type}:{});recordSession=session;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=async()=>{
        clearInterval(timer);recordSession=null;
        if(!ready||cancelled.has(session)||room.state()?.guide?.session!==session)return;
        busy=true;
        try{
          const blob=new Blob(chunks,{type:recorder.mimeType});
          const error=recordingError({size:blob.size,durationMs:(stoppedAt??performance.now())-started,heard});
          if(error)throw new Error(error);
          show('Přepisuji řeč…');
          await request(`/api/voice/audio?session=${session}&owner=${encodeURIComponent(owner)}`,blob,true);
        }catch(error){show(error.message);await request('/api/voice/error',{session,message:error.message}).catch(()=>{});}
        finally{busy=false;}
      };
      recorder.onerror=()=>{show('Nahrávání se nepodařilo.');stopRecording();};
      heard=false;started=performance.now();stoppedAt=null;lastSpeech=started;recorder.start();show('Poslouchám — řekni, jakou práci chceš vidět.');
      const samples=new Float32Array(analyser.fftSize);
      timer=setInterval(()=>{
        analyser.getFloatTimeDomainData(samples);
        const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length),now=performance.now();
        if(rms>.008){heard=true;lastSpeech=now;}
        if(!room.state()?.guide?.holdToTalk&&heard&&now-lastSpeech>1600&&now-started>=MIN_RECORDING_MS||now-started>20000)stopRecording();
      },100);
    }catch(error){show(error.message);}
  }
  function update(state){
    for(const button of $('voice-demo-buttons').children){
      button.disabled=!room.connected||demoBusy;
      button.setAttribute('aria-pressed',String(button.dataset.scene===(state?.guide?.demo||'live')));
    }
    const guide=state?.guide;if(!guide)return;
    if(guide.session!==recordSession&&recordSession!==null)stopRecording();
    if(guide.demo){
      const count=guide.projects?.length||0;
      show('Ukázka · '+(count?guide.phase==='presenting'?`${count} prací v 3D náhledu · ${guide.assignments.length} na připojených monitorech.`:'Odhaluji práce z katalogu…':guide.message||''));
    }else if(guide.phase==='listening'){
      if(ready)begin(guide.session);else show('Povol mikrofon, potom přilož prst k Flicku.');
    }else if(guide.phase==='finishing'){
      show(guide.message);
      stopRecording();
    }else if(guide.phase!=='idle')show(guide.message||'');
    else if(pendingPermission)show('Čekám na povolení mikrofonu v prohlížeči…');
    else show(ready?'Mikrofon připraven · drž prst na destičce a mluv.':'Povol mikrofon pro hlasové příkazy.');
    $('voice-start').disabled=!ready||!guide.demo&&['listening','finishing','transcribing','thinking'].includes(guide.phase);
    $('voice-transcript').textContent=guide.transcript||'';
    if(guide.legacyCategoryFallback&&guide.phase==='presenting')show(guide.message+' · širší skupina web/UI/UX podle původního katalogu');
    dock.dataset.phase=guide.phase;
    dock.classList.toggle('is-demo',!!guide.demo);
    $('voice-demo-mode').textContent=guide.demo?'Ukázka · bez mikrofonu':'Flick · automaticky';
    $('voice-demo-note').hidden=!guide.demo;
    $('voice-demo-note').textContent=guide.demo?'Náhled všech monitorů'+(guide.category?' · '+guide.category:'')+' · ↻ Flick vrátí živé ovládání.':'';
  }
  $('voice-enable').onclick=async()=>{
    if(ready){ready=false;stopRecording();stream?.getTracks().forEach(track=>track.stop());await context?.close();$('voice-enable').textContent='Povolit mikrofon';$('voice-start').disabled=true;show('Mikrofon vypnutý.');return;}
    pendingPermission=true;$('voice-enable').disabled=true;show('Čekám na povolení mikrofonu v prohlížeči…');
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Tento prohlížeč neumí nahrávat mikrofon. Otevři místní náhled v Chrome nebo Safari.');
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      context=new AudioContext();await context.resume();analyser=context.createAnalyser();analyser.fftSize=2048;
      context.createMediaStreamSource(stream).connect(analyser);
      ready=true;pendingPermission=false;$('voice-start').disabled=false;$('voice-enable').textContent='Vypnout mikrofon';update(room.state());
    }catch(error){stream?.getTracks().forEach(track=>track.stop());show(error.name==='NotAllowedError'?'Povol mikrofon v prohlížeči a zkus to znovu.':error.message);}finally{pendingPermission=false;$('voice-enable').disabled=false;}
  };
  $('voice-start').onclick=()=>request('/api/voice/start',{}).catch(error=>show(error.message));
  $('voice-form').onsubmit=async event=>{
    event.preventDefault();if(busy||!$('voice-text').value.trim())return;
    busy=true;if(recordSession!==null)cancelled.add(recordSession);stopRecording();
    try{await request('/api/voice/text',{text:$('voice-text').value.trim()});}catch(error){show(error.message);}finally{busy=false;}
  };
  request('/api/voice/demos').then(({scenes})=>{
    for(const scene of scenes){
      const button=document.createElement('button');button.type='button';button.textContent=scene.label;button.title=scene.title;button.dataset.scene=scene.id;
      button.onclick=async()=>{
        demoBusy=true;
        if(recordSession!==null)cancelled.add(recordSession);
        stopRecording();update(room.state());
        let failure;
        try{await request('/api/voice/demo',{scene:scene.id});}
        catch(error){failure=error.message;}
        finally{demoBusy=false;update(room.state());if(failure)show(failure);}
      };
      $('voice-demo-buttons').append(button);
    }
    update(room.state());
  }).catch(error=>show(error.message));
  addEventListener('pagehide',()=>{ready=false;stopRecording();stream?.getTracks().forEach(track=>track.stop());context?.close();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready)update(room.state());});
  request('/api/voice/status').then(status=>{
    if(!status.speech)show('Chybí model pro přepis řeči.');
    else if(!status.model)show('V Ollamě chybí Tev1.');
    else show(`Připraveno · ${status.projects} prací · povol mikrofon.`);
  }).catch(error=>show(error.message));
  return {update};
}
