export const icons={
  pen:'<path d="m15 3 6 6L9 21H3v-6L15 3ZM12 6l6 6M3 15l6 6"/>',
  text:'<path d="M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3"/>',
  folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 9h18"/>',
  browser:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 6.5h.1M10 6.5h.1"/>',
  undo:'<path d="m8 5-5 5 5 5M3 10h10a7 7 0 0 1 0 14"/>',
  redo:'<path d="m16 5 5 5-5 5M21 10H11a7 7 0 0 0 0 14"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface,#fffefa)"/><circle cx="15" cy="17" r="3" fill="var(--surface,#fffefa)"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',back:'<path d="m14 5-7 7 7 7"/>',minus:'<path d="M5 12h14"/>',
  mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',check:'<path d="m5 12 4 4L19 6"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  leaf:'<path d="M20 4C7 2 2 8 5 16s17 6 15-12ZM5 19 16 8"/>'
};
export const emblem='<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="12" fill="currentColor"/><path d="M13 14h14v5H17v7h10" fill="none" stroke="var(--emblem-ink,#d1efb0)" stroke-width="3" stroke-linejoin="round"/><circle cx="27" cy="26" r="2" fill="var(--emblem-ink,#d1efb0)"/></svg>';
export function icon(name){return `<span class="ui-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[name]||icons.arrow}</svg></span>`;}
export function installIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon]||icons.grid}</svg>`;el.classList.add('ui-icon');});root.querySelectorAll('[data-emblem]').forEach(el=>{el.innerHTML=emblem;el.classList.add('brand-emblem');});}
