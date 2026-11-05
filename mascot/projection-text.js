export const defaultProjectionText={prompt:{x:.5,y:.38,size:.075},listening:{x:.5,y:.65,size:.045}};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function normalizeProjectionText(input){
  return Object.fromEntries(Object.entries(defaultProjectionText).map(([name,defaults])=>[name,
    Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,Number.isFinite(input?.[name]?.[key])?
      clamp(input[name][key],key==='size'?.02:0,key==='size'?.2:1):fallback]))]));
}
export function projectionTextSettings(){
  if(typeof window==='undefined')return defaultProjectionText;
  if(!window.DodProjectionText){
    let saved;try{saved=JSON.parse(localStorage.getItem('dod-projection-text'));}catch{}
    window.DodProjectionText=normalizeProjectionText(saved);
  }
  return window.DodProjectionText;
}
export function setProjectionText(settings){
  const value=normalizeProjectionText(settings);
  if(typeof window!=='undefined'){
    window.DodProjectionText=value;
    try{localStorage.setItem('dod-projection-text',JSON.stringify(value));}catch{}
  }
  return value;
}
