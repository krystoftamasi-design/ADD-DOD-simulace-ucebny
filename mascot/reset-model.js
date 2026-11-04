import {randomAt} from './procedural-body.js';
import {screenTiles} from './bubble-flight.js';

export const resetTimings={hold:1500,burst:850};
export const resetTiles={...screenTiles,projector:[1,3]};
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};

export function sampleResetHold(pose,gesture,now,width,height){
  if(!pose)return null;
  const age=Math.max(0,now-gesture.startedAt)/1000,p=clamp(age*1000/gesture.duration);
  const swell=1+.12*smooth(p)+.015*Math.sin(age*18)*smooth(p);
  const trail=[...(pose.trail||[])];
  for(let i=0;i<7;i++){
    const born=.12+i*.10,t=smooth((age-born)/.2),angle=i*Math.PI*2/7;
    const distance=pose.size*(.27+.025*Math.sin(age*13+i));
    trail.push({x:pose.x+Math.cos(angle)*distance/width,y:pose.y+Math.sin(angle)*distance/height,
      radius:pose.size*(.12+.04*randomAt(i,997))*t});
  }
  return {...pose,trail,size:pose.size*swell,closed:false,blinkEnabled:false,
    surprise:smooth(age/.18),gazeX:0,gazeY:0};
}

// One shared burst crosses the unfolded surfaces, then lands on the exact idle
// particles. Radius changes replace opacity, so overlapping outlines still merge.
export function sampleResetBurst(targets,origin,gesture,now,station,width,height){
  const p=clamp((now-gesture.startedAt)/gesture.duration),tile=resetTiles[station];
  const result={progress:p,bodyScale:1.12*(1-smooth(p/.28)),workOpacity:1-smooth(p/.3),trail:[]};
  if(!tile)return result;
  if(p>=1){
    result.trail=targets.filter(b=>b.surface===station).map(b=>({id:b.id,x:b.x,y:b.y,radius:b.radius*width*(b.alpha??1)}));
    return result;
  }
  for(const bubble of targets){
    if(bubble.ghost)continue;
    const targetTile=resetTiles[bubble.surface];if(!targetTile)continue;
    const delay=randomAt(bubble.id,1009)*.07;
    const t=clamp((p-delay)/(1-delay)),travel=1-(1-t)**3;
    const angle=randomAt(bubble.id,1013)*Math.PI*2,distance=origin.size*.32*Math.sqrt(randomAt(bubble.id,1019));
    const fromX=origin.x+Math.cos(angle)*distance,fromY=origin.y+Math.sin(angle)*distance*origin.aspect;
    const x=fromX+(targetTile[0]+bubble.x-fromX)*travel-tile[0];
    const y=fromY+(targetTile[1]+bubble.y-fromY)*travel-tile[1];
    const initialRadius=origin.size*(.09+.04*randomAt(bubble.id,1021));
    const radius=(initialRadius+(bubble.radius-initialRadius)*travel)*width;
    if(x*width+radius<0||x*width-radius>width||y*height+radius<0||y*height-radius>height)continue;
    result.trail.push({id:bubble.id,x,y,radius});
  }
  return result;
}
