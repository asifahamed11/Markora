// Runs in an isolated Node subprocess so cancellation also stops WASM workers.
const {createWorker}=require('tesseract.js');
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);
process.stdin.on('end',async()=>{
 let worker;
 try{
  const {images,cachePath}=JSON.parse(input);
  const workerPath=require.resolve('tesseract.js/src/worker-script/node/index.js').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  const notify=event=>process.stdout.write(JSON.stringify(event)+'\n');
  worker=await createWorker(['eng','ben'],1,{workerPath,cachePath,logger:event=>{if(/loading language/.test(event.status))notify({phase:'models'});},errorHandler:()=>{}});
  for(const [index,image] of images.entries()){
   notify({phase:'page',index});
   const {data}=await worker.recognize(Buffer.from(image.data,'base64'));
   notify({phase:'result',index,text:data.text.replace(/\u0000/g,'').trim(),confidence:data.confidence});
  }
 }catch{process.stderr.write('Local image reading failed. Check internet access for the first OCR model download, or select a vision-capable AI.');process.exitCode=1;}
 finally{await worker?.terminate();}
});
