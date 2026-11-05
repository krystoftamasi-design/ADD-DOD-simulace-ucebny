import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./display.js',import.meta.url),'utf8');
const calibration=source.slice(source.indexOf('\n(function(){',1));
const expected=[[0,0.009259259700775147],[0.9833333969116211,0.02037037081188626],[0.9645833969116211,0.8287037319607204],[0.02604166865348816,0.8657407972547743]];
function load(width,height,saved={}){
  const elements=new Map(),handles=[];
  function element(){return {style:{},classList:{add(){},toggle(){}},setAttribute(){},addEventListener(){}};}
  const window={addEventListener(){},dispatchEvent(){}};
  const document={body:{classList:{add(){},toggle(){}},appendChild(el){if(el.className==='calibration-point')handles.push(el);}},
    createElement:element,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
  vm.runInNewContext(calibration,{document,window,location:{pathname:'/projector'},innerWidth:width,innerHeight:height,
    localStorage:{getItem:key=>saved[key],removeItem:key=>delete saved[key]},Event:class {},setTimeout(){},clearTimeout(){}});
  return {handles,window,elements};
}
function corners(result){return result.handles.map(el=>[parseFloat(el.style.left)/100,parseFloat(el.style.top)/100]);}
function close(actual,wanted){actual.forEach((point,i)=>point.forEach((value,j)=>assert.ok(Math.abs(value-wanted[i][j])<1e-14)));}

test('a clean Mac and Windows use the exact shared crop at different resolutions',()=>{
  for(const [w,h] of [[1920,1080],[1440,900],[2560,1440]]){
    const result=load(w,h,{'dod-projector-perspective-v1':'[[0,0],[1,0],[1,1],[0,1]]'});
    close(corners(result),expected);
    assert.ok(result.window.DodProjectionSize.width>0);
    assert.ok(result.window.DodProjectionSize.height>0);
    assert.ok(!/NaN|Infinity/.test(result.elements.get('stage').style.transform));
  }
});
test('new local adjustments survive reload and reset returns to the shared crop',()=>{
  const local=[[.1,.1],[.9,.1],[.9,.9],[.1,.9]];
  const result=load(1920,1080,{'dod-projector-perspective-v2':JSON.stringify(local)});
  close(corners(result),local);
  result.elements.get('calibration-reset').onclick();
  close(corners(result),expected);
});
test('malformed and degenerate local settings fall back to the shared crop',()=>{
  for(const saved of ['bad','null','[[0,0],[0,0],[0,0],[0,0]]'])
    close(corners(load(1920,1080,{'dod-projector-perspective-v2':saved})),expected);
});
