import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openCatalog } from './catalog.mjs';

async function freePort() {
  const server = http.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
test('samostatný průvodce funguje bez katalogu i s místně připojeným katalogem', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dod-guide-'));
  const mock = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'tev1:4b' }] }));
    let body = ''; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const answers = Object.fromEntries(Object.keys(input.questions).map(key => [key, key === 'quality' ? {choice:'none'} : {choice:key === 'tag_web' ? 'ano' : 'ne', probabilities:{ano:key === 'tag_web' ? 0.9 : 0.01}}]));
    res.end(JSON.stringify({ answers }));
  });
  mock.listen(0, '127.0.0.1'); await once(mock, 'listening');
  const dataDir = join(temp, 'data'); await mkdir(join(dataDir,'prace','showcase-digital-komplet'), {recursive:true});
  await writeFile(join(dataDir,'prace','showcase-digital-komplet','metadata.json'), JSON.stringify({projects:[],assets:{}}));
  try {
    for (const withData of [false, true]) {
      const port = await freePort();
      const env = { ...process.env, PORT:String(port), OLLAMA_URL:`http://127.0.0.1:${mock.address().port}`, DOD_FEEDBACK_FILE:join(temp,'feedback.jsonl'), DOD_BLIND_REVIEW_FILE:join(temp,'review.jsonl') };
      if (withData) env.DOD_DATA_DIR = dataDir; else delete env.DOD_DATA_DIR;
      const child = spawn(process.execPath, ['server.mjs'], {cwd:new URL('./',import.meta.url),env,stdio:['ignore','pipe','pipe']});
      try {
        await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Server se nespustil.');}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Server neodpověděl.')),5000);t.unref();})]);
        const base=`http://127.0.0.1:${port}`;
        for (const path of ['/','/admin','/slepe-hodnoceni','/tester-rozhodovani','/test-tagu','/vystava','/vystava.js','/vystava.css','/fonts/neue-machina-regular.otf','/fonts/neue-machina-ultrabold.otf']) assert.equal((await fetch(base+path)).status,200);
        const projects=await (await fetch(base+'/api/projects')).json(); assert.equal(projects.projectsConnected,withData); assert.deepEqual(projects.projects,[]);
        const result=await (await fetch(base+'/api/classify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Ukaž web',model:'tev1:4b'})})).json();
        assert.equal(result.category.id,'web'); assert.equal(result.projectsConnected,withData); assert.equal(result.project,null);
        const blind=await (await fetch(base+'/api/blind-review')).json(); assert.equal(blind.total,0);
      } finally { child.kill(); await once(child,'exit'); }
    }
  } finally { mock.closeAllConnections(); await new Promise(resolve => mock.close(resolve)); await rm(temp,{recursive:true,force:true}); }
});


test('textové hledání vrací odpovídající práce seřazené podle známky', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dod-topic-'));
  try {
    const dir = join(temp, 'prace', 'showcase-digital-komplet');
    await mkdir(dir, { recursive: true });
    const projects = [{id:'a', title:'Design města', author:'Jana Nováková', grade:'A', year:'2025/2026'}, {id:'b', title:'Design krajiny', author:'Petr Horák', grade:'B', year:'2025/2026'}, {id:'c', title:'Ilustrace', author:'Eva Nováková', grade:'C', year:'2025/2026'}, {id:'d', title:'Jiná tvorba', author:'Kryštof Tamaši', grade:'D', year:'2025/2026'}];
    projects.push({id:'e', title:'Další tvorba', author:'Pavel Mikulecký', grade:'D', year:'2025/2026'});
    const assets = Object.fromEntries(projects.map(p => [p.id, {image:{file:`obrazky/${p.id}.jpg`}, uses:[{project_id:p.id}]}]));
    await writeFile(join(dir, 'metadata.json'), JSON.stringify({projects, assets}));
    const catalog = await openCatalog(pathToFileURL(temp + '/'), []);
    const result = catalog.searchTopic('design');
    assert.deepEqual(result.projects.map(p => p.id), ['a', 'b']);
    assert.equal(result.project.id, 'a');
    assert.deepEqual(new Set(catalog.searchTopic('Nováková').projects.map(p => p.id)), new Set(['a','c']));
    const authorTerms = catalog.refineAuthorTerms('Nováková', 'práce od Jany Novákové');
    assert.deepEqual(authorTerms, ['jany', 'novákové']);
    assert.deepEqual(catalog.searchTopic('Nováková', null, null, [], authorTerms).projects.map(p => p.id), ['a']);
    assert.deepEqual(catalog.refineAuthorTerms('Nováková', 'práce od Novákové'), []);
    const tamasi = catalog.refineAuthorTerms('tamašiho', 'práce od Kryštofa Tamašiho');
    assert.deepEqual(tamasi, ['kryštofa', 'tamašiho']);
    assert.deepEqual(catalog.searchTopic('tamašiho', null, null, [], tamasi).projects.map(p => p.id), ['d']);
    const mikulecky = catalog.refineAuthorTerms('mikuleckého', 'práce od Pavla Mikuleckého');
    assert.deepEqual(mikulecky, ['pavla', 'mikuleckého']);
    assert.deepEqual(catalog.searchTopic('mikuleckého', null, null, [], mikulecky).projects.map(p => p.id), ['e']);
    assert.deepEqual(catalog.searchTopic('pavla', null, null, [], mikulecky).projects.map(p => p.id), ['e']);
    assert.deepEqual(catalog.searchTopic('krajiny').projects.map(p => p.id), ['b']);
    assert.equal(catalog.searchTopic('Nováková', ['2024/2025']).project, null);
  } finally { await rm(temp, {recursive:true, force:true}); }
});

test('nejlepší postupně doplňuje známky A+, A a B i při hledání tématu', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dod-best-'));
  try {
    const dir = join(temp, 'prace', 'showcase-digital-komplet');
    await mkdir(dir, { recursive: true });
    const projects = [{id:'plus', title:'Design města', grade:'A+', year:'2025/2026'}, {id:'a', title:'Design města', grade:'A', year:'2025/2026'}, {id:'b', title:'Design města', grade:'B', year:'2025/2026'}];
    const assets = Object.fromEntries(projects.map(p => [p.id, {image:{file:`obrazky/${p.id}.jpg`}, uses:[{project_id:p.id}]}]));
    await writeFile(join(dir, 'metadata.json'), JSON.stringify({projects, assets}));
    const catalog = await openCatalog(pathToFileURL(temp + '/'), []);
    const first = catalog.pick(null, null, null, ['A+', 'A']);
    assert.deepEqual(catalog.pickMany(null, null, null, ['A+', 'A'], first).map(p => p.grade), ['A+', 'A']);
    assert.deepEqual(catalog.searchBestTopic('města').projects.map(p => p.grade), ['A+', 'A', 'B']);
    assert.deepEqual(catalog.searchBestTopic('města', ['2024/2025']).projects || [], []);
  } finally { await rm(temp, {recursive:true, force:true}); }
});


test('nejhorší hledá od F nahoru i v tématu a zachovává rok', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dod-worst-'));
  try {
    const dir = join(temp, 'prace', 'showcase-digital-komplet');
    await mkdir(dir, {recursive:true});
    const projects = [{id:'f',title:'Festival',grade:'F',year:'2024/2025'}, {id:'e',title:'Festival',grade:'E',year:'2025/2026'}, {id:'b',title:'Festival',grade:'B',year:'2025/2026'}];
    const assets = Object.fromEntries(projects.map(p => [p.id, {image:{file:`obrazky/${p.id}.jpg`}, uses:[{project_id:p.id}]}]));
    await writeFile(join(dir,'metadata.json'),JSON.stringify({projects,assets}));
    const catalog = await openCatalog(pathToFileURL(temp + '/'), []);
    assert.equal(catalog.pickWorst(null).grade,'F');
    assert.equal(catalog.pickWorst(null,null,['2025/2026']).grade,'E');
    assert.equal(catalog.searchWorstTopic('festival',['2025/2026']).project.grade,'E');
    assert.equal(catalog.searchWorstTopic('festival').project.grade,'F');
  } finally { await rm(temp,{recursive:true,force:true}); }
});

test('nejstarší a nejnovější upřednostní rok před známkou', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dod-year-order-'));
  const mock = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const answers = Object.fromEntries(Object.keys(input.questions).map(key => [key, key === 'quality' ? {choice: input.state.includes('nejlepší') ? 'best' : 'none'} : key === 'topic' ? {choice:'none'} : {choice:key === 'tag_web' ? 'ano' : 'ne', probabilities:{ano:key === 'tag_web' ? 0.9 : 0.01}}]));
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({answers}));
  });
  mock.listen(0,'127.0.0.1'); await once(mock,'listening');
  const dir=join(temp,'prace','showcase-digital-komplet'); await mkdir(dir,{recursive:true});
  const projects=[{id:'old',title:'Starý web',grade:'A',year:'2019/2020',tags:['web']},{id:'new',title:'Nový web',grade:'C',year:'2025/2026',tags:['web']}];
  const assets=Object.fromEntries(projects.map(p=>[p.id,{image:{file:`obrazky/${p.id}.jpg`},uses:[{project_id:p.id}]}]));
  await writeFile(join(dir,'metadata.json'),JSON.stringify({projects,assets}));
  const port=await freePort(); const env={...process.env,PORT:String(port),OLLAMA_URL:`http://127.0.0.1:${mock.address().port}`,DOD_DATA_DIR:temp,DOD_TOPIC_WITH_TAGS:'1'};
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('./',import.meta.url),env,stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('Server se nespustil.');})]);
    for (const [text,id,order] of [['Nejstarší web','old','oldest'],['Nejnovější web','new','newest'],['Nové webové práce','new','newest'],['Nejnovější nejlepší web','old','newest']]) {
      const response=await fetch(`http://127.0.0.1:${port}/api/classify`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,model:'tev1:4b'})});
      const result=await response.json(); assert.equal(response.status,200); assert.equal(result.project?.id,id); assert.equal(result.yearOrder,order); assert.deepEqual(result.projects.map(p => p.id), text.includes('nejlepší') ? ['old'] : order === 'oldest' ? ['old','new'] : ['new','old']);
    }
  } finally { child.kill(); await once(child,'exit'); mock.closeAllConnections(); await new Promise(resolve=>mock.close(resolve)); await rm(temp,{recursive:true,force:true}); }
});
