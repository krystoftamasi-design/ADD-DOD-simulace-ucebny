import {watchModules} from './live-edit.js?v=network-r1';
import {setupProjectionTextEditor} from './projection-text-editor.js?v=text-editor-r2';
setupProjectionTextEditor();

const entries=Object.fromEntries(['mascot-canvas','guide-renderer','spawn-renderer'].map(name=>[name,new URL('./'+name+'.js',import.meta.url).href]));
Promise.all(['/room/mascot.json','/room/native-body.json'].map(async url=>{
  const response=await fetch(url);
  if(!response.ok)throw new Error('Mascot data unavailable');
  return response.json();
})).then(([character,nativeBody])=>{
  character.nativeBody=nativeBody;
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=260;
  const ctx=canvas.getContext('2d');
  const versionUrl=new URL('/api/animation-version',['8765','5173'].includes(location.port)?'http://127.0.0.1:8000':location.origin).href;
  watchModules({entries,versionUrl,async apply(modules){
    const draw=modules['mascot-canvas'].createCanvasCharacter(character);
    const guide=modules['guide-renderer'].createGuideRenderer(character);
    const spawn=modules['spawn-renderer'].createSpawnRenderer(character);
    await guide.fontsReady;
    // Catch common editing errors before replacing the active renderers.
    for(const seconds of [0,2.1,2.45,2.7,3])draw(ctx,seconds,{x:240,y:110,size:200,...modules['mascot-canvas'].thinkingExpression(seconds)});
    spawn(ctx,480,260,'projector',{phase:'idle',amount:{from:0,to:0,at:0,duration:1},flow:{seconds:0,at:0}},0,{phase:'idle'});
    guide.draw(ctx,480,260,'projector',{phase:'thinking',thinkingAt:0},2500);
    window.DodMascot={draw(ctx,width,height,ball,radius){draw(ctx,ball.time/1000,{x:ball.x*width,y:ball.y*height,size:radius*2});}};
    window.DodGuide=guide;window.DodSpawn={draw:spawn};
    document.documentElement.dataset.mascot='original';
    window.dispatchEvent(new Event('dod-guide-ready'));
  },onStatus({revision,error}){
    document.documentElement.dataset.animationRevision=String(revision);
    document.documentElement.dataset.animationError=error?.message||'';
    if(error)console.warn('Úprava animace se nepoužila; běží poslední funkční verze.',error);
  }});
}).catch(error=>console.error(error));
