import {z} from 'zod';
import {structuredRequest} from './structured-request.js';
import {skillContext} from './skill-pack.js';
export const reviewCriteria=['hierarchy','typography','colour','spacing and rhythm','responsiveness','motion restraint','content fidelity','accessibility'];
export const DesignReview=z.object({scores:z.tuple(reviewCriteria.map(criterion=>z.object({criterion:z.literal(criterion),score:z.number().int().min(1).max(5),reason:z.string().min(1).max(400)}))),fixes:z.array(z.string().min(1).max(400)).max(3),summary:z.string().min(1).max(600)});
export async function reviewDesign({config,key,emit=()=>{},signal,request},project,evidence){
 if(config.provider==='demo')throw new Error('AI design review needs a connected service. The offline sample cannot evaluate design.');
 const files=project.state.files.filter(f=>/^src\/sections\/|^src\/styles\.css$/.test(f.path));if(files.reduce((n,f)=>n+f.content.length,0)>100000)throw new Error('This project exceeds the optional review context. Review individual sections instead.');
 const task='Check this design without changing files. Score each criterion from 1 to 5 in the exact requested order and explain the supplied evidence behind it. Scores are subjective model opinions, not test results or a certificate. Keep content-fidelity claims limited to the supplied sources and quotes. Report up to three concrete fixes and a short summary. Never claim an interaction or user task was tested unless the supplied browser evidence actually records it. No patches, commands, new facts or unsupported success claims.';
 const skills=await skillContext(config,'react',task,{plan:project.state.design});emit({kind:'skills-used',skills:skills.ids,budget:skills.budget});
 const result=await structuredRequest({config:{...config,requestTimeoutMs:90000},key,system:skills.text+'\n'+task,input:{criteria:reviewCriteria,plan:project.state.design,profile:project.state.brief?.profile||{},contentAudit:project.state.brief?.contentAudit,evidence,files},schema:DesignReview,signal,onUsage:u=>emit({kind:'request-measured',stage:'check',...u})},request);
 return {...result,total:result.scores.reduce((n,row)=>n+row.score,0),maximum:40,scope:'Subjective AI opinion. Files were not changed. Apply any agreed fix with the pen or text command.'};
}
