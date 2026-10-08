export function projectControls(container,onNew,onStyle){
 const row=document.createElement('div');row.className='project-controls';
 const hint=document.createElement('span');hint.className='workspace-hint';
 const button=document.createElement('button');button.type='button';button.className='text-button';button.id='new-project';button.textContent='New project';row.append(hint,button);container.append(row);
 const options=document.createElement('details');options.className='design-options';const summary=document.createElement('summary');summary.textContent='Design options';options.append(summary);const design=document.createElement('label');design.className='design-choice';design.textContent='Design direction';const styles=document.createElement('select');styles.setAttribute('aria-label','Design direction');styles.append(new Option('Match my brief','auto'),new Option('Editorial · warm & expressive','editorial'),new Option('Creative studio · bold','studio'),new Option('Precision · structured','technical'));design.append(styles);options.append(design);container.append(options);
 button.onclick=onNew;styles.onchange=()=>onStyle?.(styles.value);
 return state=>{button.disabled=styles.disabled=state.busy;styles.value=state.config.websiteStyle||'auto';options.hidden=!!state.project||state.config.projectMode==='project'||state.config.projectMode==='existing';hint.textContent=state.project?.kind==='existing'?'React / Vite detected':state.project?.kind==='project'?'Project files':state.project?'Website':'Follows your request';};
}
