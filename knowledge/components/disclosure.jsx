// Copyright (c) 2026 Markora contributors. MIT; full notice in README.md.
function Disclosure({title,children}){const [open,setOpen]=React.useState(false);const id=React.useId();return <div><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{title}</button><div id={id} hidden={!open}>{children}</div></div>}
