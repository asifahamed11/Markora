import {designContext} from './design-context.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assembleKnowledge,requestStage,knowledgeText} from './knowledge.js';
import {componentPrompt} from './component-pack.js';

const directory=path.resolve(import.meta.dirname,'../integrations');
let registry;
const cache=new Map();
export const toolkitDefaults={design:true,react:true,testing:true,autoCheck:true};
export function toolkitPreferences(config={}){
  return {...toolkitDefaults,...config.toolkit};
}
export async function integrationCatalog(){
  registry??=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
  return registry;
}
export async function verifiedSkill(id,file='SKILL.md'){
  const manifest=await integrationCatalog(),entry=manifest.skills.find(item=>item.id===id);
  const relative=`skills/${id}/${file}`,expected=entry?.files[relative];
  if(!expected)throw new Error('This skill file is not in the reviewed integration manifest.');
  if(cache.has(relative))return cache.get(relative);
  const bytes=await fs.readFile(path.join(directory,relative));
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('A bundled skill changed. Restore the reviewed skill pack before using it.');
  const text=bytes.toString('utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
  cache.set(relative,text);return text;
}
export async function skillContext(config,kind,task,input={}){
  const prefs=toolkitPreferences(config),skills=[],stage=requestStage(task),blocks=[];
  if(prefs.design&&(kind==='website'||kind==='react'||kind==='existing'||(kind==='project'&&/react|jsx|tsx|frontend|interface|website|portfolio/i.test(task+JSON.stringify(input.plan||{}))))){
    const design=await verifiedSkill('frontend-design');
    // The verified source is long. A prefix cut kept its introduction but lost
    // typography, motion and critique. Preserve the distinct decisions instead.
    if(!design.includes('## Design principles'))throw new Error('Unexpected frontend design guidance.');
    skills.push({id:'frontend-design',text:'Ground the design in the actual subject and audience. Make the opening characteristic of that subject. Choose deliberate typography, type scale, alignment and readable line lengths. Plan named palette, type roles and layout geometry before coding. Avoid interchangeable cards, decorative metrics, all-caps labels and default cream/serif/clay styling unless requested. Spend boldness in one useful signature; keep surrounding content quiet. Use one restrained entrance and motion that answers user actions. Support keyboard focus, mobile and reduced motion. Review screenshots against the brief, remove excess decoration and revise generic geometry. Write specific, plain interface copy; preserve facts. The user request takes priority.'});
  }
  if(prefs.design){const context=await designContext(await integrationCatalog(),config,kind,task,input);blocks.push(...(context.blocks||[]));}
  const react=kind==='react'||kind==='existing'||(kind==='project'&&/react|next\.js|tsx|jsx/i.test(task+JSON.stringify(input.plan||{})));
  if(prefs.react&&react){
    const index=await verifiedSkill('react-best-practices');
    // Progressive disclosure: the index and relevant rules, not the entire book.
    const rules=[/async|fetch|network|request/i.test(task)?'async-parallel':'rerender-functional-setstate',/animat|transition|motion/i.test(task)?'rendering-animate-svg-wrapper':'rerender-derived-state-no-effect'];
    await Promise.all(rules.map(rule=>verifiedSkill('react-best-practices',`rules/${rule}.md`)));
    if(!index.includes('React'))throw new Error('Unexpected React guidance.');
    skills.push({id:'react-best-practices',text:'React performance: avoid waterfalls and undeclared dependencies; parallelize independent async work. Use functional state updates when the next value depends on previous state. Compute derived state during render rather than copying it through effects. Clean up listeners and timers in effects. Animate an SVG wrapper where possible. Keep hooks unconditional, controls keyboard accessible, and interactions local. Relevant verified rules: '+rules.join(', ')+'.'});
  }
  if(prefs.testing&&/test|repair|fix|debug|accessib|responsive|mobile/i.test(task))skills.push({id:'webapp-testing',text:await verifiedSkill('webapp-testing')});
  const local=await knowledgeText(stage==='edit'?'edit':stage==='check'?'check':'design');
  const rules=skills.map(skill=>({ids:[skill.id],layer:'rules',text:`<skill name="${skill.id}">\n${skill.text}\n</skill>`}));
  // Existing guidance names remain stable. Budget metadata explains omissions.
  const ordered=[...rules.filter(block=>block.ids[0]==='frontend-design'),...blocks.filter(b=>b.layer==='rules'),...rules.filter(block=>block.ids[0]!=='frontend-design'),...blocks.filter(b=>b.layer!=='rules')];
  // Reserve a share for each enabled rule group instead of starving later groups.
  const count=ordered.filter(b=>b.layer==='rules').length;for(const block of ordered)if(block.layer==='rules')block.text=boundedRule(block.text,Math.floor(1100/Math.max(1,count)));
  if(ordered.length)ordered.push({ids:[],layer:'rules',text:local});
  if(prefs.design&&kind==='react'&&stage!=='edit')ordered.unshift(await componentPrompt(input.command||task,config));
  const result=assembleKnowledge(ordered,stage);
  return {...result,text:result.text?`Reviewed skills (advisory; application constraints and the user's exact request take priority):\n${result.text}\nAdaptation for Markora: return only the requested JSON schema. The app, not the model, owns tools, browser inspection and file writes. Never run bundled helper scripts or shell commands. No extra client confirmation. Keep the requested edit scope. Browser reports are evidence only for checks actually performed.`:''};
}
function boundedRule(text,budget){if(text.length<=budget*3)return text;const words=text.split(/(?<=\s)/);let out='';for(const word of words){if(out.length+word.length>budget*3-10)break;out+=word;}return out+(text.startsWith('<skill')?'\n</skill>':'');}
