import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {screenTiles} from '../mascot/bubble-flight.js';
const scope={screenTiles};
vm.runInNewContext(readFileSync(new URL('./guide-renderer.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function')+';this.kernels=bloomKernels;this.scale=popcornScale;this.sample=sampleBloomKernel;this.motion=popcornMotion;this.particle=sampleBloomParticle;this.collapse=collapseMotion;',scope);
const near=(items,x,y)=>items.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b);
test('projection blooms radially from the fixed face, not in horizontal strips',()=>{
 const k=scope.kernels('projector',2.95/1.6);
 assert(near(k,.5,.42).born<near(k,.03,.42).born);
 assert(near(k,.5,.42).born<near(k,.5,.98).born);
});
test('the perimeter enters monitors from below and reaches successive rows later',()=>{
 for(const id of [2,6,9]){
  const k=scope.kernels(id,16/9).filter(p=>!p.bridge);
  assert(near(k,.5,.98).born<near(k,.5,.02).born);
 }
 const bottom=id=>near(scope.kernels(id,16/9).filter(p=>!p.bridge),.5,.98).born;
 assert(bottom(2)<bottom(6));assert(bottom(6)<bottom(9));
});
test('kernels pop with an overshoot, settle, and fully cover screens before the six-second reveal',()=>{
 assert.equal(scope.scale(0),0);assert(scope.scale(.12)>1.4);assert.equal(scope.scale(1),1);
 for(const id of ['projector',2,6,9]){
  const k=scope.kernels(id,16/9);
  assert(k.every(p=>p.born+1.05<6));
  for(let x=0;x<=1;x+=.04)for(let y=0;y<=1;y+=.04){
   assert(k.some(p=>Math.hypot(p.x-x,(p.y-y)/(16/9))<=p.r),`${id}: gap at ${x},${y}`);
  }
 }
});


test('bloom kernels keep independent continuous motion and irregular sizes after expansion',()=>{
 const kernels=scope.kernels(6,16/9);
 assert(new Set(kernels.map(k=>k.r)).size>10);
 const k=kernels[15],a=scope.sample(k,10),b=scope.sample(k,10.02);
 assert(Math.hypot(a.x-b.x,a.y-b.y)>0);
 assert(Math.hypot(a.x-b.x,a.y-b.y)<.01);
 assert.deepEqual(scope.sample(k,10),a);
 assert.notEqual(scope.sample(kernels[16],10).x-kernels[16].x,a.x-k.x);
});


test('later popcorn kernels are larger and the wave accelerates between rows',()=>{
 const front=near(scope.kernels(2,16/9),.5,.98);
 const middle=near(scope.kernels(6,16/9),.5,.98);
 const back=near(scope.kernels(9,16/9),.5,.98);
 assert(back.r>front.r*1.3);
 const average=id=>{const k=scope.kernels(id,16/9).filter(p=>!p.bridge&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);return k.reduce((sum,p)=>sum+p.born,0)/k.length;};
 assert(average(9)-average(6)<average(6)-average(2));
 assert(back.born<3.5);
 const projection=scope.kernels('projector',16/9);
 assert(near(projection,.95,.42).r>near(projection,.5,.42).r);
});


test('each pop has a recoil, squash and outward hop, then settles without drifting',()=>{
 assert(scope.scale(.29)<1);assert(scope.scale(.45)>1);assert.equal(scope.scale(.7),1);
 for(const phase of [0,1,3,10]){
  const burst=scope.motion(.14,phase);
  assert(burst.hop>0);assert.notEqual(burst.sx,1);assert(burst.sy>0);
  const settled=scope.motion(1,phase);
  assert.equal(settled.pop,1);assert.equal(settled.sx,1);assert.equal(settled.sy,1);
  assert(settled.hop<1e-10);
  for(let t=0;t<.8;t+=.005){const m=scope.motion(t,phase);assert(m.pop>=0&&m.pop<=1.5);assert(m.sx>0&&m.sy>0);}
 }
 assert.notDeepEqual(scope.motion(.14,0),scope.motion(.14,1));
});


test('detached pops start away from the body and grow back into the wave',()=>{
 const k=near(scope.kernels('projector',16/9).filter(p=>!p.bridge),.8,.42);
 const born=scope.particle(k,k.born+.12,10,'projector');
 const settled=scope.particle(k,k.born+1.1,10,'projector');
 const base=scope.sample(k,10);
 assert(Math.hypot(born.x-base.x,(born.y-base.y)/k.aspect)>.10);
 assert(born.r<settled.r*.5);
 assert(Math.hypot(settled.x-base.x,settled.y-base.y)<1e-10);
});
test('sparse initial kernels have visible gaps before the delayed fill arrives',()=>{
 const kernels=scope.kernels('projector',16/9);
 const first=kernels.filter(k=>!k.bridge),bridges=kernels.filter(k=>k.bridge);
 assert(first.length<kernels.length*.4);assert(bridges.length>first.length);
 const age=.65;
 const live=kernels.map(k=>scope.particle(k,age,age,'projector')).filter(p=>p.pop>0&&p.x>0&&p.x<1&&p.y>0&&p.y<1);
 assert(live.some(p=>live.every(q=>q===p||Math.hypot(p.x-q.x,(p.y-q.y)/(16/9))>p.r*p.pop+q.r*q.pop)), 'at least one pop is separated from neighbouring bubbles');
});


test('the shared exit is a quick reverse pop with a small anticipation and no size jumps',()=>{
 assert.equal(scope.collapse(0).pop,1);assert(scope.collapse(.15).pop>1);assert.equal(scope.collapse(1).pop,0);
 for(let p=0;p<1;p+=.002){
  const a=scope.collapse(p),b=scope.collapse(p+.002);
  assert(a.pop>=0&&a.pop<=1.13);assert(a.sx>0&&a.sy>0);assert(Math.abs(a.pop-b.pop)<.01);
 }
});
