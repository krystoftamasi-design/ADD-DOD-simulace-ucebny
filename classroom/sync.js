(function (root) {
  'use strict';
  root.DodRoom = function (options) {
    var ws, id=null, identity='?', station=null, state=null, pending={}, samples=[], sequence=0;
    var targetOffset=0,offset=null,lastFrame=null,reconnectTimer,burstTimer,pingTimer;
    var now=function(){return root.performance&&root.performance.now?root.performance.now():Date.now();};
    if(options.role==='display'){try{id=localStorage.getItem('dod-room-client');}catch(ignore){}}
    function notify(){if(options.onChange)options.onChange(api);}
    function send(message){if(ws&&ws.readyState===1)ws.send(JSON.stringify(message));}
    function ping(){var key=++sequence;pending[key]=now();send({type:'ping',id:key});if(key>50)delete pending[key-50];}
    function connect(){
      var url=options.url+'?role='+encodeURIComponent(options.role);
      if(id)url+='&id='+encodeURIComponent(id);
      if(options.preview)url+='&preview=1';
      if(options.surface==='projector')url+='&surface=projector';
      ws=new WebSocket(url);
      ws.onopen=function(){
        samples=[];pending={};offset=null;lastFrame=null;
        var count=0;ping();burstTimer=setInterval(function(){ping();if(++count>=9)clearInterval(burstTimer);},100);
        pingTimer=setInterval(ping,2000);
      };
      ws.onmessage=function(event){
        var message;try{message=JSON.parse(event.data);}catch(ignore){return;}
        if(message.type==='welcome'){
          id=message.id;identity=message.number;station=message.station;state=message.state;
          api.connected=true;
          if(options.role==='display'&&!options.preview&&options.surface!=='projector'){try{localStorage.setItem('dod-room-client',id);}catch(ignore){}}
          send({type:'viewport',width:root.innerWidth,height:root.innerHeight,visible:!document.hidden});notify();
        } else if(message.type==='state') {state=message.state;station=message.station===undefined?station:message.station;notify();
        } else if(message.type==='guide'){
          if(state)state.guide=message.guide;notify();
        } else if(message.type==='spawn'){
          if(state)state.spawn=message.spawn;notify();
        } else if(message.type==='proximity'){
          if(state){state.proximity=message.proximity;state.sensorConnected=message.sensorConnected;}
        } else if(message.type==='reload'){location.reload();
        } else if(message.type==='pong'){
          var t3=now(),t0=pending[message.id];if(t0===undefined)return;delete pending[message.id];
          var rtt=Math.max(0,t3-t0-(message.sentAt-message.receivedAt));
          samples.push({rtt:rtt,offset:((message.receivedAt-t0)+(message.sentAt-t3))/2});
          if(samples.length>25)samples.shift();
          var best=samples[0];for(var i=1;i<samples.length;i++)if(samples[i].rtt<best.rtt)best=samples[i];
          targetOffset=best.offset;if(offset===null)offset=targetOffset;
          if(samples.length===4)send({type:'ready',rtt:best.rtt});
        } else if(message.type==='roster'){api.roster=message.screens;notify();}
      };
      ws.onclose=function(){
        api.connected=false;state=null;clearInterval(burstTimer);clearInterval(pingTimer);notify();
        clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,1000);
      };
      ws.onerror=function(){};
    }
    var api={connected:false,roster:[],state:function(){return state;},station:function(){return station;},label:function(){if(station==='projector')return 'Projekce';return station?('0'+station).slice(-2):('0'+identity).slice(-2);},
      time:function(frameTime){
        var current=frameTime===undefined?now():frameTime;
        if(offset===null)return null;
        var delta=lastFrame===null?16:Math.max(0,Math.min(100,current-lastFrame));lastFrame=current;
        offset+=Math.max(-delta*.02,Math.min(delta*.02,targetOffset-offset));return current+offset;
      },
      imagesReady:function(session,url){send({type:'work-ready',session:session,url:url||null});},
      changeImage:function(session,step){send({type:'work-image',session:session,step:step});},
      command:function(action,values){var command={type:'control',action:action};for(var k in values)if(Object.prototype.hasOwnProperty.call(values,k))command[k]=values[k];send(command);}
    };
    root.addEventListener('resize',function(){send({type:'viewport',width:root.innerWidth,height:root.innerHeight,visible:!document.hidden});});
    document.addEventListener('visibilitychange',function(){send({type:'viewport',width:root.innerWidth,height:root.innerHeight,visible:!document.hidden});});
    connect();return api;
  };
}(window));
