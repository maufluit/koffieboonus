// Rekenpagina /wat-kost-een-kopje-koffie/ (kop A, keuze Maurits 15 nov 2026; teksten: projectmap Bestanden/Groei/REKENPAGINA.md).
// Schakelaar in rekenpagina.json. Uit = de site is letter voor letter gelijk aan daarvoor.
// Doel: een pagina waar anderen naar linken (één zin met datum en bron) en die bezoekers delen (eigen jaarbedrag).
// Regels PrijsProfeet: alleen de aanbiedingen van vandaag, elke nacht opnieuw berekend, geen archief, geen JSON/RSS en geen
// "dataset"-opmaak voor Google. De cijfers staan alleen als gewone tekst op de pagina (de rekenhulp krijgt per soort 2 getallen mee).
import fs from "node:fs";
import path from "node:path";
import { partsOf, PAGE_CSS } from "./extra-paginas.mjs";
import { FB_ON } from "./feedback.mjs";

let C = { aan: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_REKEN || "rekenpagina.json", "utf8")) }; } catch { /* geen bestand = uit */ }
export const RP_ON = C.aan === true;
export const RP_URL = "/wat-kost-een-kopje-koffie/";
const MIN = Number.isInteger(C.min_per_soort) ? C.min_per_soort : 3;
const GRAM = typeof C.gram_per_kopje === "number" ? C.gram_per_kopje : 8; // Consumentenbond 2026
let FBURL = "";
try { const f = JSON.parse(fs.readFileSync("feedback.json", "utf8")); if (FB_ON) FBURL = f.url; } catch { /* geen teller */ }

// Geen koffie: telt niet mee. Melkdranken (Dolce Gusto) tellen ook niet mee: soms 1, soms 2 cups per kopje, en de verpakking zegt niet altijd welke.
const NO_COFFEE = /choco|nesquik|kitkat|chai|\bthee\b|\btea\b|cacao|chocolade|milo|marcilla?\s*choc/i;
const MILK = /latte|cappuccino|macchiat|caf[eé] au lait|flat white|cortado|melk|mocha|chai|caramel/i;
const COMBO = d => /\bof\b/i.test(d.name || "");
// Passende Nespresso-cups zonder "Nespresso" op de verpakking (d.gok) tellen alleen mee bij merken die geen ander cupsysteem in de supermarkt hebben (keuze Maurits 26 nov).
// Barista/XL e.d. zijn in sync.mjs al uitgesloten. Twijfelmerken (bijv. Nescafé: ook Dolce Gusto) blijven eruit.
const NESP_ZEKER = new Set(["L'OR", "Douwe Egberts"]);
const SOORTEN = [
  { k: "filter", label: "Filterkoffie (gemalen)", kort: "filterkoffie", ok: d => d.type === "Gemalen koffie" && d.pu === "kilo", cup: d => d.pp * GRAM / 1000, href: "/goedkoopste-gemalen-koffie/" },
  { k: "bonen", label: "Koffiebonen", kort: "bonen", ok: d => d.type === "Bonen" && d.pu === "kilo", cup: d => d.pp * GRAM / 1000, href: "/goedkoopste-koffiebonen/" },
  { k: "pads", label: "Koffiepads", kort: "pads", ok: d => d.type === "Pads" && d.pu === "pad" && !MILK.test(d.name), cup: d => d.pp, href: "/goedkoopste-koffiepads/" },
  { k: "dg", label: "Dolce Gusto-cups", kort: "Dolce Gusto", ok: d => d.type === "Cups" && d.sys === "Dolce Gusto" && d.pu === "cup" && !MILK.test(d.name), cup: d => d.pp, href: "/goedkoopste-dolce-gusto-cups/" },
  { k: "nesp", label: "Nespresso-cups", kort: "Nespresso", ok: d => d.type === "Cups" && d.sys === "Nespresso" && !d.vertuo && (!d.gok || NESP_ZEKER.has(d.brand)) && d.pu === "cup", cup: d => d.pp, href: "/goedkoopste-nespresso-cups/" },
];
const FROM = [["filter", /gemalen|filter/], ["bonen", /bonen/], ["pads", /pads|senseo/], ["dg", /dolce-gusto/], ["nesp", /nespresso/]];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const js = v => JSON.stringify(v).replace(/</g, "\\u003c");
const cent = v => Math.round(v * 100);
const jaar = (v, n = 3) => Math.round(v * n * 365);
const eur0 = n => "€ " + n.toLocaleString("nl-NL");
const keer = f => { const r = Math.round(f); const w = ["", "", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"][r] || String(r); return (f < r - 0.05 ? "bijna " : f > r + 0.05 ? "ruim " : "") + w; };

// Berekening: per soort de goedkoopste en de middelste aanbieding per kopje (alleen zekere prijzen, geen combinatieacties, alleen koffie).
export function rekenen(deals) {
  const rows = [];
  for (const s of SOORTEN) {
    const ls = deals.filter(d => d.pp != null && !d.nodisc && (d.pct || 0) > 0 && !COMBO(d) && !NO_COFFEE.test(d.name || "") && s.ok(d))
      .map(d => ({ d, c: s.cup(d) })).sort((a, b) => a.c - b.c || (b.d.pct || 0) - (a.d.pct || 0));
    if (ls.length < MIN) continue;
    const mid = ls[Math.floor((ls.length - 1) / 2)].c;
    rows.push({ s, n: ls.length, lo: ls[0], hi: ls[ls.length - 1], mid });
  }
  rows.sort((a, b) => a.lo.c - b.lo.c);
  if (rows.length < 2) return null;
  const lo = rows[0].lo, hi = rows.reduce((m, r) => (r.hi.c > m.c ? r.hi : m), rows[0].hi);
  const hiRow = rows.find(r => r.hi === hi);
  return { rows, lo, hi, hiRow };
}

export function writeRekenpagina(OUT, tpl, h) {
  if (!RP_ON) return null;
  const { deals, updated, dateNL, nameOf, SITE, shopsN } = h;
  const R = rekenen(deals);
  const { start, footer, theme } = partsOf(tpl);
  const datum = dateNL(updated);
  const dag = new Date(updated + "T12:00:00Z").toLocaleDateString("nl-NL", { weekday: "long", timeZone: "UTC" });
  const canon = SITE + RP_URL;
  let title, desc, body;
  if (!R) {
    title = "Wat kost een kopje koffie deze week? | Koffieboonus";
    desc = "Wat kost een kopje koffie met de aanbiedingen van deze week? Op dit moment zijn er te weinig aanbiedingen om eerlijk te vergelijken.";
    body = `<p class="intro">Op ${esc(datum)} zijn er te weinig aanbiedingen met een zekere prijs om eerlijk te vergelijken. Kijk morgen nog eens, of bekijk <a href="/">alle koffie-aanbiedingen</a>.</p>`;
  } else {
    const L = cent(R.lo.c), H = cent(R.hi.c), F = keer(R.hi.c / R.lo.c);
    title = `Wat kost een kopje koffie deze week? ${L} tot ${H} cent | Koffieboonus`;
    if (title.length > 70) title = `Wat kost een kopje koffie? ${L} tot ${H} cent | Koffieboonus`;
    desc = `Een kopje koffie kost deze week ${L} tot ${H} cent, afhankelijk van hoe je het zet. Bekijk de goedkoopste aanbieding per soort en reken uit wat jouw koffie per jaar kost.`;
    const loRow = R.rows[0];
    const zin = `Een kopje koffie kost deze week tussen ${L} en ${H} cent, afhankelijk van hoe je het zet. Bron: Koffieboonus.nl, aanbiedingen van ${datum}.`;
    const kaart = r => `<li class="rp-card"><div class="rp-top"><span class="rp-soort">${esc(r.s.label)}</span><span class="rp-cent">${cent(r.lo.c)} cent <small>per kopje</small></span></div><div class="rp-jaar">${eur0(jaar(r.lo.c))} per jaar bij 3 kopjes per dag</div><div class="rp-deal">${esc(nameOf(r.lo.d))}, ${esc(r.lo.d.shop)}, ${esc(r.lo.d.deal)}${r.lo.d.until ? `, ${esc(r.lo.d.until)}` : ""}</div><a class="rp-link" href="${r.s.href}">Bekijk de goedkoopste ${esc(r.s.kort)} ›</a></li>`;
    const data = Object.fromEntries(R.rows.map(r => [r.s.k, { lo: Math.round(r.lo.c * 10000) / 10000, mid: Math.round(r.mid * 10000) / 10000, l: r.s.kort }]));
    const cheapK = loRow.s.k;
    const opts = R.rows.map(r => `<button type="button" data-k="${r.s.k}" aria-pressed="false">${esc(r.s.kort)}</button>`).join("");
    const bonen = R.rows.find(r => r.s.k === "bonen"), filt = R.rows.find(r => r.s.k === "filter");
    const cups = R.rows.filter(r => r.s.k === "dg" || r.s.k === "nesp").sort((a, b) => a.lo.c - b.lo.c)[0];
    const faq = [
      ["Wat is de goedkoopste manier om koffie te zetten?", `Meestal filterkoffie of bonen. Deze week is ${loRow.s.kort} het goedkoopst: vanaf ${cent(loRow.lo.c)} cent per kopje.${bonen && loRow !== bonen ? ` Een kopje van bonen kost vanaf ${cent(bonen.lo.c)} cent; daar heb je wel een duurder apparaat voor nodig.` : ""}`],
      ...(bonen && cups ? [["Zijn koffiebonen goedkoper dan cups?", `Per kopje bijna altijd. Deze week: bonen vanaf ${cent(bonen.lo.c)} cent, ${cups.s.kort}-cups vanaf ${cent(cups.lo.c)} cent. Bij drie kopjes per dag scheelt dat ${eur0(Math.max(0, jaar(cups.lo.c) - jaar(bonen.lo.c)))} per jaar.`]] : []),
      ["Hoeveel kopjes haal je uit een pak koffie?", `Uit 500 gram ongeveer ${Math.round(500 / GRAM)} kopjes, uit een kilo ${Math.round(1000 / GRAM)} (bij ${GRAM} gram per kopje).`],
      ["Waarom staat mijn koffie er niet bij?", "We tonen per soort alleen de goedkoopste aanbieding van vandaag. Alle aanbiedingen staan op de pagina van die soort; via ‘Bekijk’ kom je er."],
      ["Hoe vaak veranderen deze cijfers?", "Elke nacht. De meeste supermarkten wisselen hun aanbiedingen op maandag of woensdag."],
    ];
    body = `<p class="rp-ans"><strong>Tussen ${L} en ${H} cent.</strong> Hetzelfde kopje, ${esc(F)} keer zo duur.</p>
<p class="rp-src">Aanbiedingen van ${esc(dag)} ${esc(datum)}. Bron: PrijsProfeet.</p>
<p>Koffie is in vijf jaar 74% duurder geworden, mat de <a href="https://www.consumentenbond.nl/nieuws/2026/koffie-duurder-dan-ooit" rel="noopener">Consumentenbond</a>. Maar wat je per kopje betaalt, hangt vooral af van hoe je koffie zet en of je op aanbiedingen let. Met de aanbiedingen van vandaag kost een kopje ${esc(loRow.s.kort)} vanaf ${L} cent en een kopje ${esc(R.hiRow.s.kort)} tot ${H} cent. Bij drie kopjes per dag is dat ${eur0(jaar(R.lo.c))} of ${eur0(jaar(R.hi.c))} per jaar.</p>
<h2>De goedkoopste aanbieding per soort, vandaag</h2>
<ul class="rp-cards">${R.rows.map(kaart).join("")}</ul>
<p class="rp-note">Bij 1+1 gratis en ‘2 voor …’ geldt de prijs als je het genoemde aantal koopt. Staat een soort er niet bij, dan zijn er vandaag te weinig aanbiedingen om eerlijk te vergelijken.</p>
<h2 id="reken">Wat kost jouw koffie per jaar?</h2>
<div class="box rp-calc" id="rp-calc">
<p class="rp-row">Ik drink <span class="rp-step"><button type="button" data-d="-1" aria-label="Eén kopje minder">−</button><output id="rp-n" aria-live="polite">3</output><button type="button" data-d="1" aria-label="Eén kopje meer">+</button></span> kopjes per dag</p>
<p class="rp-row">met <span class="rp-opts" role="group" aria-label="Soort koffie">${opts}</span></p>
<p class="rp-out" id="rp-out" aria-live="polite"></p>
<p class="rp-sub" id="rp-sub"></p>
<p class="rp-sub" id="rp-alt"></p>
<button type="button" class="kb-share" id="rp-share">Deel jouw uitkomst</button>
</div>
<noscript><p>De rekenhulp werkt met JavaScript. Zonder: tel per kopje het bedrag uit de lijst hierboven, keer het aantal kopjes per dag, keer 365.</p></noscript>
<h2>Zo rekenen we</h2>
<ul>
<li><strong>Filterkoffie en bonen:</strong> ${GRAM} gram koffie per kopje, dezelfde maat die de Consumentenbond in 2026 gebruikt. Een pak van 500 gram is dus goed voor ruim ${Math.floor(500 / GRAM)} kopjes. Hou je van sterke koffie of grote mokken, dan gebruik je meer.</li>
<li><strong>Pads:</strong> 1 pad per kopje. Voor een grote mok gebruik je er 2.</li>
<li><strong>Cups:</strong> 1 cup per kopje. Bij Nespresso tellen ook cups van L’OR en Douwe Egberts mee die in een Nespresso-apparaat passen (geen Vertuo). Dolce Gusto-dranken en pads met melk (zoals cappuccino) tellen niet mee: daar heb je soms 1 en soms 2 cups per kopje voor nodig, en dat staat niet altijd duidelijk op de verpakking.</li>
<li><strong>Alleen aanbiedingen van vandaag.</strong> We vergelijken de aanbiedingen die nu lopen bij ${shopsN} supermarkten. Normale prijzen zonder aanbieding tellen niet mee: een huismerk zonder actie kan dus goedkoper zijn dan wat hier staat.</li>
<li><strong>Alleen als de prijs zeker is.</strong> Aanbiedingen waarbij het gewicht of het aantal niet duidelijk is, of waarbij je uit verschillende producten of maten mag kiezen, laten we weg. Een soort staat er pas bij vanaf ${MIN} vergelijkbare aanbiedingen.</li>
<li><strong>Alleen koffie.</strong> Chocolademelk-, thee- en andere cups zonder koffie tellen niet mee.</li>
<li><strong>Wat niet meetelt:</strong> melk, suiker, water, stroom en het apparaat zelf.</li>
<li><strong>Geen prijzen van vroeger.</strong> We bewaren geen oude prijzen. Voor de vraag hoeveel duurder koffie is geworden verwijzen we naar de <a href="https://www.consumentenbond.nl/espressomachine/prijspeiling-koffie" rel="noopener">prijspeiling van de Consumentenbond</a>.</li>
</ul>
<p>De cijfers worden elke nacht opnieuw berekend. Prijzen en aanbiedingen komen van PrijsProfeet; controleer de prijs altijd in de winkel.</p>
<h2>Deze cijfers gebruiken?</h2>
<div class="box"><p>Dat mag, met een link naar deze pagina. Kopieer bijvoorbeeld:</p><p class="rp-quote" id="rp-zin"><em>“${esc(zin)}”</em></p><p><button type="button" class="kb-share" id="rp-copy">Kopieer deze zin</button></p><p>Vragen of een eigen uitsplitsing nodig? Mail <a href="mailto:info@koffieboonus.nl">info@koffieboonus.nl</a>.</p></div>
<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links"><li><a href="/">Alle koffie-aanbiedingen</a></li><li><a href="/goedkoopste-koffie/">Goedkoopste koffie: overzicht per soort</a></li>${R.rows.map(r => `<li><a href="${r.s.href}">Goedkoopste ${esc(r.s.kort)}</a></li>`).join("")}</ul></div></section>
<script>(function(){var D=${js(data)},CHEAP=${js(cheapK)},U=${js(FBURL)},ZIN=${js(zin)},FROM=${js(FROM.map(([k, re]) => [k, re.source]))};
function tel(t,v){if(!U)return;try{var b=JSON.stringify({t:t,v:String(v).slice(0,120),p:location.pathname});if(navigator.sendBeacon&&navigator.sendBeacon(U,b))return;fetch(U,{method:"POST",body:b,keepalive:true,mode:"no-cors"})}catch(e){}}
var n=3,k=null;try{var r=document.referrer?new URL(document.referrer):null;if(r&&r.host===location.host)FROM.forEach(function(f){if(!k&&D[f[0]]&&new RegExp(f[1]).test(r.pathname))k=f[0]})}catch(e){}
if(!k||!D[k])k=D.filter?"filter":CHEAP;
var E=function(i){return document.getElementById(i)},eur=function(v){return "\\u20ac\\u00a0"+Math.round(v).toLocaleString("nl-NL")};
function draw(){E("rp-n").textContent=n;document.querySelectorAll(".rp-opts button").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.k===k?"true":"false")});
var d=D[k],lo=d.lo*n*365,mid=d.mid*n*365;E("rp-out").innerHTML="<strong>Met de goedkoopste aanbieding van vandaag: "+eur(lo)+" per jaar.</strong>";
E("rp-sub").textContent=mid-lo>=1?"Met de middelste aanbieding: "+eur(mid)+" per jaar. Je scheelt "+eur(mid-lo)+" door de goedkoopste te kiezen.":"";
var c=D[CHEAP];E("rp-alt").textContent=(k==="dg"||k==="nesp"||k==="pads")&&c&&CHEAP!==k?"Zet je dezelfde kopjes met "+c.l+", dan ben je vandaag "+eur(c.lo*n*365)+" per jaar kwijt.":""}
document.querySelectorAll(".rp-step button").forEach(function(b){b.addEventListener("click",function(){n=Math.max(1,Math.min(8,n+ +b.dataset.d));draw()})});
document.querySelectorAll(".rp-opts button").forEach(function(b){b.addEventListener("click",function(){k=b.dataset.k;draw()})});
function toast(t){var x=document.createElement("div");x.className="kb-toast";x.textContent=t;document.body.appendChild(x);setTimeout(function(){x.remove()},2600)}
function copy(t,wat){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){tel("deel",wat);toast("Gekopieerd.")},function(){})}}
E("rp-share").addEventListener("click",function(){var u=location.origin+location.pathname+"?ref=deel",t="Mijn koffie kost "+eur(D[k].lo*n*365)+" per jaar met de aanbiedingen van vandaag. En die van jou?";
if(navigator.share){navigator.share({title:document.title,text:t,url:u}).then(function(){tel("deel","reken")},function(){});return}copy(t+" "+u,"reken")});
E("rp-copy").addEventListener("click",function(){copy(ZIN+" "+location.origin+location.pathname,"zin")});
draw()})();</script>`;
  }
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Koffieboonus", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: "Wat kost een kopje koffie?", item: canon }] };
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="${R ? "index,follow" : "noindex,follow"}">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
  const CSS = `.rp-ans{font-size:clamp(20px,4.5vw,26px);line-height:1.3;margin:0 0 6px;color:var(--title)}.rp-src{font-size:14px;color:var(--mute);margin:0 0 16px}
.rp-cards{list-style:none;padding:0;margin:8px 0 8px;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}.rp-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0}
.rp-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.rp-soort{font-weight:600}.rp-cent{font-size:22px;font-weight:700;color:var(--title);white-space:nowrap}.rp-cent small{font-size:13px;font-weight:400;color:var(--mute)}
.rp-jaar{font-size:14px;margin:2px 0 6px}.rp-deal{font-size:14px;color:var(--mute);margin:0 0 6px}.rp-link{font-weight:600;font-size:14px}.rp-note{font-size:14px;color:var(--mute)}
.rp-calc .rp-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}.rp-step{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.rp-step button,.rp-opts button{font:inherit;border:0;background:var(--card);color:var(--ink);cursor:pointer;min-height:40px}.rp-step button{width:40px;font-size:20px}.rp-step output{min-width:28px;text-align:center;font-weight:700}
.rp-opts{display:flex;flex-wrap:wrap;gap:6px}.rp-opts button{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px}.rp-opts button[aria-pressed="true"]{background:var(--brown);color:var(--brownink);border-color:var(--brown)}
.rp-out{font-size:18px;margin:6px 0 4px}.rp-sub{margin:0 0 4px;font-size:15px}.rp-quote{font-size:15px}
.kb-share{display:inline-flex;align-items:center;gap:6px;margin:10px 0 0;font:inherit;font-size:14px;font-weight:600;padding:6px 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);cursor:pointer}
.kb-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--banner);color:var(--bannerink);padding:10px 16px;border-radius:10px;font-size:14px;z-index:50}
.rp-step button:focus-visible,.rp-opts button:focus-visible,.kb-share:focus-visible{outline:3px solid var(--orange);outline-offset:2px}`;
  const top = start.replace("{{HEAD}}", () => head).replace("</style>", () => PAGE_CSS + CSS + "</style>");
  const crumbs = `<nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">Wat kost een kopje koffie?</span></nav>`;
  const html = `${top}<main><div class="wrap">\n<section class="pagehead">${crumbs}<h1>Wat kost een kopje koffie deze week?</h1></section>\n<article class="prose">${body}</article>\n</div></main>\n${footer}\n<script>\n${theme}\n</script>\n</body>\n</html>\n`;
  fs.mkdirSync(path.join(OUT, RP_URL), { recursive: true });
  fs.writeFileSync(path.join(OUT, RP_URL, "index.html"), html);
  if (R) console.log(`Rekenpagina: ${cent(R.lo.c)}–${cent(R.hi.c)} cent per kopje; soorten: ${R.rows.map(r => `${r.s.k} ${cent(r.lo.c)}c (${r.n})`).join(", ")}`);
  else console.log("Rekenpagina: te weinig aanbiedingen, noindex");
  return { list: R ? R.rows.map(r => r.lo.d) : [], indexable: !!R };
}
