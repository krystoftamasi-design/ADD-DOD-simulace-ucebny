import {createSpawnModel,spawnSurfaces,gatherAt,smooth} from './spawn-model.js?v=cross-r1';
import {createCanvasCharacter,thinkingExpression} from './mascot-canvas.js?v=native-shape-1';

export function createSpawnRenderer(character) {
  const sample=createSpawnModel(character),mascot=createCanvasCharacter(character);
  return function drawSpawn(ctx,width,height,surface,spawn,now,guide) {
    const index=spawnSurfaces.indexOf(surface);if(index<0)return;
    const processing=guide&&['finishing','transcribing','thinking'].includes(guide.phase);
    if(processing)spawn={...spawn,phase:'listening',amount:{from:1,to:1,at:now,duration:1}};
    const amount=gatherAt(spawn,now),bubbles=sample(spawn,now);
    const original=character.nativeBody?smooth((amount-.65)/.35):0;
    const confused=guide?.phase==='empty',age=Math.max(0,(now-(guide?.thinkingAt??now))/1000);
    const expression=confused?{rotation:Math.sin(age*3.2)*.1-.14,gazeX:Math.sin(age*3)*30,gazeY:-10}:{};
    ctx.save();
    // No light outside the artwork: preserve the real projection surface.
    if(surface==='projector')ctx.clearRect(0,0,width,height);
    else{ctx.fillStyle='#030504';ctx.fillRect(0,0,width,height);}
    // Draw outlines first so gathered circles form one silhouette.
    for(const outline of [true,false]) {
      if(surface==='projector'&&original>0)mascot(ctx,now/1000,{x:width*.5,y:height*.42,size:width*.46*original,eyesAlpha:0,bodyPass:outline?'outline':'fill',cutoutInk:true,...expression});
      ctx.fillStyle=outline?character.palette.outline:character.palette.body;
      for(const bubble of bubbles) {
        if(bubble.surface!==surface)continue;
        const x=bubble.x*width,r=bubble.radius*width*(bubble.alpha??1)*(surface==='projector'?1-original:1);
        if(r<=0)continue;
        if(x+r<0||x-r>width)continue;
        ctx.save();ctx.translate(x,bubble.y*height);ctx.rotate(bubble.rotation);ctx.scale(bubble.sx,bubble.sy);
        ctx.beginPath();ctx.arc(0,0,r+(outline?character.body.outlineWidthBeforeLayerScale/character.body.circleDiameter*r:0),0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    if(surface==='projector') {
      const alpha=smooth((amount-.78)/.22);
      const listening=guide?guide.phase==='listening':spawn.phase==='listening';
      mascot(ctx,now/1000,{x:width*.5,y:height*.42,size:width*.46,bodyAlpha:0,eyesAlpha:alpha,cutoutInk:true,
        ...(processing?thinkingExpression(Math.max(0,(now-(guide.thinkingAt??now))/1000)):{}),gazeX:listening?-15:0,gazeY:listening?48:0,...expression});
      const reaction=guide&&['empty','error'].includes(guide.phase);
      if((listening||processing||reaction)&&alpha>0) {
        ctx.globalAlpha*=alpha;
        ctx.fillStyle=character.palette.body;ctx.textAlign='center';ctx.font=`500 ${Math.round(height*.055)}px system-ui,sans-serif`;
        ctx.fillText(reaction?guide.phase==='empty'?'Nerozumím. Zkus to znovu.':'Něco se nepovedlo. Zkus to znovu.':processing?guide.message:'Poslouchám…',width*.5,height*.89);
        if(!reaction)for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(width*(.47+i*.03),height*.95,Math.max(2,height*.004)*(1+.4*Math.sin(now*.004-i)),0,Math.PI*2);ctx.fill();}
      }
    }
    ctx.restore();
  };
}
