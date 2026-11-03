import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
        for (const path of ['/','/admin','/slepe-hodnoceni','/tester-rozhodovani','/test-tagu']) assert.equal((await fetch(base+path)).status,200);
        const projects=await (await fetch(base+'/api/projects')).json(); assert.equal(projects.projectsConnected,withData); assert.deepEqual(projects.projects,[]);
        const result=await (await fetch(base+'/api/classify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Ukaž web',model:'tev1:4b'})})).json();
        assert.equal(result.category.id,'web'); assert.equal(result.projectsConnected,withData); assert.equal(result.project,null);
        const blind=await (await fetch(base+'/api/blind-review')).json(); assert.equal(blind.total,0);
      } finally { child.kill(); await once(child,'exit'); }
    }
  } finally { mock.closeAllConnections(); await new Promise(resolve => mock.close(resolve)); await rm(temp,{recursive:true,force:true}); }
});
