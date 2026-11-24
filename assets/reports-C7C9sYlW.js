import{r as d,X as u,$ as l,aX as $}from"./index-Ca_uEaiw.js";const a="hh-hunt:reports";let o=u(a,[]);const n=new Set;function r(){l(a,o),$(),n.forEach(e=>e())}function S(e){o=[...o,{...e,id:Math.random().toString(36).slice(2,9),at:Date.now()}],r()}function m(){o=[],r()}function p(){return d.useSyncExternalStore(e=>(n.add(e),()=>n.delete(e)),()=>o)}function x(e){const s=e.map(t=>{const c=new Date(t.at).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}),i=t.coords?` · GPS ${t.coords[0].toFixed(5)}, ${t.coords[1].toFixed(5)} (±${Math.round(t.accuracy??0)} m)`:"";return`• ${t.stationTitle} [${t.stationId}] – ${t.kind}${t.text?`: ${t.text}`:""} (${c}${i})`});return`Schnitzeljagd Hamburg – Meldungen (${e.length})

${s.join(`
`)}`}export{S as a,m as c,x as r,p as u};
