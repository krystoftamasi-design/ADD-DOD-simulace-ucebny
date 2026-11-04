import {sampleScene,demoWorks,transitionWindow} from './animation-scenes.js?v=simulator-r3';
import {createCanvasCharacter} from './mascot-canvas.js?v=native-shape-1';
import {createSpawnRenderer} from './spawn-renderer.js?v=native-shape-1';
import {createGuideRenderer,createWorkTour} from './guide-renderer.js?v=native-shape-1';
import './timeline.js';

export function createSceneRenderer(character){
  const mascot=createCanvasCharacter(character),spawn=createSpawnRenderer(character),guide=createGuideRenderer(character);
  const timeline=window.DodTimeline,surfaces=new Map();
  const transitionTour=createWorkTour(sampleScene('left-right',0).state.guide);
  const transitions=Object.fromEntries(['left-right','right-left'].map(id=>[id,transitionWindow(transitionTour,id)]));
  window.DodMascot={draw(ctx,width,height,ball,radius){mascot(ctx,ball.time/1000,{x:ball.x*width,y:ball.y*height,size:radius*2});}};
  window.DodSpawn={draw:spawn};window.DodGuide=guide;
  function surface(station,width,height,state,now){
    const key=station+':'+width+':'+height;
    if(!surfaces.has(key)){const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;surfaces.set(key,canvas);}
    const canvas=surfaces.get(key),ctx=canvas.getContext('2d');
    if(station==='projector'){
      // Same order as src/projector.js, including its transparent table surface.
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(!guide.draw(ctx,canvas.width,canvas.height,station,state.guide,now,state.spawn)&&state.spawn.enabled)
        spawn(ctx,canvas.width,canvas.height,station,state.spawn,now,state.guide);
    }else timeline.draw(ctx,canvas.width,canvas.height,station,state,now,String(station).padStart(2,'0'));
    return canvas;
  }
  function panel(ctx,x,y,w,h,station,state,now){
    ctx.fillStyle='#262d27';ctx.fillRect(x-4,y-4,w+8,h+8);
    ctx.fillStyle=station==='projector'?'#c49b61':'#000';ctx.fillRect(x,y,w,h);
    ctx.drawImage(surface(station,w,h,state,now),x,y,w,h);
    ctx.fillStyle='#98a292';ctx.font='11px system-ui';ctx.fillText(station==='projector'?'PROJEKCE':'MONITOR '+String(station).padStart(2,'0'),x,y+h+12);
  }
  function render(canvas,animation,time,bodyTime,manualSpawn){
    const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#080a09';ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale=Math.min(canvas.width/960,canvas.height/560);
    ctx.setTransform(scale,0,0,scale,(canvas.width-960*scale)/2,(canvas.height-560*scale)/2);
    const {state,now,label,surfaces:pair}=sampleScene(animation.id,time,bodyTime,manualSpawn,guide.revealDuration,transitions[animation.id]);
    ctx.fillStyle='#cddc29';ctx.font='16px system-ui';ctx.fillText(label,40,31);
    if(pair){
      for(const [i,station] of pair.entries())panel(ctx,80+i*440,160,360,202.5,station,state,now);
    }else{
      for(const [row,stations] of [[10,9,8],[7,6,5],[4,3,2]].entries())
        for(const [col,station] of stations.entries())panel(ctx,[100,300,700][col],60+row*110,160,90,station,state,now);
      panel(ctx,280,397,258,140,'projector',state,now);
      panel(ctx,700,420,160,90,1,state,now);
    }
  }
  render.ready=Promise.all([guide.fontsReady,...demoWorks.map((project,i)=>guide.prepare({assignments:[{station:i+1,project}]},i+1))]);
  return render;
}
