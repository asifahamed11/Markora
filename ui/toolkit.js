import './toolkit.css';

const names={'frontend-design':'Design guidance','react-best-practices':'React performance','webapp-testing':'Browser testing'};
const descriptions={design:'Anthropic frontend design · typography, composition and a direction suited to your brief.',react:'Vercel React best practices · relevant performance rules for component edits.',testing:'Anthropic webapp testing · inspect first, use reliable selectors, verify honestly.',autoCheck:'Run source checks after a completed build or edit. New React builds check the page before completion; other checks run on demand.'};
const ids={design:'frontend-design',react:'react-best-practices',testing:'webapp-testing'};
export function toolkitSettings(parent,api,run){
  const panel=document.createElement('section');panel.id='settings-extensions';panel.className='settings-page';panel.hidden=true;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-extensions');
  panel.innerHTML='<div class="setup-card"><div class="setup-card-heading"><div><h3>Built-in toolkit</h3><p>Design guidance and local checks, shared by every connected AI service.</p></div></div><div id="skill-toggles"></div><p class="toolkit-pack-note">New React sites use local shadcn/ui Button, ReUI Button and Magic UI BlurFade adaptations by default. Your design requests take priority. Static sites use native HTML and CSS. Third-party notices are included; inspiration sites are never scraped.</p><div class="toolkit-browser-note"><strong>Live page check</strong><p>Playwright MCP + axe-core inspect your local preview at desktop and mobile sizes. New React websites are checked before completion. Use Project checkup to check again.</p><small>Uses an isolated Chrome or Edge session. No API key for these tools. Your chosen AI service may have usage charges.</small></div></div>';
  const toggles=panel.querySelector('#skill-toggles');
  for(const key of ['design','react','testing','autoCheck']){
    const label=document.createElement('label');label.className='checkbox-row toolkit-toggle';
    const input=document.createElement('input');input.type='checkbox';input.id=`toolkit-${key}`;
    const body=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small');
    title.textContent=names[ids[key]]||'Check each change';description.textContent=descriptions[key];body.append(title,description);label.append(input,body);
    if(ids[key]){const source=document.createElement('button');source.type='button';source.className='text-button toolkit-source';source.textContent='Source ↗';source.onclick=()=>run(()=>api.toolkitSource(ids[key]));body.append(source);}
    toggles.append(label);
  }
  parent.prepend(panel);
  const notices=document.createElement('details');notices.className='toolkit-notices';const summary=document.createElement('summary');summary.textContent='Licences and sources';const body=document.createElement('pre');body.textContent='Open to read the bundled notices.';notices.append(summary,body);panel.querySelector('.setup-card').append(notices);notices.ontoggle=()=>{if(notices.open)run(async()=>{body.textContent=await api.toolkitNotices();});};
  return {fill:state=>{for(const key of ['design','react','testing','autoCheck'])panel.querySelector(`#toolkit-${key}`).checked=state.config.toolkit?.[key]??true;},read:()=>Object.fromEntries(['design','react','testing','autoCheck'].map(key=>[key,panel.querySelector(`#toolkit-${key}`).checked]))};
}

export function browserChecks(parent,api,run,refresh){
  const section=document.createElement('section');section.className='toolkit-browser';
  section.innerHTML='<div class="toolkit-browser-heading"><div><strong>See what the browser sees</strong><p>Desktop, mobile, accessibility and runtime errors.</p></div><button type="button" id="run-browser-check" class="outline-button">Check live page</button></div><p id="browser-check-status" role="status">No browser check yet.</p><div id="browser-check-findings"></div><details id="browser-check-snapshot" hidden><summary>MCP page snapshot</summary><pre></pre></details><button type="button" id="export-browser-check" class="text-button" hidden>Save report ↗</button><small class="check-scope">Automated checks cover the loaded page at two sizes. They do not test every interaction. No screenshots or sign-in required.</small>';
  const reviewButton=document.createElement('button');reviewButton.type='button';reviewButton.className='outline-button';reviewButton.id='run-design-review';reviewButton.textContent='Ask AI for a design review';const reviewOutput=document.createElement('div');reviewOutput.id='design-review-result';reviewOutput.setAttribute('aria-live','polite');section.append(reviewButton,reviewOutput);reviewButton.onclick=()=>run(async()=>{reviewButton.disabled=true;try{await api.designReview();await refresh();}finally{reviewButton.disabled=false;}});
  parent.append(section);const $=id=>section.querySelector('#'+id);let pending=false;
  $('run-browser-check').onclick=()=>run(async()=>{pending=true;$('run-browser-check').disabled=true;$('browser-check-status').textContent='Opening a local browser…';try{await api.toolkitCheck();await refresh();}catch(error){$('browser-check-status').textContent=error.message;throw error;}finally{pending=false;$('run-browser-check').disabled=false;}});
  $('export-browser-check').onclick=()=>run(()=>api.toolkitExport());
  api.onEvent(event=>{if(event.kind==='toolkit-progress')$('browser-check-status').textContent=event.message;});
  return state=>{
    section.hidden=state.project?.kind==='project';$('run-browser-check').disabled=state.busy||pending||!state.project;
    const report=state.toolkit?.browser;
    reviewButton.hidden=state.project?.kind!=='react'||state.config.provider==='demo';reviewButton.disabled=state.busy||pending||!report||report.stale||report.skipped;reviewOutput.replaceChildren();if(report?.designReview&&!report.stale){const review=report.designReview,title=document.createElement('p');title.textContent=`AI opinion: ${review.total}/${review.maximum}. ${review.summary}`;reviewOutput.append(title);for(const row of review.scores){const item=document.createElement('p');item.textContent=`${row.criterion}: ${row.score}/5 — ${row.reason}`;reviewOutput.append(item);}for(const fix of review.fixes){const item=document.createElement('p');item.textContent=fix;reviewOutput.append(item);}const scope=document.createElement('small');scope.textContent=review.scope;reviewOutput.append(scope);}
    $('export-browser-check').hidden=!report;$('export-browser-check').disabled=state.busy;
    $('browser-check-snapshot').hidden=!report||report.stale;
    const findings=$('browser-check-findings');findings.replaceChildren();
    if(!report){if(!pending)$('browser-check-status').textContent='No browser check yet.';return;}
    if(report.stale){$('browser-check-status').textContent='The page changed. Run a fresh check.';return;}
    if(report.skipped){$('browser-check-status').textContent='Browser check unavailable: '+report.skipped;$('browser-check-snapshot').hidden=true;return;}
    const count=report.views.reduce((sum,view)=>sum+view.findings.length,0),incomplete=report.views.reduce((sum,view)=>sum+view.incomplete,0);
    $('browser-check-status').textContent=`${count} accessibility findings · ${report.views.filter(view=>view.overflow).length} sizes with overflow · ${report.runtimeErrors.length} runtime errors${incomplete?` · ${incomplete} checks need manual review`:''}`;
    $('browser-check-snapshot pre').textContent=report.mcp.snapshot;
    function finding(message,nodes=[]){
      const row=document.createElement('div');row.className='toolkit-finding';const text=document.createElement('p');text.textContent=message;row.append(text);
      const target=nodes.find(node=>node.targetId)?.targetId;
      if(target){const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent='Select for voice fix';button.disabled=state.busy;button.onclick=()=>run(async()=>{await api.toolkitSelect(target);await refresh();});row.append(button);}findings.append(row);
    }
    for(const view of report.views){if(view.overflow)finding(`${view.name}: page extends past the screen.`,view.overflowTargets);for(const issue of view.findings)finding(`${view.name}: ${issue.message} (${issue.impact})`,issue.nodes);}
    for(const view of report.views){const design=view.design;if(!design)continue;if(design.smallTargets.length)finding(`${view.name}: ${design.smallTargets.length} controls measure below 24 px. Review target size and spacing.`,design.smallTargets);if(design.smallBodyText)finding(`${view.name}: ${design.smallBodyText} long paragraphs use text below 16 px. Review readability.`);if(design.placeholders)finding(`${view.name}: placeholder wording remains in the page.`);if(design.images.some(image=>!image.loaded))finding(`${view.name}: a content image did not load.`);if(design.images.some(image=>!image.hasDimensions))finding(`${view.name}: add intrinsic image dimensions to reduce layout shifts.`);}
    for(const error of report.runtimeErrors)finding(error.message);
    if(report.refinement?.skipped)finding('AI refinement did not finish: '+report.refinement.skipped);
  };
}
