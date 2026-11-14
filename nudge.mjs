// Nudging-verbeteringen (Fable-weekend blok 1, 14 nov 2026). Schakelaars in nudge.json.
// Alles uit = de site is letter voor letter gelijk aan daarvoor.
import fs from "node:fs";

let C = { aan: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_NUDGE || "nudge.json", "utf8")) }; } catch { /* geen bestand = uit */ }
const on = k => C.aan === true && C[k] === true;
export const NU = { label: on("label"), eerstescherm: on("eerstescherm"), sprong: on("sprong"), nubij: on("nubij"), goedkoopste: on("goedkoopste"), laatstedag: on("laatstedag") };

// Combinatieactie: één prijs voor verschillende soorten verpakkingen ("pak 500 gram of zak 54 stuks").
// De prijs per kilo of per stuk is dan niet zeker, dus zo'n actie hoort niet bovenaan een goedkoopste-lijst.
export const isCombo = d => NU.goedkoopste && /\bof\b/i.test(d.name || "") && /\d\s*(g|gram|kg|kilo)\b/i.test(d.name) && /\d\s*(stuks|pads|cups)\b/i.test(d.name);

export function nudgeInject(tpl) {
  const rep = (a, b) => { if (!tpl.includes(a)) { console.warn("nudge.mjs: ankerpunt niet gevonden: " + a.slice(0, 50)); return; } tpl = tpl.replace(a, () => b); };
  let css = "";
  if (NU.label) {
    // Labels onder de productnaam (in de lijst die de browser opbouwt; build.mjs doet hetzelfde voor de vaste lijst)
    rep('${esc(d.until)}</span>${tag}</div></div><div class="act">', '${esc(d.until)}</span></div></div><div class="act">');
    rep('<div class="name">${title}${sub}</div>', '<div class="name">${title}${sub}${tag?`<div class="tags">${tag}</div>`:""}</div>');
    css += ".name .tags{margin-top:4px;font-weight:400}.name .tags .tag{margin:0 6px 0 0}";
  }
  if (NU.eerstescherm) {
    // Volgorde van de filters: eerst de soort koffie (dat weet iedereen meteen), dan de supermarkt
    const t = '<fieldset><legend>Type koffie</legend><div class="chips" id="f-type"></div></fieldset>';
    const s = '<fieldset><legend>Supermarkt</legend><div class="chips" id="f-shop"></div></fieldset>';
    if (tpl.includes(t) && tpl.includes(s)) { tpl = tpl.replace(t, () => ""); tpl = tpl.replace(s, () => t + "\n" + s); }
    // Uitleg over de sortering onder de lijst (boven de lijst staat al 'Sorteer op')
    const h = '<p class="meta hint" id="hint">Gesorteerd op hoogste korting. We tonen alleen aanbiedingen vanaf 10% korting.</p>';
    if (tpl.includes(h)) { tpl = tpl.replace(h, () => ""); rep('<p class="meta" id="ppnote" hidden>', h + '\n<p class="meta" id="ppnote" hidden>'); }
    css += "@media (max-width:860px){header{padding-top:10px;padding-bottom:10px}header p{display:none}.logo{height:40px}.site{font-size:22px}"
      + ".pagehead{margin-bottom:12px}.intro{font-size:15px}.intro:not(.open){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;cursor:pointer}"
      + ".tabs{flex-wrap:nowrap;margin-bottom:12px}.tabs button{flex:1 1 0;padding:8px 6px;font-size:15px}"
      + "fieldset{margin-bottom:10px}.chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 2px}.chips::-webkit-scrollbar{display:none}.chips label{flex:0 0 auto}.chips span{white-space:nowrap}"
      + ".bar{margin:10px 0 6px}}#hint{margin:14px 0 0}";
    rep("</body>", '<script>document.addEventListener("click",function(e){var i=e.target.closest&&e.target.closest(".intro");if(i&&!e.target.closest("a"))i.classList.add("open")});</script></body>');
  }
  if (NU.sprong || NU.nubij) css += ".jump{margin:8px 0 0}.jump a{color:var(--ink);font-weight:600}.zt{scroll-margin-top:12px}";
  if (NU.laatstedag) {
    // Eerlijk: alleen als de aanbieding echt vandaag of morgen afloopt (datum uit de bron)
    rep('const tagH=t=>', 'const lastTxt=d=>{if(!d.end||d.next)return "";if(d.end===today)return "laatste dag";const m=new Date(today+"T12:00:00");m.setDate(m.getDate()+1);return d.end===m.toLocaleDateString("sv-SE")?"t/m morgen":""};\nconst tagH=t=>');
    rep(' · ${esc(d.until)}</span>', ' · ${esc(d.until)}${lastTxt(d)?` <b class="last">${lastTxt(d)}</b>`:""}</span>');
    rep('${esc(d.until)}</div></div><div class="pr">', '${esc(d.until)}${lastTxt(d)?` <b class="last">${lastTxt(d)}</b>`:""}</div></div><div class="pr">');
    css += ".last{color:var(--deal);font-weight:700;white-space:nowrap}";
  }
  if (css) rep("</style>", css + "</style>");
  return tpl;
}
