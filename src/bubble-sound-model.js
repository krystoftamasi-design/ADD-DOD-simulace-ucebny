const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
export function bubbleSoundMode(state){
  const guide=state?.guide;
  if(!state||state.mode!=='animation'||!state.playing||guide?.recall||['listening','finishing','empty','error'].includes(guide?.phase))return 'silent';
  if(guide?.resetGesture)return guide.resetGesture.phase==='burst'?'burst':'hold';
  if(['transcribing','thinking'].includes(guide?.phase))return 'bloom';
  return guide?.phase==='presenting'?'tour':'idle';
}

// Advance once per shared timestamp, independently of how many surfaces paint.
export function createBubbleCueTracker(random=Math.random){
  let key='',lastTime=null,plan=[],tour=null,lastSurface=null,lastFlight=false,nextDrift=0,lastAmount=0,lastCue=-Infinity;
  let variants=[],lastVariant=-1,model=null;
  const between=(a,b)=>a+(b-a)*random();
  function cue(gain=.7,rate=1,pan=0){
    if(!variants.length){
      variants=[0,1,2,3];
      for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[variants[i],variants[j]]=[variants[j],variants[i]];}
      if(variants.at(-1)===lastVariant)[variants[0],variants[3]]=[variants[3],variants[0]];
    }
    lastVariant=variants.pop();
    return {variant:lastVariant,gain:gain*between(.8,1),rate:rate*between(.96,1.04),pan:clamp(pan,-.65,.65)};
  }
  function bloomPlan(state,motion){
    const start=state.guide.thinkingAt||0;
    const candidates=['projector',...new Set(state.order||[])].flatMap(surface=>motion.bloomKernels(surface,surface==='projector'?2.95/1.6:16/9)
      .filter(b=>b.x>=0&&b.x<=1&&b.y>=0&&b.y<=1).map(b=>({at:start+(b.born+.084)*1000,pan:b.x*2-1,rate:clamp(1.12-b.r, .86,1.12)}))).sort((a,b)=>a.at-b.at);
    const result=[];let next=-Infinity;
    for(const b of candidates)if(b.at>=next){result.push({...b,gain:.75});next=b.at+between(115,190);}
    return result;
  }
  return {update(state,now,motion){
    if(!Number.isFinite(now)||!motion)return [];
    const mode=bubbleSoundMode(state),guide=state.guide||{},gesture=guide.resetGesture;
    const id=[mode,guide.tourSession??guide.session,guide.thinkingAt,gesture?.startedAt,mode==='bloom'||mode==='tour'?(state.order||[]).join(','):''].join(':');
    const previous=lastTime,changed=id!==key||model!==motion||previous!==null&&(now<previous||now-previous>500);
    lastTime=now;
    const amount=state.spawn?.amount;
    const gathered=amount?(motion.gatherAt?motion.gatherAt(state.spawn,now):amount.from+(amount.to-amount.from)*smooth((now-amount.at)/(amount.duration||1))):0;
    if(changed){
      if(previous!==null&&now<previous)lastCue=-Infinity;
      key=id;model=motion;lastSurface=null;lastFlight=false;lastAmount=gathered;nextDrift=now+between(800,1500);
      plan=mode==='bloom'?bloomPlan(state,motion):mode==='hold'?Array.from({length:7},(_,i)=>({at:gesture.startedAt+220+i*100,gain:.5,rate:1.04,pan:0})):
        mode==='burst'?[0,100,220,360].map((delay,i)=>({at:gesture.startedAt+delay,gain:.85-i*.1,rate:1-i*.04,pan:between(-.5,.5)})):[];
      tour=mode==='tour'?motion.createWorkTour(guide):null;
      return [];
    }
    if(previous===null||mode==='silent')return [];
    if(['bloom','hold','burst'].includes(mode)){
      const due=plan.filter(event=>event.at>previous&&event.at<=now);
      if(!due.length||now-lastCue<90)return [];
      lastCue=now;const event=due[Math.floor(random()*due.length)];return [cue(event.gain,event.rate,event.pan)];
    }
    if(mode==='tour'){
      const age=Math.max(0,now-(guide.tourPauseMs||0)-(guide.revealAt||0));
      const pose=['projector',...new Set(state.order||[])].map(surface=>({surface,p:motion.sampleWorkTour(tour,age,surface,1600,900)}))
        .find(({p})=>p&&p.x>=0&&p.x<1&&p.y>=0&&p.y<1);
      if(!pose)return [];
      const arrival=lastSurface!==null&&(pose.surface!==lastSurface||lastFlight&&pose.p.phase==='perch');
      lastSurface=pose.surface;lastFlight=pose.p.phase==='flight';
      if(arrival||lastFlight&&now>=nextDrift){nextDrift=now+between(550,1000);lastCue=now;return [cue(arrival ? .65 : .4,1,pose.p.x*2-1)];}
      return [];
    }
    const moving=Math.abs(gathered-lastAmount)>=.09;
    if(moving)lastAmount=gathered;
    if((moving||gathered<.015&&now>=nextDrift)&&now-lastCue>=150){
      nextDrift=now+between(1000,1900);lastCue=now;return [cue(moving ? .6 : .38,1,between(-.6,.6))];
    }
    return [];
  }};
}
