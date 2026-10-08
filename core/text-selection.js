import {serialize} from 'parse5';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import {randomUUID} from 'node:crypto';
import {findNode,walk,validateCSS} from './content.js';
import {TextRange,TextPatch} from './schemas.js';

export function textNodes(root){const nodes=[];walk(root,node=>{if(node.nodeName==='#text')nodes.push(node);});return nodes;}
export function validateTextRange(html,id,input){
  const range=TextRange.parse(input),source=findNode(html,id),nodes=textNodes(source.node),nodeBoundaries=new Map(),segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});let previous,total=0;
  for(const part of range.parts){
    const node=nodes[part.nodeIndex];
    if(!node||part.end<=part.start||part.end>node.value.length||node.value.slice(part.start,part.end)!==part.text)throw new Error('The marked text changed. Mark it again.');
    if(previous&&(part.nodeIndex<previous.nodeIndex||(part.nodeIndex===previous.nodeIndex&&part.start<previous.end)))throw new Error('Text marks must be ordered and cannot overlap.');
    if(!nodeBoundaries.has(node))nodeBoundaries.set(node,new Set([0,...[...segmenter.segment(node.value)].map(s=>s.index+s.segment.length)]));
    const boundaries=nodeBoundaries.get(node);
    if(!boundaries.has(part.start)||!boundaries.has(part.end))throw new Error('Select a complete letter, including its accents.');
    total+=part.text.length;previous=part;
  }
  if(total>6000||!range.parts.some(p=>p.text.trim()))throw new Error('Mark up to 6,000 characters of visible text.');
  return {parts:range.parts};
}
export function prepareTextEdit(source,range){
  const selection=validateTextRange(source.html,source.id,range),prefix=`text-${randomUUID().replaceAll('-','')}`;
  return {...source,kind:'text',textSelection:selection,targetId:`${prefix}-0`,markers:selection.parts.map((_,i)=>`${prefix}-${i}`),text:selection.parts.map(p=>p.text).join(''),parts:selection.parts.map((p,index)=>({index,text:p.text}))};
}
// Promote only verified scoped declarations so generated theme specificity
// cannot silently override a requested local edit.
export function importantCSS(css){const ast=postcss.parse(css);ast.walkDecls(decl=>{decl.important=true;});return ast.toString();}
function fragmentCSS(css,markers){
  const ast=postcss.parse(validateCSS(css,markers[0])),copies=[];
  for(const id of markers){const copy=ast.clone();copy.walkRules(rule=>{rule.selector=selectorParser(selectors=>selectors.each(selector=>{const first=selector.nodes.find(n=>n.type!=='comment');first.setValue(id,{quoteMark:'"'});selector.insertAfter(first,selectorParser.id({value:id}));})).processSync(rule.selector);});copies.push(importantCSS(copy.toString()));}
  const reset=markers.map(id=>`[data-builder-id="${id}"]#${id}{all:unset!important;display:inline!important}[data-builder-id="${id}"]#${id}::before,[data-builder-id="${id}"]#${id}::after{content:none!important}`).join('\n');
  return `${reset}\n${copies.join('\n')}`;
}
export function applyTextEdit(sectionHTML,prepared,input){
  const patch=TextPatch.parse(input),current=findNode(sectionHTML,prepared.id);
  if(current.html!==prepared.html)throw new Error('The edit was based on stale source. Mark the text again.');
  if(patch.targetId!==prepared.targetId)throw new Error('The AI tried to edit another text fragment.');
  const range=validateTextRange(sectionHTML,prepared.id,prepared.textSelection),nodes=textNodes(current.node),replacements=new Map();let size=0;
  for(const item of patch.replacements){if(item.index>=range.parts.length||replacements.has(item.index))throw new Error('The text replacement is outside your mark.');size+=item.text.length;if(size>6000)throw new Error('The replacement text is too long.');replacements.set(item.index,item.text);}
  if(!patch.css.trim()&&!patch.replacements.length)throw new Error('The AI did not return a text change. Retry your request.');
  const css=patch.css.trim()?fragmentCSS(patch.css,prepared.markers):'';
  const byNode=new Map();range.parts.forEach((part,index)=>{if(!byNode.has(part.nodeIndex))byNode.set(part.nodeIndex,[]);byNode.get(part.nodeIndex).push({...part,index});});
  for(const [nodeIndex,parts] of byNode){const node=nodes[nodeIndex],parent=node.parentNode,children=[];let at=0;
    const add=value=>{if(value)children.push({nodeName:'#text',value,parentNode:parent});};
    for(const part of parts){add(node.value.slice(at,part.start));const value=replacements.has(part.index)?replacements.get(part.index):part.text;
      if(css){const marker=prepared.markers[part.index],span={nodeName:'span',tagName:'span',namespaceURI:'http://www.w3.org/1999/xhtml',attrs:[{name:'data-builder-id',value:marker},{name:'id',value:marker},{name:'data-builder-text-fragment',value:''}],childNodes:[],parentNode:parent};span.childNodes=[{nodeName:'#text',value,parentNode:span}];children.push(span);}else add(value);
      at=part.end;
    }
    add(node.value.slice(at));parent.childNodes.splice(parent.childNodes.indexOf(node),1,...children);
  }
  return {html:serialize(current.root),css,summary:patch.summary};
}
