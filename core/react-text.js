import {parseExpression} from '@babel/parser';
import {parseFragment} from 'parse5';
import postcss from 'postcss';
import {TextRange} from './schemas.js';

const parser={plugins:['jsx','typescript']};
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('{','&#123;').replaceAll('}','&#125;');
function literal(node,source){
 const raw=source.slice(node.start,node.end),chars=[];
 for(let i=0;i<raw.length;){const entity=raw[i]==='&'&&raw.slice(i).match(/^&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/i),token=entity?entity[0]:raw[i],value=entity?parseFragment(token).childNodes[0]?.value:token;
  for(const char of value||'')for(let unit=0;unit<char.length;unit++)chars.push({char:char[unit]==='\t'?' ':char[unit],start:node.start+i,end:node.start+i+token.length});i+=token.length;
 }
 const lines=[[]];for(const item of chars){if(item.char==='\n'||item.char==='\r'){if(item.char==='\n'||raw[item.start-node.start+1]!=='\n')lines.push([]);}else lines.at(-1).push(item);}
 let last=-1;lines.forEach((line,i)=>{if(line.some(item=>item.char!==' '))last=i;});const clean=[];
 lines.forEach((line,i)=>{if(i!==0)while(line[0]?.char===' ')line.shift();if(i!==lines.length-1)while(line.at(-1)?.char===' ')line.pop();if(line.length){clean.push(...line);if(i!==last)clean.push({char:' ',start:line.at(-1).end,end:lines[i+1]?.[0]?.start??line.at(-1).end});}});
 return {text:clean.map(item=>item.char).join(''),chars:clean};
}
export function literalTextRange(source,input){
 const range=TextRange.parse(input),root=parseExpression(source,parser),nodes=[];
 const walk=node=>{for(const child of node.children||[]){if(child.type==='JSXText'){const mapped=literal(child,source);if(mapped.text)nodes.push(mapped);}else if(child.type==='JSXElement'&&child.openingElement.name.type==='JSXIdentifier'&&/^[a-z]/.test(child.openingElement.name.name))walk(child);else if(child.type==='JSXExpressionContainer'&&child.expression.type==='JSXEmptyExpression')continue;else throw new Error('This text is rendered dynamically. Choose Element to edit its component; your mark has not changed the whole element.');}};
 walk(root);let previous;const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 const edits=range.parts.map(part=>{const node=nodes[part.nodeIndex],boundaries=node&&new Set([0,...Array.from(segmenter.segment(node.text),item=>item.index+item.segment.length)]);
  if(!node||part.end<=part.start||node.text.slice(part.start,part.end)!==part.text||!boundaries.has(part.start)||!boundaries.has(part.end)||previous&&(part.nodeIndex<previous.nodeIndex||part.nodeIndex===previous.nodeIndex&&part.start<previous.end))throw new Error('The marked text changed. Mark it again.');previous=part;
  return {...part,sourceStart:node.chars[part.start].start,sourceEnd:node.chars[part.end-1].end};
 });
 if(!edits.some(part=>part.text.trim())||edits.reduce((sum,part)=>sum+part.text.length,0)>6000)throw new Error('Mark up to 6,000 characters of visible text.');
 return edits;
}
export function editLiteralText(source,range,{css='',replacements=[]}){
 const parts=literalTextRange(source,range),changes=new Map();let size=0;for(const item of replacements){if(!Number.isInteger(item.index)||item.index<0||item.index>=parts.length||changes.has(item.index)||typeof item.text!=='string')throw new Error('The replacement is outside your mark.');size+=item.text.length;if(size>6000)throw new Error('The replacement text is too long.');changes.set(item.index,item.text);}
 const styles={};if(css.trim()){const sheet=postcss.parse(css);sheet.walkAtRules(()=>{throw new Error('Text edits support inline declarations only.');});sheet.walkRules(rule=>{if(rule.selector!=='.selected-text')throw new Error('Text styles must target .selected-text only.');});sheet.walkDecls(decl=>{if(/url\s*\(|expression\s*\(/i.test(decl.value))throw new Error('Use local text styles.');styles[decl.prop.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=decl.value;});}
 if(!Object.keys(styles).length&&!changes.size)throw new Error('No text change was returned.');
 let output=source;for(const [index,part]of parts.map((part,index)=>[index,part]).reverse()){const content=escape(changes.has(index)?changes.get(index):part.text),replacement=Object.keys(styles).length?`<span style={${JSON.stringify(styles)}}>${content}</span>`:content;output=output.slice(0,part.sourceStart)+replacement+output.slice(part.sourceEnd);}
 parseExpression(output,parser);return output;
}
