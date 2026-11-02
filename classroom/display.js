(function(){
  'use strict';
  var canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),status=document.getElementById('status');
  var room=new window.DodRoom({role:'display',url:(location.protocol==='https:'?'wss://':'ws://')+location.host+'/room/ws',preview:location.search.indexOf('preview=1')>=0,
    onChange:function(client){status.textContent=client.connected?(client.state().mode==='identify'?'Obrazovka '+client.label():''):'Spojení přerušeno. Připojuji znovu…';}});
  var raf=window.requestAnimationFrame||window.webkitRequestAnimationFrame||function(fn){return setTimeout(function(){fn(Date.now());},33);};
  function resize(){var ratio=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);}
  resize();window.addEventListener('resize',resize);
  function paint(frame){
    var state=room.state(),serverTime=room.time();
    if(state&&serverTime!==null)window.DodTimeline.draw(ctx,canvas.width,canvas.height,room.station(),state,serverTime,room.label());
    raf(paint);
  }
  raf(paint);
  document.getElementById('fullscreen').onclick=function(){
    var el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen||el.webkitRequestFullScreen||el.mozRequestFullScreen||el.msRequestFullscreen;
    if(fn){var promise=fn.call(el);if(promise&&promise.catch)promise.catch(function(){});}
  };
  var hideTimer;
  function showButton(){var button=document.getElementById('fullscreen');button.style.display='block';clearTimeout(hideTimer);hideTimer=setTimeout(function(){button.style.display='none';},4000);}
  document.addEventListener('mousemove',showButton);document.addEventListener('touchstart',showButton);showButton();
}());
