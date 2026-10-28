// Black Friday-pagina van Koffieboonus: /black-friday-koffie/
// Wordt gebruikt door build.mjs. Instelling: black-friday.json
//   "aan": false -> er verandert NIETS aan de site: geen pagina, geen link, geen sitemapregel.
//   "aan": true              -> de pagina wordt elke nacht opnieuw gebouwd, en verandert vanzelf mee met de datum:
//        - "binnenkort": tot de Black Friday-periode begint. Datum van Black Friday + de beste koffieaanbiedingen van nu.
//        - "actief":     van maandag 11 dagen vóór Black Friday t/m Cyber Monday. De beste aanbiedingen uitgebreid op een rij.
//        - "voorbij":    van Cyber Monday tot het eind van het jaar. Nette "voorbij"-tekst + de beste aanbiedingen van nu.
// Black Friday wordt elk jaar zelf uitgerekend (vrijdag na de vierde donderdag van november), dus de pagina werkt ook in 2027.
// Alleen voor testen en previews: KB_BF=<pad> gebruikt een ander instellingenbestand, KB_DATUM=JJJJ-MM-DD doet alsof het die dag is.
import fs from "node:fs";
import path from "node:path";

const SITE = "https://koffieboonus.nl";
export const BF_URL = "/black-friday-koffie/";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (fs.existsSync(file)) console.warn(`Kan ${file} niet lezen: ${e.message}`); return fallback; } };

const CFG = readJson(process.env.KB_BF || "black-friday.json", { aan: false });
export const BF_ON = CFG.aan === true;
const num = (v, d) => (Number.isInteger(v) && v >= 0 && v <= 60 ? v : d);
const START_VOOR = num(CFG.start_dagen_voor, 11);   // 11 = maandag van de week vóór Black Friday
const EIND_NA = num(CFG.eind_dagen_na, 3);          // 3 = Cyber Monday
const LINK_VOOR = num(CFG.homelink_dagen_voor, 26); // link op de startpagina vanaf ~1 november

// ---------- datums ----------
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const addDays = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return iso(t.getTime()); };
const dateNL = d => new Date(d + "T12:00:00Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dayNL = d => new Date(d + "T12:00:00Z").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
// Black Friday = de vrijdag na de vierde donderdag van november.
export function blackFriday(year) {
  const dow = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThu = 1 + ((4 - dow + 7) % 7);
  return iso(Date.UTC(year, 10, firstThu + 22, 12));
}
const TODAY = /^\d{4}-\d{2}-\d{2}$/.test(process.env.KB_DATUM || "") ? process.env.KB_DATUM : new Date().toISOString().slice(0, 10);
if (process.env.KB_DATUM) console.log(`Black Friday-pagina: datum gesimuleerd als ${TODAY} (alleen voor testen).`);
function periodOf(today) {
  const y = +today.slice(0, 4);
  const mk = yr => { const bf = blackFriday(yr); return { year: yr, bf, cm: addDays(bf, 3), start: addDays(bf, -START_VOOR), end: addDays(bf, EIND_NA), link: addDays(bf, -LINK_VOOR) }; };
  const cur = mk(y);
  if (today < cur.start) return { phase: "binnenkort", ...cur };
  if (today <= cur.end) return { phase: "actief", ...cur };
  return { phase: "voorbij", past: cur, ...mk(y + 1) };
}
export const BF = periodOf(TODAY);

// Link op de startpagina (onder "Ook bekijken"), alleen kort vóór en tijdens de Black Friday-periode.
export function bfHomeLink() {
  if (!BF_ON || BF.phase === "voorbij" || TODAY < BF.link) return "";
  return `<div class="grp"><h3>Black Friday</h3><ul class="links"><li><a href="${BF_URL}">Black Friday ${BF.year}: koffie in de aanbieding</a></li></ul></div>`;
}

// Opmaak en onderdelen van het sjabloon index.html (kop, footer, licht/donker-schakelaar).
const PAGE_CSS = ".prose{max-width:70ch}.prose h2{font-size:20px;color:var(--title);margin:28px 0 8px}.prose p,.prose ul{margin:0 0 12px}.prose ul{padding-left:22px}.prose li{margin:0 0 4px}.prose a{color:var(--ink)}.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:0 0 16px}.box p{margin:0 0 4px}.box p:last-child{margin:0}";
function partsOf(tpl) {
  const need = (cond, what) => { if (!cond) throw new Error(`black-friday.mjs: ${what} niet gevonden in index.html. Pas black-friday.mjs aan.`); };
  const iMain = tpl.indexOf("<main>");
  need(iMain > 0 && tpl.includes("{{HEAD}}"), "<main> of {{HEAD}}");
  const foot = tpl.match(/<footer>[\s\S]*?<\/footer>/);
  need(foot, "<footer>");
  // In de footer geen datum van de aanbiedingen (die staat in de tekst); de bronvermelding staat er altijd.
  const footer = foot[0].replace(/<span id="upd">[^<]*<\/span><span id="upd-sep"> · <\/span>/, "").replace(/<span id="attr" hidden>/, "<span>");
  const t0 = tpl.indexOf("/* Licht/donker schakelaar */"), t1 = tpl.indexOf("syncTheme();\n", t0);
  need(t0 > 0 && t1 > t0, "de licht/donker-schakelaar");
  return { start: tpl.slice(0, iMain), footer, theme: tpl.slice(t0, t1 + "syncTheme();".length) };
}

const BF_CSS = ".bfsec{display:grid;gap:10px;margin:28px 0 0}.bfsec h2{margin:0;font-size:20px;color:var(--title)}.bfsec>p{margin:0;max-width:70ch}.bfsec p a{color:var(--ink);font-weight:600}.bfsec .prose ul{margin:0}.bfdates{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;padding:0;list-style:none}.bfdates li{padding:6px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:14px}.bfdates strong{color:var(--title)}.shoplist{list-style:none;margin:0;padding:0;display:grid;gap:8px}.shoplist li{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px}.shoplist .meta{flex:1 1 220px}";

// ---------- pagina ----------
// h = hulpmiddelen uit build.mjs (zodat deze pagina precies dezelfde lijsten en berekeningen gebruikt als de rest van de site).
// Geeft de getoonde aanbiedingen terug (voor de sitemap-datum en IndexNow), of null als de pagina uit staat.
export function writeBlackFriday(out, tpl, h) {
  if (!BF_ON) return null;
  const { deals, updated, listHtml, eur, nameOf, mech, hubSections, cheapPages, HUB_URL, hubIndexable, pages, urlOf, labelOf } = h;
  const P = BF, Y = P.year;
  const n = deals.length, shopsN = new Set(deals.map(d => d.shop)).size;
  const disc = deals.filter(d => !d.nodisc && d.pct > 0);
  const topPct = [...disc].sort((a, b) => b.pct - a.pct)[0];
  const bonen = cheapPages.get("/goedkoopste-koffiebonen/");
  const loBonen = bonen && bonen.ranked.length ? bonen.ranked[0] : null;
  const active = P.phase === "actief";
  const dates = `<ul class="bfdates"><li>Black Friday: <strong>${esc(dayNL(P.bf))}</strong></li><li>Cyber Monday: <strong>${esc(dayNL(P.cm))}</strong></li></ul>`;
  const nowLine = n ? `Op ${dateNL(updated)} zijn er ${n} koffieaanbiedingen bij ${shopsN} supermarkten.` : `Op ${dateNL(updated)} is er geen koffieaanbieding bij de supermarkten die we volgen.`;

  // Teksten per fase
  const title = `Black Friday koffie ${Y}: aanbiedingen | Koffieboonus`;
  const h1 = `Black Friday ${Y}: koffie in de aanbieding`;
  let intro, desc;
  if (active) {
    intro = `Black Friday is op ${dayNL(P.bf)}. ${nowLine} Hieronder staan de grootste kortingen en de goedkoopste koffie per kilo, cup en pad. Deze pagina wordt elke nacht bijgewerkt.`;
    desc = `Black Friday ${Y}: de beste koffieaanbiedingen van de supermarkten${topPct ? `, nu tot ${topPct.pct}% korting` : ""}. Ook de goedkoopste koffie per kilo, cup en pad. Elke nacht bijgewerkt.`;
  } else if (P.phase === "binnenkort") {
    intro = `Black Friday is dit jaar op ${dayNL(P.bf)}. Vanaf ${dayNL(P.start)} zetten we hier de beste koffieaanbiedingen van de Black Friday-periode uitgebreid op een rij. Tot die tijd zie je hieronder de beste aanbiedingen van nu. ${nowLine}`;
    desc = `Black Friday ${Y} is op ${dateNL(P.bf)}. De beste koffieaanbiedingen van de supermarkten van nu, en hoe je een echte aanbieding herkent.`;
  } else {
    intro = `Black Friday ${P.past.year} is voorbij. De volgende Black Friday is op ${dayNL(P.bf)}. Koffie is bijna elke week wel ergens in de aanbieding: hieronder de beste aanbiedingen van nu. ${nowLine}`;
    desc = `Black Friday ${P.past.year} is voorbij; de volgende is op ${dateNL(P.bf)}. Bekijk de beste koffieaanbiedingen van de supermarkten van nu. Elke nacht bijgewerkt.`;
  }

  // Eerlijk vooraf
  const honest = `<div class="box"><p><strong>Goed om te weten:</strong> bij supermarkten staan de koffieaanbiedingen rond Black Friday meestal gewoon in de weekfolder. Wij laten precies zien wat er in de aanbieding is, ook als er niets bijzonders bij zit. De volgorde bepalen we zelf: grootste korting of laagste prijs per kilo, cup of pad. Niemand betaalt voor een plek.</p></div>`;

  // Lijsten
  const secs = [];
  const topN = active ? 10 : 6;
  if (disc.length) secs.push(`<section class="bfsec"><h2>${active ? "Grootste korting op koffie deze week" : "Nu al in de aanbieding: grootste korting"}</h2><div class="list">${listHtml(disc, { limit: topN })}</div><p><a href="/">Bekijk alle ${n} koffieaanbiedingen ›</a></p></section>`);
  else secs.push(`<section class="bfsec"><h2>Koffie in de aanbieding</h2><div class="empty">Op dit moment is er geen koffieaanbieding met korting. Deze pagina wordt elke nacht bijgewerkt. <a href="/">Bekijk de startpagina</a></div></section>`);
  if (active && hubSections.length) {
    const byPP = (a, b) => a.pp - b.pp || b.pct - a.pct;
    secs.push(`<section class="bfsec"><h2>Goedkoopste koffie per kilo, cup en pad</h2><p>Een hoog kortingspercentage is niet altijd de laagste prijs. Daarom ook de goedkoopste aanbiedingen per soort, omgerekend naar een prijs per kilo, cup of pad.</p></section>`
      + hubSections.map(g => `<section class="bfsec"><h3 style="margin:0;font-size:17px">Goedkoopste ${esc(g.c.word)}</h3><div class="list">${listHtml(g.ranked, { sort: byPP, limit: 3, rank: true })}</div>${g.indexable ? `<p><a href="/${g.c.slug}/">Alle goedkoopste ${esc(g.c.word)} ›</a></p>` : ""}</section>`).join(""));
  }

  // Webshops: alleen een eerlijke tekst, geen links. Advertentielinks komen pas als Koffieboonus een affiliateprogramma heeft (en na akkoord van Maurits).
  const shopSec = `<section class="bfsec"><h2>Koffiemachines en cups bij webshops</h2><p>Zoek je een koffiemachine of een grote voorraad cups? Webshops en merken met een eigen webwinkel hebben rond Black Friday vaak acties. Koffieboonus vergelijkt die prijzen niet. Let bij een ‘van … voor …’-prijs goed op: bij een prijsverlaging moet de ‘van’-prijs de laagste prijs van de afgelopen 30 dagen zijn.</p></section>`;
  secs.push(shopSec);

  // Tips
  secs.push(`<section class="bfsec prose"><h2>Zo herken je een echte koffieaanbieding</h2><ul><li><strong>Kijk naar de prijs per kilo, cup of pad</strong>, niet alleen naar het kortingspercentage. Een groot pak met korting kan per kilo duurder zijn dan een ander merk zonder korting.</li><li><strong>Check de ‘van’-prijs.</strong> Bij een prijsverlaging moet de winkel de laagste prijs van de afgelopen 30 dagen als ‘van’-prijs gebruiken. Een ‘adviesprijs’ zegt weinig.</li><li><strong>1+1 gratis is pas 50% korting als je ze allebei gebruikt.</strong> Sla je voorraad in, kijk dan naar de houdbaarheidsdatum.</li><li><strong>Je hoeft niet op Black Friday te wachten.</strong> Koffie is bijna elke week wel ergens in de aanbieding. Een goede aanbieding nu is net zo goed.</li></ul></section>`);

  // Veelgestelde vragen
  const faq = [
    [`Wanneer is Black Friday ${Y}?`, `Black Friday is op ${dayNL(P.bf)}. Cyber Monday is op ${dayNL(P.cm)}. Veel webshops beginnen al eerder met hun acties, soms een week of langer van tevoren.`],
    ["Doen supermarkten mee met Black Friday?", "Sommige supermarkten hebben Black Friday-acties, maar koffie staat rond Black Friday meestal gewoon in de weekaanbiedingen. Op deze pagina zie je de koffieaanbiedingen van alle supermarkten die we volgen, met de grootste korting en de laagste prijs per kilo, cup of pad."],
    ["Wat is nu de beste koffieaanbieding?", n && (topPct || loBonen) ? `Op ${dateNL(updated)}: ${[topPct ? `de grootste korting is ${topPct.pct}% op ${nameOf(topPct)} bij ${topPct.shop} (${topPct.until})` : "", loBonen ? `de goedkoopste koffiebonen zijn ${nameOf(loBonen)} bij ${loBonen.shop}, ${eur(loBonen.pp)} per kilo (${mech(loBonen)}, ${loBonen.until})` : ""].filter(Boolean).join("; ")}. Controleer de prijs altijd bij de winkel.` : "Op dit moment is er geen koffieaanbieding die we kunnen vergelijken. Deze pagina wordt elke nacht bijgewerkt."],
    ["Is een Black Friday-korting altijd echt?", "Niet altijd. De Autoriteit Consument & Markt (ACM) vond in november 2025 bij 18 van de 24 grote winkels misleidende prijsinformatie, meestal over de ‘van’-prijs. Die moet de laagste prijs van de afgelopen 30 dagen zijn. Vergelijk daarom zelf, bijvoorbeeld op prijs per kilo."],
    ["Is koffie rond Black Friday goedkoper dan normaal?", "Dat weten we niet zeker. We vergelijken alleen de aanbiedingen van nu, niet de prijzen van vorige maanden. Koffie is het hele jaar door regelmatig in de aanbieding."],
    ["Hoe vaak wordt deze pagina bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet.`],
    ["Verdient Koffieboonus geld aan deze pagina?", "Nee. De supermarktaanbiedingen zijn gratis informatie, en Koffieboonus krijgt niets voor de knoppen ‘Bekijk bij …’."],
  ];
  // FAQ-tekst zonder HTML voor schema.org
  const plainFaq = faq.map(([q, a]) => [q, a.replace(/<[^>]+>/g, "")]);

  // Ook bekijken
  const items = [];
  if (hubSections.length && hubIndexable) items.push(`<li><a href="${HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  for (const [u, g] of cheapPages) if (g.indexable) items.push(`<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  for (const t of ["Bonen", "Gemalen koffie", "Cups", "Pads"]) { const u = urlOf({ type: t }); const pg = pages.get(u); if (pg && pg.indexable && pg.list.length) items.push(`<li><a href="${u}">${esc(labelOf({ type: t }))} in de aanbieding</a> <span class="meta">(${pg.list.length})</span></li>`); }
  items.push(`<li><a href="/">Alle koffieaanbiedingen</a></li>`);
  const more = `<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links">${items.join("")}</ul></div></section>`;
  const faqHtml = `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a.includes("<a ") ? a : esc(a)}</p></details>`).join("")}</section>`;

  // Kop
  const canon = SITE + BF_URL;
  const crumb = `Black Friday koffie`;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Koffieboonus", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: crumb, item: canon }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: plainFaq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    { "@context": "https://schema.org", "@type": "WebPage", name: h1, url: canon, inLanguage: "nl-NL", dateModified: updated, isPartOf: { "@type": "WebSite", name: "Koffieboonus", url: SITE + "/" } },
  ];
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    ...ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n");
  const { start, footer, theme } = partsOf(tpl);
  const top = start.replace("{{HEAD}}", () => head).replace("</style>", () => PAGE_CSS + BF_CSS + "</style>");
  const pagehead = `<section class="pagehead"><nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">${esc(crumb)}</span></nav><h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p>${dates}</section>`;
  const html = `${top}<main><div class="wrap">\n${pagehead}\n${honest}\n${secs.join("\n")}\n${more}\n${faqHtml}\n</div></main>\n${footer}\n<script>\n${theme}\n</script>\n</body>\n</html>\n`;
  const dir = path.join(out, BF_URL);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`Black Friday-pagina: ${P.phase} (Black Friday ${P.bf}, periode ${P.start} t/m ${P.end})`);
  return [{ id: "fase-" + P.phase + "-" + Y }, ...disc.slice(0, 10)];
}
