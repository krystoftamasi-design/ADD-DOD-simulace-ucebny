import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const exec=promisify(execFile);
const {categories}=JSON.parse(await readFile(new URL('../pruvodce/categories.json',import.meta.url),'utf8'));
const speechPrompt=`Studentské práce: ${categories.map(category=>category.name).join(', ')}. Webové práce, webové stránky, animace, nejlepší práce, nejhorší práce, školní rok.`;
export async function speechAvailable(model){try{await access(model);return true;}catch{return false;}}
export async function transcribe(audio,model){
  if(!await speechAvailable(model))throw new Error('Chybí lokální model pro přepis řeči.');
  const dir=await mkdtemp(join(tmpdir(),'dod-speech-'));
  try{
    const input=join(dir,'input'),wav=join(dir,'speech.wav'),out=join(dir,'result');
    await writeFile(input,audio);
    await exec(process.env.DOD_FFMPEG||'/opt/homebrew/bin/ffmpeg',['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',input,'-vn','-t','25','-ar','16000','-ac','1','-c:a','pcm_s16le',wav],{timeout:30000,maxBuffer:100000});
    await exec(process.env.DOD_WHISPER||'/opt/homebrew/bin/whisper-cli',['-m',model,'-f',wav,'-l','cs','--prompt',speechPrompt,'-oj','-of',out,'-np','-nt','-t','4','-bs','1','-bo','1'],{timeout:90000,maxBuffer:1000000});
    const result=JSON.parse(await readFile(out+'.json','utf8'));
    const text=(result.transcription||[]).map(segment=>segment.text).join(' ').replace(/\[(?:BLANK_AUDIO|SILENCE|MUSIC)\]|\((?:zvuk|hudba|ticho)\)/gi,'').trim();
    if(!text)throw new Error('Nezachytil jsem řeč. Zkus to prosím znovu.');
    return text;
  }catch(error){
    if(error.message.startsWith('Nezachytil'))throw error;
    console.error('Přepis selhal:',error.message.slice(0,300));
    throw new Error('Nahrávku se nepodařilo přepsat. Přilož prst a zkus to prosím znovu.');
  }finally{await rm(dir,{recursive:true,force:true});}
}
