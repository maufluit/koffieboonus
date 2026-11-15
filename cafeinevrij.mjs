// Cafeïnevrije koffie (keuze Maurits 15 nov 2026). Schakelaars in cafeinevrij.json.
// Alles uit = de site is letter voor letter gelijk aan daarvoor.
//  - label:  'Cafeïnevrij' onder de productnaam, in de lijst die build.mjs schrijft én in de lijst die de browser opbouwt.
//  - pagina: /cafeinevrije-koffie/ met alle cafeïnevrije aanbiedingen. Werkt als een gewone pagina (filters, tabblad 'Volgende week'),
//            maar de browser laat alleen cafeïnevrije aanbiedingen zien (window.SCOPE = "decaf").
//  - link:   'Cafeïnevrije koffie' onder 'Ook bekijken' op de startpagina en de pagina's per soort.
// Woordkeuze (besluit 15 nov): op de site overal 'cafeïnevrij'; 'decaf' alleen in titel, inleiding en één vraag, zodat Google beide herkent.
import fs from "node:fs";

let C = { aan: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_DECAF || "cafeinevrij.json", "utf8")) }; } catch { /* geen bestand = uit */ }
const on = k => C.aan === true && C[k] === true;
export const DC = { label: on("label"), pagina: on("pagina"), link: on("link") && on("pagina"), min: Number.isInteger(C.min_index) ? C.min_index : 3 };
export const DC_URL = "/cafeinevrije-koffie/";
export const DC_SLUG = "cafeinevrije-koffie";

// Herkenning aan de productnaam (en het merk). Zelfde regel in de browser (zie decafInject).
// decaf, decafé, decafe, decaffeinato, cafeïnevrij(e), cafeinevrij, koffeïnevrij, zonder cafeïne.
const RE_SRC = "decaf|caf[eé][iï]?ne[- ]?vrij|koff?e[iï]ne[- ]?vrij|zonder caf[eé][iï]ne";
export const DECAF_RE = new RegExp(RE_SRC, "i");
export const isDecaf = d => DECAF_RE.test((d.name || "") + " " + (d.brand || ""));
export function markDecaf(list) { if (!DC.label && !DC.pagina) return; for (const d of list) if (isDecaf(d)) d.decaf = 1; }

export const decafTag = (d, o = {}) => DC.label && d.decaf && !o.nodecaf ? ` <span class="tag">Cafeïnevrij</span>` : "";

// Browser: label, aparte groepen (cafeïnevrij en gewoon niet in één kaart) en de pagina die alleen cafeïnevrij toont.
export function decafInject(tpl) {
  if (!DC.label && !DC.pagina) return tpl;
  const rep = (a, b) => { if (!tpl.includes(a)) { console.warn("cafeinevrij.mjs: ankerpunt niet gevonden: " + a.slice(0, 60)); return; } tpl = tpl.replace(a, () => b); };
  // Herkennen + op de cafeïnevrij-pagina alleen die aanbiedingen houden (vóór de filters en tellingen worden opgebouwd)
  rep("  buildChips();render();\n}\n/* Aanbiedingen komen", `  DEALS.forEach(d=>{if(/${RE_SRC}/i.test(d.name+" "+(d.brand||"")))d.decaf=1});\n  if(window.SCOPE==="decaf")DEALS=DEALS.filter(d=>d.decaf);\n  buildChips();render();\n}\n/* Aanbiedingen komen`);
  // Cafeïnevrij en gewoon in aparte kaarten (anders staat er één label boven twee soorten producten)
  rep(`d.vertuo?"v":""].join("|")`, `d.vertuo?"v":"",d.decaf?"d":""].join("|")`);
  // Label vooraan: kort, zodat het op de telefoon naast een ander label past (twee regels i.p.v. drie bij drie labels)
  if (DC.label) rep(`const tag=(allOn?tagH("Alleen online")`, `const tag=(d.decaf&&window.SCOPE!=="decaf"?tagH("Cafeïnevrij"):"")+(allOn?tagH("Alleen online")`);
  // Twee labels naast elkaar: netjes laten afbreken op een smal scherm, met een kleine tussenruimte (ook als ze onder elkaar komen)
  rep("</style>", ".name .tags{display:flex;flex-wrap:wrap;gap:4px 6px}.name .tags .tag{margin:0}@media (max-width:860px){.name .tags{gap:4px}.name .tags .tag{padding:1px 6px}}.scope-decaf .chips label.none{display:none}</style>");
  // Op de cafeïnevrij-pagina zijn de meeste merken en winkels leeg: die knoppen verbergen we daar (elders blijven ze gestippeld staan)
  return tpl;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const TYPE_ORDER = ["Bonen", "Gemalen koffie", "Pads", "Cups", "Oploskoffie", "IJskoffie & koffiedrank"];
const TYPE_LABEL = { Bonen: "Koffiebonen", "Gemalen koffie": "Gemalen koffie", Pads: "Koffiepads", Cups: "Koffiecups", Oploskoffie: "Oploskoffie", "IJskoffie & koffiedrank": "IJskoffie" };
const UNIT = { Bonen: "kilo", "Gemalen koffie": "kilo", Pads: "pad", Cups: "cup" };

// De pagina zelf. h = hulpmiddelen uit build.mjs (dezelfde lijst, prijzen en sjabloon als de rest van de site).
// Geeft { list, indexable } terug (voor sitemap en IndexNow), of null als de pagina uit staat.
export function decafPage(tpl, h) {
  if (!DC.pagina) return null;
  const { deals, upcoming, updated, dateNL, listHtml, nameOf, eur, esc, js, SITE, NU, popular = "", cheapLinks = "" } = h;
  const list = deals.filter(d => d.decaf);
  const next = upcoming.filter(d => d.decaf);
  const n = list.length, shopsN = new Set(list.map(d => d.shop)).size;
  const indexable = n >= DC.min;
  const disc = list.filter(d => !d.nodisc && d.pct > 0);
  const max = disc.length ? Math.max(...disc.map(d => d.pct)) : 0;
  const top = disc.find(d => d.pct === max);
  const types = TYPE_ORDER.filter(t => list.some(d => d.type === t));

  // Titel: zoekterm vooraan, 'decaf' erbij (zo zoeken mensen ook), beste korting als die er is.
  const base = "Cafeïnevrije koffie (decaf) aanbieding";
  const A = `${base}: tot ${max}% korting | Koffieboonus`, A2 = `${base}: tot ${max}% korting`;
  const title = n && max >= 10 ? (A.length <= 62 ? A : A2.length <= 58 ? A2 : `${base} | Koffieboonus`) : `${base} | Koffieboonus`;
  const h1 = "Cafeïnevrije koffie in de aanbieding";
  const desc = n
    ? `Welke cafeïnevrije koffie (decaf) is deze week in de aanbieding? Nu ${plural(n, "aanbieding", "aanbiedingen")} bij ${plural(shopsN, "supermarkt", "supermarkten")}${max ? `, tot ${max}% korting` : ""}, met prijs per kilo, cup en pad. Elke nacht bijgewerkt.`
    : "Welke cafeïnevrije koffie (decaf) is in de aanbieding? Op dit moment geen; bekijk de aanbiedingen van volgende week en alle andere koffie-aanbiedingen.";
  let intro = n
    ? `Op ${dateNL(updated)} ${n === 1 ? "is" : "zijn"} er ${plural(n, "aanbieding", "aanbiedingen")} voor cafeïnevrije koffie (ook wel decaf of decafé) bij ${plural(shopsN, "supermarkt", "supermarkten")}.${top ? ` De grootste korting is ${max}%: ${nameOf(top)} bij ${top.shop}.` : ""}`
    : `Op ${dateNL(updated)} is er geen cafeïnevrije koffie (decaf) in de aanbieding bij de supermarkten die we volgen.`;
  if (next.length) intro += ` ${next[0].fromTxt ? next[0].fromTxt.charAt(0).toUpperCase() + next[0].fromTxt.slice(1) : "Volgende week"} ${next.length === 1 ? "komt er 1 aanbieding" : `komen er ${next.length} aanbiedingen`} bij: zie het tabblad ‘Volgende week’.`;

  // Overzicht per soort (zelfde opmaak als de supermarktpagina's)
  const rows = types.map(t => {
    const ls = list.filter(d => d.type === t), dz = ls.filter(d => !d.nodisc && d.pct > 0);
    const mx = dz.length ? Math.max(...dz.map(d => d.pct)) : 0, u = UNIT[t];
    const pp = u ? ls.filter(d => d.pp != null && d.pu === u).map(d => d.pp) : [];
    return `<tr><th scope="row">${esc(TYPE_LABEL[t])}</th><td>${ls.length}</td><td>${mx ? mx + "%" : "–"}</td><td>${pp.length ? `${eur(Math.min(...pp))}/${u}` : "–"}</td></tr>`;
  });
  const table = rows.length ? `<section class="zt" id="overzicht"><h2>Cafeïnevrije koffie per soort</h2><p>Op ${dateNL(updated)}. Gebruik de filters bovenaan om één soort of één supermarkt te kiezen.</p><div class="ztwrap"><table class="zttab"><thead><tr><th scope="col">Soort</th><th scope="col">Aantal</th><th scope="col">Max. korting</th><th scope="col">Laagste prijs</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></section>` : "";

  // Vragen. Het wettelijke maximum (0,1% cafeïne in de droge stof) komt uit het Warenwetbesluit Bereiding en behandeling van levensmiddelen.
  const byShop = Object.entries(list.reduce((m, d) => (m[d.shop] = (m[d.shop] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
  const lowK = list.filter(d => d.pp != null && d.pu === "kilo" && (d.type === "Bonen" || d.type === "Gemalen koffie")).sort((a, b) => a.pp - b.pp)[0];
  const faq = [
    ["Welke cafeïnevrije koffie is nu in de aanbieding?", n ? `Op ${dateNL(updated)} bij ${byShop.map(([s, c]) => `${s} (${c})`).join(", ")}.${lowK ? ` De laagste prijs per kilo is ${eur(lowK.pp)}: ${nameOf(lowK)} bij ${lowK.shop} (${lowK.until}).` : ""}` : "Op dit moment bij geen enkele supermarkt die we volgen. Deze pagina wordt elke nacht bijgewerkt."],
    ["Is decaf hetzelfde als cafeïnevrij?", "Ja. Decaf, decafé en decaffeinato (Italiaans) betekenen allemaal cafeïnevrije koffie. Op de verpakking staat vaak één van die woorden; op Koffieboonus herken je ze aan het label ‘Cafeïnevrij’."],
    ["Zit er echt geen cafeïne in cafeïnevrije koffie?", "Een heel klein beetje. In Nederland mag koffie alleen ‘cafeïnevrij’ heten als er hooguit 0,1% cafeïne in zit (berekend op de droge koffie). Dat is een paar milligram per kopje, tegen zo’n 60 tot 100 milligram in een gewoon kopje."],
    ["Hoe vaak wordt deze pagina bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet. Controleer de actuele prijs altijd bij de winkel.`],
  ];
  const faqHtml = `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const more = `<section class="more"><h2>Ook bekijken</h2>${cheapLinks}<div class="grp"><ul class="links"><li><a href="/">Alle koffie-aanbiedingen</a></li></ul></div>${popular}</section>`;

  const canon = SITE + DC_URL;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Koffieboonus", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: "Cafeïnevrije koffie", item: canon }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="${indexable ? "index,follow,max-image-preview:large" : "noindex,follow"}">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    ...ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n");
  const jump = NU.sprong && n ? `<p class="jump"><a href="#overzicht">Overzicht per soort ↓</a></p>` : "";
  const top_ = `<section class="pagehead"><nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">Cafeïnevrije koffie</span></nav><h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p>${jump}</section>`;
  // Zonder JavaScript (en voor Google) staat de lijst er al; de browser vervangt hem door de lijst met filters.
  const body = n ? listHtml(list, { nodecaf: true }) : `<div class="empty"><strong>Nu geen cafeïnevrije koffie in de aanbieding.</strong><br>${next.length ? "Kijk onder ‘Volgende week’, of bekijk " : "Zodra er weer een is, staat die hier. Bekijk intussen "}<a href="/">alle koffie-aanbiedingen</a>.</div>`;
  // Geen PLABEL: de pagina gedraagt zich als de startpagina (Merk en Systeem ingeklapt op de telefoon), maar dan alleen met cafeïnevrije koffie.
  const presetJs = `<script>window.PRESET=null;window.PLABEL=null;window.SCOPE="decaf";document.documentElement.classList.add("scope-decaf");window.STATIC=${n ? "true" : "false"};</script>`;
  const html = tpl
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => presetJs)
    .replace("{{TOP}}", () => top_)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => table + more + faqHtml);
  return { html, list, indexable };
}

// Link onder 'Ook bekijken' (startpagina en pagina's per soort)
export function decafLink(deals) {
  if (!DC.link) return "";
  const n = deals.filter(d => d.decaf).length;
  if (n < DC.min) return "";
  return `<div class="grp"><h3>Speciaal</h3><ul class="links"><li><a href="${DC_URL}">Cafeïnevrije koffie</a> <span class="meta">(${n})</span></li></ul></div>`;
}
