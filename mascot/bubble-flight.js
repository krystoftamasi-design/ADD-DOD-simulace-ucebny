import {randomAt,noise} from './procedural-body.js';

// Unfolded screen wall, matching the classroom's rows and columns.
export const screenTiles={1:[2,3],2:[2,2],3:[1,2],4:[0,2],5:[2,1],6:[1,1],7:[0,1],8:[2,0],9:[1,0],10:[0,0]};
// Adjacent edges only. Independent starting points and directions prevent a
// common stream; the cul-de-sac at Mac 1 is entered and left in a smooth turn.
const route=[1,2,3,4,7,6,5,8,9,10,7,4,3,6,9,8,5,2];
const wrap=(value,length)=>(value%length+length)%length;
function direction(from,to){return screenTiles[to].map((n,i)=>n-screenTiles[from][i]);}
function edge(vector,across,enter=false){
  const [x,y]=vector;
  return x?[enter?(x>0?0:1):(x>0?1:0),across]:[across,enter?(y>0?0:1):(y>0?1:0)];
}
export function sampleFlight(id,home,seconds){
  const starts=route.flatMap((station,index)=>station===home?[index]:[]);
  const start=starts[Math.floor(randomAt(id,503)*starts.length)%starts.length];
  const sign=randomAt(id,509)<.5?-1:1;
  const progress=seconds*(.075+.055*randomAt(id,521))+randomAt(id,523);
  const step=Math.floor(progress),t=progress-step;
  const station=offset=>route[wrap(start+(step+offset)*sign,route.length)];
  const surface=station(0),incoming=direction(station(-1),surface),outgoing=direction(surface,station(1));
  const a=edge(incoming,.18+.64*randomAt(step,id^541),true);
  const b=edge(outgoing,.18+.64*randomAt(step+1,id^541));
  const c=a.map((n,i)=>n+incoming[i]*.42),d=b.map((n,i)=>n-outgoing[i]*.42);
  const pos=a.map((n,i)=>(1-t)**3*n+3*(1-t)**2*t*c[i]+3*(1-t)*t*t*d[i]+t**3*b[i]);
  const wobble=Math.sin(Math.PI*t)**2*.035;
  return {surface,x:pos[0]+wobble*noise(seconds*.6+id,557),y:pos[1]+wobble*noise(seconds*.7+id,563)};
}

export function neighbours(surface,x,y,radius){
  const tile=screenTiles[surface],result=[];
  for(const [id,other] of Object.entries(screenTiles)){
    const dx=other[0]-tile[0],dy=other[1]-tile[1];
    if(Math.abs(dx)+Math.abs(dy)!==1)continue;
    if(dx===-1&&x<radius||dx===1&&x>1-radius||dy===-1&&y<radius||dy===1&&y>1-radius)
      result.push({surface:Number(id),x:x-dx,y:y-dy});
  }
  return result;
}
