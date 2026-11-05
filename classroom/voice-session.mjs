import {MIN_RECORDING_MS} from '../src/listening.js';

export class VoiceSession {
  constructor({classify,transcribe,onChange,stations=()=>[],clock=()=>performance.now()}){
    this.classify=classify;this.transcribe=transcribe;this.onChange=onChange;this.stations=stations;this.readyImages=new Map();
    this.clock=clock;this.phaseSince=clock();
    // A connected recorder must not confuse a server restart with its previous request.
    this.serial=Date.now();this.state={phase:'idle',session:this.serial,transcript:'',message:''};
  }
  set(values){if(['finishing','transcribing','thinking'].includes(values.phase)&&!Number.isFinite(this.state.thinkingAt))values.thinkingAt=this.clock();if(values.phase&&values.phase!==this.state.phase){this.phaseSince=this.clock();if(values.phase==='presenting')values.tourPauseMs=0;}this.state={...this.state,...values};this.onChange(this.state);}
  begin({holdToTalk=false,replace=false}={}){
    if(!this.state.demo&&['finishing','transcribing','thinking'].includes(this.state.phase))return false;
    if(!replace&&this.state.phase==='listening')return false;
    const now=this.clock();
    const source=this.state.phase==='presenting'?{...this.state,resetGesture:null,
      tourPauseMs:(this.state.tourPauseMs||0)+(this.state.resetGesture?.phase==='holding'?Math.max(0,now-this.state.resetGesture.startedAt):0)}:null;
    const recall=this.state.recall||(source?{source,startedAt:now}:null);
    this.owner=null;this.serial++;this.phaseSince=now;
    this.state={phase:'listening',holdToTalk,session:this.serial,transcript:'',message:'Poslouchám…',recall};
    this.onChange(this.state);return true;
  }
  claim(session,owner){if(this.state.demo||session!==this.serial||this.state.phase!=='listening'||this.owner&&this.owner!==owner)return false;this.owner=owner;return true;}
  finish(){
    if(this.state.phase!=='listening')return;
    // A short tap cancels the session before any recorder can upload its audio.
    if(this.state.holdToTalk&&this.clock()-this.phaseSince<MIN_RECORDING_MS){this.cancelRecording();return;}
    this.set({phase:'finishing',message:'Dokončuji nahrávání…'});
  }
  tick(){
    if(this.state.demo&&!this.state.prepared)return;
    const elapsed=this.clock()-this.phaseSince;
    if(this.state.prepared&&this.state.phase==='thinking'&&this.clock()-this.state.thinkingAt>=6000&&this.state.assignments.every(a=>this.readyImages.get(a.station)===this.imageUrl(a.project))){this.set({phase:'presenting',revealAt:this.clock(),prepared:false});return;}
    if(this.state.prepared&&this.clock()-this.state.preparedAt>30000){this.fail(this.serial,'Obrázek se nepodařilo načíst na všech obrazovkách. Zkus požadavek znovu.');return;}
    if(this.state.phase==='listening'&&elapsed>=25000)this.finish();
    else if(this.state.phase==='finishing'&&elapsed>=10000)this.cancelRecording();
  }
  imageUrl(project){return project?.images?.[0]?.url||null;}
  changeImage(session,station,step){
    if(session!==this.serial||this.state.phase!=='presenting'||this.state.resetGesture||![-1,1].includes(step))return false;
    const work=this.state.assignments?.find(a=>a.station===station)?.project;
    const images=work?.images?.filter(image=>!image.hidden&&typeof image.url==='string')||[];
    if(images.length<2)return false;
    const previous=this.state.imageIndices?.[station],index=previous?.project===work.id?previous.index:0;
    this.set({imageIndices:{...this.state.imageIndices,[station]:{project:work.id,index:(index+step+images.length)%images.length}}});
    return true;
  }
  imagesReady(session,station,url=null){
    const assignment=this.state.assignments?.find(item=>item.station===station);
    if(session===this.serial&&this.state.prepared&&assignment&&url===this.imageUrl(assignment.project))this.readyImages.set(station,url);
  }
  imageReadiness(){
    const assignments=this.state.assignments||[];
    return {ready:assignments.filter(a=>this.readyImages.get(a.station)===this.imageUrl(a.project)).map(a=>a.station),waiting:assignments.filter(a=>this.readyImages.get(a.station)!==this.imageUrl(a.project)).map(a=>a.station)};
  }
  reset(){this.serial++;this.phaseSince=this.clock();this.state={phase:'idle',session:this.serial,transcript:'',message:''};this.onChange(this.state);}
  cancelRecording(){
    const source=this.state.recall?.source;
    if(!source){this.reset();return;}
    this.owner=null;this.serial++;this.phaseSince=this.clock();
    this.state={...source,session:this.serial,tourSession:source.tourSession??source.session};
    this.onChange(this.state);
  }
  preview(scene,projects=[],category=null){
    // A new session cancels pending model work and any previous microphone owner.
    this.serial++;this.owner=null;this.readyImages=new Map();this.phaseSince=this.clock();
    this.state={phase:scene.phase,demo:scene.id,session:this.serial,transcript:'',message:scene.title,thinkingAt:this.clock(),
      projects,project:projects[0]||null,assignments:[],category};
    if(scene.works){
      if(!projects.length)this.state={...this.state,phase:'empty',message:'V katalogu nejsou dostupné obrázky pro tuto ukázku.'};
      else Object.assign(this.state,this.presentation(projects),{prepared:true,preparedAt:this.clock()});
    }
    this.onChange(this.state);
  }
  fail(session,message){if(session===this.serial)this.set({phase:'error',prepared:false,message});}
  presentation(projects){
    const stations=[...new Set(this.stations())].filter(id=>Number.isInteger(id)&&id>=1&&id<=10);
    const assignments=projects.slice(0,stations.length).map((project,i)=>({station:stations[i],project}));
    return {assignments,station:assignments[0]?.station??null,message:assignments.length?
      `Nalezeno prací: ${projects.length} · zobrazeno ${assignments.length} na ${assignments.length} obrazovkách.`:
      `Nalezeno prací: ${projects.length} · čekám na připojení obrazovek.`};
  }
  redistribute(){
    if(this.state.phase!=='presenting'&&!this.state.prepared)return;
    const next=this.presentation(this.state.projects);
    if(JSON.stringify(next.assignments)!==JSON.stringify(this.state.assignments))this.set(next);
  }
  async submit({session,text,audio}){
    if(this.state.demo||session!==this.serial||!['listening','finishing'].includes(this.state.phase))throw Object.assign(new Error('Tento požadavek už není aktivní.'),{status:409});
    try{
      const recalling=!!this.state.recall;
      this.set({phase:audio?'transcribing':'thinking',message:audio?'Přepisuji řeč…':'Vybírám práci…',
        ...(!audio&&recalling?{recall:null,thinkingAt:this.clock()}:{})});
      if(audio)text=await this.transcribe(audio);
      if(session!==this.serial)return;
      text=text?.trim();if(!text||text.length>2000)throw new Error('Zadej nebo nadiktuj krátký požadavek.');
      this.set({phase:'thinking',transcript:text,message:'Vybírám práci…',...(recalling?{recall:null,thinkingAt:this.clock()}:{})});
      const result=await this.classify(text);
      if(session!==this.serial)return;
      const candidates=result.projects?.length?result.projects:result.project?[result.project]:[];
      const projects=[...new Map(candidates.filter(Boolean).map(p=>[p.id||p,p])).values()].slice(0,10);
      const project=projects[0]||null;
      const presentation=project?this.presentation(projects):{assignments:[],station:null,message:result.clarification||'Pro tento požadavek jsem práci nenašel. Zkus jiný obor nebo rok.'};
      this.readyImages=new Map();
      this.set({phase:project?'thinking':'empty',prepared:!!project,preparedAt:this.clock(),project,projects,...presentation,categories:result.categories||[],years:result.years,quality:result.quality,
        legacyCategoryFallback:result.legacyCategoryFallback||false});
    }catch(error){if(session===this.serial)this.fail(session,error.message);throw error;}
  }
}
