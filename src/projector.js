import * as THREE from 'three';
import { ListeningState } from './listening.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A ceiling-mounted, downward-facing projector over the front empty desk.
export function addTableProjector(scene, x, z) {
  const tableTop=1.49,hardwareScale=.8,flickCenterZ=.43;
  const flickWidth=.66*hardwareScale,flickDepth=.43*hardwareScale;
  const projectionWidth=2.95,projectionDepth=1.6;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const aluminium = new THREE.MeshStandardMaterial({ color: '#b9bebd', metalness: .55, roughness: .4 });
  const casing = new THREE.MeshStandardMaterial({ color: '#f2f1eb', roughness: .5 });
  const black = new THREE.MeshStandardMaterial({ color: '#222a2d', roughness: .6 });
  function solid(w, h, d, material, px, py, pz, parent=group) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(.035, h / 4, d / 4)), material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(radius, height, material, px, py, pz, parent=group) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  solid(.42, .045, .36, aluminium, 0, 5.98, 0);
  cylinder(.045, .93, aluminium, 0, 5.515, 0);
  cylinder(.012, .98, black, .075, 5.5, 0);
  solid(.9, .3, .7, casing, 0, 4.9, 0);
  solid(.6, .045, .46, aluminium, 0, 5.06, 0);
  for (let i = 0; i < 7; i++) solid(.025, .09, .014, black, -.28 + i * .065, 4.91, .354);
  cylinder(.125, .13, black, 0, 4.7, 0);
  cylinder(.092, .016, new THREE.MeshBasicMaterial({ color: '#d8f5c1' }), 0, 4.625, 0);

  // Flick plate and the small exposed Raspberry board sit on the projected desk.
  const hardware=new THREE.Group();
  const hardwarePivot=new THREE.Vector3(0,tableTop,flickCenterZ);
  hardware.scale.setScalar(hardwareScale);
  hardware.position.copy(hardwarePivot).multiplyScalar(1-hardwareScale);
  group.add(hardware);
  const hardwarePoint=(px,py,pz)=>new THREE.Vector3(px,py,pz).sub(hardwarePivot).multiplyScalar(hardwareScale).add(hardwarePivot);
  const plate = solid(.66, .025, .43, casing, 0, 1.515, .43, hardware);
  const face = solid(.60, .003, .37, new THREE.MeshStandardMaterial({color:'#e5e5dc', roughness:.8}), 0, 1.53, .43, hardware);
  const screw = new THREE.MeshStandardMaterial({color:'#909793', metalness:.6, roughness:.35});
  for (const px of [-.295,.295]) for (const pz of [.245,.615]) cylinder(.012,.004,screw,px,1.534,pz,hardware);
  const markCanvas=document.createElement('canvas'); markCanvas.width=256; markCanvas.height=128;
  const mark=markCanvas.getContext('2d'); mark.fillStyle='#b94b2a'; mark.font='bold 34px system-ui'; mark.fillText('Flick',12,110);
  mark.strokeStyle='#d6d8d1'; mark.lineWidth=1;
  for(let n=-128;n<256;n+=24){mark.beginPath();mark.moveTo(n,0);mark.lineTo(n+128,128);mark.stroke()}
  const markTexture=new THREE.CanvasTexture(markCanvas); markTexture.colorSpace=THREE.SRGBColorSpace;
  const marking=new THREE.Mesh(new THREE.PlaneGeometry(.58,.35),new THREE.MeshBasicMaterial({map:markTexture,transparent:true,depthWrite:false}));
  marking.rotation.x=-Math.PI/2; marking.position.set(0,1.536,.43);hardware.add(marking);
  const green=new THREE.MeshStandardMaterial({color:'#16714e',roughness:.65});
  const chip=new THREE.MeshStandardMaterial({color:'#27332f',roughness:.6});
  solid(.28,.018,.14,green,.04,1.515,-.24,hardware);
  solid(.085,.02,.065,chip,.02,1.534,-.24,hardware);
  solid(.045,.025,.085,aluminium,-.085,1.535,-.24,hardware);
  for(let i=0;i<9;i++) for(const pz of [-.294,-.186]) solid(.012,.012,.012,aluminium,-.06+i*.024,1.535,pz,hardware);
  solid(.11,.018,.035,black,0,1.54,.205,hardware);
  const colors=['#b92938','#e87b2e','#e3c84d','#419565','#3b71a4','#774889'];
  colors.forEach((color,i)=>{
    const dx=(i-2.5)*.012;
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(dx,1.54,.205),new THREE.Vector3(dx-.04,1.55,.08),
      new THREE.Vector3(dx+.06,1.55,-.06),new THREE.Vector3(.04+dx,1.54,-.20)
    ]);
    hardware.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.006,6,false),new THREE.MeshStandardMaterial({color})));
  });
  const cable=new THREE.CatmullRomCurve3([
    hardwarePoint(.04,1.535,-.31),hardwarePoint(.1,1.53,-.5),
    new THREE.Vector3(.12,1.52,-.85),new THREE.Vector3(.14,1.45,-1.07),
    new THREE.Vector3(.14,.85,-1.12)
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(cable,36,.018*hardwareScale,8,false),black));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(projectionWidth*400); canvas.height = Math.round(projectionDepth*400);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const projection = new THREE.Mesh(
    new THREE.PlaneGeometry(projectionWidth, projectionDepth),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .92, toneMapped: false })
  );
  projection.rotation.x = -Math.PI / 2;
  projection.position.y = 1.496;
  group.add(projection);
  const particles=Array.from({length:24},(_,i)=>({x:canvas.width*.117+(i*173)%(canvas.width*.78),y:85+(i*107)%470,r:8+(i%4)*3,phase:i*1.7}));
  let pointer=null, sensor=null, previousTime=0;
  const listening=new ListeningState();
  const finger=new THREE.Mesh(new THREE.SphereGeometry(.065,20,16),new THREE.MeshBasicMaterial({color:'#f5ffff',transparent:true,opacity:.8}));
  finger.visible=false;group.add(finger);
  for(const p of particles){p.currentX=p.x;p.currentY=p.y}
  function update(time){
    listening.update(sensor,time);
    const dt=Math.min((time-previousTime)/1000,.1);previousTime=time;
    const target=sensor ? {x:(.5+(sensor.x/100-.5)*flickWidth/projectionWidth)*canvas.width,y:(.5+(flickCenterZ+(.5-sensor.y/100)*flickDepth)/projectionDepth)*canvas.height} : pointer;
    const strength=sensor ? .3+.65*(1-sensor.z/100) : .55;
    finger.visible=!!sensor;
    if(sensor)finger.position.set((sensor.x/100-.5)*flickWidth,1.6+sensor.z/100*.7,flickCenterZ+(.5-sensor.y/100)*flickDepth);
    ctx.fillStyle='#f3ffe2'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#dcecc8'; ctx.lineWidth=2;
    for(let px=32;px<canvas.width;px+=64){ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,canvas.height);ctx.stroke()}
    for(let py=32;py<canvas.height;py+=64){ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(canvas.width,py);ctx.stroke()}
    ctx.strokeStyle='#9db965';ctx.lineWidth=5;ctx.strokeRect(24,24,canvas.width-48,canvas.height-48);
    for(const p of particles){
      let x=p.x+Math.sin(time*.0007+p.phase)*14, y=p.y+Math.cos(time*.0008+p.phase)*12;
      if(target){const dx=target.x-x,dy=target.y-y,d=Math.hypot(dx,dy);const pull=Math.max(0,1-d/900)*strength;x+=dx*pull;y+=dy*pull}
      const blend=1-Math.exp(-dt*9);p.currentX+=(x-p.currentX)*blend;p.currentY+=(y-p.currentY)*blend;
      x=p.currentX;y=p.currentY;
      ctx.fillStyle='#c6e93a';ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#36542e';ctx.font='bold 70px system-ui';ctx.fillText(listening.active?'Naslouchám…':'Ahoj!',65,135);
    if(listening.active){ctx.fillStyle='#dd694a';ctx.beginPath();ctx.arc(65,190,11,0,Math.PI*2);ctx.fill();ctx.font='25px system-ui';ctx.fillText('Mikrofon · simulace',90,199)}
    texture.needsUpdate=true;
  }
  update(0);
  const corners = [[-projectionWidth/2, 1.5, -projectionDepth/2], [projectionWidth/2, 1.5, -projectionDepth/2], [projectionWidth/2, 1.5, projectionDepth/2], [-projectionWidth/2, 1.5, projectionDepth/2]];
  const vertices = [];
  for (let i = 0; i < 4; i++) vertices.push(0, 4.61, 0, ...corners[i], ...corners[(i + 1) % 4]);
  const beamGeometry = new THREE.BufferGeometry();
  beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const beam = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({
    color: '#e5ffc6', transparent: true, opacity: .035,
    side: THREE.DoubleSide, depthWrite: false, toneMapped: false
  }));
  group.add(beam);
  const target = new THREE.Object3D();
  target.position.set(0, 1.49, 0);
  group.add(target);
  const light = new THREE.SpotLight('#efffdc', 7, 5, .5, .7, 2);
  light.position.set(0, 4.61, 0);
  light.target = target;
  group.add(light);
  return {group, projection, plate, face, canvas, update,
    setPointer(uv){ pointer=uv ? {x:uv.x*canvas.width,y:(1-uv.y)*canvas.height} : null; },
    setSensor(position){sensor=position;},
    startListening(){listening.touch(sensor,performance.now());},
    toggleListening(){listening.toggle(); return listening.active;}
  };
}
