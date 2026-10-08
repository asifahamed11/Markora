import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanHTML, findNode, getId, replaceTarget, siteHTML, validateCSS, walk,sectionCSS } from './content.js';
import { parseFragment } from 'parse5';
import {prepareTextEdit,applyTextEdit,importantCSS} from './text-selection.js';

export const baseCSS = `:root{color-scheme:light;--ink:#172623;--paper:#f6f6ee;--accent:#b7eb73}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,sans-serif;line-height:1.65}section,header,footer{padding:64px max(6vw,24px)}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(42px,7vw,92px);line-height:1.06;letter-spacing:-.05em}h2{font-size:clamp(28px,4vw,48px);line-height:1.15}a{color:inherit}button,.button{display:inline-block;border:0;border-radius:99px;padding:14px 25px;background:var(--accent);color:var(--ink);font:inherit;font-weight:700;text-decoration:none}ul{padding-left:22px}@keyframes builder-pulse{50%{transform:scale(1.025)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`;

export async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, data, { mode: 0o600 });
    for(let attempt=0;;attempt++){try{await fs.rename(temp,file);break;}catch(error){if(process.platform!=='win32'||!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=5)throw error;await new Promise(resolve=>setTimeout(resolve,40*(attempt+1)));}}
  }
  finally { await fs.rm(temp, { force: true }); }
}
export class Project {
  constructor(directory, publish = () => {}, { inPlace = false } = {}) {
    this.directory = directory; this.inPlace = inPlace; this.public = inPlace ? directory : path.join(directory, 'site');
    this.metadata = inPlace ? path.join(directory, '.easy-web-ai') : directory;
    this.historyFile = path.join(this.metadata, inPlace ? 'website-history.json' : 'history.json');
    this.previewRoot = inPlace ? path.join(this.metadata, 'preview') : this.public;
    this.notify = publish;
  }
  async init(title = 'Your new website') {
    await fs.mkdir(this.public, { recursive: true });
    if (this.inPlace) await this.checkManagedPaths();
    try { this.record = JSON.parse(await fs.readFile(this.historyFile, 'utf8')); }
    catch (e) {
      if (e.code !== 'ENOENT') throw e;
      if (this.inPlace) for (const name of ['index.html', 'styles.css']) {
        try { await fs.access(path.join(this.public, name)); throw new Error(`Existing ${name} is not managed by Markora. Choose an empty output folder or move that file yourself.`); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const state = { title, sections: [], css: baseCSS, complete: false };
      this.record = { cursor: 0, versions: [{ label: 'New project', at: Date.now(), state }] };
      await this.persist();
    }
    await this.checkPublished(); await this.publish(); return this;
  }
  get state() { return this.record.versions[this.record.cursor].state; }
  get history() { return { undo: this.record.cursor > 0, redo: this.record.cursor < this.record.versions.length - 1, versions: this.record.versions.map(({ label, at }) => ({ label, at })), cursor: this.record.cursor }; }
  async checkManagedPaths() {
    const root = await fs.realpath(this.directory);
    for (const name of ['.easy-web-ai', '.easy-web-ai/website-history.json', '.easy-web-ai/sections', '.easy-web-ai/preview', '.easy-web-ai/preview/index.html', '.easy-web-ai/preview/styles.css', 'index.html', 'styles.css']) {
      const file = path.join(root, name);
      try { if ((await fs.lstat(file)).isSymbolicLink() || !(await fs.realpath(file)).startsWith(root + path.sep)) throw new Error('Linked website files are not editable.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    try { for (const name of await fs.readdir(path.join(root, '.easy-web-ai/sections'))) if ((await fs.lstat(path.join(root, '.easy-web-ai/sections', name))).isSymbolicLink()) throw new Error('Linked source fragments are not editable.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async checkPublished() {
    if (!this.inPlace) return;
    await this.checkManagedPaths();
    const files = { 'index.html': this.page(), 'styles.css': this.state.css };
    for (const [name, expected] of Object.entries(files)) {
      try { if (await fs.readFile(path.join(this.public, name), 'utf8') !== expected) throw new Error(`Changed outside the bot: ${name}. Keep your changes before editing or restoring.`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  async persist() { if (this.inPlace) await this.checkManagedPaths(); await atomicWrite(this.historyFile, JSON.stringify(this.record)); }
  async commit(label, state) {
    const ids = new Set();
    for (const section of state.sections) walk(parseFragment(section.html), node => {
      const id = getId(node);
      if (id) { if (ids.has(id)) throw new Error('The change would create duplicate element IDs across sections.'); ids.add(id); }
    });
    await this.checkPublished();
    const previous = this.record;
    this.record = { cursor: previous.cursor + 1, versions: [...previous.versions.slice(0, previous.cursor + 1), { label, at: Date.now(), state: structuredClone(state) }] };
    try { await this.persist(); await this.publish(); }
    catch (error) { this.record = previous; await this.persist(); await this.publish(); throw error; }
  }
  async publish() {
    if (this.inPlace) await this.checkManagedPaths();
    // Source fragments are kept outside Vite's served directory.
    for (const section of this.state.sections) await atomicWrite(path.join(this.metadata, 'sections', `${section.id}.html`), section.html);
    await atomicWrite(path.join(this.public, 'styles.css'), this.state.css);
    const page = this.page();
    await atomicWrite(path.join(this.public, 'index.html'), page);
    if (this.inPlace) {
      await atomicWrite(path.join(this.previewRoot, 'index.html'), page);
      await atomicWrite(path.join(this.previewRoot, 'styles.css'), this.state.css);
    }
    this.notify(this.history);
  }
  page() { return (this.state.sections.length||this.state.buildDraft) ? siteHTML(this.state) : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live build</title><link rel="stylesheet" href="/styles.css"></head><body><section><p>Markora live preview</p><h1>Building your website</h1><p>Sections will appear here as your website is built.</p></section></body></html>`; }
  async addSection(spec, content) {
    const css=sectionCSS(content.css,spec.id);
    const inner = cleanHTML(content.html, spec.id);
    if (!inner.trim()) throw new Error('The AI returned an empty section.');
    const html = `<section id="${spec.id}" data-builder-id="${spec.id}">${inner}</section>`;
    await this.commit(`Built ${spec.title}`, { ...this.state, sections: [...this.state.sections, { id: spec.id, title: spec.title, html }], css: `${this.state.css}\n${css}` });
  }
  selection(id) {
    for (const section of this.state.sections) {
      try { const source = findNode(section.html, id); return { id, html: source.html, file: `sections/${section.id}.html`, section: section.id }; }
      catch { /* Search the remaining sections. */ }
    }
    throw new Error('This element is no longer in the project. Select it again.');
  }
  async applyPatch(patch) {
    const source = this.selection(patch.targetId);
    const css = importantCSS(validateCSS(patch.css, patch.targetId));
    const sections = this.state.sections.map(section => section.id === source.section ? { ...section, html: replaceTarget(section.html, patch.targetId, patch.before, patch.after) } : section);
    await this.commit(patch.summary, { ...this.state, sections, css: `${this.state.css}\n/* ${patch.targetId} edit */\n${css}` });
  }
  prepareText(id,range){return prepareTextEdit(this.selection(id),range);}
  async applyTextPatch(prepared,patch){
    const source=this.selection(prepared.id),section=this.state.sections.find(s=>s.id===source.section),change=applyTextEdit(section.html,prepared,patch);
    const sections=this.state.sections.map(s=>s.id===source.section?{...s,html:change.html}:s);
    await this.commit(change.summary,{...this.state,sections,css:change.css?`${this.state.css}\n/* marked text edit */\n${change.css}`:this.state.css});
  }
  async move(delta) {
    const cursor = this.record.cursor + delta;
    if (cursor < 0 || cursor >= this.record.versions.length) return;
    await this.checkPublished();
    const previous = this.record.cursor; this.record.cursor = cursor;
    try { await this.persist(); await this.publish(); }
    catch (error) { this.record.cursor = previous; await this.persist(); await this.publish(); throw error; }
  }
  async exportTo(parent) {
    const dest = path.join(parent, `markora-${new Date().toISOString().slice(0,10)}-${randomUUID().slice(0,8)}`);
    await fs.mkdir(dest);
    await fs.writeFile(path.join(dest, 'index.html'), siteHTML(this.state).replace('href="/styles.css"', 'href="./styles.css"'));
    await fs.writeFile(path.join(dest, 'styles.css'), this.state.css);
    await fs.writeFile(path.join(dest, 'README.txt'), `${this.state.title}\n\nOpen index.html in a browser, or upload this folder to a static host.\nGenerated locally by Markora.\n`);
    return dest;
  }
}
