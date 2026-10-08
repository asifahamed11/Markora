import {z} from 'zod';
import {requestJSON} from './providers.js';
import {coreKnowledge,estimateTokens} from './knowledge.js';

const writing='For summaries, instructions and interface copy, use plain, specific sentences. Prefer concrete verbs and remove hype, filler, staged slogans and repetitive closing lines. Preserve every supplied fact, name, number, date, quotation and link. Match the user language. Do not change code identifiers or add unsupported claims while improving prose.';
// Large document bundles and source patches need more time than a short edit.
// Keep a hard ceiling, preserve explicit review deadlines and never extend Stop.
export function requestDeadline(config,tokens){
 const explicit=config.requestTimeoutMs;
 if(explicit!==undefined){if(!Number.isFinite(explicit)||explicit<=0)throw new Error('Invalid model request deadline.');return Math.min(300000,Math.ceil(explicit));}
 return tokens>=6000?300000:180000;
}
export function abortableRequest(run,signal){return new Promise((resolve,reject)=>{const aborted=()=>{cleanup();reject(signal.reason||new Error('Cancelled.'));},cleanup=()=>signal.removeEventListener('abort',aborted);if(signal.aborted)return aborted();signal.addEventListener('abort',aborted,{once:true});Promise.resolve().then(run).then(value=>{cleanup();signal.aborted?reject(signal.reason):resolve(value);},error=>{cleanup();reject(error);});});}

// One bounded format-repair attempt; authentication/quota failures are never
// retried. Source/output is data, and nothing is committed until validation.
export async function structuredRequest({config,key,system,input,schema,signal,onRepair,onUsage},request=requestJSON){
 const contract=JSON.stringify(z.toJSONSchema(schema)),core=await coreKnowledge();let issues;
 for(let attempt=0;attempt<2;attempt++){
  signal?.throwIfAborted();let raw;
  const prompt=`${core}\n${system}\n${writing}\nReturn ONLY valid JSON matching this schema: ${contract}${issues?'\nYour previous response failed validation. Correct these fields: '+JSON.stringify(issues):''}`;
  const estimatedPromptTokens=estimateTokens(prompt)+estimateTokens(input),deadlineMs=requestDeadline(config,estimatedPromptTokens);
  const began=Date.now(),timeout=AbortSignal.timeout(deadlineMs),abort=signal?AbortSignal.any([signal,timeout]):timeout;
  try{raw=await abortableRequest(()=>request(config,key,prompt,input,abort),abort);onUsage?.({estimatedPromptTokens,deadlineMs,elapsedMs:Date.now()-began,attempt:attempt+1,status:'received'});}
  catch(error){onUsage?.({estimatedPromptTokens,deadlineMs,elapsedMs:Date.now()-began,attempt:attempt+1,status:signal?.aborted?'cancelled':timeout.aborted?'timeout':'failed'});if(timeout.aborted&&!signal?.aborted)throw new Error('This model request timed out. Your saved files are safe. Retry or test another available model.');if(!/invalid JSON|returned no usable text|connection was interrupted while reading/i.test(error.message)||attempt)throw error;issues=[{path:'response',message:'Return a nonempty valid JSON response, without commentary.'}];onRepair?.();continue;}
  const result=schema.safeParse(raw);if(result.success)return result.data;
  issues=result.error.issues.slice(0,8).map(i=>({path:i.path.join('.'),message:i.message.slice(0,180)}));
  if(!attempt)onRepair?.();
 }
 throw new Error(`The AI output still failed validation (${issues?.[0]?.path||'response'}). No change was applied. Test another model or simplify the request.`);
}
