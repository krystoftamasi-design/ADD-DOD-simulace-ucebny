(function (root) {
  'use strict';
  var stations=[
    {id:1,type:'Mac',x:4.5,z:6},{id:2,type:'Mac',x:4.5,z:2},
    {id:3,type:'PC',x:-1.5,z:2},{id:4,type:'PC',x:-4.5,z:2},
    {id:5,type:'Mac',x:4.5,z:-2.5},{id:6,type:'PC',x:-1.5,z:-2.5},
    {id:7,type:'PC',x:-4.5,z:-2.5},{id:8,type:'Mac',x:4.5,z:-7},
    {id:9,type:'PC',x:-1.5,z:-7},{id:10,type:'PC',x:-4.5,z:-7}
  ];
  var sprites=null;
  function proximityAmount(state,now){
    if(!state.experiment||!state.proximity)return 0;
    var effect=state.proximity,t=Math.max(0,Math.min(1,(now-effect.at)/(effect.duration||1)));
    t=t*t*(3-2*t);
    return Math.max(0,Math.min(1,effect.from+(effect.to-effect.from)*t));
  }
  function fieldCount(amount){return Math.floor(192*Math.max(0,Math.min(1,amount))*Math.max(0,Math.min(1,amount)));}
  function makeSprite(faceAlpha){
    var canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    var c=canvas.getContext('2d');
    c.fillStyle='#d5f52b';c.strokeStyle='#c6e71f';c.lineWidth=2;
    c.beginPath();c.arc(64,64,61,0,Math.PI*2);c.fill();c.stroke();
    c.globalAlpha=faceAlpha;
    for(var side=-1;side<=1;side+=2){
      var x=64+side*21;c.fillStyle='#fff';c.beginPath();c.arc(x,62,17,0,Math.PI*2);c.fill();
      c.fillStyle='#080a08';c.beginPath();c.arc(x+5,57,10,0,Math.PI*2);c.fill();
    }
    return canvas;
  }
  function drawField(ctx,width,height,station,amount,now){
    var count=fieldCount(amount);if(!count)return;
    if(!sprites)sprites=[makeSprite(1),makeSprite(.24)];
    var cellW=width/16,cellH=height/12,r=Math.sqrt(cellW*cellW+cellH*cellH)*(.33+.27*amount);
    var sprite=sprites[amount>.82?1:0];
    for(var i=0;i<count;i++){
      var index=(i*73)%192,phase=index*1.71+station;
      var x=(index%16+.5+Math.sin(now*.0006+phase)*.08)*cellW;
      var y=(Math.floor(index/16)+.5+Math.cos(now*.0005+phase)*.08)*cellH;
      ctx.drawImage(sprite,x-r,y-r,r*2,r*2);
    }
  }
  function horizontalPosition(id){
    // Perspective from the visitor's default position in the classroom model.
    for(var i=0;i<stations.length;i++)if(stations[i].id===id)return (stations[i].x-1.5)/(18-stations[i].z);
    return 0;
  }
  function direction(from,to){return horizontalPosition(to)<horizontalPosition(from)?-1:1;}
  function sample(state, now) {
    var order = state.order || [], elapsed = state.playing ? Math.max(0, now - state.startAt) : state.elapsed;
    var progress = elapsed / state.stepMs, index = Math.floor(progress),slot=index%order.length;
    return {previous:order[(slot+order.length-1)%order.length],from:order[slot],to:order[(slot+1)%order.length],fraction:progress % 1,time:elapsed};
  }
  function placements(state,now,station,radius){
    if(!state.order||!state.order.length)return [];
    var frame=sample(state,now),f=frame.fraction,result=[];
    var incoming=direction(frame.previous,frame.from),outgoing=direction(frame.from,frame.to);
    var entry=incoming>0?radius:1-radius,exit=outgoing>0?1-radius:radius;
    if(station===frame.from){
      var x,y=.5,heading=outgoing;
      if(f<.84){
        var t=f/.84;
        if(incoming===outgoing){x=entry+(exit-entry)*t;}
        else{
          var control=entry<.5?1.1:-.1;
          x=(1-t)*(1-t)*entry+2*(1-t)*t*control+t*t*exit;
          heading=t<.5?incoming:outgoing;
        }
        y-=.13*Math.pow(Math.sin(t*Math.PI),2);
      }else{x=exit+outgoing*2*radius*((f-.84)/.16);}
      result.push({x:x,y:y,direction:heading,time:frame.time});
    }
    if(station===frame.to&&f>=.84){
      var handoff=(f-.84)/.16;
      result.push({x:outgoing>0?-radius+2*radius*handoff:1+radius-2*radius*handoff,y:.5,direction:outgoing,time:frame.time});
    }
    return result;
  }
  function drawBall(ctx,width,height,ball,radius){
    ctx.save();ctx.translate(ball.x*width,ball.y*height);
    ctx.fillStyle='#d5f52b';ctx.strokeStyle='#f7ffde';ctx.lineWidth=radius*.055;
    ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    var blinkTime=ball.time%3600,blink=blinkTime<180?Math.max(.08,Math.abs(blinkTime/90-1)):1;
    ctx.scale(1,blink);
    for(var side=-1;side<=1;side+=2){
      var eye=side*radius*.37;
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(eye,0,radius*.31,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#080a08';ctx.beginPath();ctx.arc(eye+ball.direction*radius*.1,-radius*.1,radius*.19,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function draw(ctx, width, height, station, state, now, label) {
    ctx.fillStyle = '#111c27';ctx.fillRect(0,0,width,height);
    if (state.mode === 'identify') {
      ctx.fillStyle = '#d5f52b';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.floor(Math.min(height * .72,width * .55)) + 'px Arial,sans-serif';
      ctx.fillText(label || ('0' + station).slice(-2),width/2,height/2);
      ctx.textAlign = 'start';ctx.textBaseline = 'alphabetic';return;
    }
    if (!state.order || !state.order.length) return;
    if(state.order.indexOf(station)>=0)drawField(ctx,width,height,station,proximityAmount(state,now),now);
    var radius=Math.min(height*.16,width*.14),balls=placements(state,now,station,radius/width);
    for(var i=0;i<balls.length;i++)drawBall(ctx,width,height,balls[i],radius);
  }
  root.DodTimeline={stations:stations,sample:sample,direction:direction,placements:placements,draw:draw,proximityAmount:proximityAmount,fieldCount:fieldCount};
}(typeof window !== 'undefined' ? window : this));
