// Z is a percentage of Flick's sensing range; lower values are nearer the plate.
import {resetTimings} from '../mascot/reset-model.js';
export const RESET_HOLD_MS=resetTimings.hold,RESET_BURST_MS=resetTimings.burst;
export class HoverReset {
  constructor(){this.reset();}
  reset(){this.since=null;this.lastAt=null;this.latched=false;this.withdrawalRequired=false;}
  requireWithdrawal(){this.since=null;this.withdrawalRequired=true;}
  update(sensor,now,{enabled=true,touching=false}={}){
    if(this.lastAt!==null&&now-this.lastAt>400)this.since=null;
    this.lastAt=now;
    const z=sensor?.position?.z;
    const valid=sensor?.connected===true&&Number.isFinite(z)&&z>=0&&z<=100;
    const pressed=touching||sensor?.touching===true;
    if(this.withdrawalRequired){
      if(!valid||z>72)this.withdrawalRequired=false;
      this.since=null;return false;
    }
    if(this.latched){
      if(!valid||z>72||pressed)this.latched=false;
      return false;
    }
    if(!enabled||!valid||z>66||pressed){this.since=null;return false;}
    this.since??=now;
    if(now-this.since<RESET_HOLD_MS)return false;
    this.since=null;this.latched=true;return true;
  }
}

// Only stage boundaries are sent over the wire; clients animate from the shared
// timestamps. Keep the old guide until the burst finishes so it has an origin.
export function advanceResetGesture(hover,voice,spawn,sensor,now,{enabled=true,touching=false}={}){
  // Lifting off the plate ends recording. The same lingering hand must not
  // become a new reset gesture while that recording is being processed.
  if(['listening','finishing','transcribing','thinking'].includes(voice.state.phase)){
    hover.requireWithdrawal();enabled=false;
  }
  const current=voice.state.resetGesture;
  if(current?.phase==='burst'){
    if(now-current.startedAt<current.duration)return null;
    voice.reset();return 'complete';
  }
  if(hover.update(sensor,now,{enabled,touching})){
    const idle=spawn.reset(now);
    voice.set({resetGesture:{...current,phase:'burst',startedAt:now,duration:RESET_BURST_MS,spawn:idle}});
    return 'burst';
  }
  if(current?.phase==='holding'&&hover.since!==null&&hover.since!==current.startedAt){
    voice.set({tourPauseMs:(voice.state.tourPauseMs||0)+Math.max(0,now-current.startedAt),
      resetGesture:{...current,startedAt:hover.since}});
    return 'hold';
  }
  if(hover.since!==null&&!current){
    const guide=voice.state;
    const source={phase:guide.phase,session:guide.session,tourSession:guide.tourSession,revealAt:guide.revealAt,thinkingAt:guide.thinkingAt,
      assignments:guide.assignments,projects:guide.projects,project:guide.project,station:guide.station,imageIndices:guide.imageIndices};
    voice.set({resetGesture:{phase:'holding',startedAt:hover.since,duration:RESET_HOLD_MS,frozenAt:now-(guide.tourPauseMs||0),source}});
    return 'hold';
  }
  if(hover.since===null&&current?.phase==='holding'){
    voice.set({resetGesture:null,tourPauseMs:(voice.state.tourPauseMs||0)+Math.max(0,now-current.startedAt)});
    return 'cancel';
  }
  return null;
}
