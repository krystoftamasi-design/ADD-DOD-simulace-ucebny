import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A ceiling-mounted, downward-facing projector over the front empty desk.
export function addTableProjector(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const aluminium = new THREE.MeshStandardMaterial({ color: '#b9bebd', metalness: .55, roughness: .4 });
  const casing = new THREE.MeshStandardMaterial({ color: '#f2f1eb', roughness: .5 });
  const black = new THREE.MeshStandardMaterial({ color: '#222a2d', roughness: .6 });
  function solid(w, h, d, material, px, py, pz) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(.035, h / 4, d / 4)), material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  function cylinder(radius, height, material, px, py, pz) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    group.add(mesh);
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

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3ffe2';
  ctx.fillRect(0, 0, 1024, 640);
  ctx.strokeStyle = '#dcecc8';
  ctx.lineWidth = 2;
  for (let px = 32; px < 1024; px += 64) {
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 640); ctx.stroke();
  }
  for (let py = 32; py < 640; py += 64) {
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(1024, py); ctx.stroke();
  }
  ctx.strokeStyle = '#9db965';
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, 976, 592);
  ctx.fillStyle = '#36542e';
  ctx.font = '600 25px system-ui';
  ctx.fillText('DEN OTEVŘENÝCH DVEŘÍ', 70, 120);
  ctx.font = 'bold 110px system-ui';
  ctx.fillText('Ahoj!', 70, 290);
  ctx.font = '28px system-ui';
  ctx.fillText('Vítej v naší učebně.', 74, 350);
  ctx.font = '20px system-ui';
  ctx.fillText('PROJEKČNÍ STŮL / 01', 74, 560);
  ctx.fillStyle = '#ccef32';
  ctx.beginPath(); ctx.arc(770, 330, 150, 0, Math.PI * 2); ctx.fill();
  for (const px of [710, 820]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(px, 325, 42, 55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#10150e';
    ctx.beginPath(); ctx.ellipse(px + 14, 309, 27, 34, -.3, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const projection = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.6),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .92, toneMapped: false })
  );
  projection.rotation.x = -Math.PI / 2;
  projection.position.y = 1.496;
  group.add(projection);

  const corners = [[-1.3, 1.5, -.8], [1.3, 1.5, -.8], [1.3, 1.5, .8], [-1.3, 1.5, .8]];
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
  return group;
}
