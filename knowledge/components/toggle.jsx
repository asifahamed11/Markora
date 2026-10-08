// Copyright (c) 2026 Markora contributors. MIT; full notice in README.md.
function Toggle({label,onChange}){const [active,setActive]=React.useState(false);return <button type="button" aria-pressed={active} onClick={()=>{setActive(value=>!value);onChange?.(!active);}}>{label}</button>}
