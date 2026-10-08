// nativeImage decodes pixels but does not apply JPEG EXIF orientation.
export function jpegOrientation(bytes){
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216)return 1;
 let offset=2;
 while(offset+4<=bytes.length){
  if(bytes[offset]!==255)return 1;while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];if(marker===217||marker===218)return 1;if(marker===1||marker>=208&&marker<=215)continue;
  if(offset+2>bytes.length)return 1;const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)return 1;
  if(marker===225&&length>=16&&bytes.toString('ascii',offset+2,offset+8)==='Exif\0\0'){
   const start=offset+8,end=offset+length,little=bytes.toString('ascii',start,start+2)==='II';
   if(!little&&bytes.toString('ascii',start,start+2)!=='MM')return 1;
   const u16=p=>little?bytes.readUInt16LE(p):bytes.readUInt16BE(p),u32=p=>little?bytes.readUInt32LE(p):bytes.readUInt32BE(p);
   if(start+8>end||u16(start+2)!==42)return 1;const table=start+u32(start+4);if(table<start+8||table+2>end)return 1;
   const count=u16(table);if(count>1024||table+2+count*12>end)return 1;
   for(let i=0;i<count;i++){const entry=table+2+i*12;if(u16(entry)===274&&u16(entry+2)===3&&u32(entry+4)===1){const value=u16(entry+8);return value>=1&&value<=8?value:1;}}
   return 1;
  }
  offset+=length;
 }
 return 1;
}
export function orientBitmap(bitmap,width,height,orientation){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>60000000||bitmap.length!==width*height*4)throw new Error('Unsupported image dimensions.');
 if(orientation===1)return {bitmap,width,height};
 const swap=orientation>=5,outWidth=swap?height:width,outHeight=swap?width:height,out=Buffer.allocUnsafe(bitmap.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let dx,dy;
  switch(orientation){case 2:dx=width-1-x;dy=y;break;case 3:dx=width-1-x;dy=height-1-y;break;case 4:dx=x;dy=height-1-y;break;case 5:dx=y;dy=x;break;case 6:dx=height-1-y;dy=x;break;case 7:dx=height-1-y;dy=width-1-x;break;case 8:dx=y;dy=width-1-x;break;default:throw new Error('Unsupported image orientation.');}
  out.writeUInt32LE(bitmap.readUInt32LE((y*width+x)*4),(dy*outWidth+dx)*4);
 }
 return {bitmap:out,width:outWidth,height:outHeight};
}
export function normalizedNativeImage(bytes,nativeImage){
 const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw new Error('An input image could not be decoded.');
 const size=image.getSize();if(size.width*size.height>60000000)throw new Error('Resize images below 60 megapixels.');
 const orientation=jpegOrientation(bytes);if(orientation===1)return image;
 const result=orientBitmap(image.toBitmap(),size.width,size.height,orientation);
 return nativeImage.createFromBitmap(result.bitmap,{width:result.width,height:result.height,scaleFactor:1});
}
