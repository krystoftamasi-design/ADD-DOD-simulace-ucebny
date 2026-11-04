import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFlight,screenTiles,neighbours} from '../web/bubble-flight.js';
const world=p=>({x:p.x+screenTiles[p.surface][0],y:p.y+screenTiles[p.surface][1]});

test('independent dots cross neighbouring screens without position jumps',()=>{
  for(let id=0;id<20;id++){
    let previous=sampleFlight(id,id%10+1,0),previousWorld=world(previous),crossings=0;
    for(let t=.05;t<100;t+=.05){
      const p=sampleFlight(id,id%10+1,t),w=world(p);
      assert(Math.hypot(w.x-previousWorld.x,w.y-previousWorld.y)<.03);
      if(p.surface!==previous.surface){
        const a=screenTiles[p.surface],b=screenTiles[previous.surface];
        assert.equal(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]),1);crossings++;
      }
      previous=p;previousWorld=w;
    }
    assert(crossings>=5);
  }
});
test('edge-overlap copies represent the same point on neighbouring screens',()=>{
  for(const [x,y] of [[.01,.5],[.99,.5],[.5,.01],[.5,.99]]){
    const copies=neighbours(6,x,y,.04);assert(copies.length);
    const a=world({surface:6,x,y});
    for(const copy of copies){const b=world(copy);assert(Math.abs(a.x-b.x)<1e-10);assert(Math.abs(a.y-b.y)<1e-10);}
  }
});
