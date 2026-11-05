import {watchModules} from './live-edit.js?v=live-r1';
import {setupProjectionTextEditor} from './projection-text-editor.js?v=text-editor-r2';
import './sync.js?v=text-editor-r1';
setupProjectionTextEditor();
if(['localhost','127.0.0.1'].includes(location.hostname))new window.DodRoom({role:'observer',url:'ws://127.0.0.1:8000/room/ws'});
let animations=[],categories=[],sampleScene,followSpawn;

const $ = id => document.getElementById(id);
const seconds = value => value.toFixed(1).replace('.', ',');
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let speed = 1, clock = 0, detail = null, renderScene;
const cards = [];
let observer;
const dialog = $('inspector');

function resize(canvas) {
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (width !== canvas.width || height !== canvas.height) {canvas.width = width;canvas.height = height;}
}
function updatePause() {
  $('pause-all').innerHTML = paused ? '▶ <span>Přehrát vše</span>' : 'Ⅱ <span>Pozastavit vše</span>';
  $('pause-all').setAttribute('aria-pressed', String(paused));
}
function paintDetail() {
  if (!detail || !renderScene) return;
  resize($('detail-canvas'));
  renderScene($('detail-canvas'), detail.animation, detail.time, detail.bodyTime, detail.manualSpawn);
  $('seek').value = String(detail.time / detail.animation.duration);
  $('detail-time').textContent = `${seconds(detail.time)} / ${seconds(detail.animation.duration)} s`;
  $('detail-play').textContent = detail.playing ? 'Pozastavit' : 'Přehrát';
  if(detail.animation.id==='spawn'&&!detail.manualSpawn){
    const {state}=sampleScene('spawn',detail.time,detail.bodyTime);
    const percent=Math.round(state.spawn.amount.to*100);
    $('spawn-proximity').value=String(percent);$('spawn-value').textContent=percent+' %';
  }
}
function openDetail(animation) {
  detail = {animation, time: 0, bodyTime: 0, playing: !paused, manualSpawn: null};
  $('spawn-controls').hidden=animation.id!=='spawn';
  $('spawn-proximity').value='0';$('spawn-value').textContent='0 %';
  $('detail-title').textContent = animation.name;
  $('detail-category').textContent = categories.find(item => item.id === animation.category).name;
  $('detail-note').textContent = animation.note;
  dialog.showModal();paintDetail();
}
function buildLibrary() {
  const starts=new Map(cards.map(card=>[card.animation.id,card.start]));
  observer?.disconnect();cards.length=0;
  const library = $('library');library.replaceChildren();$('filters').replaceChildren();
  categories.forEach((category, index) => {
    const list = animations.filter(animation => animation.category === category.id);
    const section = document.createElement('section');section.dataset.category = category.id;
    section.innerHTML = `<div class="section-heading"><h2 id="heading-${category.id}"><span>0${index + 1}</span>${category.name}</h2><span>${list.length} animace</span></div><div class="grid"></div>`;
    section.setAttribute('aria-labelledby', `heading-${category.id}`);
    for (const animation of list) {
      const article = document.createElement('article');article.className = 'animation-card';article.dataset.animation = animation.id;
      article.innerHTML = `<button class="preview" aria-label="Zvětšit: ${animation.name}"><canvas aria-label="Animace: ${animation.name}"></canvas><span class="preview-label">${animation.continuous ? 'ŽIVÝ STAV' : 'NÁHLED POHYBU'}</span><span class="expand-icon" aria-hidden="true">↗</span></button><div class="card-info"><div><h3>${animation.name}</h3><div class="card-meta">${animation.continuous ? 'Průběžná animace' : seconds(animation.duration) + ' s · smyčka náhledu'}</div></div><button class="replay" aria-label="Přehrát od začátku: ${animation.name}" title="Přehrát od začátku">↻</button></div>`;
      const card = {animation, section, canvas: article.querySelector('canvas'), start: starts.get(animation.id)||0, visible: false};
      article.querySelector('.preview').onclick = () => openDetail(animation);
      article.querySelector('.replay').onclick = () => {
        card.start = clock;
        // A replay is explicit user intent even when automatic previews are paused.
        if (paused) {paused = false;updatePause();}
      };
      cards.push(card);section.querySelector('.grid').append(article);
    }
    library.append(section);
  });
  const filters = [{id: 'all', short: 'Vše', count: animations.length}, ...categories.map(category => ({...category, count: animations.filter(item => item.category === category.id).length}))];
  for (const filter of filters) {
    const button = document.createElement('button');button.className = 'filter';button.dataset.filter = filter.id;
    button.innerHTML = `${filter.short}<span>${filter.count}</span>`;button.setAttribute('aria-pressed', String(filter.id === 'all'));
    button.onclick = () => {
      for (const child of $('filters').children) child.setAttribute('aria-pressed', String(child === button));
      for (const section of library.children) section.hidden = filter.id !== 'all' && section.dataset.category !== filter.id;
    };
    $('filters').append(button);
  }
  const byCanvas = new Map(cards.map(card => [card.canvas, card]));
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) byCanvas.get(entry.target).visible = entry.isIntersecting;
  }, {rootMargin: '100px'});
  for (const card of cards) observer.observe(card.canvas);
}

$('speed').onchange = event => {speed = Number(event.target.value);};
$('pause-all').onclick = () => {paused = !paused;updatePause();};
$('close-detail').onclick = () => dialog.close();
dialog.addEventListener('close', () => {detail = null;});
dialog.addEventListener('click', event => {if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close();});
$('detail-play').onclick = () => {if (detail) {detail.playing = !detail.playing;paintDetail();}};
$('detail-replay').onclick = () => {if (detail) {detail.time = 0;detail.bodyTime = 0;detail.manualSpawn=null;detail.playing = true;paintDetail();}};
$('seek').oninput = event => {
  if (!detail) return;
  detail.manualSpawn=null;detail.playing = false;detail.time = Number(event.target.value) * detail.animation.duration;detail.bodyTime = detail.time;paintDetail();
};

async function main() {
  const [character,nativeBody]=await Promise.all(['assets/mascot.json','assets/native-body.json'].map(async path=>{
    const response=await fetch(path);
    if(!response.ok)throw new Error('Chybí podklad maskota');
    return response.json();
  }));
  character.nativeBody=nativeBody;
  const entries={renderer:new URL('./gallery-renderer.js',import.meta.url).href,scenes:new URL('./animation-scenes.js',import.meta.url).href};
  watchModules({entries,async apply({renderer,scenes}){
    const previous={DodMascot:window.DodMascot,DodSpawn:window.DodSpawn,DodGuide:window.DodGuide,DodTimeline:window.DodTimeline};
    let next;
    try{
      next=renderer.createSceneRenderer(character);await next.ready;
      const probe=document.createElement('canvas');probe.width=480;probe.height=280;
      for(const id of ['listening','thinking','reveal','hover-reset']){
        const animation=scenes.animations.find(item=>item.id===id);
        for(const time of [0,1.2,1.8,2.45,2.7,3])next(probe,animation,Math.min(time,animation.duration),time);
      }
    }catch(error){Object.assign(window,previous);throw error;}
    const changed=JSON.stringify(animations)!==JSON.stringify(scenes.animations)||JSON.stringify(categories)!==JSON.stringify(scenes.categories);
    const filter=$('filters').querySelector('[aria-pressed="true"]')?.dataset.filter||'all';
    animations=scenes.animations;categories=scenes.categories;sampleScene=scenes.sampleScene;followSpawn=scenes.followSpawn;renderScene=next;
    if(changed){
      buildLibrary();
      $('filters').querySelector(`[data-filter="${filter}"]`)?.click();
      if(detail){
        const updated=animations.find(item=>item.id===detail.animation.id);
        if(updated){detail.animation=updated;detail.time=Math.min(detail.time,updated.duration);$('detail-title').textContent=updated.name;$('detail-note').textContent=updated.note;}
        else dialog.close();
      }
    }
    paintDetail();
  },onStatus({revision,error}){
    document.documentElement.dataset.animationRevision=String(revision);
    document.documentElement.dataset.animationError=error?.message||'';
    $('live-status').textContent=error?'Chyba v kódu · běží poslední funkční verze':revision>1?'Uloženo · '+new Date().toLocaleTimeString('cs-CZ'):'Živé úpravy zapnuté';
    $('live-status').title=error?.message||'Změny animací se načítají automaticky po uložení';
    $('live-status').classList.toggle('error',!!error);
    $('load-status').textContent=error?'Úprava se nepoužila: '+error.message:'';
    if(error)console.warn('Úprava animace se nepoužila.',error);
  }});
  updatePause();
  let last = null, lastPaint = -Infinity;
  function tick(now) {
    requestAnimationFrame(tick);
    const delta = last === null || document.hidden ? 0 : Math.min((now - last) / 1000, .1) * speed;last = now;
    if (!paused) clock += delta;
    if (detail?.playing) {detail.time = (detail.time + delta) % detail.animation.duration;detail.bodyTime += delta;}
    if (now - lastPaint < 1000 / 30 || document.hidden) return;
    lastPaint = now;
    if(!renderScene)return;
    if (detail) {paintDetail();return;}
    for (const card of cards) {
      if (!card.visible || card.section.hidden) continue;
      resize(card.canvas);
      const elapsed = clock - card.start;
      const time = card.animation.continuous ? elapsed : elapsed % (card.animation.duration + .6);
      renderScene(card.canvas, card.animation, time, elapsed);
    }
  }
  requestAnimationFrame(tick);
}
main().catch(error => {$('load-status').textContent = `Náhled se nepodařilo načíst: ${error.message}`;console.error(error);});

function setSpawn(amount,listening=false){
  if(!detail||detail.animation.id!=='spawn')return;
  const previous=sampleScene('spawn',detail.time,detail.bodyTime,detail.manualSpawn).state.spawn;
  detail.manualSpawn=followSpawn(previous,amount,listening,detail.bodyTime*1000);detail.playing=true;
  $('spawn-proximity').value=String(amount*100);
  $('spawn-value').textContent=listening?'Poslouchám':Math.round(amount*100)+' %';
  paintDetail();
}
$('spawn-proximity').oninput=event=>setSpawn(Number(event.target.value)/100);
$('spawn-touch').onclick=()=>setSpawn(1,true);
$('spawn-idle').onclick=()=>setSpawn(0);
