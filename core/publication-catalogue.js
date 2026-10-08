// Preserve explicit Markdown bibliographies before an LLM summary can drop
// coauthors or promote an invitation/acceptance into a published paper.
export function sourcePublications(documents){
 const records=[];
 for(const doc of documents){
  if(doc.kind==='image')continue;
  for(const block of (doc.text||'').split(/(?=^### \d+\. )/m)){
   const heading=/^### (\d+)\. ([^\r\n]+)/.exec(block);
   const fields=Object.fromEntries([...block.matchAll(/^- \*\*([^:\r\n]+):\*\* ([^\r\n]+)/gm)].map(m=>[m[1],m[2].trim()]));
   if(!heading||!fields.Authors||!fields.Status||!(fields.Conference||fields.Journal||fields.Book))continue;
   records.push({source:doc.name,id:heading[1],title:heading[2].trim(),...fields});
  }
 }
 return records;
}
export function preservePublicationSources(profile,documents){
 const records=sourcePublications(documents);if(!records.length)return profile;
 const counts={};for(const record of records){const status=record.Status.split(';')[0].trim();counts[status]=(counts[status]||0)+1;}
 const mixed=records.some(r=>r.Status!=='Published');
 return {...profile,publications:records.map(r=>r.title+' — Status: '+r.Status),sourcePublications:records,publicationStatusCounts:counts,
  bio:mixed?profile.bio.replace(/peer-reviewed publications/gi,'listed research contributions'):profile.bio};
}
export function preserveCatalogueTotal(plan,count){
 if(!count)return plan;
 const correct=value=>typeof value==='string'?value.replace(/\ball\s+\d+\s+(publications|papers(?: and book chapters)?|works|contributions)\b/gi,(_,kind)=>'all '+count+' '+kind):Array.isArray(value)?value.map(correct):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,correct(item)])):value;
 return correct(plan);
}
