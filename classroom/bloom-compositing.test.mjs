import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createCanvasCharacter,thinkingExpression} from '../mascot/mascot-canvas.js';
import {createSpawnRenderer} from '../mascot/spawn-renderer.js';
import {randomAt} from '../mascot/procedural-body.js';
import {screenTiles} from '../mascot/bubble-flight.js';
import {createSpawnModel,gatherAt} from '../mascot/spawn-model.js';
import {sampleResetHold,sampleResetBurst,resetTiles} from '../mascot/reset-model.js';
import {createWorkPresentation,exhibitionImageFrame,loadWorkFonts,selectedWorkImage,drawProjectionPrompt,projectionPromptOpacity,drawProjectionListening} from '../mascot/work-presentation.js';
const character=JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url),'utf8'));
class Context {
 constructor(){this.ops=[];this.ellipses=[];this.stack=[];this.globalAlpha=1;this.globalCompositeOperation='source-over';}
 save(){this.stack.push({globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle});}
 restore(){Object.assign(this,this.stack.pop());}
 translate(){} rotate(){} scale(){} beginPath(){} arc(){} rect(){} ellipse(...args){this.ellipses.push(args);} clip(){} clearRect(){}
 record(kind,color){this.ops.push({kind,color,alpha:this.globalAlpha});}
 fill(){this.record('fill',this.fillStyle);} stroke(){this.record('stroke',this.strokeStyle);}
 fillRect(){this.record('rect',this.fillStyle);} fillText(){this.record('text',this.fillStyle);}
 drawImage(){this.record('image');}
 measureText(text){return {width:text.length*8};}
}
function renderer(){
 const layers=[],poses=[];
 const capture=character=>{const draw=createCanvasCharacter(character);return (ctx,time,pose)=>{poses.push(pose);draw(ctx,time,pose);};};
 const scope={URL,location:{port:'8765',origin:'http://127.0.0.1:8765'},createCanvasCharacter:capture,thinkingExpression,randomAt,screenTiles,createSpawnModel,gatherAt,sampleResetHold,sampleResetBurst,resetTiles,createWorkPresentation,exhibitionImageFrame,loadWorkFonts,selectedWorkImage,drawProjectionPrompt,projectionPromptOpacity,drawProjectionListening,
   Image:class {complete=true;naturalWidth=1600;naturalHeight=900;set src(value){this.onload?.();}},
   document:{createElement(){const ctx=new Context();layers.push(ctx);return {getContext:()=>ctx};}}};
 vm.runInNewContext(readFileSync(new URL('./guide-renderer.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('export function','function'),scope);
 return {draw:scope.createGuideRenderer(character).draw,layers,poses};
}
test('original body and popcorn share an opaque silhouette, with no white rim painted over green',()=>{
 const {draw}=renderer(),ctx=new Context();
 draw(ctx,1180,640,'projector',{phase:'thinking',thinkingAt:0},850,{enabled:true});
 const visible=ctx.ops.filter(op=>op.alpha>0);
 const green=visible.findIndex(op=>op.color===character.palette.body);
 assert(green>0);assert(visible.slice(0,green).some(op=>op.color===character.palette.outline));
 assert(!visible.slice(green).some(op=>op.color===character.palette.outline));
 assert(visible.every(op=>op.alpha===1));
});
test('reveal shrinks all circles together quickly and keeps them opaque',()=>{
 const {draw,layers}=renderer();
 const guide={phase:'presenting',thinkingAt:0,revealAt:6500,assignments:[]};
 const early=new Context(),late=new Context(),gone=new Context();
 draw(early,1000,600,2,guide,6600,{enabled:true});
 draw(late,1000,600,2,guide,6850,{enabled:true});
 draw(gone,1000,600,2,guide,6900,{enabled:true});
 assert(early.ellipses.length>0);assert.equal(early.ellipses.length,late.ellipses.length);
 for(let i=0;i<early.ellipses.length;i++)assert(late.ellipses[i][2]<early.ellipses[i][2]*.1);
 assert.equal(gone.ellipses.length,0);assert.equal(layers.length,0);
 assert([...early.ops,...late.ops].every(op=>op.alpha===1));
});
test('spawn transfer shrinks disappearing bubbles instead of making their fills translucent',()=>{
 const ctx=new Context();createSpawnRenderer(character)(ctx,1000,600,2,{phase:'gathering',amount:{from:.06,to:.06,at:0,duration:1},flow:{seconds:0,at:0}},1000,null);
 assert(ctx.ops.some(op=>op.color===character.palette.body));
 assert(ctx.ops.filter(op=>op.alpha>0).every(op=>op.alpha===1));
});
test('projection contraction retains the original body and face until takeoff',()=>{
 const {draw,poses}=renderer(),guide={phase:'presenting',thinkingAt:0,revealAt:6500,assignments:[]};
 for(const time of [6500,6800,7200,7449,7450,7750]){
  poses.length=0;const ctx=new Context();draw(ctx,1000,600,'projector',guide,time,{enabled:true});
  const bodies=poses.filter(p=>p.bodyAlpha!==0&&p.eyesAlpha!==0||p.bodyPass==='fill');
  assert(bodies.length>0);assert(bodies.every(p=>p.size===460));
  assert(poses.some(p=>p.eyesAlpha!==0&&p.closed===false));
  assert(ctx.ops.filter(op=>op.alpha>0).every(op=>op.alpha===1));
 }
});
test('previous work remains painted during recording and transcription, then gives way to thinking',()=>{
 const {draw}=renderer(),project={id:'old',title:'Old work',images:[{url:'/old'}]};
 const source={phase:'presenting',session:31,revealAt:0,projects:[project],assignments:[{station:2,project}]};
 for(const phase of ['listening','finishing','transcribing']){
  const ctx=new Context();draw(ctx,1600,900,2,{phase,session:32,recall:{source,startedAt:10000}},13500,{enabled:true});
  assert.equal(ctx.ops.filter(op=>op.kind==='image').length,1,phase);
 }
 const ctx=new Context();draw(ctx,1600,900,2,{phase:'thinking',thinkingAt:14000,recall:null},14200,{enabled:true});
 assert.equal(ctx.ops.filter(op=>op.kind==='image').length,0);
});
