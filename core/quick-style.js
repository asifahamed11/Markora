// Intentionally small grammar. Ambiguous, negative and compound requests fall
// through to AI; we never discard an unrecognized part of a spoken instruction.
const colors={green:'#4caf50',blue:'#4285f4',red:'#e64949',purple:'#9b6bdb',orange:'#ef982f',black:'#172623',white:'#ffffff',pink:'#ee8fb2',সুবুজ:'#4caf50',সবুজ:'#4caf50',নীল:'#4285f4',লাল:'#e64949',কালো:'#172623',সাদা:'#ffffff'};
export function quickStyle(command,{text=false,tag='',fontSize}={}){
  let value=command.trim().toLowerCase().replace(/[.!।]+$/u,'').replace(/\s+/g,' '),property;
  const mixed=value.match(/^(?:ei|eta|etake) (button|heading|text|section) (?:(?:er )?(?:color|colour|rong) )?(green|blue|red|black|white|sobuj|nil|lal|kalo|shada) (?:koro|kore dao|korun)$/);
  if(mixed)value=`make this ${mixed[1]} ${{sobuj:'green',nil:'blue',lal:'red',kalo:'black',shada:'white'}[mixed[2]]||mixed[2]}`;
  if(/\b(background|fill)\b|ব্যাকগ্রাউন্ড|পটভূমি/u.test(value))property='background-color';
  else if(text||/^(h[1-6]|p|span|strong|em|small)$/.test(tag)||/\b(text|font) (color|colour)\b/u.test(value))property='color';
  else property='background-color';
  const color=value.match(/^(?:make|change|set) (?:(?:this|the|selected|marked) )?(?:(?:button|text|heading|section|element|background|fill|font) )?(?:(?:color|colour|background color|text color|font color) )?(?:(?:to|of this button to|of this text to) )?(green|blue|red|purple|orange|black|white|pink|#[0-9a-f]{6})$/i)
    ||value.match(/^(?:এই|এটা|এটাকে|এটার|নির্বাচিত) (?:(?:বাটন|button|লেখা|টেক্সট|text|রং|রঙ|ব্যাকগ্রাউন্ড) )?(?:(?:এর রং|এর রঙ|রং|রঙ) )?(সবুজ|নীল|লাল|কালো|সাদা) (?:করো|করে দাও|করুন)$/u);
  if(color){const hex=colors[color[1]]||color[1];return `${property}:${hex};${property==='background-color'&&!/background|fill|ব্যাকগ্রাউন্ড|পটভূমি/u.test(value)?`color:${hex==='#172623'?'#ffffff':'#172623'};`:''}`;}
  const size=value.match(/^(?:make|set) (?:(?:this|the|selected|marked) )?(?:(?:button|text|heading|section|element) )?(bigger|larger|smaller)$/i)||value.match(/^(?:এই|এটা|এটাকে) (?:(?:বাটন|button|লেখা|টেক্সট|text) )?(বড়|বড়|ছোট) (?:করো|করে দাও|করুন)$/u);
  if(size){const scale=/smaller|ছোট/u.test(size[1])?.88:1.15,current=Number.parseFloat(fontSize);return `font-size:${Number.isFinite(current)&&current>=6&&current<400?(current*scale).toFixed(1)+'px':scale+'em'};`;}
  if(/^(?:make (?:this|the|selected) (?:button|element) (?:round|rounded)|round the corners)$/.test(value))return 'border-radius:32px;';
  return null;
}
