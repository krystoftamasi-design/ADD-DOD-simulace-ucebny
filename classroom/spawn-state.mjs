import {proximityFromSensor} from './proximity.mjs';
import {followGather,flowAt} from '../mascot/spawn-model.js';
import {ListeningState} from '../src/listening.js';

export function initialSpawn(now=0) {
  return {enabled:true,phase:'idle',fingerPresent:false,amount:{from:0,to:0,at:now,duration:300},flow:{seconds:0,at:now},listeningAt:null};
}
export class SpawnController {
  constructor(now=0){this.state=initialSpawn(now);this.touchId=null;this.contact=new ListeningState();}
  reset(now){this.state=initialSpawn(now);this.contact=new ListeningState();return this.state;}
  update(sensor,now,wallTime=Date.now(),suppressHover=false) {
    const id=sensor?.touchId;
    const touch=Number.isInteger(id)&&this.touchId!==null&&id!==this.touchId&&sensor.connected===true&&wallTime-sensor.touchAt>=0&&wallTime-sensor.touchAt<2000;
    if(Number.isInteger(id))this.touchId=id;
    const old=this.state;
    const proximity=proximityFromSensor(sensor);
    const position=sensor?.connected===true?sensor.position:null;
    const fingerPresent=!!position&&['x','y','z'].every(axis=>Number.isFinite(position[axis])&&position[axis]>=0&&position[axis]<=100);
    // Confirm a lift relative to the touch height, even while the finger is still in range.
    if(typeof sensor?.touching==='boolean'){
      if(!sensor.connected||!sensor.touching)this.contact.active=false;
      else if(touch)this.contact.touch(position,now);
    }else if(touch&&!this.contact.active)this.contact.touch(position,now);
    else this.contact.update(position,now);
    const listening=this.contact.active;
    if(old.phase==='listening'&&listening)return this.state=old.fingerPresent===fingerPresent?old:{...old,fingerPresent};
    const target=listening?1:suppressHover?0:proximity;
    const phase=listening?'listening':target>.015?'gathering':'idle';
    if(Math.abs(target-old.amount.to)<.003&&phase===old.phase)return this.state=old.fingerPresent===fingerPresent?old:{...old,fingerPresent};
    this.state={enabled:true,phase,fingerPresent,
      amount:followGather(old,target,now),
      flow:{seconds:flowAt(old,now),at:now},listeningAt:touch?now:null};
    return this.state;
  }
}
