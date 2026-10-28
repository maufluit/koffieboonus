// Verbeteringen voor meer bezoekers (sessie 4). Elke verbetering heeft een schakelaar in groei.json.
// Alles op false = de site is gelijk aan vóór deze verbeteringen. Live sinds 28 okt 2026 (akkoord Maurits).
import fs from "node:fs";
import path from "node:path";

let CFG = {};
try { CFG = JSON.parse(fs.readFileSync(new URL("./groei.json", import.meta.url), "utf8")); } catch { CFG = {}; }
export const G = {
  titels: CFG.titels === true,
  meerkoop: CFG.meerkoop === true,
  uitleg: CFG.uitleg === true,
  voetregel: CFG.voetregel === true,
  links: CFG.links === true,
};

const SITE = "https://koffieboonus.nl";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- voetregel: datum en bronvermelding direct in de HTML ----------
// De JavaScript van de pagina zet dezelfde tekst er later nog eens in; lukt het laden niet, dan blijft de datum gewoon staan.
export function footerStatic(tpl, updatedNL) {
  if (!G.voetregel) return tpl;
  return tpl
    .replace('<span id="upd"></span>', () => `<span id="upd">Laatst bijgewerkt: ${esc(updatedNL)}</span>`)
    .replace('<span id="attr" hidden>', '<span id="attr">')
    .replace('}).catch(()=>{\n  document.getElementById("upd-sep").hidden=true;', () => '}).catch(()=>{\n  if(!document.getElementById("upd").textContent)document.getElementById("upd-sep").hidden=true;');
}

// ---------- uitleg op de startpagina ----------
export function homeFaqExtra(deals) {
  if (!G.uitleg) return [];
  const shops = [...new Set(deals.map(d => d.shop))].sort((a, b) => a.localeCompare(b, "nl"));
  return [
    ["Wat is Koffieboonus?", "Koffieboonus is een gratis overzicht van alle koffie die in de aanbieding is bij Nederlandse supermarkten: koffiebonen, gemalen koffie, koffiecups (capsules), koffiepads, oploskoffie en ijskoffie. Per aanbieding zie je de korting, tot wanneer hij geldt en waar dat kan de prijs per kilo, cup of pad, zodat je verpakkingen eerlijk kunt vergelijken."],
    ["Bij welke supermarkten kijkt Koffieboonus?", shops.length ? `Op dit moment staan er aanbiedingen van ${plural(shops.length, "supermarkt", "supermarkten")} op de site: ${shops.join(", ")}. HEMA en Kruidvat staan er (nog) niet bij.` : "Bij de grote Nederlandse supermarkten. HEMA en Kruidvat staan er (nog) niet bij."],
    ["Wie zit er achter Koffieboonus?", "Hoi, ik ben Maurits uit Rotterdam. Koffie wordt elk jaar duurder, en eerlijk is eerlijk: ik betaal liever niet de volle prijs voor mijn dagelijkse bakje. Gelukkig is er bijna altijd wel érgens een koffie in de aanbieding. Alleen moest ik daarvoor elke week alle folders doorbladeren, en dat kon slimmer. Zo is Koffieboonus ontstaan: een passieproject waarmee je in een paar tellen ziet waar jouw koffie deze week het voordeligst is. Of je nu bonen, gemalen koffie, pads of cups drinkt. Gemaakt voor mezelf, en voor iedereen die net als ik de beste koffiedeal wil scoren. Koffieboonus is geen winkel en verkoopt zelf niets. Ik ben niet verbonden aan de supermarkten of koffiemerken op de site."],
    ["Kost Koffieboonus iets?", "Nee. Je hoeft geen account te maken of je ergens voor aan te melden. Je kijkt de aanbiedingen gewoon op de site en koopt in de winkel zelf."],
  ];
}
export const SITE_DESC = "Gratis overzicht van alle koffie in de aanbieding bij Nederlandse supermarkten, met prijs per kilo, cup en pad. Elke nacht bijgewerkt.";

// ---------- pagina "Koffie 1+1 gratis en 2e halve prijs" ----------
export const MK_URL = "/koffie-1-plus-1-gratis/";
const MIN_MK = 3; // pas indexeren vanaf zoveel aanbiedingen
const isMulti = d => /^(1\+1 gratis|2\+1 gratis|2e halve prijs|\d+ voor €)/.test(d.deal || "");
export const multiDeals = deals => G.meerkoop ? deals.filter(isMulti) : [];
export const mkIndexable = deals => multiDeals(deals).length >= MIN_MK;
export function mkLinkItem(deals) {
  const n = multiDeals(deals).length;
  return n >= MIN_MK ? `<li><a href="${MK_URL}">Koffie 1+1 gratis en 2e halve prijs</a> <span class="meta">(${n})</span></li>` : "";
}

// Geeft {list, indexable} terug (voor sitemap-datum en IndexNow in build.mjs), of null als de pagina uit staat.
export function writeMeerkoop(out, tpl, h) {
  if (!G.meerkoop) return null;
  const { deals, updated, dateNL, listHtml, nameOf } = h;
  const list = multiDeals(deals);
  const n = list.length, indexable = n >= MIN_MK;
  const kind = re => list.filter(d => re.test(d.deal)).length;
  const k11 = kind(/^1\+1 gratis/), k21 = kind(/^2\+1 gratis/), k2h = kind(/^2e halve prijs/), kN = kind(/^\d+ voor €/);
  const parts = [k11 && `${k11}× 1+1 gratis`, k21 && `${k21}× 2+1 gratis`, k2h && `${k2h}× 2e halve prijs`, kN && `${kN}× 'meer voor minder'`].filter(Boolean);
  const shopsN = new Set(list.map(d => d.shop)).size;
  const byShop = Object.entries(list.reduce((m, d) => (m[d.shop] = (m[d.shop] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
  let title = n ? `Koffie 1+1 gratis en 2e halve prijs: ${n} deals nu | Koffieboonus` : "Koffie 1+1 gratis en 2e halve prijs | Koffieboonus";
  if (title.length > 66) title = "Koffie 1+1 gratis en 2e halve prijs | Koffieboonus";
  const h1 = "Koffie 1+1 gratis en 2e halve prijs";
  const desc = n
    ? `Welke koffie is nu 1+1 gratis of 2e halve prijs? ${plural(n, "aanbieding", "aanbiedingen")} bij ${plural(shopsN, "supermarkt", "supermarkten")}, met wat je echt betaalt en de prijs per kilo, cup of pad.`
    : "Op dit moment is er geen koffie 1+1 gratis of 2e halve prijs. Bekijk alle koffie-aanbiedingen op Koffieboonus.";
  const intro = n
    ? `Op ${dateNL(updated)} ${n === 1 ? "is" : "zijn"} er ${plural(n, "aanbieding", "aanbiedingen")} waarbij je meer koopt voor minder: ${parts.join(", ")}. Per aanbieding zie je wat je in totaal betaalt en, waar dat kan, de prijs per kilo, cup of pad. Zo zie je of de actie echt voordelig is.`
    : `Op ${dateNL(updated)} is er geen koffie 1+1 gratis, 2+1 gratis of 2e halve prijs. Zodra er weer een is, staat die hier.`;
  const faq = [
    ["Welke koffie is nu 1+1 gratis of 2e halve prijs?", n ? `Op ${dateNL(updated)} bij ${byShop.map(([s, c]) => `${s} (${c})`).join(", ")}.` : "Op dit moment bij geen enkele supermarkt. Deze pagina wordt elke nacht bijgewerkt."],
    ["Hoeveel korting is 1+1 gratis eigenlijk?", "Bij 1+1 gratis betaal je voor twee pakken de prijs van één: dat is 50% korting per pak. Bij 2+1 gratis is het ongeveer 33%, bij 2e halve prijs 25%. Je krijgt die korting alleen als je ook echt meerdere pakken koopt."],
    ["Is 1+1 gratis altijd de goedkoopste koffie?", "Niet altijd. Een duur merk met 1+1 gratis kan per kilo nog steeds duurder zijn dan een ander merk zonder actie. Vergelijk daarom de prijs per kilo, cup of pad. Op de pagina's 'Goedkoopste ...' staan de aanbiedingen op volgorde van die prijs."],
    ["Hoe vaak wordt deze pagina bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet. Controleer de actuele prijs altijd bij de winkel.`],
  ];
  const trail = [{ name: "Koffieboonus", url: "/" }, { name: h1, url: MK_URL }];
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const canon = SITE + MK_URL;
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
  const top = `<section class="pagehead"><nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">${esc(h1)}</span></nav><h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p></section>`;
  const body = n ? listHtml(list, { limit: 80 }) : `<div class="empty">Op dit moment is er geen koffie 1+1 gratis of 2e halve prijs. <a href="/">Bekijk alle koffie-aanbiedingen</a></div>`;
  const items = [];
  for (const [u, g] of h.cheapPages) if (g.indexable) items.push(`<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  if (h.hubIndexable) items.push(`<li><a href="${h.HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  items.push(`<li><a href="/">Alle koffie-aanbiedingen</a></li>`);
  const bottom = `<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links">${items.join("")}</ul></div></section><section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const html = tpl
    .replace("<body>", '<body class="hub">')
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => `<script>window.PRESET=null;window.PLABEL=null;window.HUB=true;window.STATIC=true;</script>`)
    .replace("{{TOP}}", () => top)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => bottom);
  fs.mkdirSync(path.join(out, MK_URL), { recursive: true });
  fs.writeFileSync(path.join(out, MK_URL, "index.html"), html);
  return { list, indexable };
}
