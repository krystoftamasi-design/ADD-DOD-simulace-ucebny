import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkPresentation,exhibitionImageFrame,wrapWorkText,cleanWorkText,selectedWorkImage} from '../mascot/work-presentation.js';
const work={id:'one',title:'Vztah obrazu a prostoru',author:'Jana Nováková',year:'2025/2026',grade:'A+',description:'Autorský projekt zkoumá obraz a prostor. '.repeat(15)};
function context(clientWidth=1280){
 const texts=[],images=[];return {canvas:{clientWidth},texts,images,globalAlpha:1,
  measureText(text){return {width:text.length*parseFloat(this.font.match(/[\d.]+px/)[0])*.53};},
  save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},arc(){},fill(){},stroke(){},moveTo(){},lineTo(){},
  fillText(text,x,y){texts.push({text,x,y,font:this.font});},drawImage(...args){images.push(args);}};
}
test('exhibition fills the hero area without cropping and reserves the bottom credits',()=>{
 for(const [width,height,iw,ih] of [[1600,900,2000,800],[1280,1024,600,1800],[900,1600,1800,600]]){
  const frame=exhibitionImageFrame(width,height,iw,ih);
  assert(Math.abs(frame.width/frame.height-iw/ih)<1e-8);assert(frame.x>=0&&frame.y>=0);
  assert(frame.x+frame.width<=width+1e-7);assert(frame.y+frame.height<=frame.heroHeight+1e-7);assert(frame.heroHeight<height);
  const normalized=exhibitionImageFrame(width/height,1,iw,ih);assert(Math.abs(frame.y/height-normalized.y)<1e-8);
 }
});
test('current exhibition has Neue Machina credits on the left and two description columns on the right',()=>{
 const ctx=context(),renderer=createWorkPresentation(),img={complete:true,naturalWidth:1800,naturalHeight:1200};
 const view=renderer.draw(ctx,1600,900,work,img,2);
 assert.equal(view.columns,2);assert(ctx.texts.some(t=>t.text===work.author&&/NeueMachina/.test(t.font)));
 assert(ctx.texts.some(t=>t.text===work.year));assert(!ctx.texts.some(t=>t.text===work.grade));
 assert(ctx.texts.some(t=>t.x>view.w*.5&&/Arial/.test(t.font)));
 assert(ctx.images[0][2]>=0);assert(view.image.heroHeight<900);assert(view.previous.x<view.next.x);
});
test('small screens and long unbroken words wrap inside bounded credit columns',()=>{
 const ctx=context(375),view=createWorkPresentation().layout(ctx,750,1334,{...work,title:'A'.repeat(120)},600,1800);
 assert.equal(view.columns,1);assert(view.credit<view.h*.53);assert(view.title.length>1);
 const lines=wrapWorkText('aaaaa aaaa\nDlouhýNázevPráce',6,text=>text.length);
 assert(lines.every(line=>line.length<=6));assert.equal(lines.join('').replaceAll(' ',''),'aaaaaaaaaDlouhýNázevPráce');
 assert.equal(cleanWorkText('<p>Ahoj</p><p>světe<br>znovu</p>'),'Ahoj\n\nsvěte\nznovu');
});
test('gallery ignores hidden photos and a prior selection belonging to another work',()=>{
 const project={id:'a',images:[{url:'/a'},{url:'/hidden',hidden:true},{url:'/b'}]};
 assert.deepEqual(selectedWorkImage(project,{project:'a',index:1}),{images:[{url:'/a'},{url:'/b'}],index:1});
 assert.equal(selectedWorkImage(project,{project:'old',index:1}).index,0);
});
test('wheel over credits scrolls long text and leaves the hero controls alone',()=>{
 const ctx=context(),renderer=createWorkPresentation(),view=renderer.layout(ctx,1600,900,{...work,description:work.description.repeat(8)},1800,1200);
 assert.equal(renderer.scroll(view,1400,100,100),false);
 assert(renderer.scroll(view,1400,880,100));assert(view.descriptionScroll>0);
 renderer.scroll(view,1400,880,-10000);assert.equal(view.descriptionScroll,0);
});
