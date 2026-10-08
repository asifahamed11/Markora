import {z} from 'zod';
const number=z.number().finite().min(-100000).max(100000);
export const VisualContext=z.object({
  tag:z.string().max(30),text:z.string().max(2000),
  rect:z.object({x:number,y:number,width:number,height:number}),
  viewport:z.object({width:number,height:number}),
  styles:z.record(z.string().max(40),z.string().max(300)).refine(value=>Object.keys(value).length<=25),
  nearby:z.string().max(3000),instances:z.number().int().min(1).max(10000).optional(),
});
export function imageBytes(image){
  if(!image||image.mime!=='image/png'||typeof image.data!=='string'||image.data.length>3000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))throw new Error('Invalid preview image.');
  const bytes=Buffer.from(image.data,'base64');
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)>1600||bytes.readUInt32BE(20)>1200)throw new Error('Preview image exceeds the supported size.');
  return bytes;
}
