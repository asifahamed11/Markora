const names={'frontend-design':'Frontend design','design-craft':'Layout rules','react-best-practices':'React performance','webapp-testing':'Testing guidance','project-design':'Project DESIGN.md',shadcn:'shadcn/ui','magic-ui':'Magic UI',reui:'ReUI'};
export function guidanceLabel(id){return id.startsWith('components:')?id==='components:custom'?'Custom component preference':(names[id.slice(11)]||id.slice(11))+' components':id.startsWith('component:')?'Local '+id.slice(10)+' control':id.startsWith('preset:')?id.slice(7).replaceAll('-',' ')+' preset':names[id]||id;}
export function guidanceView(element,usage){
  element.hidden=!usage;
  if(!usage)return;
  const local=usage.mode==='local';
  element.querySelector('summary').textContent=local?'Local edit · no AI request':usage.ids.length?'AI guidance · '+usage.ids.length+' references':'AI guidance · no references';
  element.querySelector('p').textContent=local?'This change used a built-in shortcut.':usage.ids.length?'Attached to the latest AI request. Model output still needs checking.':'No skill instructions were attached to this request.';
  if(!local&&usage.budget)element.querySelector('p').textContent+=` Approx. ${usage.budget.estimatedTokens} guidance tokens ? ${usage.budget.stage}. ${usage.budget.omitted.length?usage.budget.omitted.length+' optional blocks left out to keep context small.':''}`;
  element.querySelector('.guidance-items').replaceChildren(...usage.ids.map(id=>{const span=document.createElement('span');span.textContent=guidanceLabel(id);return span;}));
}
