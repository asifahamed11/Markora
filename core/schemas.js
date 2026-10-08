import { z } from 'zod';
const text = z.string().max(3000);
export const Profile = z.object({
  name: text, headline: text, bio: text, tone: text,
  skills: z.array(text).max(100),
  projects: z.array(z.object({ name: text, description: text, link: text })).max(30),
  education: z.array(text).max(30), experience: z.array(text).max(30),
  publications: z.array(text).max(30),
  contacts: z.array(z.object({ label: text, url: text })).max(30),
  missing: z.array(text).max(30),
});
export const Plan = z.object({
  title: z.string().min(1).max(200), summary: text,
  palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(2).max(6),
  typography: text, layout: text,
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    title: z.string().min(1).max(120), purpose: text,
  })).min(1).max(10),
}).refine(p => new Set(p.sections.map(s => s.id)).size === p.sections.length, 'Section IDs must be unique');
export const Section = z.object({ html: z.string().min(1).max(60000), css: z.string().max(40000) });
export const WebsiteAnalysis = z.object({ profile: Profile, plan: Plan });
export const SectionBatch = z.object({sections:z.array(Section.extend({id:z.string().regex(/^[a-z][a-z0-9-]{0,39}$/)})).min(1).max(3)});
export function sectionBatchSchema(specs){
 if(!specs.length||specs.length>3)throw new Error('A section batch must contain one to three sections.');
 return SectionBatch.extend({sections:z.tuple(specs.map(section=>Section.extend({id:z.literal(section.id)})))});
}
export const Patch = z.object({
  targetId: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  before: z.string().min(1).max(60000), after: z.string().min(1).max(60000),
  css: z.string().max(20000), summary: z.string().min(1).max(500),
});
export const TextRange = z.object({parts:z.array(z.object({nodeIndex:z.number().int().min(0).max(60000),start:z.number().int().min(0).max(60000),end:z.number().int().min(1).max(60000),text:z.string().min(1).max(6000)})).min(1).max(160)});
export const TextPatch = z.object({
  targetId:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  replacements:z.array(z.object({index:z.number().int().min(0).max(159),text:z.string().max(6000)})).max(160),
  css:z.string().max(20000),summary:z.string().min(1).max(500),
});
export function jsonResponse(raw) {
  const source = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(source); } catch { throw new Error('The AI returned invalid JSON. Please retry or use another model.'); }
}
