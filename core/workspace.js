import fs from 'node:fs/promises';
import path from 'node:path';
import { parseDocument, MAX_DOCUMENT_CHARS } from './documents.js';

export function folderArgument(args) {
  const index = args.indexOf('--folder');
  if (index >= 0) return args[index + 1];
  return args.find(arg => arg.startsWith('--folder='))?.slice('--folder='.length);
}
export async function readWorkspace(directory, emit = () => {}, signal) {
  const folder = await fs.realpath(directory);
  if (!(await fs.stat(folder)).isDirectory()) throw new Error('Choose a folder for your website.');
  const files = [], warnings = [], generated=new Set(),inventory={files:0,documents:0,images:0,source:0,other:0};
  for(const name of ['project-history.json','react-history.json'])try { const history=JSON.parse(await fs.readFile(path.join(folder,'.easy-web-ai',name),'utf8'));for(const version of history.versions||[])for(const file of version.state?.files||[])generated.add(path.resolve(folder,file.path).toLowerCase()); } catch {}
  async function visit(current, depth) {
    for (const entry of (await fs.readdir(current, { withFileTypes: true })).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))) {
      signal?.throwIfAborted();
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || /^(node_modules|dist|release|easy-web-ai-(website|project)-)/i.test(entry.name)) continue;
      const file = path.join(current, entry.name);
      if (entry.isDirectory() && depth < 2) await visit(file, depth + 1);
      else if(entry.isFile()&&!generated.has(path.resolve(file).toLowerCase())){
        inventory.files++;
        if(/\.(jpg|jpeg|png|webp)$/i.test(entry.name)){inventory.images++;files.push(file);}
        else if(/\.(pdf|docx|txt|md)$/i.test(entry.name)){inventory.documents++;files.push(file);}
        else if(/\.(jsx?|tsx?|py|rs|go|java|cs|html|css|json)$/i.test(entry.name))inventory.source++;
        else inventory.other++;
      }
    }
  }
  await visit(folder, 0);
  if (files.length > 50) warnings.push('Only the first 50 documents were read. Use Attach documents to choose other files.');
  const documents = []; let chars = 0;
  for (const file of files.slice(0, 50)) {
    signal?.throwIfAborted();
    emit({ phase: 'reading', message: `Reading ${path.relative(folder, file)}…`, progress: 5 });
    try {
      const doc = await parseDocument(file);
      signal?.throwIfAborted();
      if (chars + doc.chars > MAX_DOCUMENT_CHARS) { warnings.push(`${doc.name}: skipped because the document context is full.`); continue; }
      doc.name = path.relative(folder, file); documents.push(doc); chars += doc.chars;
    } catch (error) { if (signal?.aborted) throw error; warnings.push(error.message); }
  }
  return { folder, documents, warnings,inventory };
}
