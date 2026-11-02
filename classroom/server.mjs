import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocket, WebSocketServer } from 'ws';
import { proximityFromSensor } from './proximity.mjs';

const addresses = Object.values(networkInterfaces()).flat().filter(item => item.family === 'IPv4' && !item.internal).map(item => item.address);
const address = process.env.DOD_ADDRESS || addresses[0] || '127.0.0.1';
const port = Number(process.env.DOD_PORT || 8000);
const hostnames = new Set([...addresses.map(ip => `${ip}:${port}`), `${address}:${port}`, `dod.local:${port}`, `127.0.0.1:${port}`, `localhost:${port}`]);
const layoutFile = new URL('./layout.json', import.meta.url);
const assets = new Map([
  ['/', ['display.html', 'text/html']],
  ['/room/display.js', ['display.js', 'text/javascript']],
  ['/room/timeline.js', ['timeline.js', 'text/javascript']],
  ['/room/sync.js', ['sync.js', 'text/javascript']],
]);
let registry = [];
try { registry = JSON.parse(await readFile(layoutFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const peers = new Map();
let state = {mode:process.env.DOD_ANIMATE==='1'?'animation':'identify', playing:process.env.DOD_ANIMATE==='1', elapsed:0, startAt:performance.now()+500, stepMs:2500, route:'all', order:[], revision:0,experiment:process.env.DOD_PROXIMITY==='1',proximity:{from:0,to:0,at:0,duration:120},sensorConnected:false};
let saveQueue = Promise.resolve();
function saveLayout() {
  const json = JSON.stringify(registry, null, 2) + '\n';
  saveQueue = saveQueue.then(async () => {await writeFile(new URL('./layout.json.tmp', import.meta.url), json);await rename(new URL('./layout.json.tmp', import.meta.url), layoutFile);});
  saveQueue.catch(error => console.error('Layout could not be saved:', error.message));
}
function send(ws, message) {if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));}
function isLocal(socket) {return socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1' || socket.remoteAddress === '::ffff:127.0.0.1';}
function screens() {
  return [...peers.values()].filter(peer => peer.role === 'display' && !peer.preview).map(peer => ({...peer.record,visible:peer.visible,width:peer.width,height:peer.height,ready:peer.ready,rtt:peer.rtt}));
}
function roster() {const message={type:'roster',screens:screens()};for(const [ws,peer] of peers)if(peer.role!=='display')send(ws,message);}
function broadcast() {
  state.revision++;
  for(const [ws,peer] of peers)send(ws,{type:'state',state,station:peer.preview?1:peer.record?.station ?? null});
  roster();
}
function updateOrder() {
  const online = new Set(screens().filter(peer => peer.visible).map(peer => peer.station).filter(Boolean));
  const expected = state.route === 'pair' ? [8,7] : [1,2,3,4,5,6,7,8,9,10];
  const order=expected.filter(station=>online.has(station));
  if(JSON.stringify(order)!==JSON.stringify(state.order)){
    state.order=order;state.elapsed=0;state.startAt=performance.now()+500;
    broadcast();
  } else roster();
}
function applyControl(command) {
  const elapsed = state.playing ? Math.max(0,performance.now()-state.startAt) : state.elapsed;
  if(command.action==='identify') {
    if(typeof command.enabled!=='boolean')throw new Error('enabled must be boolean');
    state.mode=command.enabled?'identify':'animation';
  } else if(command.action==='play') {
    state.mode='animation';state.startAt=performance.now()+500-state.elapsed;state.playing=true;
  } else if(command.action==='pause') {state.elapsed=elapsed;state.playing=false;
  } else if(command.action==='speed') {
    if(!Number.isFinite(command.value)||command.value<.5||command.value>2)throw new Error('Invalid speed');
    const progress=elapsed/state.stepMs;state.stepMs=2500/command.value;state.elapsed=progress*state.stepMs;state.startAt=performance.now()-state.elapsed;
  } else if(command.action==='route') {
    if(!['all','pair'].includes(command.value))throw new Error('Invalid route');
    state.route=command.value;updateOrder();
  } else if(command.action==='experiment') {
    if(typeof command.enabled!=='boolean')throw new Error('enabled must be boolean');
    state.experiment=command.enabled;
  } else if(command.action==='reload') {
    for(const ws of peers.keys())send(ws,{type:'reload'});
    return state;
  } else if(command.action==='mapping') {
    if(!command.mapping||typeof command.mapping!=='object'||Array.isArray(command.mapping))throw new Error('Invalid mapping');
    const next=registry.map(record=>({...record}));
    for(const [key,station] of Object.entries(command.mapping)){
      const record=next.find(item=>item.id===key||String(item.number)===key);
      if(!record||!Number.isInteger(station)||station<1||station>10)throw new Error('Unknown screen or invalid station');
      record.station=station;
    }
    const assigned=next.filter(record=>record.station).map(record=>record.station);
    if(new Set(assigned).size!==assigned.length)throw new Error('A station cannot be assigned twice');
    registry=next;
    for(const peer of peers.values())if(peer.record)peer.record=registry.find(record=>record.id===peer.record.id);
    saveLayout();updateOrder();
  } else throw new Error('Unknown action');
  broadcast();return state;
}
function allowed(req) {
  if(!hostnames.has(req.headers.host))return false;
  const origin=req.headers.origin;
  return !origin||origin===`http://${req.headers.host}`||origin==='http://127.0.0.1:8765'||origin==='http://localhost:8765';
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!allowed(req)){res.writeHead(403).end();return;}
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url.pathname==='/api/status'){
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({state,screens:screens(),registered:registry}));return;
  }
  if(url.pathname==='/api/control'&&req.method==='POST'){
    if(!isLocal(req.socket)){res.writeHead(403).end();return;}
    let body='';
    for await (const chunk of req){body+=chunk;if(body.length>8192){res.writeHead(413).end();return;}}
    try{const result=applyControl(JSON.parse(body));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}
    catch(error){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:error.message}));}
    return;
  }
  if(url.pathname==='/state'){
    try{const reply=await fetch('http://127.0.0.1:8765/state',{signal:AbortSignal.timeout(1500)});res.setHeader('Content-Type','application/json');res.end(await reply.text());}
    catch{res.writeHead(503).end();}return;
  }
  if(req.method!=='GET'||!assets.has(url.pathname)){res.writeHead(404).end();return;}
  const [file,type]=assets.get(url.pathname);
  try{res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await readFile(new URL(file,import.meta.url)));}
  catch{res.writeHead(500).end();}
});
const wss=new WebSocketServer({noServer:true,maxPayload:8192});
server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,`http://${req.headers.host}`),role=url.searchParams.get('role');
  if(!allowed(req)||url.pathname!=='/room/ws'||!['display','control','observer'].includes(role)||(role==='control'&&!isLocal(socket))){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>{
    const preview=url.searchParams.get('preview')==='1';
    let record=null;
    if(role==='display'&&!preview){
      const id=url.searchParams.get('id');
      record=registry.find(item=>item.id===id)||registry.find(item=>item.ip===socket.remoteAddress);
      if(!record){record={id:randomUUID(),number:Math.max(0,...registry.map(item=>item.number))+1,station:null,ip:socket.remoteAddress};registry.push(record);saveLayout();}
      for(const [old,peer] of peers)if(peer.record?.id===record.id){peers.delete(old);old.close(1000,'Reconnected');}
      record.ip=socket.remoteAddress;
    }
    const peer={role,preview,record,visible:true,width:0,height:0,ready:false,rtt:null,alive:true};peers.set(ws,peer);
    send(ws,{type:'welcome',id:record?.id||'preview',number:record?.number||'?',station:preview?1:record?.station??null,state});
    updateOrder();
    ws.on('error',()=>{});
    ws.on('pong',()=>{peer.alive=true;});
    ws.on('message',raw=>{
      let message;try{message=JSON.parse(raw.toString());}catch{return;}
      if(!message||typeof message!=='object')return;
      if(message.type==='ping'&&Number.isInteger(message.id)){const receivedAt=performance.now();send(ws,{type:'pong',id:message.id,receivedAt,sentAt:performance.now()});}
      else if(message.type==='viewport'){
        if(Number.isFinite(message.width)&&Number.isFinite(message.height)&&message.width>0&&message.height>0){peer.width=message.width;peer.height=message.height;peer.visible=message.visible===true;updateOrder();}
      }else if(message.type==='ready'&&Number.isFinite(message.rtt)&&message.rtt>=0){peer.ready=true;peer.rtt=message.rtt;roster();}
      else if(message.type==='control'&&role==='control'){try{applyControl(message);}catch(error){send(ws,{type:'notice',message:error.message});}}
    });
    ws.on('close',()=>{peers.delete(ws);updateOrder();});
  });
});
let proximityBusy=false;
const proximityTimer=setInterval(async()=>{
  if(proximityBusy)return;
  proximityBusy=true;
  let target=0,connected=false;
  try{
    if(state.experiment){
      const response=await fetch('http://127.0.0.1:8765/state',{signal:AbortSignal.timeout(800)});
      if(response.ok){const sensor=await response.json();target=proximityFromSensor(sensor);connected=sensor.connected===true;}
    }
    if(Math.abs(target-state.proximity.to)>.003||connected!==state.sensorConnected){
      state.proximity={from:state.proximity.to,to:target,at:performance.now(),duration:target===0?350:120};
      state.sensorConnected=connected;
      for(const ws of peers.keys())send(ws,{type:'proximity',proximity:state.proximity,sensorConnected:connected});
    }
  }catch{
    if(state.proximity.to!==0||state.sensorConnected){
      state.proximity={from:state.proximity.to,to:0,at:performance.now(),duration:350};state.sensorConnected=false;
      for(const ws of peers.keys())send(ws,{type:'proximity',proximity:state.proximity,sensorConnected:false});
    }
  }finally{proximityBusy=false;}
},100);proximityTimer.unref();
const heartbeat=setInterval(()=>{
  for(const [ws,peer]of peers){if(!peer.alive){ws.terminate();continue;}peer.alive=false;ws.ping();}
  roster();
},5000);heartbeat.unref();
server.listen(port,'0.0.0.0',()=>console.log(`Classroom displays: http://dod.local:${port}/ (http://${address}:${port}/)`));
function shutdown(){clearInterval(heartbeat);clearInterval(proximityTimer);for(const ws of peers.keys())ws.terminate();server.close(()=>process.exit(0));}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
