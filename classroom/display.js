(function(){
  'use strict';
  var canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),status=document.getElementById('status');
  var pendingImage=null;
  var preview=location.search.indexOf('preview=1')>=0;
  var previewImage=null;
  function previewGuide(guide){
    if(!guide)return guide;var copy={},key;for(key in guide)copy[key]=guide[key];
    if(guide.phase==='presenting')copy.assignments=(guide.projects||[guide.project]).filter(Boolean).slice(0,10).map(function(project,i){return {station:i+1,project:project};});
    if(previewImage&&previewImage.session===guide.session)copy.imageIndices=previewImage.indices;
    if(guide.recall){copy.recall={};for(key in guide.recall)copy.recall[key]=guide.recall[key];copy.recall.source=previewGuide(guide.recall.source);}
    if(guide.resetGesture){copy.resetGesture={};for(key in guide.resetGesture)copy.resetGesture[key]=guide.resetGesture[key];copy.resetGesture.source=previewGuide(guide.resetGesture.source);}
    return copy;
  }
  var room=new window.DodRoom({role:'display',url:(location.protocol==='https:'?'wss://':'ws://')+location.host+'/room/ws',preview:preview,surface:location.pathname==='/projector'?'projector':null,
    onChange:function(client){if(!client.connected)pendingImage=null;prepareImages(client);status.textContent=client.connected?(!client.station()?'Obrazovka '+client.label()+' · čeká na přiřazení pozice':client.state().mode==='identify'?'Obrazovka '+client.label():''):'Spojení přerušeno. Připojuji znovu…';}});
  function prepareImages(client){
    var state=client.state(),guide=state&&state.guide;
    if(!client.connected||!guide||!guide.prepared||!window.DodGuide||!window.DodGuide.prepare)return;
    var station=client.station(),assignment=(guide.assignments||[]).filter(function(item){return item.station===station;})[0];
    if(!assignment)return;
    var images=assignment.project.images||[],url=images[0]&&images[0].url||null;
    var key=JSON.stringify([guide.session,station,url]);
    if(pendingImage===key)return;
    pendingImage=key;
    window.DodGuide.prepare(guide,station).then(function(loadedUrl){
      var current=client.state(),latest=current&&current.guide;
      if(pendingImage===key&&client.connected&&latest&&latest.prepared&&latest.session===guide.session)client.imagesReady(guide.session,loadedUrl);
    }).catch(function(){if(pendingImage===key)status.textContent='Obrázek práce se nepodařilo načíst.';});
  }
  window.addEventListener('dod-guide-ready',function(){prepareImages(room);});
  var raf=window.requestAnimationFrame||window.webkitRequestAnimationFrame||function(fn){return setTimeout(function(){fn(Date.now());},33);};
  function resize(){var ratio=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);}
  resize();window.addEventListener('resize',resize);
  function paint(frame){
    var state=room.state(),serverTime=room.time();
    if(preview&&state){var copy={};for(var key in state)copy[key]=state[key];copy.order=[1];copy.guide=previewGuide(state.guide);state=copy;}
    if(state&&serverTime!==null)window.DodTimeline.draw(ctx,canvas.width,canvas.height,room.station(),state,serverTime,room.label());
    raf(paint);
  }
  raf(paint);
  function changeImage(step){
    var state=room.state(),guide=state&&state.guide;
    if(!guide||guide.phase!=='presenting'||guide.resetGesture||!room.changeImage)return;
    if(preview){
      guide=previewGuide(guide);var assignment=(guide.assignments||[])[0],work=assignment&&assignment.project;
      var images=work&&work.images.filter(function(image){return !image.hidden&&typeof image.url==='string';});if(!images||images.length<2)return;
      var current=guide.imageIndices&&guide.imageIndices[1],index=current&&current.project===work.id?current.index:0;
      previewImage={session:guide.session,indices:{1:{project:work.id,index:(index+step+images.length)%images.length}}};return;
    }
    room.changeImage(guide.session,step);
  }
  canvas.onclick=function(event){
    var state=room.state();if(!state||!window.DodGuide||!window.DodGuide.imageStepAt)return;
    var rect=canvas.getBoundingClientRect(),step=window.DodGuide.imageStepAt((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height,room.station(),preview?previewGuide(state.guide):state.guide);
    if(step)changeImage(step);
  };
  var lastWheel=0;
  canvas.onwheel=function(event){
    if(event.ctrlKey)return;var delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    var state=room.state();if(!delta||!state||!window.DodGuide||!window.DodGuide.workWheel)return;
    event.preventDefault();var rect=canvas.getBoundingClientRect();
    var step=window.DodGuide.workWheel((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height,delta,room.station(),preview?previewGuide(state.guide):state.guide);
    var now=Date.now();if(!step||now-lastWheel<380)return;lastWheel=now;changeImage(step);
  };
  document.addEventListener('keydown',function(event){
    if(event.altKey||event.ctrlKey||event.metaKey||/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target&&event.target.tagName||''))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();changeImage(event.key==='ArrowLeft'?-1:1);}
  });
  document.getElementById('fullscreen').onclick=function(){
    var el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen||el.webkitRequestFullScreen||el.mozRequestFullScreen||el.msRequestFullscreen;
    if(fn){var promise=fn.call(el);if(promise&&promise.catch)promise.catch(function(){});}
  };
  var hideTimer;
  function showButton(){var button=document.getElementById('fullscreen');button.style.display='block';clearTimeout(hideTimer);hideTimer=setTimeout(function(){button.style.display='none';},4000);}
  document.addEventListener('mousemove',showButton);document.addEventListener('touchstart',showButton);showButton();
}());
