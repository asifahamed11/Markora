/* Tiny, bounded pointer response; no global click effects or looping particles. */
export function petInteraction(button){
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  button.addEventListener('pointermove',event=>{if(motion.matches)return;const r=button.getBoundingClientRect();const x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;button.style.setProperty('--look-x',`${x*4}px`);button.style.setProperty('--look-y',`${y*3}px`);button.style.setProperty('--lean',`${x*4}deg`);});
  button.addEventListener('pointerleave',()=>{for(const key of ['--look-x','--look-y','--lean'])button.style.removeProperty(key);});
}
