import {circleLayout, sampleCircle, randomAt, noise} from './procedural-body.js';
import {mascotBounds} from './cursor-follow.js';
import {sampleFlight,neighbours} from './bubble-flight.js';

export const spawnSurfaces = [1,2,3,4,5,6,7,8,9,10,'projector'];
export const spawnSettings={dotsPerMonitor:12,projectionDots:22,followResponseMs:180};
export const clamp = value => Math.max(0, Math.min(1, value));
export const smooth = value => {const t=clamp(value);return t*t*(3-2*t);};
export function gatherMotion(spawn, now) {
  const change=spawn.amount;
  if(change.responseMs){
    // Analytic critically damped follow: the shared clock gives every display
    // the same position and velocity, without frame-by-frame integration.
    const seconds=Math.max(0,now-change.at)/1000,omega=1000/change.responseMs;
    const offset=change.from-change.to,velocity=change.velocity||0;
    if(seconds===0)return {value:change.from,velocity};
    const slope=velocity+omega*offset,decay=Math.exp(-omega*seconds);
    const value=change.to+(offset+slope*seconds)*decay;
    const speed=(velocity-omega*slope*seconds)*decay;
    if(value<0||value>1)return {value:clamp(value),velocity:0};
    if(Math.abs(value-change.to)<.0001&&Math.abs(speed)<.001)return {value:change.to,velocity:0};
    return {value,velocity:speed};
  }
  // Fixed demo clips and older snapshots keep their authored timing.
  const duration=change.duration||1,t=clamp((now-change.at)/duration);
  return {value:change.from+(change.to-change.from)*smooth(t),
    velocity:(change.to-change.from)*6*t*(1-t)*1000/duration};
}
export function gatherAt(spawn, now) {
  return gatherMotion(spawn,now).value;
}
export function followGather(spawn,target,now){
  const motion=gatherMotion(spawn,now);
  return {from:motion.value,to:clamp(target),velocity:motion.velocity,at:now,responseMs:spawnSettings.followResponseMs};
}
export function flowAt(spawn, now) {
  return spawn.flow.seconds+(spawn.phase==='idle'?Math.max(0,now-spawn.flow.at)/1000:0);
}

// Bubble identity is preserved. Monitor bubbles leave through the bottom edge
// and arrive through the top edge of the projection; no horizontal screen strip.
export function createSpawnModel(character) {
  const {body}=character,layout=circleLayout(body),bounds=mascotBounds(body,1);
  const center=[bounds.x+bounds.width/2,bounds.y+bounds.height/2];
  const extent=Math.max(bounds.width,bounds.height),projectionAspect=2.95/1.6;
  const monitorCount=spawnSurfaces.length-1;
  const monitorBubbles=monitorCount*spawnSettings.dotsPerMonitor;
  const count=monitorBubbles+spawnSettings.projectionDots;
  let cachedSpawn,cachedNow,cachedParticles;
  return function particles(spawn, now) {
    if(cachedSpawn===spawn&&cachedNow===now)return cachedParticles;
    const amount=gatherAt(spawn,now),flow=flowAt(spawn,now),result=[];
    const poses=layout.map(circle=>sampleCircle(circle,now/1000,body.wiggle));
    for(let id=0;id<count;id++){
      // Multiple idle dots merge into each of the original 42 body circles.
      const target=id%layout.length,pose=poses[target];
      const phase=randomAt(id,37)*137,phaseY=randomAt(id,43)*137;
      const rateX=.10+.22*randomAt(id,107),rateY=.11+.20*randomAt(id,109);
      const flight=id<monitorBubbles?sampleFlight(id,spawnSurfaces[id%monitorCount],flow):null;
      const originX=flight?flight.x:.5+.28*Math.sin(flow*rateX+phase)+.10*noise(flow*.3+phase,1009+id)+.06*noise(flow*.95+phase,2027+id);
      const originY=flight?flight.y:.5+.28*Math.sin(flow*rateY+phaseY)+.10*noise(flow*.37+phaseY,3011+id)+.06*noise(flow*1.07+phaseY,4001+id);
      const targetX=.5+(body.position[0]+pose.x*body.layerScalePercent[0]/100-center[0])/extent*.46;
      const targetY=.42+(body.position[1]+pose.y*body.layerScalePercent[1]/100-center[1])/extent*.46*projectionAspect;
      const idleRadius=.012+randomAt(id,51)*.01;
      const radius=idleRadius+(body.circleDiameter/2*body.layerScalePercent[0]/100/extent*.46-idleRadius)*amount;
      const shape={id,target,radius,sx:1+(pose.scaleX-1)*amount,sy:1+(pose.scaleY-1)*amount,rotation:pose.rotation*Math.PI/180*amount};
      function place(surface,x,y,extra={}){
        if(y+radius*projectionAspect>=0&&y-radius*projectionAspect<=1)result.push({...shape,surface,x,y,...extra});
      }
      if(id<monitorBubbles){
        // Unfold the monitor + projection into one vertical path. The shared
        // edge has the same travel speed on both surfaces, also in reverse.
        const travel=amount*(1-originY+targetY);
        place(flight.surface,originX,originY+travel);
        const ghostAlpha=1-smooth(amount/.12);
        if(ghostAlpha>0)for(const ghost of neighbours(flight.surface,originX,originY,idleRadius*projectionAspect))
          result.push({...shape,...ghost,ghost:true,alpha:ghostAlpha});
        const projectionY=originY+travel-1;
        const horizontalBlend=smooth(projectionY/Math.max(.01,targetY));
        if(amount>0)place('projector',originX+(targetX-originX)*horizontalBlend,projectionY,{alpha:smooth(amount/.12)});
      }else{
        place('projector',originX+(targetX-originX)*amount,originY+(targetY-originY)*amount);
      }
    }
    cachedSpawn=spawn;cachedNow=now;cachedParticles=result;
    return result;
  };
}

export function demoSpawn(time, manual) {
  const amount=manual?manual.amount:smooth((time-2)/3.5)*(1-smooth((time-8)/1.3));
  const listening=manual?manual.listening:time>=6&&time<8;
  return {enabled:true,phase:listening?'listening':amount>0?'gathering':'idle',
    amount:{from:listening?1:amount,to:listening?1:amount,at:0,duration:1},
    flow:{seconds:Math.min(time,2),at:time*1000},listeningAt:listening?6000:null};
}
