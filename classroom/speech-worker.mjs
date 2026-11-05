import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

let worker, modelPath, ready, sequence=0;
const pending=new Map();
export function stopSpeechWorker(){
  const child=worker;worker=null;ready=null;
  child?.kill();
  for(const request of pending.values())request.reject(new Error('Whisper worker stopped'));
  pending.clear();
}
export function warmSpeechWorker(model){
  if(worker&&modelPath===model)return ready;
  stopSpeechWorker();modelPath=model;
  const child=spawn(process.env.DOD_SPEECH_PYTHON||'python',['-u',fileURLToPath(new URL('../scripts/handy_transcribe.py',import.meta.url)),'--worker',model],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  worker=child;
  ready=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{reject(new Error('Whisper load timeout'));if(worker===child)stopSpeechWorker();},120000);
    const fail=error=>{clearTimeout(timeout);reject(error);if(worker===child)stopSpeechWorker();};
    child.on('error',fail);
    child.on('exit',code=>fail(new Error('Whisper worker exited: '+code)));
    child.stdin.on('error',fail);
    child.stderr.on('data',chunk=>console.error('Whisper:',String(chunk).trim().slice(-1000)));
    createInterface({input:child.stdout}).on('line',line=>{
      if(!line.startsWith('DOD:'))return;
      let reply;try{reply=JSON.parse(line.slice(4));}catch{return;}
      if(reply.ready){clearTimeout(timeout);resolve();return;}
      const request=pending.get(reply.id);if(!request)return;
      pending.delete(reply.id);
      if(reply.error)request.reject(new Error(reply.error));else request.resolve(reply.result);
    });
  });
  return ready;
}
export async function transcribeWithWorker(model,audio){
  await warmSpeechWorker(model);
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timeout=setTimeout(()=>{stopSpeechWorker();},90000);
    pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
    worker.stdin.write(JSON.stringify({id,audio})+'\n');
  });
}
