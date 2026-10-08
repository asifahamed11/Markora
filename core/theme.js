export const themes={
 minimal:{label:'Minimal',palette:['#172623','#fafaf5','#587c37']},
 editorial:{label:'Editorial',palette:['#24231f','#f5f0e7','#9b4a32']},
 'dark-tech':{label:'Dark tech',palette:['#edf2f1','#111b20','#79d9c4']},
 brutalist:{label:'Brutalist',palette:['#171717','#f7f5ee','#be321e']},
 playful:{label:'Playful',palette:['#302340','#fff7e9','#7350ad']},
 academic:{label:'Academic',palette:['#192539','#fafbf8','#315a87']},
 'creative-portfolio':{label:'Creative portfolio',palette:['#1d252c','#f3f4ef','#975332']},
 'corporate-clean':{label:'Corporate',palette:['#192938','#f7fafc','#216560']},
};
export function themeCSS(palette){if(!Array.isArray(palette)||palette.length<2||palette.some(value=>!/^#[\da-f]{6}$/i.test(value)))throw new Error('Invalid theme palette.');return `:root{--ink:${palette[0]};--paper:${palette[1]};--accent:${palette[2]||palette[0]};--surface:var(--paper);--muted:color-mix(in srgb,var(--ink) 75%,var(--paper));--line:color-mix(in srgb,var(--ink) 22%,transparent);--space-1:8px;--space-2:16px;--space-3:24px;--space-4:40px;--space-5:64px;--radius:4px;--content-width:1200px;--motion-fast:180ms;--body-font:Arial,"Markora Bengali",sans-serif;--heading-font:Georgia,"Markora Bengali",serif}\n`;}
