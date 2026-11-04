import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function client(prepare){
 let guide={session:1,prepared:true,assignments:[{station:6,project:{images:[{url:'/guide/media/1'}]}}]},options;
 const acks=[],events={},raf=[];
 const api={connected:true,state:()=>({mode:'animation',guide}),station:()=>6,label:()=> '06',imagesReady:(...args)=>acks.push(args)};
 const elements={stage:{getContext:()=>({})},status:{},fullscreen:{style:{}}};
 const window={DodRoom:function(o){options=o;return api;},DodGuide:prepare?{prepare}:null,addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>raf.push(fn)};
 const scope={window,document:{hidden:true,getElementById:id=>elements[id],addEventListener(){}},location:{search:'',pathname:'/',protocol:'http:',host:'localhost:8000'},innerWidth:1920,innerHeight:1080,setTimeout:()=>1,clearTimeout(){}};
 vm.runInNewContext(readFileSync(new URL('./display.js',import.meta.url),'utf8'),scope);
 return {window,api,acks,events,raf,change:()=>options.onChange(api),setGuide:g=>guide=g};
}
test('hidden display preloads and acknowledges an image without any animation frames',async()=>{
 let calls=0;const c=client(()=>{calls++;return Promise.resolve('/guide/media/1');});
 c.change();c.change();await Promise.resolve();
 assert.equal(calls,1);assert.equal(c.acks.length,1);assert.deepEqual(c.acks[0],[1,'/guide/media/1']);
 assert.equal(c.raf.length,1); // Scheduled but deliberately never executed.
});
test('the renderer-ready event starts preloading even when the tab has no animation frames',async()=>{
 const c=client();c.change();assert.equal(c.acks.length,0);
 c.window.DodGuide={prepare:()=>Promise.resolve('/guide/media/1')};c.events['dod-guide-ready']();await Promise.resolve();
 assert.deepEqual(c.acks[0],[1,'/guide/media/1']);
});
test('an image completing after the assignment changes cannot acknowledge the old project',async()=>{
 const pending=[];const c=client(()=>new Promise(resolve=>pending.push(resolve)));
 c.change();c.setGuide({session:1,prepared:true,assignments:[{station:6,project:{images:[{url:'/guide/media/2'}]}}]});c.change();
 pending[0]('/guide/media/1');await Promise.resolve();assert.equal(c.acks.length,0);
 pending[1]('/guide/media/2');await Promise.resolve();assert.deepEqual(c.acks[0],[1,'/guide/media/2']);
});
