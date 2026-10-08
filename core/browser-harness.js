import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createConnection} from '@playwright/mcp';

const require=createRequire(import.meta.url);
// Use the browser engine version that the upstream MCP package expects.
const {chromium}=createRequire(require.resolve('@playwright/mcp'))('playwright');
export function previewURL(value){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!url.port||url.username||url.password)throw new Error('Browser checks require the current local preview URL.');
  return url;
}
export async function browserExecutable(){
  const candidates=process.platform==='win32'?[
    path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),
    path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe'),
    path.join(process.env.PROGRAMFILES||'C:/Program Files','Microsoft/Edge/Application/msedge.exe'),
  ]:[chromium.executablePath()];
  for(const file of candidates)try{await fs.access(file);return file;}catch{}
  throw new Error('Install Chrome or Edge to run browser checks. Skills and source checks work without it.');
}
const snapshotText=result=>result.content?.filter(item=>item.type==='text').map(item=>item.text).join('\n').slice(0,14000)||'';

export async function runBrowserHarness({url,signal,emit=()=>{},onScreenshot}){
  const destination=previewURL(url),work=await fs.mkdtemp(path.join(os.tmpdir(),'markora-browser-check-'));
  let browser,server,client,context;
  const timeout=AbortSignal.timeout(60000),abort=signal?AbortSignal.any([signal,timeout]):timeout;
  const closeOnAbort=()=>{void browser?.close().catch(()=>{});};
  abort.addEventListener('abort',closeOnAbort,{once:true});
  try{
    abort.throwIfAborted();
    browser=await chromium.launch({headless:true,executablePath:await browserExecutable(),timeout:20000});
    abort.throwIfAborted();
    // Fresh, temporary context: never attach to the user's signed-in browser.
    context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false});
    await context.route('**/*',route=>{
      const request=route.request(),target=new URL(request.url());
      if(target.origin!==destination.origin||!['GET','HEAD'].includes(request.method()))return route.abort('blockedbyclient');
      return route.continue();
    });
    await context.routeWebSocket('**/*',socket=>{
      const target=new URL(socket.url());
      if(target.hostname===destination.hostname&&target.port===destination.port)socket.connectToServer();else socket.close();
    });
    const page=await context.newPage(),runtimeErrors=[];
    page.on('pageerror',error=>runtimeErrors.push({type:'exception',message:error.message.slice(0,300)}));
    page.on('console',message=>{if(message.type()==='error')runtimeErrors.push({type:'console',message:message.text().slice(0,300)});});
    emit({kind:'toolkit-progress',message:'Opening an isolated local browser for checks.'});
    await page.goto(destination.href,{waitUntil:'networkidle',timeout:15000});
    if(new URL(page.url()).origin!==destination.origin)throw new Error('The preview redirected away from the selected project.');
    // The official Playwright MCP server runs in-process, using this controlled
    // context. Only the snapshot call is exposed by this application adapter.
    server=await createConnection({browser:{isolated:false},capabilities:['core'],webmcp:false,outputDir:work,saveSession:false,imageResponses:'omit',timeouts:{action:5000,navigation:15000}},async()=>context);
    client=new Client({name:'markora-local-inspector',version:'1.0.0'});
    const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);await client.connect(clientTransport,{signal:abort,timeout:10000});
    const tools=await client.listTools({}, {signal:abort,timeout:10000});
    if(!tools.tools.some(tool=>tool.name==='browser_snapshot'))throw new Error('Playwright MCP snapshot is unavailable.');
    const result=await client.callTool({name:'browser_snapshot',arguments:{}},undefined,{signal:abort,timeout:15000});
    if(result.isError)throw new Error('The MCP browser snapshot failed.');
    const snapshot=snapshotText(result),axeSource=await fs.readFile(require.resolve('axe-core/axe.min.js'),'utf8'),views=[];
    for(const viewport of [{name:'Desktop',width:1440,height:1000},{name:'Mobile',width:360,height:844}]){
      abort.throwIfAborted();emit({kind:'toolkit-progress',message:`Checking ${viewport.name.toLowerCase()} layout and accessibility.`});
      await page.setViewportSize(viewport);await page.waitForTimeout(200);
      // App-owned fixed audit code, never LLM-supplied JavaScript.
      await page.evaluate(axeSource);
      const evidence=await page.evaluate(async()=>{
        const audit=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations','incomplete']});
        // An unmapped library child is not the same source as its mapped parent.
        const sourceId=selector=>{try{return document.querySelector(selector)?.getAttribute('data-builder-id')||undefined;}catch{return undefined;}};
        const findings=audit.violations.map(rule=>({rule:rule.id,impact:rule.impact,message:rule.help,helpURL:rule.helpUrl,nodes:rule.nodes.slice(0,6).map(node=>({selector:node.target.join(' '),targetId:sourceId(node.target.join(' ')),message:node.failureSummary?.slice(0,350)}))})).slice(0,30);
        const overflow=document.documentElement.scrollWidth>innerWidth+2;
        const overflowTargets=overflow?Array.from(document.querySelectorAll('body *')).filter(node=>{const rect=node.getBoundingClientRect();return rect.width>0&&rect.right>innerWidth+2&&getComputedStyle(node).position!=='fixed';}).slice(0,8).map(node=>({selector:node.tagName.toLowerCase(),targetId:node.getAttribute('data-builder-id')||undefined})):[];
        const composition=Array.from(document.querySelectorAll('main section,h1,h2,nav,main button')).slice(0,45).map(node=>{const rect=node.getBoundingClientRect(),style=getComputedStyle(node);return {tag:node.tagName.toLowerCase(),id:node.id||undefined,text:node.textContent.trim().slice(0,180),rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)},font:style.fontFamily,fontSize:style.fontSize,color:style.color,background:style.backgroundColor,display:style.display,gap:style.gap};});
        const visible=node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(node).visibility==='visible';};
        const smallTargets=Array.from(document.querySelectorAll('main button,main input,main select')).filter(visible).filter(node=>{const r=node.getBoundingClientRect();return r.width<24||r.height<24;}).slice(0,12).map(node=>({tag:node.tagName.toLowerCase(),targetId:node.getAttribute('data-builder-id')||undefined}));
        const smallBodyText=Array.from(document.querySelectorAll('main p')).filter(visible).filter(node=>node.textContent.length>80&&parseFloat(getComputedStyle(node).fontSize)<16).length;
        const images=Array.from(document.querySelectorAll('main img')).slice(0,30).map(node=>({alt:node.getAttribute('alt'),width:node.naturalWidth,height:node.naturalHeight,loaded:node.complete&&node.naturalWidth>0,hasDimensions:node.hasAttribute('width')&&node.hasAttribute('height'),lazy:node.loading==='lazy'}));
        const placeholders=/\blorem ipsum\b|\byour (?:name|project title) here\b/i.test(document.querySelector('main')?.textContent||'');
        return {findings,incomplete:audit.incomplete.length,overflow,overflowTargets,composition,design:{smallTargets,smallBodyText,images,placeholders,scope:'Rendered measurements and heuristics, not an aesthetic score. Target checks do not account for every WCAG exception.'}};
      });
      views.push({...viewport,...evidence});
      if(viewport.name==='Desktop'&&onScreenshot)await onScreenshot(await page.screenshot({type:'png',animations:'disabled'}));
    }
    abort.throwIfAborted();
    return {checkedAt:Date.now(),url:destination.href,mcp:{name:'@playwright/mcp',version:'0.0.83',connected:true,tool:'browser_snapshot',snapshot},views,runtimeErrors:runtimeErrors.slice(0,25),scope:'Automated accessibility and horizontal overflow at two viewports, plus initial console errors and an MCP accessibility snapshot. No clicks, forms, logins, shell commands or behavioral tests. Cross-origin and non-GET requests are blocked; pages requiring them may need manual testing.'};
  }finally{
    abort.removeEventListener('abort',closeOnAbort);
    await client?.close().catch(()=>{});await server?.close().catch(()=>{});await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
    const actual=await fs.realpath(work),parent=await fs.realpath(os.tmpdir());
    if(path.dirname(actual)!==parent||!path.basename(actual).startsWith('markora-browser-check-'))throw new Error('Invalid browser-check cleanup path.');
    await fs.rm(actual,{recursive:true,force:true,maxRetries:20,retryDelay:150});
  }
}
