import {randomAt} from './procedural-body.js';
import {projectionTextSettings} from './projection-text.js';

// Canvas counterpart of pruvodce/vystava.css (PR #3). All classroom surfaces
// share this layout, including the image rectangle used by the mascot's tour.
const limit=(value,min,max)=>Math.max(min,Math.min(max,value));
export const projectionTopics=['UI/UX','3D','nejlepší','webové','animované','experimentální','typografické','nejnovější'];
export function projectionPromptLayout(ctx,width,height,settings=projectionTextSettings()){
  ctx.save();
  const base=height*settings.prompt.size;
  ctx.font=`800 ${base}px NeueMachina,Arial,sans-serif`;
  const longest=Math.max(ctx.measureText('Zeptej se Bublíka na naše').width,...projectionTopics.map(topic=>ctx.measureText(`${topic} práce`).width));
  const size=base*Math.min(1,width*.88/longest),lineHeight=size*1.45;
  ctx.restore();
  const textWidth=longest*size/base,padding=Math.min(width,height)*.04,halfHeight=lineHeight*.5+size*.65;
  const x=limit(width*settings.prompt.x,textWidth/2+padding,width-textWidth/2-padding);
  const y=limit(height*settings.prompt.y,halfHeight+padding,height-halfHeight-padding);
  const firstY=y-lineHeight*.5,secondY=y+lineHeight*.5;
  return {size,x,y,firstY,secondY,left:x-textWidth/2,right:x+textWidth/2,top:y-halfHeight,bottom:y+halfHeight};
}
export function projectionPromptOpacity(spawn,amount=0){
  if(spawn?.fingerPresent||spawn?.enabled!==false&&spawn?.amount?.to>0)return 0;
  const t=limit(amount/.03,0,1);
  return 1-t*t*(3-2*t);
}
export function projectionPromptBubble(id,seconds,layout,width,height,extent){
  const phase=randomAt(id,911)*Math.PI*2;
  const angle=phase+seconds*(.12+.12*randomAt(id,919))*(randomAt(id,929)<.5?-1:1)+.2*Math.sin(seconds*.19+phase);
  const cx=(layout.left+layout.right)/2,cy=(layout.top+layout.bottom)/2;
  const gap=layout.size*.15;
  const wander=.5+.4*Math.sin(seconds*.23+phase*1.7);
  for(const direction of [angle,angle+Math.PI/2,angle+Math.PI,angle+Math.PI*1.5,0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const dx=Math.cos(direction),dy=Math.sin(direction);
    const inner=Math.min(((layout.right-layout.left)/2+gap+extent)/Math.abs(dx),((layout.bottom-layout.top)/2+gap+extent)/Math.abs(dy));
    const outer=Math.min((dx>0?width-cx-extent:cx-extent)/Math.abs(dx),(dy>0?height-cy-extent:cy-extent)/Math.abs(dy));
    if(outer>=inner){const distance=inner+(outer-inner)*wander;return {x:cx+dx*distance,y:cy+dy*distance};}
  }
  return {x:extent,y:extent};
}
export function drawProjectionPrompt(ctx,width,height,now,opacity=1,layout){
  if(opacity<=0)return;
  const period=6000,elapsed=((now%period)+period)%period;
  const index=((Math.floor(now/period)%projectionTopics.length)+projectionTopics.length)%projectionTopics.length;
  const fade=limit(Math.min(elapsed,period-elapsed)/240,0,1);
  const {size,x,firstY,secondY}=layout||projectionPromptLayout(ctx,width,height);
  ctx.save();ctx.globalAlpha*=opacity;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`800 ${size}px NeueMachina,Arial,sans-serif`;
  ctx.fillStyle='#fff';ctx.fillText('Zeptej se Bublíka na naše',x,firstY);
  ctx.globalAlpha*=fade*fade*(3-2*fade);
  ctx.fillStyle='#cddc29';ctx.fillText(`${projectionTopics[index]} práce`,x,secondY);
  ctx.restore();
}
export function projectionListeningLayout(ctx,width,height,settings=projectionTextSettings()){
  ctx.save();
  const base=height*settings.listening.size;
  ctx.font=`800 ${base}px NeueMachina,Arial,sans-serif`;
  const measured=ctx.measureText('Poslouchám').width,size=base*Math.min(1,width*.88/measured),textWidth=measured*size/base,padding=Math.min(width,height)*.04;
  const x=limit(width*settings.listening.x,textWidth/2+padding,width-textWidth/2-padding);
  const y=limit(height*settings.listening.y,size+padding,height-padding);
  ctx.restore();return {size,x,y,left:x-textWidth/2,right:x+textWidth/2,top:y-size,bottom:y};
}
export function drawProjectionListening(ctx,width,height,layout=projectionListeningLayout(ctx,width,height)){
  ctx.save();
  const {size,x,y}=layout;
  ctx.font=`800 ${size}px NeueMachina,Arial,sans-serif`;
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='bottom';
  // Flick's upper edge is at 66% of the projected surface height.
  ctx.fillText('Poslouchám',x,y);
  ctx.restore();
}
export function cleanWorkText(value){
  return typeof value==='string'?value.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div|li|h[1-6])\s*>/gi,'\n\n')
    .replace(/<[^>]*>/g,'').replace(/[\t\f\v ]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim():'';
}
export function visibleWorkImages(work){return (work?.images||[]).filter(image=>!image.hidden&&typeof image.url==='string');}
export function selectedWorkImage(work,selection){
  const images=visibleWorkImages(work),index=selection?.project===work.id?selection.index:0;
  return {images,index:images.length?((index||0)%images.length+images.length)%images.length:0};
}
export function exhibitionImageFrame(width,height,imageWidth,imageHeight,creditHeight=146/1280*width){
  const available=Math.max(1e-6,height-creditHeight),scale=Math.min(width/imageWidth,available/imageHeight);
  const w=imageWidth*scale,h=imageHeight*scale;
  return {x:(width-w)/2,y:(available-h)/2,width:w,height:h,heroHeight:available};
}
export function wrapWorkText(text,maxWidth,measure){
  const result=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      if(line&&measure(line+' '+word)<=maxWidth){line+=' '+word;continue;}
      if(line){result.push(line);line='';}
      if(measure(word)<=maxWidth){line=word;continue;}
      for(const char of word){
        if(line&&measure(line+char)>maxWidth){result.push(line);line=char;}else line+=char;
      }
    }
    result.push(line);
  }
  return result;
}
export function loadWorkFonts(){
  if(typeof document==='undefined'||typeof FontFace==='undefined')return Promise.resolve();
  if(window.DodWorkFonts)return window.DodWorkFonts;
  const origin=['8765','5173'].includes(location.port)?'http://127.0.0.1:8000/':location.origin+'/';
  const directory=location.port==='8878'?'fonts/':'room/fonts/';
  window.DodWorkFonts=Promise.all([['Regular',400],['Ultrabold',800]].map(async([name,weight])=>{
    const font=new FontFace('NeueMachina',`url("${origin+directory}PPNeueMachina-Plain${name}.otf")`,{weight:String(weight)});
    document.fonts.add(await font.load());
  })).catch(error=>{console.warn('Písmo výstavy se nepodařilo načíst.',error);});
  return window.DodWorkFonts;
}
export function createWorkPresentation(){
  const cache=new Map();
  function layout(ctx,width,height,work,imageWidth,imageHeight){
    const viewport=ctx.canvas?.clientWidth||1280,ratio=width/viewport,w=viewport,h=height/ratio;
    const key=JSON.stringify([width,height,viewport,work.id,work.title,work.author,work.year,work.description,imageWidth,imageHeight]);
    if(cache.has(key))return cache.get(key);
    const mobile=w<=700,compact=h<=500&&!mobile;
    const contentWidth=Math.min(w,1700),padding=mobile?limit(w*.06,28,42):limit(w*.04,32,64);
    const gap=mobile?limit(w*.05,20,36):limit(w*.04,28,64),left=(w-contentWidth)/2+padding;
    const inner=contentWidth-padding*2-gap,headingWidth=inner*(mobile?.45:.5),descriptionWidth=inner-headingWidth;
    const titleSize=mobile?limit(w*.035,15,19):limit(w*.0165,18,26);
    const authorSize=mobile?limit(w*.028,12,15):limit(w*.012,13,19);
    const yearSize=mobile?10:limit(w*.009,11,14),descriptionSize=mobile?limit(w*.026,12,14):limit(w*.0102,13,16);
    const maxText=Math.max(mobile?92:compact?72:98,h*(mobile?.17:.22));
    function lines(value,size,weight,maxWidth,family='NeueMachina'){
      ctx.font=`${weight} ${size}px ${family},Arial,sans-serif`;
      return wrapWorkText(cleanWorkText(value),maxWidth,text=>ctx.measureText(text).width);
    }
    const title=lines(work.title||'Bez názvu',titleSize,800,headingWidth),author=lines(work.author||'Autor neuveden',authorSize,400,headingWidth);
    const year=lines(work.year||'Rok neuveden',yearSize,400,headingWidth);
    const columns=mobile?1:2,columnGap=descriptionSize*2.2,columnWidth=(descriptionWidth-columnGap*(columns-1))/columns;
    const description=lines(work.description||'',descriptionSize,400,columnWidth,'Arial');
    const headingHeight=title.length*titleSize*1.15+author.length*authorSize*1.3+year.length*yearSize*1.45+10;
    const descriptionHeight=work.description?Math.ceil(description.length/columns)*descriptionSize*1.5:0;
    const top=mobile?18:compact?12:24,bottom=mobile?20:compact?14:27;
    const credit=Math.min(h*.52,Math.max(mobile?112:compact?100:146,Math.min(maxText,Math.max(headingHeight,descriptionHeight))+top+bottom));
    const image=exhibitionImageFrame(width,height,imageWidth,imageHeight,credit*ratio);
    const buttonSize=(mobile?64:76)*ratio,buttonX=limit(w*.022,8,30)*ratio;
    const data={ratio,w,h,left,headingWidth,descriptionWidth,columnWidth,columnGap,columns,maxText,credit,bottom,
      title,author,year,description,titleSize,authorSize,yearSize,descriptionSize,headingHeight,descriptionHeight,image,headingScroll:0,descriptionScroll:0,
      previous:{x:buttonX+buttonSize/2,y:image.heroHeight/2,r:buttonSize/2},
      next:{x:width-buttonX-buttonSize/2,y:image.heroHeight/2,r:buttonSize/2}};
    if(cache.size>32)cache.clear();cache.set(key,data);return data;
  }
  function text(ctx,lines,x,y,size,weight,lineHeight,color,family='NeueMachina'){
    ctx.font=`${weight} ${size}px ${family},Arial,sans-serif`;ctx.fillStyle=color;
    for(const line of lines){ctx.fillText(line,x,y);y+=lineHeight;}
    return y;
  }
  function draw(ctx,width,height,work,img,photoCount,opacity=1){
    const view=layout(ctx,width,height,work,img?.naturalWidth||16,img?.naturalHeight||9),r=view.ratio;
    ctx.save();ctx.globalAlpha*=opacity;ctx.textAlign='left';ctx.textBaseline='top';
    const frame=view.image;
    if(img?.complete&&img.naturalWidth)ctx.drawImage(img,frame.x,frame.y,frame.width,frame.height);
    else text(ctx,['Načítám práci…'],width*.42,frame.heroHeight/2,16*r,400,20*r,'#aaa79f','Arial');
    ctx.scale(r,r);
    const floor=view.h-view.bottom,headingTop=Math.max(view.h-view.credit,floor-Math.min(view.maxText,view.headingHeight));
    ctx.save();ctx.beginPath();ctx.rect(view.left,headingTop,view.headingWidth,Math.min(view.maxText,view.headingHeight));ctx.clip();
    let y=text(ctx,view.title,view.left,headingTop-view.headingScroll,view.titleSize,800,view.titleSize*1.15,'#f4f1eb')+5;
    y=text(ctx,view.author,view.left,y,view.authorSize,400,view.authorSize*1.3,'#f4f1eb')+5;
    text(ctx,view.year,view.left,y,view.yearSize,400,view.yearSize*1.45,'#aaa79f');ctx.restore();
    const rows=Math.ceil(view.description.length/view.columns),lineHeight=view.descriptionSize*1.5;
    const descTop=Math.max(view.h-view.credit,floor-Math.min(view.maxText,rows*lineHeight));
    const descX=view.left+view.headingWidth+(view.w-2*view.left-view.headingWidth-view.descriptionWidth);
    ctx.save();ctx.beginPath();ctx.rect(descX,descTop,view.descriptionWidth,view.maxText);ctx.clip();
    for(let col=0;col<view.columns;col++)text(ctx,view.description.slice(col*rows,(col+1)*rows),descX+col*(view.columnWidth+view.columnGap),descTop-view.descriptionScroll,
      view.descriptionSize,400,lineHeight,'#dedbd3','Arial');
    ctx.restore();ctx.restore();
    if(photoCount>1){
      ctx.save();ctx.globalAlpha*=opacity;
      for(const [direction,button] of [[-1,view.previous],[1,view.next]]){
        ctx.fillStyle='#cedd24';ctx.strokeStyle='#fff';ctx.lineWidth=4*r;
        ctx.beginPath();ctx.arc(button.x,button.y,button.r*.64,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.lineWidth=3*r;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        ctx.moveTo(button.x-direction*4*r,button.y-7*r);ctx.lineTo(button.x+direction*3*r,button.y);ctx.lineTo(button.x-direction*4*r,button.y+7*r);ctx.stroke();
      }
      ctx.restore();
    }
    return view;
  }
  return {draw,layout,scroll(view,x,y,delta){
    if(y<view.image.heroHeight)return false;
    const heading=x/view.ratio<view.left+view.headingWidth,key=heading?'headingScroll':'descriptionScroll';
    const total=heading?view.headingHeight:view.descriptionHeight;
    view[key]=limit(view[key]+delta/view.ratio,0,Math.max(0,total-view.maxText));return true;
  },clear(){cache.clear();}};
}
