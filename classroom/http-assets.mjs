import {createHash} from 'node:crypto';
import {stat,readFile} from 'node:fs/promises';

const stamp=info=>`${info.mtimeNs}-${info.ctimeNs}-${info.size}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
function unchanged(req,res,etag,type){
  // Revalidate on every use: edits remain visible even at the same URL.
  res.setHeader('Cache-Control','private, no-cache');
  res.setHeader('ETag',etag);res.setHeader('Content-Type',type);
  const tags=(req.headers['if-none-match']||'').split(',').map(tag=>tag.trim().replace(/^W\//,''));
  if(tags.includes('*')||tags.includes(etag.replace(/^W\//,''))){res.writeHead(304);res.end();return true;}
  return false;
}
export async function sendAsset(req,res,file,type){
  const info=await stat(file,{bigint:true});
  if(unchanged(req,res,`W/"${stamp(info)}"`,type))return;
  const body=await readFile(file);
  res.setHeader('Content-Length',body.length);res.end(body);
}
export function sendImage(req,res,body,type){
  if(unchanged(req,res,`"${hash(body)}"`,type))return;
  res.setHeader('Content-Length',body.length);res.end(body);
}
export async function animationVersion(files){
  const stamps=await Promise.all(files.map(async file=>`${file}:${stamp(await stat(file,{bigint:true}))}`));
  return hash(stamps.join('\n'));
}
