import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkPresentation,exhibitionImageFrame,wrapWorkText,cleanWorkText,selectedWorkImage,projectionPromptLayout,projectionPromptOpacity,projectionPromptBubble,drawProjectionPrompt,projectionListeningLayout,drawProjectionListening} from '../mascot/work-presentation.js';
import {normalizeProjectionText,defaultProjectionText} from '../mascot/projection-text.js';
const work={id:'one',title:'Vztah obrazu a prostoru',author:'Jana Nováková',year:'2025/2026',grade:'A+',description:'Autorský projekt zkoumá obraz a prostor. '.repeat(15)};
function context(clientWidth=1280){
 const texts=[],images=[];return {canvas:{clientWidth},texts,images,globalAlpha:1,
  measureText(text){return {width:text.length*parseFloat(this.font.match(/[\d.]+px/)[0])*.53};},
  save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},arc(){},fill(){},stroke(){},moveTo(){},lineTo(){},
  fillText(text,x,y){texts.push({text,x,y,font:this.font,color:this.fillStyle});},drawImage(...args){images.push(args);}};
}
test('the static prompt prefix is white on the first line and the changing topic stays green',()=>{
 const ctx=context();drawProjectionPrompt(ctx,1180,640,1000);
 assert.equal(ctx.texts[0].text,'Zeptej se Bublíka na naše');assert.equal(ctx.texts[0].color,'#fff');
 assert.equal(ctx.texts[1].text,'UI/UX práce');assert.equal(ctx.texts[1].color,'#cddc29');
 assert(ctx.texts[0].y<ctx.texts[1].y);
 assert.equal(projectionPromptLayout(context(),1180,640).size,640*.075);
});
test('prompt and listening positions and sizes can change independently and stay within the projection',()=>{
 const settings=normalizeProjectionText({prompt:{x:.28,y:.25,size:.05},listening:{x:.7,y:.85,size:.08}});
 const prompt=projectionPromptLayout(context(),1180,640,settings),listening=projectionListeningLayout(context(),1180,640,settings);
 assert.equal(prompt.x,1180*.28);assert.equal(prompt.y,640*.25);assert.equal(prompt.size,640*.05);
 const ctx=context();drawProjectionListening(ctx,1180,640,listening);
 assert.equal(ctx.texts[0].text,'Poslouchám');assert.equal(ctx.texts[0].x,1180*.7);assert.equal(ctx.texts[0].y,640*.85);
 for(const x of [0,1])for(const y of [0,1]){
  const edge=normalizeProjectionText({prompt:{x,y,size:.2},listening:{x,y,size:.2}});
  for(const layout of [projectionPromptLayout(context(),1180,640,edge),projectionListeningLayout(context(),1180,640,edge)]){
   assert(layout.left>=0&&layout.right<=1180);assert(layout.top>=0&&layout.bottom<=640);
  }
 }
 assert.deepEqual(normalizeProjectionText({prompt:{x:-1,y:3,size:Infinity}}),{...defaultProjectionText,prompt:{x:0,y:1,size:defaultProjectionText.prompt.size}});
});
test('idle bubbles avoid the prompt after moving it close to the edge',()=>{
 const width=1180,height=640;
 for(const point of [{x:.1,y:.1},{x:.9,y:.9},{x:.2,y:.6}]){
  const settings=normalizeProjectionText({prompt:{...point,size:.12}}),layout=projectionPromptLayout(context(),width,height,settings);
  for(let seconds=0;seconds<20;seconds+=.5)for(let id=120;id<142;id++){
   const extent=width*.022,p=projectionPromptBubble(id,seconds,layout,width,height,extent);
   assert(p.x>=extent-1e-7&&p.x<=width-extent+1e-7);assert(p.y>=extent-1e-7&&p.y<=height-extent+1e-7);
   assert(p.x+extent<=layout.left||p.x-extent>=layout.right||p.y+extent<=layout.top||p.y-extent>=layout.bottom);
  }
 }
});
test('projection prompt disappears on detection without waiting for gathered animation frames',()=>{
 const amount={from:0,to:0,at:100,duration:300};
 assert.equal(projectionPromptOpacity({fingerPresent:true,amount},0),0);
 assert.equal(projectionPromptOpacity({amount:{...amount,to:.01}},0),0);
 assert.equal(projectionPromptOpacity({fingerPresent:false,amount},0),1);
 assert.equal(projectionPromptOpacity({fingerPresent:false,amount},.1),0);
});
test('projection bubbles move around every side of the prompt without touching either text line',()=>{
 for(const [width,height] of [[1180,640],[480,260],[1600,900]]){
  const layout=projectionPromptLayout(context(),width,height),sides=new Set();
  for(let seconds=0;seconds<90;seconds+=.25)for(let id=120;id<142;id++){
   const extent=width*(.012+(id%11)*.001)*1.11;
   const p=projectionPromptBubble(id,seconds,layout,width,height,extent);
   assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert(p.x+extent<=layout.left||p.x-extent>=layout.right||p.y+extent<=layout.top||p.y-extent>=layout.bottom);
   if(p.x+extent<layout.left)sides.add('left');if(p.x-extent>layout.right)sides.add('right');
   if(p.y+extent<layout.top)sides.add('top');if(p.y-extent>layout.bottom)sides.add('bottom');
  }
  assert.equal(sides.size,4);
 }
});
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
