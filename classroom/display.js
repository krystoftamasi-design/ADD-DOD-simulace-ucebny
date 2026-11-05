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
  function resize(){var ratio=Math.min(window.devicePixelRatio||1,1.5),size=window.DodProjectionSize;canvas.width=Math.max(1,Math.round((size?size.width:innerWidth)*ratio));canvas.height=Math.max(1,Math.round((size?size.height:innerHeight)*ratio));}
  resize();window.addEventListener('resize',resize);window.addEventListener('dod-projection-resize',resize);
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

(function(){
  'use strict';
  if(location.pathname!=='/projector')return;
  document.body.classList.add('projector');
  var canvas=document.getElementById('stage'), bar=document.createElement('div');
  var defaults=[[0,0],[1,0],[1,1],[0,1]], points;
  var key='dod-projector-perspective-v1';
  function valid(p){
    if(!Array.isArray(p)||p.length!==4||!p.every(function(q){return Array.isArray(q)&&q.length===2&&q.every(function(n){return typeof n==='number'&&isFinite(n)&&n>=0&&n<=1;});}))return false;
    return p.every(function(a,i){var b=p[(i+1)%4],c=p[(i+2)%4];return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>0.0001;});
  }
  try{points=JSON.parse(localStorage.getItem(key));}catch(e){}
  if(!valid(points))points=defaults.map(function(p){return p.slice();});
  bar.id='calibration-bar';
  bar.innerHTML='<button type="button" id="calibrate">Nastavit perspektivu</button><span id="calibration-actions" hidden><span>Tažením bodů nastav rohy projekce</span><button type="button" id="calibration-reset">Obnovit</button><button type="button" id="calibration-done">Hotovo</button></span>';
  document.body.appendChild(bar);
  var handles=points.map(function(p,i){var b=document.createElement('button');b.type='button';b.className='calibration-point';b.hidden=true;b.setAttribute('aria-label',['Levý horní roh','Pravý horní roh','Pravý dolní roh','Levý dolní roh'][i]);document.body.appendChild(b);return b;});
  var editing=false;
  function render(){
    var w=innerWidth,h=innerHeight,p=points.map(function(v){return [v[0]*w,v[1]*h];});
    function distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
    window.DodProjectionSize={width:(distance(p[0],p[1])+distance(p[3],p[2]))/2,height:(distance(p[0],p[3])+distance(p[1],p[2]))/2};
    window.dispatchEvent(new Event('dod-projection-resize'));
    var dx1=p[1][0]-p[2][0],dx2=p[3][0]-p[2][0],dx3=p[0][0]-p[1][0]+p[2][0]-p[3][0];
    var dy1=p[1][1]-p[2][1],dy2=p[3][1]-p[2][1],dy3=p[0][1]-p[1][1]+p[2][1]-p[3][1];
    var den=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/den,k=(dx1*dy3-dx3*dy1)/den;
    var a=p[1][0]-p[0][0]+g*p[1][0],b=p[3][0]-p[0][0]+k*p[3][0];
    var c=p[1][1]-p[0][1]+g*p[1][1],d=p[3][1]-p[0][1]+k*p[3][1];
    canvas.style.transform='matrix3d('+[a/w,c/w,0,g/w,b/h,d/h,0,k/h,0,0,1,0,p[0][0],p[0][1],0,1].join(',')+')';
    handles.forEach(function(el,i){el.style.left=(points[i][0]*100)+'%';el.style.top=(points[i][1]*100)+'%';});
  }
  function setEditing(value){editing=value;handles.forEach(function(el){el.hidden=!value;});document.getElementById('calibrate').hidden=value;document.getElementById('calibration-actions').hidden=!value;bar.classList.toggle('editing',value);document.body.classList.toggle('calibrating',value);}
  handles.forEach(function(el,i){
    el.addEventListener('pointerdown',function(e){e.preventDefault();el.setPointerCapture(e.pointerId);});
    el.addEventListener('pointermove',function(e){if(!el.hasPointerCapture(e.pointerId))return;var next=points.map(function(p){return p.slice();});next[i]=[Math.max(0,Math.min(1,e.clientX/innerWidth)),Math.max(0,Math.min(1,e.clientY/innerHeight))];if(valid(next)){points=next;render();try{localStorage.setItem(key,JSON.stringify(points));}catch(ignore){}}});
  });
  document.addEventListener('keydown',function(e){if(e.key.toLowerCase()!=='b'||e.altKey||e.ctrlKey||e.metaKey||e.repeat||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target&&e.target.tagName||''))return;e.preventDefault();setEditing(!editing);});
  document.getElementById('calibrate').onclick=function(){setEditing(true);};
  document.getElementById('calibration-done').onclick=function(){setEditing(false);};
  document.getElementById('calibration-reset').onclick=function(){points=defaults.map(function(p){return p.slice();});try{localStorage.removeItem(key);}catch(ignore){}render();};
  window.addEventListener('resize',render);render();
  var timer;function show(){bar.classList.add('visible');clearTimeout(timer);timer=setTimeout(function(){if(!editing)bar.classList.remove('visible');},4000);}document.addEventListener('mousemove',show);document.addEventListener('touchstart',show);show();
}());
