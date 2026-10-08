import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
export async function reactRuntime(directory){
 const root=path.join(directory,'react-preview-runtime'),aliases={};
 for(const name of ['react','react-dom','scheduler']){
  const metadata=require.resolve(name+'/package.json'),source=path.dirname(metadata),bytes=await fs.readFile(metadata),pkg=JSON.parse(bytes);
  const destination=path.join(root,name+'-'+pkg.version);
  // Trusted bundled runtime, copied outside ASAR for the dependency optimizer.
  await fs.mkdir(destination,{recursive:true});
  const copy=async(current,relative='')=>{for(const entry of await fs.readdir(current,{withFileTypes:true})){
   if(entry.isSymbolicLink())throw new Error('The bundled React runtime contains a linked file.');
   const next=path.join(relative,entry.name),target=path.join(destination,next);
   if(entry.isDirectory()){await fs.mkdir(target,{recursive:true});await copy(path.join(current,entry.name),next);}
   else if(entry.isFile()){const data=await fs.readFile(path.join(current,entry.name));let same=false;try{same=data.equals(await fs.readFile(target));}catch(error){if(error.code!=='ENOENT')throw error;}if(!same)await fs.writeFile(target,data);}
  }};
  await copy(source);aliases[name]=destination;
 }
 return {root,aliases,cacheDir:path.join(directory,'react-preview-cache')};
}
export function previewCache(directory){return createHash('sha256').update(path.resolve(directory)).digest('hex').slice(0,16);}
