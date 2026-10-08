import {z} from 'zod';
export const CompactReview=z.object({summary:z.string().min(1).max(700),edits:z.array(z.object({path:z.string().max(180),before:z.string().min(1).max(2000),after:z.string().max(4000)})).max(6)});
export function reviewFiles(files,budget=30000){
 // Shared CSS and the opening are useful even when a large catalogue occupies
 // most of the source. Prefer SVG sections for interactive accessibility fixes.
 const score=file=>file.path==='src/styles.css'?0:/svg/.test(file.content)?1:/hero/.test(file.path)?2:3;
 let used=0;return [...files].sort((a,b)=>score(a)-score(b)).map(file=>file.path==='src/styles.css'&&file.content.length>14000?{...file,content:file.content.slice(0,14000),excerpt:true}:file).filter(file=>{if(used+file.content.length>budget)return false;used+=file.content.length;return true;});
}
export function materializeReview(files,reply){
 const changed=new Map();for(const edit of reply.edits){const file=files.find(file=>file.path===edit.path);if(!file)throw new Error('Review edit refers to a file outside the supplied context.');const current=changed.get(edit.path)?.content??file.content;
  const at=current.indexOf(edit.before);if(!edit.before||at<0||current.indexOf(edit.before,at+edit.before.length)>=0)throw new Error('Review snippet must match exactly once in the current file.');
  changed.set(edit.path,{path:edit.path,before:file.content,content:current.slice(0,at)+edit.after+current.slice(at+edit.before.length)});
 }
 return {summary:reply.summary,files:[...changed.values()].filter(file=>file.content!==file.before)};
}
