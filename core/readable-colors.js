import postcss from 'postcss';
// Generated metadata often fades ink into transparency until it is unreadable.
// Correct that narrow pattern; preserve backgrounds, accents and user edit CSS.
export function readableInkColors(css){
 const sheet=postcss.parse(css);sheet.walkDecls('color',decl=>{
  const match=/^color-mix\(\s*in srgb,\s*var\(--ink(?:,\s*#[\da-f]{6})?\)\s*(\d+(?:\.\d+)?)%,\s*(?:transparent|var\(--paper(?:,\s*#[\da-f]{6})?\))\s*\)$/i.exec(decl.value);
  if(match&&Number(match[1])<75)decl.value='var(--muted)';
 });return sheet.toString();
}
