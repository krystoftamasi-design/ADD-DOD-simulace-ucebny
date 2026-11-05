// Local animation editing: rebuild only the renderer module graph. Keeping the
// document alive preserves audio capture, WebSockets, fullscreen and scrub time.
const imports=/\bimport\s+(?:[^'";]*?\s+from\s*)?(['"])(\.[^'"\r\n]+)\1/g;
const clean=url=>{const value=new URL(url);value.search='';value.hash='';return value.href;};
function dependencies(source,url){return [...source.matchAll(imports)].map(match=>clean(new URL(match[2],url)));}
export async function readModuleGraph(entries,read=async url=>{
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('Soubor nelze načíst: '+new URL(url).pathname);
  return response.text();
}){
  const graph=new Map();let queue=Object.values(entries).map(clean);
  while(queue.length){
    const batch=[...new Set(queue)].filter(url=>!graph.has(url));queue=[];
    await Promise.all(batch.map(async url=>{graph.set(url,await read(url));}));
    for(const url of batch)queue.push(...dependencies(graph.get(url),url).filter(dependency=>!graph.has(dependency)));
  }
  return graph;
}
function equal(a,b){return a&&a.size===b.size&&[...b].every(([url,source])=>a.get(url)===source);}
export async function importModuleGraph(graph,entries){
  const urls=new Map(),visiting=new Set();
  function compile(url){
    if(visiting.has(url))throw new Error('Cyklické závislosti animace: '+url);
    if(urls.has(url))return urls.get(url);
    visiting.add(url);
    const source=graph.get(url);
    const rewritten=source.replace(imports,(match,quote,path)=>match.replace(quote+path+quote,quote+compile(clean(new URL(path,url)))+quote));
    visiting.delete(url);
    const blob=URL.createObjectURL(new Blob([rewritten+'\n//# sourceURL='+url+'\n'],{type:'text/javascript'}));
    urls.set(url,blob);return blob;
  }
  try{return Object.fromEntries(await Promise.all(Object.entries(entries).map(async([name,url])=>[name,await import(compile(clean(url)))])));}
  finally{for(const url of urls.values())URL.revokeObjectURL(url);}
}
async function readVersion(url){
  // Older/static preview servers have no version endpoint; keep their live editing.
  try{
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)return null;
    const {version}=await response.json();return typeof version==='string'?version:null;
  }catch{return null;}
}
export function createModuleReloader({entries,apply,onStatus=()=>{},read,load=importModuleGraph,versionUrl,versionRead=readVersion}){
  let attempted=null,attemptedVersion=null,busy=null,revision=0;
  async function update(){
    try{
      const version=versionUrl?await versionRead(versionUrl):null;
      if(version!==null&&version===attemptedVersion)return;
      const graph=await readModuleGraph(entries,read);
      attemptedVersion=version;
      if(equal(attempted,graph))return;
      attempted=graph;
      await apply(await load(graph,entries));
      revision++;onStatus({revision,error:null});
    }catch(error){onStatus({revision,error});}
  }
  return {refresh(){if(!busy)busy=update().finally(()=>{busy=null;});return busy;}};
}
export function watchModules(options){
  const reloader=createModuleReloader(options);let stopped=false,timer;
  async function tick(){
    clearTimeout(timer);
    if(stopped)return;
    if(!document.hidden||!timer)await reloader.refresh();
    if(!stopped)timer=setTimeout(tick,options.interval??750);
  }
  const visible=()=>{if(!document.hidden)tick();};
  document.addEventListener('visibilitychange',visible);tick();
  return {refresh:reloader.refresh,stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);}};
}
