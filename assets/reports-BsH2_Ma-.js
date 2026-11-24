import{r as d,X as u,$ as l,b2 as $}from"./index-C7T0rj1f.js";const r="hh-hunt:reports";let o=u(r,[]);const n=new Set;function a(){l(r,o),$(),n.forEach(e=>e())}function S(e){o=[...o,{...e,id:Math.random().toString(36).slice(2,9),at:Date.now()}],a()}function m(){o=[],a()}function p(){return d.useSyncExternalStore(e=>(n.add(e),()=>n.delete(e)),()=>o)}function x(e){const s=e.map(t=>{const c=new Date(t.at).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}),i=t.coords?` · GPS ${t.coords[0].toFixed(5)}, ${t.coords[1].toFixed(5)} (±${Math.round(t.accuracy??0)} m)`:"";return`• ${t.stationTitle} [${t.stationId}] – ${t.kind}${t.text?`: ${t.text}`:""} (${c}${i})`});return`Schnitzeljagd Hamburg – Meldungen (${e.length})

${s.join(`
`)}`}export{S as a,m as c,x as r,p as u};
