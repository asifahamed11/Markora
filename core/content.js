import sanitizeHtml from 'sanitize-html';
import { parseFragment, serialize, serializeOuter } from 'parse5';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function walk(node, fn) { fn(node); for (const child of node.childNodes || []) walk(child, fn); }
export function getId(node) { return node.attrs?.find(a => a.name === 'data-builder-id')?.value; }
export function findNode(html, id) {
  const root = parseFragment(html); let found;
  walk(root, node => { if (getId(node) === id) found = node; });
  if (!found) throw new Error('This element no longer exists. Select it again.');
  return { root, node: found, html: serializeOuter(found) };
}
export function cleanHTML(html, prefix, preserve = false) {
  const cleaned = sanitizeHtml(html, {
    allowedTags: ['section', 'header', 'footer', 'nav', 'main', 'div', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'p', 'span', 'a', 'button', 'ul', 'ol', 'li', 'strong', 'em', 'small', 'br', 'hr', 'blockquote', 'figure', 'figcaption', 'details', 'summary'],
    allowedAttributes: { '*': ['class', 'id', 'data-builder-id', 'data-builder-text-fragment', 'aria-label', 'role'], a: ['href', 'title'], button: ['type'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'], allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
  const root = parseFragment(cleaned); let count = 0; const seen = new Set();
  walk(root, node => {
    if (!node.tagName) return;
    let id = preserve ? getId(node) : undefined;
    if (id && (!/^[a-z][a-z0-9-]{0,79}$/.test(id) || seen.has(id))) throw new Error('The AI returned duplicate or invalid element IDs.');
    if (!id) { do { id = `${prefix.slice(0,68)}-n${++count}`; } while (seen.has(id)); }
    seen.add(id);
    node.attrs = node.attrs.filter(a => a.name !== 'data-builder-id');
    node.attrs.push({ name: 'data-builder-id', value: id });
    if (node.tagName === 'button') { node.attrs = node.attrs.filter(a => a.name !== 'type'); node.attrs.push({ name: 'type', value: 'button' }); }
  });
  return serialize(root);
}
export function validateCSS(css, targetId) {
  const ast = postcss.parse(css);
  if (/url\s*\(|expression\s*\(|javascript\s*:|@import|\\/i.test(css)) throw new Error('External assets and executable CSS are unsupported in the MVP.');
  ast.walkDecls(decl => {
    if (decl.prop.startsWith('--') && targetId) throw new Error('Targeted edits cannot change shared CSS variables.');
  });
  ast.walkAtRules(rule => {
    if (!['media', 'supports', 'keyframes'].includes(rule.name.toLowerCase()) || (targetId && rule.name.toLowerCase() === 'keyframes')) throw new Error('Unsupported CSS at-rule.');
  });
  if (targetId) ast.walkRules(rule => {
    selectorParser(selectors => selectors.each(selector => {
      const first = selector.nodes.find(n => n.type !== 'comment');
      if (first?.type !== 'attribute' || first.attribute !== 'data-builder-id' || first.operator !== '=' || first.value !== targetId) throw new Error('Every edit selector must start with the selected data-builder-id.');
      // Sibling selectors or :has could change/select outside the chosen subtree.
      selector.walkCombinators(n => { if (![' ', '>'].includes(n.value)) throw new Error('Edits must stay within the selected element.'); });
      selector.walkPseudos(n => { if (n.nodes?.length || /:has|:root|:host/.test(n.value)) throw new Error('Use simple pseudo selectors in targeted edits.'); });
    })).processSync(rule.selector);
  });
  return ast.toString();
}
export function sectionCSS(css,sectionId){
  if(!/^[a-z][a-z0-9-]{0,39}$/.test(sectionId))throw new Error('Invalid section ID.');
  const ast=postcss.parse(validateCSS(css));
  ast.walkRules(rule=>{
    for(let parent=rule.parent;parent;parent=parent.parent)if(parent.type==='atrule'&&parent.name.toLowerCase()==='keyframes')return;
    rule.selector=selectorParser(selectors=>selectors.each(selector=>{
      selector.walkIds(node=>{if(node.value==='SECTION_ID')node.value=sectionId;});
      const first=selector.nodes.find(node=>node.type!=='comment');
      if(first?.type!=='id'||first.value!==sectionId)throw new Error(`Every section selector must start with #${sectionId}.`);
      selector.walkCombinators(node=>{if(![' ','>'].includes(node.value))throw new Error('Section styles must stay within their section.');});
    })).processSync(rule.selector);
  });
  return ast.toString();
}
export function replaceTarget(sectionHTML, targetId, before, after) {
  const current = findNode(sectionHTML, targetId);
  if (current.html !== before) throw new Error('The edit was based on stale source. Select the element and retry.');
  const cleaned = cleanHTML(after, `${targetId}-edit`, true);
  const fragment = parseFragment(cleaned);
  const elements = fragment.childNodes.filter(n => n.tagName);
  if (elements.length !== 1 || fragment.childNodes.some(n => n.nodeName === '#text' && n.value.trim()) || getId(elements[0]) !== targetId) throw new Error('An edit must preserve the selected element’s root ID.');
  const replacement = elements[0];
  const parent = current.node.parentNode;
  parent.childNodes[parent.childNodes.indexOf(current.node)] = replacement;
  replacement.parentNode = parent;
  const output = serialize(current.root); const seen = new Set();
  walk(parseFragment(output), node => { const id = getId(node); if (id) { if (seen.has(id)) throw new Error('The edit created a duplicate element ID.'); seen.add(id); } });
  return output;
}
export function siteHTML(state) {
  const pending=state.complete?'':(state.buildDraft?.sections||[]).filter(spec=>!state.sections.some(section=>section.id===spec.id)).map((spec,index)=>`<section class="ew-pending" aria-busy="true"><div class="ew-container"><p class="ew-eyebrow">${index===0&&!state.sections.length?'YOUR DESIGN IS TAKING SHAPE':'COMING NEXT'}</p><h2>${escapeHTML(!state.sections.length&&index===0?state.buildDraft.name||state.title:spec.title)}</h2><p>${escapeHTML(!state.sections.length&&index===0?state.buildDraft.headline||spec.purpose:spec.purpose)}</p><div class="ew-loading-line" aria-hidden="true"></div><small>Designing ${escapeHTML(spec.title.toLowerCase())}…</small></div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(state.title)}</title><link rel="stylesheet" href="./styles.css"></head><body>${state.sections.map(s => s.html).join('\n')}${pending}</body></html>`;
}
