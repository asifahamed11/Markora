// Browser DOM ranges use UTF-16 offsets, just like parse5 text values in source.
const builder='[data-builder-id]';
export function pointInside(x,y,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function bounds(points){const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};}
function overlaps(a,b,pad=0){return a.right>=b.left-pad&&a.left<=b.right+pad&&a.bottom>=b.top-pad&&a.top<=b.bottom+pad;}
function contains(r,x,y){return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function clippedLength(a,b,r){let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]){if(p===0){if(q<0)return 0;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return 0;}}return Math.hypot(dx,dy)*(hi-lo);}
export function strokeHitsRect(points,r){
  if(!points.length)return false;const b=bounds(points);if(!overlaps(r,b,4))return false;
  const closed=points.length>=6&&b.right-b.left>8&&b.bottom-b.top>8&&Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<Math.max(5,Math.hypot(b.right-b.left,b.bottom-b.top)*.35);
  if(closed){const x=(r.left+r.right)/2;return [.35,.5,.65].filter(t=>pointInside(x,r.top+r.height*t,points)).length>=2;}
  let length=0;const expanded={left:r.left-2,right:r.right+2,top:r.top-3,bottom:r.bottom+3};
  for(let i=1;i<points.length;i++)length+=clippedLength(points[i-1],points[i],expanded);
  const horizontal=b.right-b.left>=b.bottom-b.top;return length>=Math.max(3,Math.min(12,(horizontal?r.width:r.height)*.3));
}
export function collectText(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);return nodes;}
function sourceElement(element){let node=element?.closest(builder);while(node?.hasAttribute('data-builder-text-fragment'))node=node.parentElement?.closest(builder);return node;}
function elementAt(point){return sourceElement(document.elementFromPoint(point.x,point.y));}
function encloses(mark,r){return r.left>=mark.left-3&&r.right<=mark.right+3&&r.top>=mark.top-3&&r.bottom<=mark.bottom+3;}
function pickElement(points,click){
  if(click)return {element:elementAt(points.at(-1))};const mark=bounds(points),candidates=[];
  for(const node of document.querySelectorAll(builder)){if(node.hasAttribute('data-builder-text-fragment'))continue;const r=node.getBoundingClientRect();if(!r.width||!r.height||!overlaps(mark,r)||getComputedStyle(node).visibility!=='visible')continue;const area=Math.max(0,Math.min(mark.right,r.right)-Math.max(mark.left,r.left))*Math.max(0,Math.min(mark.bottom,r.bottom)-Math.max(mark.top,r.top)),union=r.width*r.height+(mark.right-mark.left)*(mark.bottom-mark.top)-area,score=area/Math.max(1,union);candidates.push({node,score});}
  candidates.sort((a,b)=>b.score-a.score||(a.node.contains(b.node)?1:b.node.contains(a.node)?-1:0));const first=candidates[0],second=candidates.find(item=>first&&!first.node.contains(item.node)&&!item.node.contains(first.node));return {element:first?.node,ambiguous:!!second&&first.score>0&&Math.abs(first.score-second.score)<.04};
}
export function pickSelection(points,mode='auto'){
  if(!points.length)return null;const mark=bounds(points),click=mark.right-mark.left<8&&mark.bottom-mark.top<8,point=points.at(-1),resolved=pickElement(points,click),element=resolved.element;
  if(mode==='element')return resolved.ambiguous?{error:'That mark covers more than one element. Click the intended element or make a smaller mark.'}:element?{id:element.dataset.builderId}:null;
  const control=element?.closest('button,a,summary');
  if(mode==='auto'&&control&&(click||encloses(mark,control.getBoundingClientRect())))return {id:sourceElement(control).dataset.builderId};
  if(!Intl.Segmenter)return {error:'Precise text selection needs an up-to-date browser.'};
  const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'}),hits=[];let measured=0;
  for(const node of collectText(document.body)){
    const parent=node.parentElement;if(!parent?.closest(builder)||!node.data.trim()||getComputedStyle(parent).visibility!=='visible')continue;
    const whole=document.createRange();whole.selectNodeContents(node);if(![...whole.getClientRects()].some(r=>overlaps(r,mark,4)))continue;
    for(const part of segmenter.segment(node.data)){
      if(++measured>12000)return {error:'That mark covers too much text. Select a smaller part.'};
      const range=document.createRange();range.setStart(node,part.index);range.setEnd(node,part.index+part.segment.length);
      for(const r of range.getClientRects()){if(r.width<.5||r.height<.5)continue;if(click?contains(r,point.x,point.y):strokeHitsRect(points,r)){hits.push({node,start:part.index,end:part.index+part.segment.length,distance:Math.hypot(point.x-(r.left+r.right)/2,point.y-(r.top+r.bottom)/2)});break;}}
    }
  }
  if(click&&hits.length){hits.sort((a,b)=>a.distance-b.distance);hits.splice(1);}
  if(!hits.length)return resolved.ambiguous?{error:'That mark covers more than one element. Click the intended element or make a smaller mark.'}:mode==='auto'&&element&&(click||encloses(mark,element.getBoundingClientRect()))?{id:element.dataset.builderId}:null;
  let root=hits[0].node.parentElement.closest(builder);while(root&&!hits.every(hit=>root.contains(hit.node)))root=root.parentElement?.closest(builder);
  if(!root)return {error:'Mark text within one website section at a time.'};
  const nodes=collectText(root),indexes=new Map(nodes.map((node,index)=>[node,index]));hits.sort((a,b)=>indexes.get(a.node)-indexes.get(b.node)||a.start-b.start);
  const parts=[];for(const hit of hits){const index=indexes.get(hit.node),previous=parts.at(-1);if(previous&&previous.nodeIndex===index&&previous.end===hit.start){previous.end=hit.end;previous.text=hit.node.data.slice(previous.start,previous.end);}else parts.push({nodeIndex:index,start:hit.start,end:hit.end,text:hit.node.data.slice(hit.start,hit.end)});}
  while(parts.length&&!parts[0].text.trim())parts.shift();while(parts.length&&!parts.at(-1).text.trim())parts.pop();
  if(!parts.length)return null;
  const first=parts[0],last=parts.at(-1);first.start+=first.text.length-first.text.trimStart().length;first.text=first.text.trimStart();last.end-=last.text.length-last.text.trimEnd().length;last.text=last.text.trimEnd();
  if(parts.length>160||parts.reduce((sum,p)=>sum+p.text.length,0)>6000)return {error:'Mark up to 6,000 characters at a time.'};
  return {id:root.dataset.builderId,textSelection:{parts}};
}
export function selectionRects(selection){
  const root=selection?.id&&document.querySelector(`[data-builder-id="${selection.id}"]`);if(!root)return [];
  if(!selection.textSelection)return [root.getBoundingClientRect()];
  const nodes=collectText(root),rects=[];
  for(const part of selection.textSelection.parts){const node=nodes[part.nodeIndex];if(!node||node.data.slice(part.start,part.end)!==part.text)return [];const range=document.createRange();range.setStart(node,part.start);range.setEnd(node,part.end);rects.push(...range.getClientRects());}
  return rects;
}
