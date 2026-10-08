import {checkProject} from './quality.js';
import {toolkitPreferences} from './skill-pack.js';

// Named, app-owned lifecycle hooks. Never execute commands from project files.
export const hookCatalog=[
  {id:'before-model',name:'Relevant skills',description:'Load integrity-checked design / React / testing guidance before an AI request.'},
  {id:'after-change',name:'Source checks',description:'Inspect the committed revision locally after a completed build or edit.'},
  {id:'on-demand-browser',name:'Live page check',description:'Inspect desktop/mobile with Playwright MCP and axe-core when requested.'},
];
export async function afterChangeHook(project,config,signal){
  if(!toolkitPreferences(config).autoCheck)return null;
  try{return {status:'checked',report:await checkProject(project,signal)};}
  catch(error){return {status:signal?.aborted?'cancelled':'failed',revision:project.history.cursor,message:'The change is saved, but source checks did not finish. Run checks again.'};}
}
