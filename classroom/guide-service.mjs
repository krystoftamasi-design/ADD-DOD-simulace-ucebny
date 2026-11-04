import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {openCatalog} from '../pruvodce/catalog.mjs';
import {randomInt} from 'node:crypto';
const source=new URL('../pruvodce/server.mjs',import.meta.url);
const publicProject=project=>({id:project.id,title:project.title,author:project.author,year:project.year,grade:project.grade,tags:project.tags,description:project.description,
  images:project.images.filter(image=>!image.hidden).map(image=>({url:'/guide'+image.url,width:image.width,height:image.height}))});
export async function startGuideService(dataDir){
  const url=process.env.DOD_GUIDE_URL||'http://127.0.0.1:18187';
  let child;
  if(!process.env.DOD_GUIDE_URL){
    child=spawn(process.execPath,[fileURLToPath(source)],{env:{...process.env,PORT:'18187',DOD_DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
    child.on('error',error=>console.error('Průvodce:',error.message));
    child.stderr.on('data',chunk=>console.error(String(chunk).trim()));
  }
  const stop=()=>child?.kill('SIGTERM');
  try{
    for(let i=0;i<50;i++){
      if(child&&child.exitCode!==null)throw new Error('Průvodce se nespustil; ověř port 18187 a katalog.');
      try{const response=await fetch(url+'/api/categories',{signal:AbortSignal.timeout(500)});if(response.ok){
        const {categories}=await response.json();
        const legacyIds=new Set(['web','applications','web-ui-ux']);
        const catalog=await openCatalog(pathToFileURL(dataDir+'/'),categories.map(c=>legacyIds.has(c.id)?{...c,name:'web / UI / UX design'}:c));
        async function status(){
          const response=await fetch(url+'/api/models',{signal:AbortSignal.timeout(5000)});
          if(!response.ok)throw new Error('Ollama není dostupná.');
          const {models}=await response.json();
          const model=models.find(m=>m==='tev1:4b')||models.find(m=>m==='tev1:latest')||models.find(m=>/^tev1(?::|$)/.test(m));
          return {model:model||null,projects:catalog.list().length};
        }
        let revision=0,latestDecision=null;
        const publish=decision=>{latestDecision={revision:++revision,decision};};
        async function classify(text){
          try{
          const {model}=await status();publish({pending:true,diagnostics:{input:text,model}});if(!model)throw new Error('V Ollamě chybí Tev1.');
          const response=await fetch(url+'/api/classify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,model}),signal:AbortSignal.timeout(125000)});
          const result=await response.json();if(!response.ok)throw new Error(result.error||'Výběr práce selhal.');
          if(!result.project&&result.categories?.some(c=>legacyIds.has(c.id))){
            const primary=result.categories[0].id,secondary=result.categories[1]?.id;
            result.project=result.quality==='best'?catalog.pickBest(primary,secondary,result.years):catalog.pick(primary,secondary,result.years,result.quality==='worst'?'F':null);
            result.legacyCategoryFallback=!!result.project;
            result.projects=catalog.pickMany(primary,secondary,result.years,result.quality==='best'?result.project?.grade:result.quality==='worst'?'F':null,result.project);
          }
          const selected=result.projects?.length?result.projects:result.project?[result.project]:[];
          result.projects=selected.slice(0,10).map(publicProject);
          result.project=result.projects[0]||null;
          publish(result);return result;
          }catch(error){publish({error:error.message,diagnostics:latestDecision?.decision?.diagnostics||{input:text}});throw error;}
        }
        function sample(mode){
          let pool=catalog.list().filter(p=>catalog.bestGradeOrder.includes(p.grade)&&p.images.some(image=>!image.hidden)),category=null;
          if(mode==='category'&&pool.length){
            const tags=[...new Set(pool.flatMap(p=>p.tags||[]))];
            if(tags.length){category=tags[randomInt(tags.length)];pool=pool.filter(p=>p.tags.includes(category));}
          }
          const selected=[];
          while(pool.length&&selected.length<(mode==='single'?1:10))selected.push(pool.splice(randomInt(pool.length),1)[0]);
          return {projects:selected.map(publicProject),category};
        }
        return {url,stop,status,classify,sample,decision:()=>latestDecision};
      }}catch(error){if(error.message.includes('ENOENT'))throw error;}
      await delay(100);
    }
    throw new Error('Průvodce není dostupný.');
  }catch(error){stop();throw error;}
}
