import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const MAX_DOCUMENT_CHARS = 90000;
export const imageExtensions=['.jpg','.jpeg','.png','.webp'];
export async function parseDocument(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.txt', '.md', '.pdf', '.docx',...imageExtensions].includes(ext)) throw new Error('Use PDF, DOCX, TXT, MD, JPG, PNG or WebP inputs.');
  const stat = await fs.stat(file);
  if (stat.size > 15 * 1024 * 1024) throw new Error('Each document must be smaller than 15 MB.');
  if(imageExtensions.includes(ext)){
    const handle=await fs.open(file,'r');let header;
    try{header=Buffer.alloc(12);await handle.read(header,0,12,0);}finally{await handle.close();}
    const mime=header[0]===255&&header[1]===216&&header[2]===255?'image/jpeg':header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':header.toString('ascii',0,4)==='RIFF'&&header.toString('ascii',8,12)==='WEBP'?'image/webp':null;
    if(!mime)throw new Error(`${path.basename(file)} is not a readable JPG, PNG or WebP image.`);
    return {name:path.basename(file),kind:'image',mime,file:path.resolve(file),text:'',chars:0,bytes:stat.size};
  }
  let text;
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: new Uint8Array(await fs.readFile(file)) });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else if (ext === '.docx') {
    text = (await mammoth.extractRawText({ path: file })).value;
  } else text = await fs.readFile(file, 'utf8');
  text = text.replace(/\u0000/g, '').trim();
  if (!text) throw new Error(`${path.basename(file)} has no extractable text. Scanned PDFs need OCR; attach a text document instead.`);
  if (text.length > MAX_DOCUMENT_CHARS) throw new Error(`${path.basename(file)} is too long for the MVP. Split it into smaller documents.`);
  return { name: path.basename(file), text, chars: text.length };
}
export function documentContext(documents) {
  if (documents.reduce((sum, d) => sum + d.text.length, 0) > MAX_DOCUMENT_CHARS) {
    throw new Error('Attached documents exceed 90,000 characters. Remove a document or split the task.');
  }
  return documents.map(({ name, text,kind }) => ({ name, text,...(kind==='image'?{kind:'image',note:text?'Text extracted locally from this image. Check uncertain facts.':'Scanned page or visual reference; read the attached image. Do not assume it is empty.'}:{}) }));
}
