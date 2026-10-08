import { jsonResponse } from './schemas.js';
import {accountProviders,requestAccountJSON} from './accounts.js';
import {imageBytes} from './visual-context.js';
import {requestImages} from './input-images.js';

export const providerModels = {
  openai: 'gpt-4.1-mini', anthropic: 'claude-sonnet-4-5', gemini: 'gemini-2.5-flash', demo: 'offline-demo',
  openrouter: 'openrouter/free', ollama: 'qwen2.5-coder:7b',
  chatgpt:'default','claude-code':'default','google-account':'default',
};
export async function requestJSON(config, key, system, input, signal, fetcher = fetch) {
  const images=requestImages(config);
  if(accountProviders.includes(config.provider))return requestAccountJSON(config,system,input,signal);
  if (!key && config.provider !== 'ollama') throw new Error('Connect your AI provider in Settings first. Free cloud providers still require your own key.');
  const timeout = AbortSignal.timeout(config.provider === 'ollama' ? 600000 : 180000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const waitError=error=>!signal?.aborted&&(timeout.aborted||error.name==='TimeoutError')?new Error('The AI service took too long to respond. Try again, or choose another model in Settings.'):error;
  const prompt = `${system}\nReturn ONLY valid JSON, with no markdown or commentary.`;
  let url, headers, body;
  if (config.provider === 'openai') {
    url = 'https://api.openai.com/v1/responses';
    headers = { Authorization: `Bearer ${key}` };
    const content=[{type:'input_text',text:JSON.stringify(input)}];
    for(const image of images)content.push({type:'input_text',text:'Document image: '+image.name},{type:'input_image',image_url:`data:${image.mime};base64,${image.data}`,detail:'auto'});
    if(config.visualImage)content.push({type:'input_image',image_url:'data:image/png;base64,'+imageBytes(config.visualImage).toString('base64'),detail:'auto'});
    body = { model: config.model, instructions: prompt, input: config.visualImage||images.length?[{role:'user',content}]:JSON.stringify(input), store: false, max_output_tokens: 14000, text: { format: { type: 'json_object' } } };
  } else if (config.provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    body = { model: config.model, system: prompt, max_tokens: 14000, messages: [{ role: 'user', content: JSON.stringify(input) }] };
    if(images.length)body.messages[0].content=[{type:'text',text:JSON.stringify(input)},...images.flatMap(image=>[{type:'text',text:'Document image: '+image.name},{type:'image',source:{type:'base64',media_type:image.mime,data:image.data}}])];
  } else if (config.provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
    headers = { 'x-goog-api-key': key };
    body = { systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }], generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 14000 } };
    for(const image of images)body.contents[0].parts.push({text:'Document image: '+image.name},{inlineData:{mimeType:image.mime,data:image.data}});
  } else if (config.provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = { Authorization: `Bearer ${key}` };
    body = { model: config.model, messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(input) }], max_tokens: 14000, response_format:{type:'json_object'},provider:{require_parameters:true},reasoning:{effort:'low',exclude:true} };
    if(images.length)body.messages[1].content=[{type:'text',text:JSON.stringify(input)},...images.flatMap(image=>[{type:'text',text:'Document image: '+image.name},{type:'image_url',image_url:{url:`data:${image.mime};base64,${image.data}`}}])];
  } else if (config.provider === 'ollama') {
    if (/:cloud$/.test(config.model)) throw new Error('Choose a downloaded local Ollama model, not a cloud model.');
    url = 'http://127.0.0.1:11434/api/chat'; headers = {};
    body = { model: config.model, stream: false, format: 'json', messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(input) }], options: { num_ctx: 32768, num_predict: 14000 } };
    if(images.length)body.messages[1].images=images.map(image=>image.data);
  } else throw new Error('Unsupported provider.');
  let response;
  try { response = await fetcher(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: combined }); }
  catch (error) { if (config.provider === 'ollama' && !combined.aborted) throw new Error('Ollama is not responding. Install/start Ollama and download the model selected in Settings.'); throw waitError(error); }
  if (!response.ok) {
    // Do not echo provider payloads: they may contain personal text or secrets.
    throw new Error(`AI provider returned HTTP ${response.status}. Check your key, model access, quota, and connection.`);
  }
  const data = await response.json().catch(error=>{if(!combined.aborted&&/terminated|socket|network/i.test(error.message))throw new Error('The model connection was interrupted while reading the response.');throw waitError(error);});
  if(config.provider==='openrouter'&&data.error)throw new Error(`AI provider returned error ${Number.isInteger(Number(data.error.code))?Number(data.error.code):'response'}. Check your model access, quota and connection.`);
  const raw = config.provider === 'openai'
    ? (data.output || []).flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('')
    : config.provider === 'anthropic'
      ? (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
      : config.provider === 'openrouter' ? data.choices?.[0]?.message?.content || ''
        : config.provider === 'ollama' ? data.message?.content || ''
          : (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if (!raw) throw new Error('The provider returned no usable text. Try another model or a shorter document.');
  return jsonResponse(raw);
}
