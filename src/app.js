import * as THREE from 'three';
import { addTableProjector } from './projector.js?v=classroom-recovery-20261102';
import { connectFlick } from './flick.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const host = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dfe3dd');
const camera = new THREE.PerspectiveCamera(64, 1, .1, 100);
const eyePosition = new THREE.Vector3(1.5, 3.6, 18);
const eyeTarget = new THREE.Vector3(1.5, 1.7, -1.5);
camera.position.copy(eyePosition);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(eyeTarget); controls.enableDamping = true;
controls.minDistance = 5; controls.maxDistance = 32;
controls.maxPolarAngle = Math.PI / 2.03;
scene.add(new THREE.HemisphereLight(0xffffff, 0x9b9f98, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 14, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left:-14,right:14,top:14,bottom:-14,near:1,far:35});
scene.add(sun);
const mat = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
const wood=mat('#d8b57b'), edge=mat('#c49a63'), metal=mat('#777c7a'), dark=mat('#242b2c'), chair=mat('#313a3a'), silver=mat('#c7ccca'), wall=mat('#f4f1e9'), floor=mat('#a7aaa7');
silver.color.set('#d5d7d4');silver.metalness=.35;silver.roughness=.38;metal.metalness=.7;metal.roughness=.38;
const grainCanvas=document.createElement('canvas');grainCanvas.width=512;grainCanvas.height=256;
const grain=grainCanvas.getContext('2d');grain.fillStyle='#d9bb8c';grain.fillRect(0,0,512,256);
for(let i=0;i<180;i++){grain.strokeStyle=i%3?'rgba(124,83,43,.07)':'rgba(255,241,208,.19)';grain.lineWidth=.5+(i%4)*.3;grain.beginPath();for(let x=0;x<=512;x+=16){const y=i*1.45+Math.sin(x*.017+i)*1.4;if(x===0)grain.moveTo(x,y);else grain.lineTo(x,y)}grain.stroke()}
wood.map=new THREE.CanvasTexture(grainCanvas);wood.map.colorSpace=THREE.SRGBColorSpace;
function rounded(w,h,d,material,x,y,z,parent,r=.04){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function rod(a,b,r,material,parent){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh}
function panel(w,h,r,material,x,y,z,parent){const shape=new THREE.Shape();const l=-w/2,b=-h/2;shape.moveTo(l+r,b);shape.lineTo(l+w-r,b);shape.quadraticCurveTo(l+w,b,l+w,b+r);shape.lineTo(l+w,b+h-r);shape.quadraticCurveTo(l+w,b+h,l+w-r,b+h);shape.lineTo(l+r,b+h);shape.quadraticCurveTo(l,b+h,l,b+h-r);shape.lineTo(l,b+r);shape.quadraticCurveTo(l,b,l+r,b);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
const logoCanvas=document.createElement('canvas');logoCanvas.width=128;logoCanvas.height=128;
const logo=logoCanvas.getContext('2d');logo.fillStyle='#1a1c1b';
logo.beginPath();logo.moveTo(64,37);logo.bezierCurveTo(91,20,108,44,102,70);logo.bezierCurveTo(96,99,83,114,68,105);logo.bezierCurveTo(62,101,58,101,52,105);logo.bezierCurveTo(34,115,17,84,20,62);logo.bezierCurveTo(22,37,42,25,64,37);logo.fill();
logo.save();logo.globalCompositeOperation='destination-out';logo.beginPath();logo.ellipse(105,57,17,19,0,0,Math.PI*2);logo.fill();logo.restore();logo.save();logo.translate(73,20);logo.rotate(.55);logo.beginPath();logo.ellipse(0,0,6,14,0,0,Math.PI*2);logo.fill();logo.restore();
const logoTexture=new THREE.CanvasTexture(logoCanvas);logoTexture.colorSpace=THREE.SRGBColorSpace;
const logoMaterial=new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false});
const meshCanvas=document.createElement('canvas');meshCanvas.width=64;meshCanvas.height=64;
const weave=meshCanvas.getContext('2d');weave.fillStyle='rgba(48,54,53,.35)';weave.fillRect(0,0,64,64);weave.strokeStyle='rgba(31,36,35,.55)';weave.lineWidth=1;for(let n=0;n<64;n+=4){weave.beginPath();weave.moveTo(n,0);weave.lineTo(n,64);weave.moveTo(0,n);weave.lineTo(64,n);weave.stroke()}
const meshTexture=new THREE.CanvasTexture(meshCanvas);meshTexture.wrapS=meshTexture.wrapT=THREE.RepeatWrapping;meshTexture.repeat.set(5,6);
const meshMaterial=new THREE.MeshStandardMaterial({map:meshTexture,transparent:true,side:THREE.DoubleSide,roughness:1,depthWrite:false});
function box(w,h,d,material,x,y,z,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
box(14,.16,24,floor,0,-.09,0);
box(14,6,.15,wall,0,3,-11.95);
box(.15,6,24,wall,-7,3,0); box(.15,6,24,wall,7,3,0);
// Relative size and placement inferred from the classroom photograph.
const board = new THREE.Group();board.position.set(2.5,3.55,-11.82);scene.add(board);
box(5,2.5,.045,mat('#fdfdfa'),0,0,0,board);
for(const y of [-1.27,1.27])box(5.12,.045,.07,silver,0,y,.025,board);
for(const x of [-2.535,2.535])box(.045,2.54,.07,silver,x,0,.025,board);
box(4.75,.035,.16,silver,0,-1.31,.075,board);
for(const x of [-2.52,2.52])for(const y of [-1.255,1.255])box(.045,.045,.012,dark,x,y,.066,board);
const tv = new THREE.Group();tv.position.set(-2.8,4.65,-11.74);scene.add(tv);
rounded(3.32,1.89,.13,silver,0,0,0,tv,.025);
rounded(3.27,1.84,.025,dark,0,.008,.073,tv,.015);
panel(3.2,1.8,.012,new THREE.MeshBasicMaterial({color:'#101619'}),0,.008,.087,tv);
const tvCable=new THREE.CatmullRomCurve3([
 new THREE.Vector3(-3.85,3.72,-11.7),new THREE.Vector3(-3.82,3.15,-11.68),
 new THREE.Vector3(-3.9,2.35,-11.67),new THREE.Vector3(-3.85,1.5,-11.65)
]);
scene.add(new THREE.Mesh(new THREE.TubeGeometry(tvCable,20,.012,6,false),dark));
for (const z of [-8,-3,2,7]) { box(.08,2.6,3.2,edge,6.9,3.65,z); box(.04,2.35,2.96,mat('#c8d8da'),6.84,3.65,z); box(.08,.08,3.2,edge,6.8,2.4,z); box(.08,.08,3.2,edge,6.8,4.9,z); }
const screens = new Map();
const layout = window.DodTimeline.stations;
function labelTexture(text, sub){const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.fillStyle='#ffffff';x.beginPath();x.roundRect(0,0,256,96,16);x.fill();x.fillStyle='#24322a';x.font='bold 40px system-ui';x.fillText(text,20,54);x.fillStyle='#8c9990';x.font='22px system-ui';x.fillText(sub,145,53);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function createStation(item){
 const g=new THREE.Group();g.position.set(item.x,0,item.z);scene.add(g);
 const outerSide=item.type==='Mac'?1:(item.x===-4.5?-1:0);
 const tableWidth=3+.8*Math.abs(outerSide),tableCenter=.4*outerSide;
 box(tableWidth,.08,2.1,wood,tableCenter,1.45,0,g);
 for(let n=0;n<3;n++)box(tableWidth,.008,.015,n%2?wood:edge,tableCenter,1.417-n*.009,1.052,g);
 for(const x of [tableCenter-tableWidth/2+.22,tableCenter+tableWidth/2-.22]){
  const outside=x+Math.sign(x)*.1;
  rod([x,1.41,-.75],[outside,.04,-.9],.017,metal,g);
  rod([x,1.41,.75],[outside,.04,.9],.017,metal,g);
  rod([x,1.41,-.75],[outside,.04,.9],.014,metal,g);
  rod([x,1.41,.75],[outside,.04,-.9],.014,metal,g);
  rod([outside,.04,-.9],[outside,.04,.9],.017,metal,g);
 }
 rounded(1.02,.13,.76,chair,0,.83,1.72,g,.05);
 box(.08,.58,.08,metal,0,.47,1.72,g);
 for(let n=0;n<5;n++){const a=n*Math.PI*2/5;const x=Math.sin(a)*.53,z=1.72+Math.cos(a)*.53;rod([0,.21,1.72],[x,.13,z],.035,metal,g);rounded(.13,.14,.1,dark,x,.08,z,g,.04)}
 for(const x of [-.49,.49])box(.045,1.22,.07,dark,x,1.48,2.02,g);
 for(const y of [.89,2.07])rounded(1.02,.055,.08,dark,0,y,2.02,g,.02);
 const chairMesh=new THREE.Mesh(new THREE.PlaneGeometry(.94,1.16),meshMaterial);chairMesh.position.set(0,1.48,2.02);g.add(chairMesh);
 if(!item.type)return;
 const isMac=item.type==='Mac';
 const computer=new THREE.Group();computer.position.y=1.5;computer.scale.setScalar(isMac?.88:1);g.add(computer);
 const display=new THREE.Group();display.position.set(0,isMac?.84:.73,-.32);display.rotation.x=-.065;computer.add(display);
 if(isMac){
  rounded(1.8,1.30,.14,silver,0,0,0,display,.045);
  panel(1.74,1.02,.035,new THREE.MeshBasicMaterial({color:'#090c0d'}),0,.105,.072,display);
  const apple=new THREE.Mesh(new THREE.PlaneGeometry(.10,.11),logoMaterial);apple.position.set(0,-.527,.072);display.add(apple);
  const rearApple=new THREE.Mesh(new THREE.PlaneGeometry(.22,.25),logoMaterial);rearApple.rotation.y=Math.PI;rearApple.position.set(0,.06,-.076);display.add(rearApple);
  const webcam=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),dark);webcam.position.set(0,.58,.074);display.add(webcam);
  const standShape=new THREE.Shape();standShape.moveTo(-.23,0);standShape.lineTo(.23,0);standShape.lineTo(.13,.43);standShape.lineTo(-.13,.43);standShape.closePath();
  const stand=new THREE.Mesh(new THREE.ExtrudeGeometry(standShape,{depth:.075,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,steps:1}),silver);stand.position.set(0,0,-.34);stand.rotation.x=-.18;stand.castShadow=true;computer.add(stand);
  rounded(.58,.035,.5,silver,0,.006,-.18,computer,.015);
 }else{
  rounded(1.69,1.025,.115,dark,0,0,0,display,.025);
  rounded(.44,.035,.38,dark,0,.007,-.3,computer,.015);
  box(.1,.35,.09,dark,0,.19,-.36,computer);
  box(.075,.012,.008,silver,0,-.488,.06,display);
 }
 rounded(isMac?.83:.95,.025,.29,isMac?silver:dark,-.06,1.508,.65,g,.01);
 for(let row=0;row<4;row++)for(let key=0;key<12;key++)box(.047,.006,.041,isMac?wall:chair,-.46+key*.067,1.525,.55+row*.057,g);
 const mouse=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),isMac?wall:dark);mouse.scale.set(.07,.035,.11);mouse.position.set(.64,1.522,.65);g.add(mouse);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(isMac?1.53:1.57,isMac?.860625:.883125),new THREE.MeshBasicMaterial({map:texture}));screen.position.set(0,isMac?.105:0,isMac?.074:.06);display.add(screen);
 const tag=new THREE.Mesh(new THREE.PlaneGeometry(.74,.275),new THREE.MeshBasicMaterial({map:labelTexture(String(item.id).padStart(2,'0'),item.type),transparent:true}));tag.position.set(0,isMac?2.94:2.93,-.3);g.add(tag);
 screens.set(item.id,{canvas,texture,item});
}
layout.forEach(createStation);
[{x:-4.5,z:6},{x:-1.5,z:6}].forEach(createStation);
const standaloneState={mode:'animation',playing:true,elapsed:0,startAt:performance.now(),stepMs:2500,route:'all',order:layout.map(item=>item.id),experiment:false,proximity:{from:0,to:0,at:0,duration:120}};
const elapsedAt=now=>standaloneState.playing?Math.max(0,now-standaloneState.startAt):standaloneState.elapsed;
const tableProjector=addTableProjector(scene, -1.5, 6);
connectFlick({onPosition:position=>{
 tableProjector.setSensor(position);
 const now=performance.now(),target=position?Math.max(0,Math.min(1,(75-position.z)/65)):0;
 if(target!==standaloneState.proximity.to)standaloneState.proximity={from:window.DodTimeline.proximityAmount(standaloneState,now),to:target,at:now,duration:target===0?350:120};
},onTouch:()=>tableProjector.startListening()});
const projectionDialog=document.querySelector('#projection-preview');
projectionDialog.append(tableProjector.canvas);
function openProjection(){
 if(projectionDialog.open)return;
 tableProjector.setPointer(null);controls.enabled=false;projectionDialog.showModal();
}
document.querySelector('#projection-open').onclick=openProjection;
document.querySelector('#projection-close').onclick=()=>projectionDialog.close();
projectionDialog.addEventListener('close',()=>{controls.enabled=true;tableProjector.setPointer(null)});
tableProjector.canvas.addEventListener('pointermove',event=>{
 const canvas=tableProjector.canvas,rect=canvas.getBoundingClientRect();
 const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
 const width=canvas.width*scale,height=canvas.height*scale;
 const x=(event.clientX-rect.left-(rect.width-width)/2)/width;
 const y=(event.clientY-rect.top-(rect.height-height)/2)/height;
 tableProjector.setPointer(x>=0&&x<=1&&y>=0&&y<=1?{x,y:1-y}:null);
});
tableProjector.canvas.addEventListener('pointerleave',()=>tableProjector.setPointer(null));
const raycaster=new THREE.Raycaster(), pointerPosition=new THREE.Vector2();
function pointAt(event){
 const rect=renderer.domElement.getBoundingClientRect();
 pointerPosition.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointerPosition,camera);
 return raycaster.intersectObject(tableProjector.projection)[0];
}
renderer.domElement.addEventListener('pointermove',event=>{
 const hit=pointAt(event);tableProjector.setPointer(hit?.uv || null);renderer.domElement.style.cursor=hit?'zoom-in':'';
});
renderer.domElement.addEventListener('pointerleave',()=>tableProjector.setPointer(null));
let pointerDown;
renderer.domElement.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY}});
renderer.domElement.addEventListener('pointerup',event=>{
 const start=pointerDown;pointerDown=null;
 if(!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
 if(pointAt(event))openProjection();
});
renderer.domElement.addEventListener('pointercancel',()=>{pointerDown=null});
function refreshControls(client){
 const connected=client.connected,state=connected?client.state():standaloneState,count=client.roster?.length||0;
 document.querySelector('#room-status').textContent=connected?'Učebna · '+count+' obrazovek · '+client.roster.filter(item=>item.station).length+' přiřazeno':'Samostatný náhled';
 document.querySelector('#room-identify').disabled=!connected;
 if(!state)return;
 document.querySelector('#play').textContent=state.playing?'Pozastavit':'Spustit';
 document.querySelector('#room-identify').textContent=state.mode==='identify'?'Skrýt čísla':'Čísla na obrazovkách';
 document.querySelector('#room-experiment').textContent=state.experiment?'Vypnout množení kuliček':'Zapnout množení kuliček';
 document.querySelector('#route').value=state.route;
 document.querySelector('#speed').value=2500/state.stepMs;
 document.querySelector('#speed-value').textContent=(2500/state.stepMs)+'×';
}
// The public HTTPS preview runs independently; LAN control is available on this Mac.
const localControl=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);
const room=localControl?new window.DodRoom({role:'control',url:'ws://127.0.0.1:8000/room/ws',onChange:refreshControls}):{connected:false};
refreshControls(room);
function renderScreens(now){
 const state=room.connected&&room.state()?room.state():standaloneState;
 const serverTime=room.connected?room.time(now):now;
 if(serverTime===null)return;
 // With no classroom screens online, keep the local scene animated for preview.
 const viewState=state.order.length?state:{...state,order:state.route==='pair'?[8,7]:layout.map(item=>item.id)};
 for(const [id,screen] of screens){window.DodTimeline.draw(screen.canvas.getContext('2d'),screen.canvas.width,screen.canvas.height,id,viewState,serverTime);screen.texture.needsUpdate=true;}
}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();
function animate(now){requestAnimationFrame(animate);renderScreens(now);tableProjector.update(now);if(!projectionDialog.open){controls.update();renderer.render(scene,camera)}}
document.querySelector('#loading').remove();requestAnimationFrame(animate);
document.querySelector('#play').onclick=()=>{
 if(room.connected){room.command(room.state().playing?'pause':'play',{});return;}
 const now=performance.now();standaloneState.elapsed=elapsedAt(now);standaloneState.startAt=now-standaloneState.elapsed;standaloneState.playing=!standaloneState.playing;refreshControls(room);
};
document.querySelector('#speed').oninput=event=>{
 const value=Number(event.target.value);
 if(room.connected){room.command('speed',{value});return;}
 const now=performance.now(),progress=elapsedAt(now)/standaloneState.stepMs;
 standaloneState.stepMs=2500/value;standaloneState.elapsed=progress*standaloneState.stepMs;standaloneState.startAt=now-standaloneState.elapsed;refreshControls(room);
};
document.querySelector('#route').onchange=event=>{
 const value=event.target.value;
 if(room.connected){room.command('route',{value});return;}
 standaloneState.route=value;standaloneState.order=value==='pair'?[8,7]:layout.map(item=>item.id);standaloneState.elapsed=0;standaloneState.startAt=performance.now();refreshControls(room);
};
function setView(top){camera.position.set(...(top?[0,20,4]:eyePosition.toArray()));controls.target.copy(top?new THREE.Vector3(0,0,-2):eyeTarget);controls.update();document.querySelector('#top').classList.toggle('active',top);document.querySelector('#eye').classList.toggle('active',!top);document.querySelector('#table-view').classList.remove('active')}
document.querySelector('#reset').onclick=()=>setView(false);document.querySelector('#eye').onclick=()=>setView(false);document.querySelector('#top').onclick=()=>setView(true);

document.querySelector('#table-view').onclick=()=>{camera.position.set(-1.5,5.2,10.4);controls.target.set(-1.5,1.5,6);controls.update();document.querySelector('#eye').classList.remove('active');document.querySelector('#top').classList.remove('active');document.querySelector('#table-view').classList.add('active')};

document.querySelector('#room-identify').onclick=()=>{if(room.connected)room.command('identify',{enabled:room.state().mode!=='identify'})};
document.querySelector('#room-experiment').onclick=()=>{
 if(room.connected){room.command('experiment',{enabled:!room.state().experiment});return;}
 standaloneState.experiment=!standaloneState.experiment;refreshControls(room);
};
