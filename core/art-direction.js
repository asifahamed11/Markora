import {z} from 'zod';
import {designPreset} from './design-context.js';

const sentence=z.string().min(1).max(700);
export const ArtDirection=z.object({
  candidates:z.array(z.object({name:z.string().min(1).max(90),composition:sentence,fit:sentence})).length(3).refine(items=>new Set(items.map(item=>item.composition.toLowerCase().replace(/\s+/g,' ').trim())).size===3,'Concepts must have different compositions, not duplicate descriptions'),
  chosen:z.number().int().min(0).max(2),
  signature:sentence,
  rhythm:z.array(sentence).min(1).max(10),
  motion:sentence,
});
const lenses={
  editorial:['Magazine opening: a strong masthead and offset story introduction.','Annotated essay: margin notes and deliberate reading rhythm.','Typographic journal: expressive display type with quiet long-form content.'],
  'dark-tech':['Instrument panel: real local controls and precise type hierarchy.','Technical field notes: compact annotations and a useful project index.','Product terminal: restrained contrast and an interaction that explains the tool.'],
  brutalist:['Type manifesto: strong scale and explicit grid structure.','Work catalogue: blunt labels and wide evidence-led rows.','Graphic sheet: clear rules and one original composition built from real content.'],
  playful:['Interactive story: a small useful response that fits the topic.','Color chapter: distinct content groups and friendly readable type.','Illustrated index: original local vector detail and clear navigation.'],
  academic:['Research atlas: a strong typographic masthead with a structured publication index.','Field notebook: an annotated opening, restrained rules and a readable investigation timeline.','Editorial dossier: oversized name, compact academic facts and alternating long-form sections.'],
  'creative-portfolio':['Gallery-led portfolio: an offset title and immersive work rows with real content.','Typographic poster: a confident opening, strong negative space and a contrasting project index.','Studio notebook: intimate type, numbered work chapters and purposeful hover details.'],
  'corporate-clean':['Product demonstration: use a working local interaction to explain the actual product.','Editorial launch: an expressive opening and alternating feature compositions.','Workflow canvas: a diagram of the real process and a compact, useful navigation.'],
  minimal:['Quiet editorial: strong type hierarchy and a distinctive asymmetric opening.','Architectural grid: deliberate proportion, fine rules and spacious content rows.','Focused product: one memorable composition and a small, useful interaction.'],
};
export function conceptBrief(config,command){
 const preset=designPreset(config,'Create a design plan',{command}),ideas=lenses[preset]||lenses['creative-portfolio'];
 return `Art direction: explore THREE visibly different concepts in the plan.artDirection candidates, then choose the one best suited to this content. Starting lenses (adapt them, do not copy a template): ${ideas.join(' ')} Explain the content fit. Define one memorable, purposeful signature and an explicit rhythm for the real sections. The signature must be visible in the opening composition or a custom interaction tied to actual content; ordinary rounded buttons, hover lifts, tabs, filters or entrance fades alone are not a signature. For an expressive brief, commit to a clear typographic, spatial or interactive idea instead of defaulting to a safe split hero and uniform rows. A small local prototype or original diagram is useful when it explains supplied work, clearly labeled as a demonstration rather than evidence of published features. Do not manufacture product claims. Describe how each concept changes the actual opening geometry and hierarchy; palette changes alone are not different concepts. Specify motion that helps orientation or feedback, with an immediate reduced-motion version. Honor the user's existing brand and requested simplicity. A request for minimal design still needs intentional composition. Avoid the standard centered headline + three identical rounded cards. Do not create fake dashboards, statistics, client logos, testimonials or decorative placeholder images. Contrast, readable text, keyboard focus and mobile usability are part of the design. Make the page recognizable from its opening composition, not extra adjectives in the copy.`;
}
export function directionName(plan){return plan.artDirection?.candidates[plan.artDirection.chosen]?.name||'Content-led design';}
