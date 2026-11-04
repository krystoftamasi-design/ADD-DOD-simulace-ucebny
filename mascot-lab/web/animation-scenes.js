export const categories = [
  {id:'transitions',name:'Přechody mezi monitory',short:'Přechody'},
  {id:'utils',name:'Interakce s návštěvníkem',short:'Interakce'},
  {id:'work',name:'Odhalení a zobrazení prací',short:'Práce'},
];

export const animations = [
  {id:'left-right',category:'transitions',name:'Mezi pracemi · doprava',duration:5,kind:'transition',note:'Aktuální organický přelet: plynulý rozjezd, opožděné kuličky a měkké dosednutí u rohu obrázku. Následuje pohled a mrknutí.'},
  {id:'right-left',category:'transitions',name:'Mezi pracemi · doleva',duration:5,kind:'transition',note:'Stejný přelet opačným směrem. Levá hrana navazuje na pravou; maskot přistane u skutečného rohu zobrazené práce.'},
  {id:'spawn',category:'utils',name:'Spawn · přivolání Flickem',duration:10,kind:'classroom',note:'Přiblížení shlukuje volné kuličky do původního tvaru na projekci. Oddálení bez dotyku je rozptýlí. Přiblížení a dotyk lze vyzkoušet ovladači níže.'},
  {id:'listening',category:'utils',name:'Poslouchání',duration:6,kind:'classroom',continuous:true,note:'Dotyk drží maskota na projekci s pohledem dolů. Po ukončení nahrávání navazuje přemýšlení.'},
  {id:'thinking',category:'utils',name:'Přemýšlení · popcorn',duration:6.5,kind:'classroom',note:'Dvě sekundy zavřených třesoucích se očí, pak vykulení a dvě mrknutí. Po druhém se vrátí běžný pohled. Kuličky popají do kruhu a odspodu postupně zaplňují řady monitorů.'},
  {id:'hover-reset',category:'utils',name:'Hover · rozprsknutí a restart',duration:4,kind:'classroom',note:'Podržením ruky na Z ≤ 66 % se maskot zastaví, vykulí oči a lehce bobtná na místě. Po 1,5 sekundy se rozprskne do všech monitorů a vrátí volné kuličky. Oddálení před limitem obnoví pohyb.'},
  {id:'reveal',category:'work',name:'Odhalení prací · návrat maskota',duration:3.5,kind:'classroom',note:'Kuličky na monitorech rychle odkryjí práce. Na projekci se stáhnou do původního maskota, který se po krátké přípravě rozletí k prvnímu obrázku.'},
  {id:'single-work',category:'work',name:'Jedna nalezená práce',duration:14,kind:'classroom',note:'Maskot přiletí k obrázku a navštěvuje různé rohy. Zastaví se, podívá se na práci, mrkne a po přípravě odletí. Některé kuličky se opožďují a měkce dobíhají. Obrázek v přehledu je ukázkový.'},
  {id:'category-work',category:'work',name:'Více nalezených prací',duration:24,kind:'classroom',note:'Jediný maskot odletí z projekce a navštěvuje rohy zobrazených prací. Plynulý rozjezd a brzdění, opožděné kuličky, zastavení, pohled a mrknutí. Obrázky v přehledu jsou ukázkové.'},
];

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export const demoWorks=Array.from({length:10},(_,i)=>({
  id:'preview-'+(i+1),title:'Ukázka práce '+String(i+1).padStart(2,'0'),author:'Ukázkový obsah',year:'2025/2026',grade:'A',
  description:'Práce zkoumá vztah obrazu, tvaru a prostoru. Vizuální řešení propojuje jednoduché geometrické prvky, výraznou barevnost a hledání nových souvislostí.\n\nSoubor představuje proces od prvních skic přes materiálové experimenty až k výsledné kompozici.',
  images:[{url:'/assets/gallery-work-'+(i%3+1)+'.svg'}],
}));
const assignments=demoWorks.map((project,i)=>({station:i+1,project}));
export function transitionWindow(tour,id){
  const from=id==='left-right'?3:2,to=id==='left-right'?2:3;
  const leg=tour.legs.find(item=>item.from.station===from&&item.to.station===to);
  const start=tour.launchAt+tour.initial.end+leg.start;
  return {start,end:start+leg.flight+leg.to.dwell-250};
}

// Only the demonstration's inputs are scripted here. Painting and motion are
// delegated to the same timeline, guide and spawn renderers as the simulator.
export function sampleScene(id,time,bodyTime=time,manualSpawn=null,revealDuration=400,transition=null){
  const animation=animations.find(item=>item.id===id);
  if(!animation)throw new Error('Unknown animation: '+id);
  const t=animation.continuous?Math.max(0,time):Math.max(0,Math.min(time,animation.duration));
  const now=bodyTime*1000;
  const spawn={enabled:true,phase:'idle',amount:{from:0,to:0,at:now,duration:1},flow:{seconds:bodyTime,at:now},listeningAt:null};
  const state={mode:'animation',playing:true,startAt:now-t*1000,elapsed:0,stepMs:2500,order:[1,2,3,4,5,6,7,8,9,10],experiment:true,spawn,guide:{phase:'idle'}};
  let label='VOLNÉ KULIČKY';
  if(animation.kind==='transition'){
    const age=transition?Math.min(transition.start+t*1000,transition.end):t*1000;
    state.guide={phase:'presenting',session:1,revealAt:now-age,assignments:[assignments[2],assignments[1]]};
    return {now,state,label:id==='left-right'?'MEZI PRACEMI · DOPRAVA':'MEZI PRACEMI · DOLEVA',surfaces:[3,2]};
  }
  if(id==='spawn'||id==='listening'){
    const amount=id==='listening'?1:manualSpawn?clamp(manualSpawn.amount):smooth((t-1.5)/2)*(1-smooth((t-6)/2));
    const listening=id==='listening'||manualSpawn?.listening;
    spawn.amount.from=spawn.amount.to=amount;
    spawn.phase=listening?'listening':amount>.015?'gathering':'idle';
    state.guide={phase:listening?'listening':'idle'};
    label=listening?'DOTEK · POSLOUCHÁNÍ':amount>.015?'PŘIBLÍŽENÍ · SHLUKOVÁNÍ':'VOLNÉ KULIČKY';
  }else if(id==='thinking'){
    spawn.amount.from=spawn.amount.to=1;spawn.phase='listening';
    state.guide={phase:'thinking',thinkingAt:now-t*1000};
    label=t<2?'PŘEMÝŠLENÍ · SOUSTŘEDĚNÍ':'PŘEMÝŠLENÍ · BOBTNÁNÍ';
  }else if(id==='hover-reset'){
    const start=now-t*1000,burstAt=start+resetTimings.hold;
    const source={phase:'presenting',session:1,revealAt:start-5000,projects:demoWorks,assignments};
    const resetSpawn={enabled:true,phase:'idle',amount:{from:0,to:0,at:burstAt,duration:300},flow:{seconds:0,at:burstAt},listeningAt:null};
    if(t<(resetTimings.hold+resetTimings.burst)/1000){
      const holding=t<resetTimings.hold/1000;
      state.guide={...source,resetGesture:{phase:holding?'holding':'burst',source,frozenAt:start,
        startedAt:holding?start:burstAt,duration:holding?resetTimings.hold:resetTimings.burst,spawn:resetSpawn}};
      label=holding?'HOVER · '+t.toFixed(1).replace('.',',')+' / 1,5 s':'RESET · ROZPRSKNUTÍ';
    }else{Object.assign(spawn,resetSpawn);label='RESET · VOLNÉ KULIČKY';}
  }else{
      const revealAt=now-(t-.25)*1000;
      state.guide={phase:t<.25?'thinking':'presenting',session:1,thinkingAt:revealAt-6500,revealAt,
        assignments:id==='single-work'?[assignments[2]]:assignments};
      label=t<.25?'OBRÁZKY NAČTENÉ':t<.25+revealDuration/1000?'ODHALENÍ PRACÍ':'NALEZENÉ PRÁCE';
  }
  return {now,state,label};
}
import {resetTimings} from './reset-model.js';
