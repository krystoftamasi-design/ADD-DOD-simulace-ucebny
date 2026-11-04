import {circleLayout, sampleCircle, noise, randomAt} from './procedural-body.js';
import {mascotBounds} from './cursor-follow.js';

export function thinkingExpression(seconds){
  const age=Math.max(0,seconds),t=Math.max(0,Math.min(1,(age-2)/.24));
  const doubleBlink =
  (age >= 2.40 && age < 2.50) ||
  (age >= 2.65 && age < 2.75);
  // Po druhém mrknutí se oči otevřou už v běžné velikosti.
  return {closed: age < 2 || doubleBlink,eyeShake:age<2?3:0,surprise:age<2.75?t*t*(3-2*t):0,blinkEnabled:false};
}

export function nativeBodyFrame(seconds,count,fps=30){
  if(count<2)return 0;
  const period=2*(count-1),frame=Math.floor(Math.max(0,seconds)*fps)%period;
  return frame<count?frame:period-frame;
}

export function createCanvasCharacter(character) {
  const {body, palette, eyes} = character;
  const layout = circleLayout(body), bounds = mascotBounds(body, 1);
  const native=character.nativeBody,paths=new Map();
  function nativePaths(seconds){
    const frame=nativeBodyFrame(seconds,native.frames.length,native.fps);
    if(!paths.has(frame))paths.set(frame,native.frames[frame].map(mask=>mask.map(shape=>{
      const translation=(shape.transform.match(/-?[\d.]+/g)||[0,0]).map(Number);
      return {path:new Path2D(shape.d),x:translation[0],y:translation[1]};
    })));
    return paths.get(frame);
  }
  const center = [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
  const extent = Math.max(bounds.width, bounds.height);
  return function drawCharacter(ctx, seconds, pose) {
    const {x, y, size, rotation = 0, alpha = 1, spread = 0, gazeX = 0, gazeY = 0, closed = false, surprise = 0, eyeShake = 0, blinkEnabled = true, bodyPass = null, bodyAlpha = 1, eyesAlpha = 1, cutoutInk = false} = pose;
    const poses = native ? null : layout.map(circle => sampleCircle(circle, seconds, body.wiggle));
    ctx.save();ctx.globalAlpha *= alpha;ctx.translate(x, y);ctx.rotate(rotation);
    ctx.scale(size / extent, size / extent);ctx.translate(-center[0], -center[1]);
    ctx.save();ctx.globalAlpha *= bodyAlpha;
    const passes=bodyAlpha<=0?[]:bodyPass==='outline'?[true]:bodyPass==='fill'?[false]:[true,false];
    if(native&&passes.length){
      const masks=nativePaths(seconds);
      for(const outline of passes){
        ctx.fillStyle=outline?palette.outline:palette.body;
        for(const shape of masks[outline?0:1]){ctx.save();ctx.translate(shape.x,shape.y);ctx.fill(shape.path);ctx.restore();}
      }
    }else{
    ctx.translate(body.position[0], body.position[1]);
    ctx.scale(body.layerScalePercent[0] / 100, body.layerScalePercent[1] / 100);
    for (const outline of passes) {
      ctx.fillStyle = outline ? palette.outline : palette.body;
      ctx.strokeStyle = palette.outline;ctx.lineWidth = body.outlineWidthBeforeLayerScale;
      poses.forEach((p, i) => {
        const angle = randomAt(i, 83) * Math.PI * 2;
        ctx.save();ctx.translate(p.x + Math.cos(angle) * spread * 170, p.y + Math.sin(angle) * spread * 170);
        ctx.rotate(p.rotation * Math.PI / 180);ctx.scale(p.scaleX, p.scaleY);
        ctx.beginPath();ctx.arc(0, 0, body.circleDiameter / 2, 0, Math.PI * 2);
        ctx.fill();if (outline) ctx.stroke();ctx.restore();
      });
    }
    }
    ctx.restore();
    ctx.globalAlpha *= eyesAlpha;
    const block = Math.floor(seconds / 6), age = seconds - (block * 6 + 1 + 3 * randomAt(block, 907));
    const blink = blinkEnabled && age >= 0 && age < .15;
    const wide=Math.max(0,Math.min(1,surprise));
    for (const [index,eye] of eyes.entries()) {
      ctx.save();ctx.translate(...eye.center);
      if (closed || blink) {
        if(cutoutInk)ctx.globalCompositeOperation='destination-out';
        ctx.fillStyle = palette.pupil;
        const rect=character.blink.closedRects[index];
        const shake=closed?Math.sin(seconds*28)*eyeShake:0;
        ctx.fillRect(rect.x-eye.center[0]+shake,rect.y-eye.center[1],rect.width,rect.height);
      } else {
        ctx.fillStyle = palette.eyeWhite;ctx.beginPath();ctx.arc(0, 0, eye.whiteRadius*(1+.28*wide), 0, Math.PI * 2);ctx.fill();ctx.clip();
        if(cutoutInk)ctx.globalCompositeOperation='destination-out';
        ctx.fillStyle = palette.pupil;ctx.beginPath();
        ctx.arc((eye.referencePupilOffset[0] + gazeX + 5 * noise(seconds * .22 + 17, 601))*(1-wide),
          (eye.referencePupilOffset[1] + gazeY)*(1-wide), eye.pupilRadius*(1-.40*wide), 0, Math.PI * 2);ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };
}
