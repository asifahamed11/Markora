import fs from 'node:fs/promises';
import path from 'node:path';
import {parse} from '@babel/parser';
import postcss from 'postcss';
import {ExistingProject} from './existing-project.js';
import {FileProject} from './file-project.js';
import {escapeHTML} from './content.js';
import {literalTextRange,editLiteralText} from './react-text.js';
import {themes,themeCSS} from './theme.js';
import {bundledBengaliFonts} from './local-assets.js';
import {componentNotices,componentMarkers} from './component-pack.js';

const packageMetadata={name:'markora-website',version:'1.0.0',private:true,type:'module',scripts:{dev:'vite --host 127.0.0.1',build:'vite build',preview:'vite preview --host 127.0.0.1'},dependencies:{react:'19.3.0','react-dom':'19.3.0'},devDependencies:{vite:'8.3.2'}};
const globalCSS=`*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,Helvetica,"Markora Bengali",sans-serif;-webkit-font-smoothing:antialiased}button,input,select,textarea{font:inherit}button,a{-webkit-tap-highlight-color:transparent}a{color:inherit}button{cursor:pointer}img,svg{max-width:100%}h1,h2,h3,p{overflow-wrap:break-word}h1,h2{text-wrap:balance}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid currentColor;outline-offset:4px}.build-pending{padding:80px max(24px,6vw);font:16px/1.6 Arial}.skip-link{position:fixed;z-index:100;top:-80px;left:16px;padding:12px;background:var(--ink);color:var(--paper)}.skip-link:focus{top:12px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`;
function headingFacts(source){const facts=new Map(),ast=parse(source,{sourceType:'module',plugins:['jsx']}),text=node=>node.type==='JSXText'?node.value:(node.children||[]).map(text).join(' ');const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='JSXElement'&&['h1','h3'].includes(node.openingElement.name.name)){const value=text(node).replace(/\s+/g,' ').trim();if(value)facts.set(value,(facts.get(value)||0)+1);}for(const [key,value]of Object.entries(node)){if(['loc','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}};visit(ast);return facts;}
function factualAnchors(source){const facts=new Set(),ast=parse(source,{sourceType:'module',plugins:['jsx']});const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='JSXText')for(const match of node.value.matchAll(/\d[\d.,:/-]*/g))facts.add('number:'+match[0]);if(node.type==='JSXAttribute'&&node.name?.name==='href'&&node.value?.type==='StringLiteral')facts.add('link:'+node.value.value);for(const [key,value]of Object.entries(node)){if(['loc','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}};visit(ast);return facts;}
export function validateReactSection(jsx,css,id,allowedAssets){
 const ast=parse(jsx,{sourceType:'module',plugins:['jsx']});let exported=false,intrinsic=0;
 componentMarkers(jsx);
 for(const statement of ast.program.body){if(statement.type==='ImportDeclaration'&&statement.source.value!=='react')throw new Error('Section components can import only the bundled React runtime.');if(statement.type==='ExportDefaultDeclaration')exported=true;}
 if(!exported)throw new Error('A React section needs a default component export.');
 const visit=node=>{if(!node||typeof node!=='object')return;
  if(node.type==='JSXOpeningElement'&&node.name.type==='JSXIdentifier'&&/^[a-z]/.test(node.name.name))intrinsic++;
  if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&node.callee.object.name==='React'&&node.callee.property.name==='createElement')throw new Error('Keep section markup in JSX so the magic pen can map its elements. Do not replace JSX with React.createElement.');
  if(node.type==='ImportExpression'||node.type==='MetaProperty'||node.type==='CallExpression'&&['eval','Function','require','fetch'].includes(node.callee.name)||node.type==='NewExpression'&&['Function','WebSocket','XMLHttpRequest','Worker'].includes(node.callee.name))throw new Error('Generated sections must use local React interactions.');
  if(node.type==='JSXIdentifier'&&['script','iframe','object','embed'].includes(node.name)||node.type==='JSXAttribute'&&node.name?.name==='dangerouslySetInnerHTML')throw new Error('This section contains unsupported active markup.');
  if(node.type==='JSXAttribute'&&node.name?.name==='src'){if(node.value?.type!=='StringLiteral'||!/^\/assets\/markora-images\/[a-f0-9]{12}-\d+\.(jpg|png)$/.test(node.value.value)||allowedAssets&&!allowedAssets.has(node.value.value))throw new Error('Use an exact local image asset URL from the supplied catalogue.');}
  if(node.type==='JSXAttribute'&&node.name?.name==='href'&&node.value?.type==='StringLiteral'&&/^\s*(javascript|data|vbscript):/i.test(node.value.value))throw new Error('Unsafe link protocol.');
  if(node.type==='JSXAttribute'&&node.name?.name==='srcSet'){if(node.value?.type!=='StringLiteral'||node.value.value.split(',').some(value=>!/^\/assets\/markora-images\/[a-f0-9]{12}-\d+\.(?:jpg|png) \d+w$/.test(value.trim())||allowedAssets&&!allowedAssets.has(value.trim().split(' ')[0])))throw new Error('Use only the supplied local responsive image variants.');}
  for(const [key,value]of Object.entries(node)){if(['loc','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
 };visit(ast);if(!intrinsic)throw new Error('Return intrinsic JSX markup so the magic pen can map this section.');
 const sheet=postcss.parse(css);sheet.walkAtRules(rule=>{if(/import|font-face/i.test(rule.name))throw new Error('Use local CSS and installed fonts in the generated website.');});
 sheet.walkDecls(decl=>{if(/url\s*\(/i.test(decl.value))throw new Error('Do not add remote or placeholder assets to a section stylesheet.');});
 sheet.walkRules(rule=>{if(rule.parent.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;for(const selector of rule.selectors||[])if(!selector.trim().startsWith('#'+id)||!new RegExp('^#'+id+'(?:\\s|[.:#\\[>]|$)').test(selector.trim())||/[+~]/.test(selector))throw new Error('Scope section CSS to its actual section ID.');});
 return {jsx,css};
}
export class ReactProject extends ExistingProject{
 constructor(directory,notify,options={}){super(directory,notify);this.inPlace=options.inPlace??true;this.public=this.inPlace?directory:path.join(directory,'files');this.kind='react';this.historyName='react-history.json';}
 async publish(previous,next,allowExisting=false){let release;this.publication=new Promise(resolve=>{release=resolve;});const order=file=>file.path.startsWith('src/sections/')?0:file.path==='src/styles.css'?2:file.path==='src/App.jsx'?3:1;try{await super.publish(previous,[...next].sort((a,b)=>order(a)-order(b)),allowExisting);}finally{release();this.publication=undefined;}}
 async init(title='Your website'){
  await FileProject.prototype.init.call(this,title);
  if(!this.state.files.length){
   const ownLicense=await fs.readFile(path.resolve(import.meta.dirname,'../knowledge/LICENSE'),'utf8');
   const files=[{path:'package.json',content:JSON.stringify(packageMetadata,null,2)+'\n'},{path:'index.html',content:`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`},{path:'src/main.jsx',content:"import React from 'react';import {createRoot} from 'react-dom/client';import App from './App.jsx';import './styles.css';createRoot(document.getElementById('root')).render(<App/>);\n"},{path:'src/App.jsx',content:"import React from 'react';export default function App(){return <main id=\"main-content\"><div className=\"build-pending\"><p>Live preview</p><h1>Creating your website</h1><p>The opening will appear here first.</p></div></main>}\n"},{path:'src/styles.css',content:':root{--ink:#182723;--paper:#fafaf5;--accent:#986238}\n'+globalCSS},{path:'README.md',content:`# ${title}\n\nA React website created in this folder. The companion preview uses its bundled runtime.\n\nTo run independently, install Node.js, then run:\n\n\`\`\`sh\nnpm install\nnpm run dev\n\`\`\`\n\nProduction build: \`npm run build\`.\n\n## Original local control notices\n\n${ownLicense}\n`}];
   try{await this.commit('React workspace',{...this.state,files,sections:[],sectionCSS:{},complete:false,instructions:'Preview opens automatically in Markora. To run this folder independently: npm install, then npm run dev. Production: npm run build.'});}
   catch(error){if(this.record?.cursor===0&&!this.state.files.length)await fs.rm(this.historyFile,{force:true});throw error;}
  }
  return this;
 }
 async prepareAssets(assets,{bengali=false}={}){if(this.state.assetPipeline)return;const font=bengali?await bundledBengaliFonts():{files:[],css:''};await this.commit('Local images and fonts',{...this.state,files:[...this.state.files,...assets.files,...font.files],assets:assets.assets,fontCSS:font.css,assetPipeline:true});}
 async prepareComponents(policy){if(this.state.componentPolicy)return;if(policy.mode==='custom'){await this.commit('Custom component preference',{...this.state,componentPolicy:policy});return;}await this.commit('Default component pack',{...this.state,componentPolicy:policy,files:[...this.state.files,{path:'COMPONENT-LICENSES.md',content:await componentNotices(policy.libraries)}]});}
 async setDirection(plan){
  if(this.state.design)return;
  const css=themeCSS(plan.palette)+(this.state.fontCSS||'')+globalCSS;
  const files=this.state.files.map(file=>file.path==='src/styles.css'?{...file,content:css}:file);
  await this.commit('Design direction',{...this.state,files,design:plan,sections:[],sectionCSS:{}});
 }
 async addSections(specs,contents){
  const sections=[...(this.state.sections||[])],styles={...this.state.sectionCSS},files=this.state.files.map(file=>({...file}));
  for(const [index,content] of contents.entries()){
   const spec=specs[index];if(content.id!==spec.id)throw new Error('The React response contains a different section.');validateReactSection(content.jsx,content.css,spec.id);
   const file=`src/sections/${spec.id}.jsx`;if(files.some(item=>item.path===file))throw new Error('This section already exists.');files.push({path:file,content:content.jsx});sections.push({id:spec.id,title:spec.title,file});styles[spec.id]=content.css;
  }
  const imports=sections.map((section,i)=>`import Section${i} from './sections/${section.id}.jsx';`).join('\n');
  const app=`import React from 'react';\n${imports}\nexport default function App(){return <><a className="skip-link" href="#main-content">Skip to content</a><main id="main-content">${sections.map((section,i)=>`<section id="${section.id}"><Section${i}/></section>`).join('')}</main></>}\n`;
  for(const file of files){if(file.path==='src/App.jsx')file.content=app;if(file.path==='src/styles.css')file.content=file.content.split('\n/* Section styles */')[0]+'\n/* Section styles */\n'+sections.map(section=>styles[section.id]).join('\n');}
  this.validateFiles(files);
  const components=[...(this.state.components||[]),...contents.flatMap(item=>item.components||[])].filter((item,index,items)=>items.findIndex(value=>value.id===item.id)===index);
  await this.commit('Built '+specs.map(spec=>spec.title).join(', '),{...this.state,files,sections,sectionCSS:styles,components});
 }
 async applyReview(patch,design){
  if(patch.files.some(file=>!/^src\/sections\/[a-z][a-z0-9-]*\.jsx$|^src\/styles\.css$/.test(file.path)||file.before===null||file.content===null))throw new Error('Design review can only refine the current section files and stylesheet.');
  const prepared=this.preparePatch({...patch,instructions:this.state.instructions});
  if(this.state.componentPolicy?.mode==='library')for(const file of patch.files){if(file.path.endsWith('.jsx')){const after=componentMarkers(file.content);for(const id of componentMarkers(file.before))if(!after.has(id))throw new Error('Automatic refinement must preserve the default component adaptation: '+id);}if(file.path==='src/styles.css')for(const id of new Set(this.state.files.filter(f=>f.path.startsWith('src/sections/')).flatMap(f=>[...componentMarkers(f.content)])))if(!file.content.includes(`[data-markora-component="${id}"]`))throw new Error('Automatic refinement must retain local component styles: '+id);}
  for(const file of patch.files)if(file.path.endsWith('.jsx')){const before=headingFacts(file.before),after=headingFacts(file.content);for(const [title,count]of before)if((after.get(title)||0)<count)throw new Error('Design refinement cannot remove or rename a person or project heading: '+title);}
  for(const file of patch.files)if(file.path.endsWith('.jsx')){const after=factualAnchors(file.content);for(const value of factualAnchors(file.before))if(!after.has(value))throw new Error('Design refinement cannot change or remove a displayed number or supplied link.');}
  this.validateFiles(prepared.state.files);
  await this.commit(patch.summary,{...prepared.state,designReview:patch.summary,...(design?{design}: {})});
 }
 async changeTheme(id){const theme=themes[id];if(!theme)throw new Error('Unknown theme.');const files=this.state.files.map(file=>({...file})),css=files.find(file=>file.path==='src/styles.css'),sheet=postcss.parse(css.content);sheet.walkRules(rule=>{if(rule.selector===':root')rule.walkDecls(decl=>{if(['--ink','--paper','--accent'].includes(decl.prop))decl.value=theme.palette[['--ink','--paper','--accent'].indexOf(decl.prop)];});});css.content=sheet.toString();await this.commit('Changed theme to '+theme.label,{...this.state,files,design:{...this.state.design,palette:theme.palette,theme:id}});return 'Theme updated. Layout and content are unchanged; literal colour overrides retain their values.';}
 async replaceComposition(plan,contents){if(contents.length!==this.state.sections.length||contents.some((item,index)=>item.id!==this.state.sections[index].id))throw new Error('A concept change must preserve every section and its order.');const files=contents.map(item=>{validateReactSection(item.jsx,item.css,item.id);const name=`src/sections/${item.id}.jsx`;return {path:name,before:this.state.files.find(f=>f.path===name).content,content:item.jsx};});const css=this.state.files.find(file=>file.path==='src/styles.css');files.push({path:css.path,before:css.content,content:themeCSS(plan.palette)+(this.state.fontCSS||'')+globalCSS+'\n/* Section styles */\n'+contents.map(item=>item.css).join('\n')});await this.applyReview({summary:'Changed composition to '+plan.artDirection.candidates[plan.artDirection.chosen].name,files},plan);}
 validateFiles(files){const allowedAssets=new Set(files.filter(file=>file.encoding==='base64'&&file.path.startsWith('public/assets/markora-images/')).map(file=>file.path.slice(6)));for(const file of files){if(/^src\/sections\/.*\.jsx$/.test(file.path))validateReactSection(file.content,'',path.basename(file.path,'.jsx'),allowedAssets);if(file.path==='src/styles.css'){const sheet=postcss.parse(file.content);sheet.walkAtRules(rule=>{if(/import/i.test(rule.name)||/font-face/i.test(rule.name)&&!postcss.parse(this.state.fontCSS||'').nodes.some(face=>face.toString()===rule.toString()))throw new Error('Keep the stylesheet local and preserve bundled font declarations.');});sheet.walkDecls(decl=>{if(/url\s*\(/i.test(decl.value)&&!(decl.prop==='src'&&decl.parent.name==='font-face'&&postcss.parse(this.state.fontCSS||'').nodes.some(face=>face.toString()===decl.parent.toString())))throw new Error('Keep the stylesheet local.');});}}}
 async apply(input){const {patch,state}=this.preparePatch(input);this.validateFiles(state.files);await this.commit(patch.summary,state);}
 validateTextSelection(id,range){literalTextRange(this.selection(id).before,range);return range;}
 async applyTextSource(target,range,patch){await this.applySource(target,editLiteralText(target.before,range,patch),patch.summary);}
 async complete(refinement){await this.commit('Complete',{...this.state,complete:true,...(refinement?{refinement}: {})});}
}
