import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const manifest=JSON.parse(await fs.readFile(path.join(root,'integrations/manifest.json'),'utf8'));
let count=0;
for(const skill of [...manifest.skills,...(manifest.referencePacks||[])])for(const [name,expected] of Object.entries(skill.files)){
  const target=path.resolve(root,'integrations',name);
  if(!target.startsWith(path.join(root,'integrations')+path.sep))throw new Error('Invalid manifest path');
  const hash=createHash('sha256').update(await fs.readFile(target)).digest('hex');
  if(hash!==expected)throw new Error('Integrity mismatch: '+name);count++;
}
for(const entry of manifest.packages){
  let directory=path.dirname(require.resolve(entry.name==='@modelcontextprotocol/sdk'?entry.name+'/client/index.js':entry.name)),pkg;
  for(let i=0;i<8;i++,directory=path.dirname(directory)){
    try{const candidate=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));if(candidate.name===entry.name){pkg=candidate;break;}}catch{}
  }
  if(!pkg)throw new Error('Package metadata not found: '+entry.name);
  if(pkg.version!==entry.version||pkg.license!==entry.license)throw new Error('Package mismatch: '+entry.name);
}
console.log(`PASS: ${manifest.skills.length} pinned skills, ${manifest.referencePacks?.length||0} reference packs, ${count} SHA-256-verified files, ${manifest.packages.length} exact package versions and licenses.`);
const knowledge=JSON.parse(await fs.readFile(path.join(root,'knowledge/manifest.json'),'utf8')),components=JSON.parse(await fs.readFile(path.join(root,'knowledge/components/registry.json'),'utf8')),fonts=JSON.parse(await fs.readFile(path.join(root,'knowledge/fonts/manifest.json'),'utf8'));
const reviewed=[...knowledge.items,...components.components,...fonts.files.map(item=>({...item,file:'fonts/'+item.file}))];
for(const item of reviewed){const file=path.resolve(root,'knowledge',item.file);if(!file.startsWith(path.join(root,'knowledge')+path.sep)||(await fs.lstat(file)).isSymbolicLink())throw new Error('Unsafe knowledge path');if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==item.sha256)throw new Error('Knowledge integrity mismatch: '+item.file);}
if(createHash('sha256').update(await fs.readFile(path.join(root,'knowledge/fonts/OFL.txt'))).digest('hex')!==fonts.licenseSHA256)throw new Error('Font licence changed');
console.log(`PASS: ${knowledge.items.length} original guidance files, ${components.components.length} local controls, ${fonts.files.length} WOFF2 fonts and OFL notice.`);
const recipes=JSON.parse(await fs.readFile(path.join(root,'knowledge/component-recipes/manifest.json'),'utf8'));for(const item of recipes.items){if(!item.licenseVerified||item.license!=='MIT'||!/^[\w-]+\.json$/.test(item.file))throw new Error('Unreviewed component recipe');const bytes=await fs.readFile(path.join(root,'knowledge/component-recipes',item.file));if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error('Component recipe integrity mismatch');}console.log(`PASS: ${recipes.items.length} default MIT component adaptations.`);
