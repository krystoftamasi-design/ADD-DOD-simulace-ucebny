import {gatherAt,flowAt} from '../mascot/spawn-model.js';

export const demoScenes=[
  {id:'idle',label:'Bublinky',title:'Volné bublinky mezi všemi monitory a projekcí.',phase:'idle',amount:0},
  {id:'spawn',label:'Spawn',title:'Kuličky se shromáždí do maskota na projekci.',phase:'idle',amount:1},
  {id:'listening',label:'Poslouchání',title:'Pohled dolů jako při poslechu, bez nahrávání.',phase:'listening',amount:1},
  {id:'transcribing',label:'Přepis',title:'Ukázka zpracování nahrávky bez volání Whisperu.',phase:'transcribing',amount:1},
  {id:'thinking',label:'Přemýšlení',title:'Soustředění a rozrůstání kuliček po obrazovkách.',phase:'thinking',amount:1},
  {id:'confused',label:'Nepochopení',title:'Maskot nerozumí požadavku a rozhlíží se.',phase:'empty',amount:1},
  {id:'error',label:'Chyba',title:'Ukázka reakce na chybu.',phase:'error',amount:1},
  {id:'single-work',label:'Jedna práce',title:'Odhalí jednu náhodnou práci ze skutečného katalogu.',phase:'thinking',amount:1,works:'single'},
  {id:'category-work',label:'Kategorie',title:'Rozloží práce z jedné náhodně zvolené kategorie.',phase:'thinking',amount:1,works:'category'},
  {id:'random-work',label:'Náhodné práce',title:'Rozloží až deset různých prací z celého katalogu.',phase:'thinking',amount:1,works:'random'},
  {id:'floating',label:'Plovoucí maskot',title:'Maskot opakovaně přechází mezi monitory.',phase:'idle',amount:0},
  {id:'live',label:'↻ Flick',title:'Ukončí ukázku a vrátí ovládání destičce a mikrofonu.'},
];

export function demoSpawn(previous,scene,now){
  return {enabled:scene.id!=='floating',phase:scene.phase==='listening'?'listening':scene.amount?'gathering':'idle',
    amount:{from:previous.enabled?gatherAt(previous,now):0,to:scene.amount,at:now,duration:scene.id==='spawn'?1600:650},
    flow:{seconds:flowAt(previous,now),at:now},listeningAt:scene.phase==='listening'?now:null};
}
