import test from 'node:test';
import assert from 'node:assert/strict';
import {animations,categories,sampleScene,transitionWindow,followSpawn} from '../web/animation-scenes.js';
import {gatherAt,gatherMotion} from '../../mascot/spawn-model.js';
import {RESET_HOLD_MS,RESET_BURST_MS} from '../../classroom/hover-reset.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {screenTiles} from '../../mascot/bubble-flight.js';
import {randomAt} from '../../mascot/procedural-body.js';
import {exhibitionImageFrame} from '../../mascot/work-presentation.js';
const runtime={screenTiles,randomAt,exhibitionImageFrame};
vm.runInNewContext(readFileSync(new URL('../web/guide-renderer.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function'),runtime);

test('catalogue contains current classroom states with deterministic replay and finite clocks',()=>{
  assert.equal(new Set(animations.map(a=>a.id)).size,animations.length);
  assert(animations.some(a=>a.id==='reveal'));assert(animations.some(a=>a.id==='hover-reset'));
  assert(!animations.some(a=>['confused','projector-monitor'].includes(a.id)));
  for(const animation of animations){
    assert(categories.some(c=>c.id===animation.category));
    for(let t=0;t<=animation.duration;t+=.17){
      const scene=sampleScene(animation.id,t,10+t);
      assert(Number.isFinite(scene.now));assert(Number.isFinite(scene.state.startAt));
      assert(scene.state.guide.phase);assert.deepEqual(sampleScene(animation.id,t,10+t),scene);
    }
  }
});

test('transition previews use the actual work tour, including its timing and connected edges',()=>{
  for(const id of ['left-right','right-left']){
    const base=sampleScene(id,0),tour=runtime.createWorkTour(base.state.guide),range=transitionWindow(tour,id);
    const from=id==='left-right'?3:2,to=id==='left-right'?2:3;
    const leg=tour.legs.find(leg=>leg.from.station===from&&leg.to.station===to);
    assert.equal(base.state.guide.phase,'presenting');assert.equal(base.state.spawn.enabled,true);
    const actual=sampleScene(id,1,10,null,400,range);
    assert.equal(actual.now-actual.state.guide.revealAt,range.start+1000);
    let low=0,high=leg.flight;
    for(let i=0;i<30;i++){
      const mid=(low+high)/2,p=runtime.sampleWorkTour(tour,range.start+mid,from,1600,900);
      if(p&&(from===3?p.x<1:p.x>0))low=mid;else high=mid;
    }
    const age=range.start+(low+high)/2,a=runtime.sampleWorkTour(tour,age,from,1600,900),b=runtime.sampleWorkTour(tour,age,to,1600,900);
    assert(a&&b);assert(Math.abs(a.y-b.y)<1e-6);assert(a.trail.length>0&&b.trail.length>0);
    assert(Math.abs(a.x-(from===3?1:0))<1e-6);assert(Math.abs(b.x-(from===3?0:1))<1e-6);
    assert.equal(runtime.sampleWorkTour(tour,age,'projector',1600,900),null);
    const end=sampleScene(id,5,10,null,400,range);
    assert.equal(end.now-end.state.guide.revealAt,range.end);
    assert.equal(runtime.sampleWorkTour(tour,range.end,to,1600,900).phase,'perch');
  }
});

test('spawn supports hover withdrawal and a held touch without prematurely triggering thinking',()=>{
  assert.equal(sampleScene('spawn',0).state.spawn.phase,'idle');
  assert.equal(sampleScene('spawn',4).state.spawn.amount.to,1);
  assert.equal(sampleScene('spawn',9).state.spawn.phase,'idle');
  const touch=sampleScene('spawn',3,3,{amount:1,listening:true}).state;
  assert.equal(touch.spawn.phase,'listening');assert.equal(touch.guide.phase,'listening');
  const listen=sampleScene('listening',10).state;
  assert.equal(listen.spawn.amount.to,1);assert.equal(listen.guide.phase,'listening');
});

test('the gallery slider uses the same smooth finger follow as the real classroom',()=>{
  const start=sampleScene('spawn',0,0).state.spawn;
  const manual=followSpawn(start,1,false,0);
  const middle=sampleScene('spawn',.1,.1,manual).state.spawn;
  assert(gatherAt(middle,100)>0&&gatherAt(middle,100)<.5);
  const withdrawal=followSpawn(middle,0,false,100);
  const next=sampleScene('spawn',.1,.1,withdrawal).state;
  assert.deepEqual(gatherMotion(next.spawn,100),gatherMotion(middle,100));
  assert.equal(next.guide.phase,'idle');assert.equal(gatherAt(next.spawn,1600),0);
});

test('thinking, simultaneous 400 ms reveal and results use actual guide phases and assignments',()=>{
  const thinking=sampleScene('thinking',2.1,12.1);
  assert.equal(thinking.now-thinking.state.guide.thinkingAt,2100);
  for(const id of ['reveal','single-work','category-work']){
    assert.equal(sampleScene(id,0).state.guide.phase,'thinking');
    const start=sampleScene(id,.25),end=sampleScene(id,.65);
    assert.equal(start.state.guide.phase,'presenting');assert.equal(start.now-start.state.guide.revealAt,0);
    assert.equal(end.now-end.state.guide.revealAt,400);
    assert.equal(end.state.guide.assignments.length,id==='single-work'?1:10);
    assert.equal(end.state.spawn.enabled,true);assert.equal(end.state.playing,true);
  }
});

test('preview reset shows the frozen hold, the full burst, then the before-spawn field',()=>{
  const hold=sampleScene('hover-reset',1).state.guide;
  assert.equal(hold.phase,'presenting');assert.equal(hold.resetGesture.phase,'holding');
  assert.equal(hold.resetGesture.duration,RESET_HOLD_MS);
  const burst=sampleScene('hover-reset',RESET_HOLD_MS/1000).state.guide;
  assert.equal(burst.resetGesture.phase,'burst');assert.equal(burst.resetGesture.duration,RESET_BURST_MS);
  const end=sampleScene('hover-reset',(RESET_HOLD_MS+RESET_BURST_MS)/1000).state;
  assert.equal(end.guide.phase,'idle');assert.equal(end.spawn.amount.to,0);
  assert.equal(end.spawn.flow.at,1500);
});
