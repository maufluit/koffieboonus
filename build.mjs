// Bouwt elke nacht de hele site: startpagina + een pagina per soort, merk, systeem, supermarkt en combinatie.
// Gebruik: node build.mjs [uitmap]   (leest deals.json en index.html, schrijft sitemap.xml en alle pagina's)
import fs from "node:fs";
import path from "node:path";

const SITE = "https://koffieboonus.nl";
const OUT = process.argv[2] || "_site";
const raw = JSON.parse(fs.readFileSync("deals.json", "utf8"));
const tpl = fs.readFileSync("index.html", "utf8");
const today = new Date().toISOString().slice(0, 10);
const updated = (raw.updated || today).slice(0, 10);
const deals = raw.deals.filter(d => (!d.end || d.end >= today) && !(d.next && d.from > today));

// ---------- vaste lijsten ----------
const SHOPS = ["Albert Heijn", "Jumbo", "PLUS", "Dirk", "DekaMarkt", "Hoogvliet", "Poiesz", "Vomar", "Aldi", "Lidl", "Coop", "Ekoplaza", "Nettorama", "SPAR", "Dagwinkel", "Boon's Markt", "MCD"];
const MAIN_BRANDS = ["Douwe Egberts", "Nescafé", "L'OR", "Lavazza", "Senseo", "Starbucks", "Segafredo", "Illy", "Jacobs", "Perla", "Buisman", "Kanis & Gunnink", "Smit & Dorlas"];
const SYSTEMS = ["Dolce Gusto", "Nespresso", "Senseo"];
const TYPES = ["Bonen", "Gemalen koffie", "Cups", "Pads", "Oploskoffie", "IJskoffie & koffiedrank"];
const TYPE_SLUG = { Bonen: "koffiebonen", "Gemalen koffie": "gemalen-koffie", Cups: "cups", Pads: "pads", Oploskoffie: "oploskoffie", "IJskoffie & koffiedrank": "ijskoffie" };
const TYPE_WORD = { Bonen: "koffiebonen", "Gemalen koffie": "gemalen koffie", Cups: "koffiecups", Pads: "koffiepads", Oploskoffie: "oploskoffie", "IJskoffie & koffiedrank": "ijskoffie" };
const SYS_DEFAULT = { "Dolce Gusto": "cups", Nespresso: "cups", Senseo: "pads" };
const MIN_BRAND_DEALS = 3; // overige merken krijgen pas een pagina vanaf zoveel aanbiedingen
const MIN_COMBO_DEALS = 2; // combinaties pas vanaf zoveel aanbiedingen

const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "en").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const low = s => s.charAt(0).toLowerCase() + s.slice(1);
const nl = n => String(n);
const dateNL = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- waardes en slugs (zonder botsingen) ----------
const brandCount = {};
deals.forEach(d => { if (d.brand) brandCount[d.brand] = (brandCount[d.brand] || 0) + 1; });
const BRANDS = [...MAIN_BRANDS, ...Object.keys(brandCount).filter(b => !MAIN_BRANDS.includes(b) && b !== "Overig" && brandCount[b] >= MIN_BRAND_DEALS).sort()]
  .filter(b => b !== "Senseo"); // Senseo is een systeem-pagina (/senseo/)
const taken = new Map(); // slug -> dim
const dict = { brand: new Map(), sys: new Map(), type: new Map(), shop: new Map() };
function reg(dim, values, slugFn = slug) {
  for (const v of values) {
    const s = slugFn(v);
    if (!s || taken.has(s)) { console.warn(`Slug-botsing overgeslagen: ${dim} ${v} -> ${s}`); continue; }
    taken.set(s, dim); dict[dim].set(s, v);
  }
}
reg("type", TYPES, v => TYPE_SLUG[v]);
reg("sys", SYSTEMS);
reg("shop", SHOPS);
reg("brand", BRANDS);
const slugOf = (dim, v) => [...dict[dim]].find(([, val]) => val === v)?.[0];

// ---------- pagina's bepalen ----------
const match = (d, p) => (!p.brand || d.brand === p.brand) && (!p.sys || d.sys === p.sys) && (!p.type || d.type === p.type) && (!p.shop || d.shop === p.shop);
const dealsFor = p => deals.filter(d => match(d, p));
const urlOf = p => "/" + [p.brand ? slugOf("brand", p.brand) : p.sys ? slugOf("sys", p.sys) : null, p.type ? slugOf("type", p.type) : null, p.shop ? slugOf("shop", p.shop) : null].filter(Boolean).join("/") + (Object.keys(p).length ? "/" : "");
const keyOf = p => urlOf(p);

const pages = new Map(); // url -> {p, list}
const seenSets = new Map(); // welke aanbiedingen staan al op een pagina? (tegen bijna-dubbele pagina's)
const setKey = p => deals.map((d, i) => match(d, p) ? i : -1).filter(i => i >= 0).join(",");
function add(p) {
  const list = dealsFor(p);
  const dims = Object.keys(p).length;
  const u = urlOf(p);
  if (dims >= 2) {
    if (list.length < MIN_COMBO_DEALS) return;
    // Heeft een bredere pagina precies dezelfde aanbiedingen, dan maken we deze niet: geen dubbele pagina's.
    const k = setKey(p);
    if (seenSets.has(k)) return;
    seenSets.set(k, u);
  } else if (list.length) seenSets.set(setKey(p), seenSets.get(setKey(p)) || u);
  pages.set(u, { p, list, indexable: dims === 0 || (dims === 1 ? list.length >= 1 : true) });
}
add({});
for (const v of BRANDS) add({ brand: v });
for (const v of SYSTEMS) add({ sys: v });
for (const v of TYPES) add({ type: v });
for (const v of SHOPS) add({ shop: v });
const A = [{}, ...BRANDS.map(brand => ({ brand })), ...SYSTEMS.map(sys => ({ sys }))];
const T = [{}, ...TYPES.map(type => ({ type }))];
const S = [{}, ...SHOPS.map(shop => ({ shop }))];
const combos = [];
for (const a of A) for (const t of T) for (const s of S) {
  const p = { ...a, ...t, ...s };
  if (Object.keys(p).length >= 2) combos.push(p);
}
combos.sort((x, y) => Object.keys(x).length - Object.keys(y).length); // eerst de bredere pagina's
combos.forEach(add);

// ---------- "Goedkoopste ..."-pagina's: aanbiedingen gesorteerd op prijs per kilo, cup of pad ----------
// Mensen zoeken op "goedkoopste koffiebonen" (niet op "prijs per kilo"): deze pagina's zetten de goedkoopste aanbiedingen op een rij.
const CHEAP = [
  { slug: "goedkoopste-koffiebonen", word: "koffiebonen", unit: "kilo", f: { type: "Bonen" } },
  { slug: "goedkoopste-gemalen-koffie", word: "gemalen koffie", unit: "kilo", f: { type: "Gemalen koffie" } },
  { slug: "goedkoopste-koffiecups", word: "koffiecups", unit: "cup", f: { type: "Cups" } },
  { slug: "goedkoopste-dolce-gusto-cups", word: "Dolce Gusto cups", unit: "cup", f: { sys: "Dolce Gusto", type: "Cups" } },
  { slug: "goedkoopste-nespresso-cups", word: "Nespresso cups", unit: "cup", f: { sys: "Nespresso", type: "Cups" } },
  { slug: "goedkoopste-koffiepads", word: "koffiepads", unit: "pad", f: { type: "Pads" } },
  { slug: "goedkoopste-senseo-pads", word: "Senseo pads", unit: "pad", f: { sys: "Senseo", type: "Pads" } },
];
const MIN_CHEAP = 3; // pas indexeren vanaf zoveel vergelijkbare aanbiedingen
const cheapPages = new Map(); // url -> {c, list, ranked, indexable}
for (const c of CHEAP) {
  if (taken.has(c.slug)) { console.warn(`Slug-botsing overgeslagen: ${c.slug}`); continue; }
  const list = deals.filter(d => match(d, c.f));
  const ranked = list.filter(d => d.pp != null && d.pu === c.unit).sort((a, b) => a.pp - b.pp || b.pct - a.pct);
  cheapPages.set(`/${c.slug}/`, { c, list, ranked, indexable: ranked.length >= MIN_CHEAP });
}
// Overzichtspagina "Goedkoopste koffie": per soort de 3 goedkoopste, met links naar de volledige lijsten.
const HUB_URL = "/goedkoopste-koffie/";
const hubSections = ["goedkoopste-koffiebonen", "goedkoopste-gemalen-koffie", "goedkoopste-koffiecups", "goedkoopste-koffiepads"].map(s => cheapPages.get(`/${s}/`)).filter(g => g && g.ranked.length);
const hubIndexable = hubSections.filter(g => g.indexable).length >= 2;
const cheapLinks = p => {
  const home = !Object.keys(p).length;
  const match_ = g => home || (p.type && !p.sys && !p.brand && !p.shop && g.c.f.type === p.type && !g.c.f.sys) || (p.sys && !p.brand && !p.shop && !p.type && g.c.f.sys === p.sys);
  const li = [...cheapPages].filter(([, g]) => g.indexable && match_(g)).map(([u, g]) => `<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a> <span class="meta">(per ${g.c.unit})</span></li>`);
  if (home && hubIndexable) li.unshift(`<li><a href="${HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  return li.length ? `<div class="grp"><h3>Goedkoopste</h3><ul class="links">${li.join("")}</ul></div>` : "";
};

// ---------- teksten ----------
function labelOf(p) {
  const a = p.brand || p.sys;
  const t = p.type ? TYPE_WORD[p.type] : null;
  let core;
  if (a) core = t ? `${a} ${t}` : p.sys ? `${a} ${SYS_DEFAULT[a] || "koffie"}` : `${a} koffie`;
  else core = t ? cap(t) : "Koffie";
  return p.shop ? `${core} bij ${p.shop}` : core;
}
const sentLabel = p => (p.brand || p.sys) ? labelOf(p) : low(labelOf(p));
const mech = d => d.deal.startsWith("Volume") ? "Volume voordeel" : /^Nu voor/.test(d.deal) ? (d.nodisc ? d.deal.replace(/^Nu voor/, "Actieprijs") : `${d.pct}% korting`) : d.deal;
const eur = n => "€" + n.toFixed(2).replace(".", ",");
const nameOf = d => (d.brand && d.brand !== "Huismerk" && d.brand !== "Overig" ? d.brand + " " : "") + d.name;

function listHtml(list, o = {}) {
  const sorted = [...list].sort(o.sort || ((a, b) => b.pct - a.pct)).slice(0, o.limit || 80);
  const nowS = d => (d.deal.match(/€[\d,]+/) || [""])[0];
  const SHOPCOL = {"Albert Heijn":"#00ADE6","Jumbo":"#FFC900","Dirk":"#E2001A","PLUS":"#00A651","Aldi":"#2F5BD0","Lidl":"#0050AA","Coop":"#E30613","SPAR":"#009640","Ekoplaza":"#7AB800","Hoogvliet":"#00ACE7","DekaMarkt":"#E30613","Poiesz":"#3DA643","Vomar":"#E20613","Nettorama":"#FFD700","Dagwinkel":"#FF6600","Boon's Markt":"#C8102E","MCD":"#D32F2F","boni":"#E30613","Boni":"#E30613"};
  const chip = s => `<span class="sdot"${SHOPCOL[s] ? ` style="--c:${SHOPCOL[s]}"` : ""}></span>${esc(s)}`;
  return sorted.map((d, i) => {
    const priceType = !d.nodisc && !d.noprice && /^Nu voor/.test(d.deal);
    const price = d.noprice || d.nodisc ? "" : priceType ? `<div class="pnow">${esc(nowS(d))} <s class="reg">${esc(d.reg)}</s></div>` : `<span class="reg">${esc(d.reg)}</span>`;
    const badge = d.noprice ? d.deal : d.nodisc ? d.deal.replace(/^Nu voor/, "Actieprijs") : priceType ? `${d.pct}% korting` : mech(d);
    const note = d.noprice ? `<div class="meta sub">Prijs onbekend, check de winkel</div>` : d.nodisc ? `<div class="meta sub">Normale prijs onbekend</div>` : "";
    return `<div class="row"><div class="name">${o.rank ? `<span class="rk">${i + 1}.</span> ` : ""}${esc(d.name)}<div class="meta bt">${esc(d.brand)} · ${esc(d.type)}</div></div><div class="who"><div class="shop">${chip(d.shop)}</div></div><div class="act"><span class="deal">${esc(badge)}</span><div class="meta">${esc(d.until)}</div></div><div class="pr">${price}${d.pp!=null?`<div class="meta ppu">${eur(d.pp)} per ${d.pu}</div>`:""}${note}</div>${d.url ? `<div class="gocell"><a class="go" href="${esc(d.url)}" target="_blank" rel="sponsored nofollow noopener" aria-label="Bekijk bij ${esc(d.shop)}">Bekijk<span class="gs"> bij ${esc(d.shop)}</span> ›</a></div>` : `<div class="gocell"></div>`}</div>`;
  }).join("");
}

function counts(list, key) {
  const m = {};
  list.forEach(d => { if (d[key]) m[d[key]] = (m[d[key]] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function faqOf(p, list) {
  const n = list.length, sl = sentLabel(p);
  let a1;
  if (!n) a1 = `Op dit moment bij geen enkele supermarkt. Deze pagina wordt elke nacht bijgewerkt, dus kom gerust later terug.`;
  else if (p.shop) a1 = `Bij ${p.shop} zijn er nu ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl.replace(` bij ${p.shop}`, "")}.`;
  else a1 = `Op dit moment bij ${counts(list, "shop").map(([s, c]) => `${s} (${c})`).join(", ")}.`;
  const ppFaq = [];
  const byUnit = {};
  list.forEach(d => { if (d.pp != null) (byUnit[d.pu] = byUnit[d.pu] || []).push(d); });
  for (const [u, arr] of Object.entries(byUnit).sort((a, b) => b[1].length - a[1].length).slice(0, 2)) {
    if (arr.length < 2) continue;
    const lo = arr.reduce((m, d) => d.pp < m.pp ? d : m);
    const word = u === "kilo" ? "kilo" : u;
    ppFaq.push([`Wat is nu de laagste prijs per ${word} voor ${sl}?`, `Op ${dateNL(updated)} is dat ${eur(lo.pp)} per ${word}: ${nameOf(lo)} bij ${lo.shop} (${mech(lo)}, ${lo.until}). De prijs is berekend uit de verpakkingsgrootte; controleer hem altijd bij de winkel.`]);
  }
  return [
    [`Waar is ${sl} nu in de aanbieding?`, a1],
    ...ppFaq,
    ["Hoe vaak worden de aanbiedingen bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet.`],
    ["Zijn de prijzen en acties altijd actueel?", "Prijzen en acties kunnen per winkel verschillen. Controleer de actuele prijs daarom altijd bij de winkel zelf voordat je koopt."],
  ];
}

function relatedHtml(url, p) {
  const groups = [];
  const link = (q, text) => { const pg = pages.get(urlOf(q)); return pg && pg.indexable && pg.list.length ? `<li><a href="${urlOf(q)}">${esc(text ?? labelOf(q))}</a> <span class="meta">(${pg.list.length})</span></li>` : ""; };
  const has = k => p[k];
  const aSet = p.brand || p.sys;
  const ext = [];
  if (!aSet) {
    ext.push(["Per merk", BRANDS.map(v => link({ ...p, brand: v }, v))]);
    ext.push(["Per systeem", SYSTEMS.map(v => link({ ...p, sys: v }, v))]);
  }
  if (!has("type")) ext.push(["Per soort", TYPES.map(v => link({ ...p, type: v }, cap(TYPE_WORD[v])))]);
  if (!has("shop")) ext.push(["Per supermarkt", SHOPS.map(v => link({ ...p, shop: v }, v))]);
  for (const [title, items] of ext) { const li = items.filter(Boolean).join(""); if (li) groups.push(`<div class="grp"><h3>${title}</h3><ul class="links">${li}</ul></div>`); }
  // breder zoeken: één onderdeel weglaten
  const wider = [];
  for (const k of ["shop", "type", "brand", "sys"]) if (p[k] && Object.keys(p).length >= 1) { const q = { ...p }; delete q[k]; const t = Object.keys(q).length ? labelOf(q) : "Alle koffie-aanbiedingen"; wider.push(`<li><a href="${urlOf(q)}">${esc(t)}</a></li>`); }
  if (wider.length) groups.push(`<div class="grp"><h3>Breder zoeken</h3><ul class="links">${wider.join("")}</ul></div>`);
  const cg = cheapLinks(p);
  if (cg) groups.unshift(cg);
  return groups.length ? `<section class="more"><h2>Ook bekijken</h2>${groups.join("")}</section>` : "";
}

function crumbs(p) {
  const trail = [{ name: "Koffieboonus", url: "/" }];
  const acc = {};
  for (const k of [p.brand ? "brand" : p.sys ? "sys" : null, p.type ? "type" : null, p.shop ? "shop" : null]) {
    if (!k) continue;
    acc[k] = p[k];
    trail.push({ name: Object.keys(acc).length === 1 && k !== "type" && k !== "shop" ? p[k] : labelOf(acc), url: urlOf(acc) });
  }
  return trail;
}

function render(url, { p, list, indexable }) {
  const n = list.length, home = url === "/";
  const sl = sentLabel(p), Label = labelOf(p);
  const disc = list.filter(d => !d.nodisc);
  const max = disc.length ? Math.max(...disc.map(d => d.pct)) : 0;
  const top = disc.length ? disc.find(d => d.pct === max) : null;
  const shopsN = new Set(list.map(d => d.shop)).size;
  let title, h1, desc, intro;
  if (home) {
    title = "Koffie in de aanbieding: alle supermarkten op één plek | Koffieboonus";
    h1 = "Koffie in de aanbieding bij alle supermarkten";
    desc = `Nu ${n} koffie-aanbiedingen bij Nederlandse supermarkten${max ? `, tot ${max}% korting` : ""}. Filter op supermarkt, merk en soort koffie. Dagelijks bijgewerkt.`;
  } else {
    title = n ? `${Label} aanbieding: ${n} deals nu | Koffieboonus` : `${Label} aanbieding | Koffieboonus`;
    if (title.length > 62) title = `${Label} aanbieding | Koffieboonus`;
    h1 = `${Label} in de aanbieding`;
    desc = n
      ? `Nu ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl}${p.shop ? "" : ` bij ${plural(shopsN, "supermarkt", "supermarkten")}`}${max ? `, tot ${max}% korting` : ""}. Dagelijks bijgewerkt op Koffieboonus.`
      : `Op dit moment is er geen aanbieding voor ${sl}. Bekijk alle koffie-aanbiedingen van Nederlandse supermarkten op Koffieboonus.`;
  }
  if (n) {
    intro = home
      ? `Op ${dateNL(updated)} zijn er ${n} koffie-aanbiedingen bij ${shopsN} supermarkten.${top ? ` De grootste korting is ${max}%: ${nameOf(top)} bij ${top.shop}.` : ""} Kies hieronder je supermarkt, merk of soort koffie.`
      : `Op ${dateNL(updated)} zijn er ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl}${p.shop ? "" : ` bij ${plural(shopsN, "supermarkt", "supermarkten")}`}.${top ? ` De grootste korting is ${max}%: ${nameOf(top)}${p.shop ? "" : ` bij ${top.shop}`}.` : ""} Hieronder staan alle aanbiedingen, de filters kun je zelf aanpassen.`;
  } else intro = `Op ${dateNL(updated)} is er geen aanbieding voor ${sl}. Zodra er weer een is, staat die hier. Bekijk intussen de andere aanbiedingen.`;

  const canon = SITE + url;
  const faq = faqOf(p, list);
  const trail = crumbs(p);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  if (home) ld.push({ "@context": "https://schema.org", "@type": "WebSite", name: "Koffieboonus", url: SITE + "/" });
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
  const crumbHtml = home ? "" : `<nav class="crumbs" aria-label="Kruimelpad">${trail.map((t, i) => i < trail.length - 1 ? `<a href="${t.url}">${esc(t.name)}</a>` : `<span aria-current="page">${esc(t.name)}</span>`).join(" › ")}</nav>`;
  const top_ = `<section class="pagehead">${crumbHtml}<h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p></section>`;
  const bottom = relatedHtml(url, p) + `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const preset = { brand: p.brand ? [p.brand] : [], sys: p.sys ? [p.sys] : [], type: p.type ? [p.type] : [], shop: p.shop ? [p.shop] : [] };
  const presetJs = `<script>window.PRESET=${JSON.stringify(preset)};window.PLABEL=${home ? "null" : JSON.stringify(Label)};window.STATIC=${n ? "true" : "false"};</script>`;
  const body = n ? listHtml(list) : `<div class="empty">Aanbiedingen laden…</div>`;
  const html = tpl
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => presetJs)
    .replace("{{TOP}}", () => top_)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => bottom);
  return html;
}

function renderCheap(url, { c, list, ranked, indexable }) {
  const n = ranked.length, lo = ranked[0], u = c.unit;
  const shown = Math.min(n, 15);
  let title = n ? `Goedkoopste ${c.word}: nu vanaf ${eur(lo.pp)} per ${u} | Koffieboonus` : `Goedkoopste ${c.word} | Koffieboonus`;
  if (title.length > 62) title = `Goedkoopste ${c.word} per ${u} | Koffieboonus`;
  const h1 = `Goedkoopste ${c.word} in de aanbieding`;
  const desc = n
    ? `De ${plural(shown, "goedkoopste aanbieding", "goedkoopste aanbiedingen")} voor ${c.word}, op volgorde van prijs per ${u}. Nu vanaf ${eur(lo.pp)} per ${u} bij ${lo.shop}. Dagelijks bijgewerkt.`
    : `Op dit moment kunnen we voor ${c.word} geen prijzen per ${u} vergelijken. Bekijk alle aanbiedingen op Koffieboonus.`;
  const intro = n
    ? `Op ${dateNL(updated)} is de goedkoopste aanbieding voor ${c.word} ${eur(lo.pp)} per ${u}: ${nameOf(lo)} bij ${lo.shop} (${mech(lo)}, ${lo.until}). Hieronder staan de goedkoopste aanbiedingen op een rij. We rekenen de prijs om naar een prijs per ${u}, zodat je verschillende verpakkingen eerlijk kunt vergelijken.`
    : `Op ${dateNL(updated)} kunnen we voor ${c.word} geen prijzen per ${u} vergelijken. Zodra dat weer kan, staat de lijst hier.`;
  const faq = [
    [`Wat is nu de goedkoopste ${c.word}?`, n ? `Op ${dateNL(updated)} is dat ${nameOf(lo)} bij ${lo.shop}: ${eur(lo.pp)} per ${u} (${mech(lo)}, ${lo.until}). Controleer de prijs altijd bij de winkel.` : `Op dit moment is er geen aanbieding waarvan we de prijs per ${u} kunnen berekenen.`],
    ["Hoe vergelijken jullie de prijzen?", `We rekenen de aanbiedingsprijs om naar een prijs per ${u}, op basis van de verpakkingsgrootte in de productnaam. Alleen producten waarvan die grootte zeker is, doen mee.`],
    [`Is dit ook de goedkoopste ${c.word} buiten de aanbieding?`, "Niet per se. We vergelijken alleen producten die nu in de aanbieding zijn. Een product met een lage vaste prijs staat hier alleen tussen als de winkel het als aanbieding aanmerkt."],
    ["Hoe vaak worden deze prijzen bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet.`],
  ];
  const canon = SITE + url;
  const trail = [{ name: "Koffieboonus", url: "/" }, { name: `Goedkoopste ${c.word}`, url }];
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) },
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
  const crumbHtml = `<nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">Goedkoopste ${esc(c.word)}</span></nav>`;
  const top_ = `<section class="pagehead">${crumbHtml}<h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p></section>`;
  // Ook bekijken: de gewone pagina, de andere "goedkoopste"-pagina's en de startpagina
  const items = [];
  const plain = pages.get(urlOf(c.f));
  if (plain && plain.list.length) items.push(`<li><a href="${urlOf(c.f)}">Alle ${esc(low(labelOf(c.f)))} in de aanbieding</a> <span class="meta">(${plain.list.length})</span></li>`);
  for (const [u2, g] of cheapPages) if (u2 !== url && g.indexable) items.push(`<li><a href="${u2}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  if (hubIndexable) items.push(`<li><a href="${HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  items.push(`<li><a href="/">Alle koffie-aanbiedingen</a></li>`);
  const more = `<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links">${items.join("")}</ul></div></section>`;
  const bottom = more + `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const preset = { brand: [], sys: c.f.sys ? [c.f.sys] : [], type: c.f.type ? [c.f.type] : [], shop: [] };
  const presetJs = `<script>window.PRESET=${JSON.stringify(preset)};window.PLABEL=${JSON.stringify(`Goedkoopste ${c.word}`)};window.SORT="pp";window.STATIC=${list.length ? "true" : "false"};</script>`;
  const body = n ? listHtml(ranked, { sort: (a, b) => a.pp - b.pp || b.pct - a.pct, limit: 15, rank: true }) : list.length ? listHtml(list) : `<div class="empty">Aanbiedingen laden…</div>`;
  return tpl
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => presetJs)
    .replace("{{TOP}}", () => top_)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => bottom)
    .replace("Gesorteerd op hoogste korting.", () => `Gesorteerd op laagste prijs per ${u}.`);
}

function renderHub() {
  const byPP = (a, b) => a.pp - b.pp || b.pct - a.pct;
  const line = g => { const lo = g.ranked[0]; return `${g.c.word} ${eur(lo.pp)} per ${g.c.unit} (${nameOf(lo)} bij ${lo.shop})`; };
  const title = "Goedkoopste koffie in de aanbieding | Koffieboonus";
  const h1 = "Goedkoopste koffie in de aanbieding";
  const desc = "De goedkoopste koffie van deze week: koffiebonen en gemalen koffie per kilo, cups en pads per stuk. Alle aanbiedingen vergeleken, dagelijks bijgewerkt.";
  const intro = `Op ${dateNL(updated)} zijn dit de goedkoopste aanbiedingen per soort koffie: ${hubSections.map(line).join("; ")}. Per soort rekenen we de prijs om naar een prijs per kilo of per stuk, zodat je verschillende verpakkingen eerlijk kunt vergelijken.`;
  const faq = [
    ["Wat is nu de goedkoopste koffie?", `Dat hangt van de soort af. Op ${dateNL(updated)}: ${hubSections.map(line).join("; ")}. Controleer de prijs altijd bij de winkel.`],
    ["Hoe vergelijken jullie de prijzen?", "We rekenen de aanbiedingsprijs om naar een prijs per kilo (bonen en gemalen koffie) of per cup of pad, op basis van de verpakkingsgrootte in de productnaam. Alleen producten waarvan die grootte zeker is, doen mee."],
    ["Is dit ook de goedkoopste koffie buiten de aanbieding?", "Niet per se. We vergelijken alleen producten die nu in de aanbieding zijn. Een product met een lage vaste prijs staat hier alleen tussen als de winkel het als aanbieding aanmerkt."],
    ["Hoe vaak worden deze prijzen bijgewerkt?", `Elke nacht. Deze pagina is voor het laatst bijgewerkt op ${dateNL(updated)}. De aanbiedingen komen van PrijsProfeet.`],
  ];
  const canon = SITE + HUB_URL;
  const trail = [{ name: "Koffieboonus", url: "/" }, { name: "Goedkoopste koffie", url: HUB_URL }];
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="${hubIndexable ? "index,follow,max-image-preview:large" : "noindex,follow"}">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    ...ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n");
  const top_ = `<section class="pagehead"><nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">Goedkoopste koffie</span></nav><h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p></section>`;
  const body = hubSections.map(g => `<section class="hubsec"><h2>Goedkoopste ${esc(g.c.word)}</h2>${listHtml(g.ranked, { sort: byPP, limit: 3, rank: true })}<p><a href="/${g.c.slug}/">Bekijk alle goedkoopste ${esc(g.c.word)} ›</a></p></section>`).join("");
  const items = [...cheapPages].filter(([, g]) => g.indexable).map(([u, g]) => `<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  items.push(`<li><a href="/">Alle koffie-aanbiedingen</a></li>`);
  const bottom = `<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links">${items.join("")}</ul></div></section><section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const presetJs = `<script>window.PRESET=null;window.PLABEL=null;window.HUB=true;window.STATIC=true;</script>`;
  return tpl
    .replace("<body>", '<body class="hub">')
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => presetJs)
    .replace("{{TOP}}", () => top_)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => bottom);
}

// ---------- schrijven ----------
fs.mkdirSync(OUT, { recursive: true });
const sitemap = [];
for (const [url, pg] of pages) {
  const html = render(url, pg);
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  if (pg.indexable) sitemap.push(`  <url><loc>${SITE}${url}</loc><lastmod>${updated}</lastmod></url>`);
}
for (const [url, pg] of cheapPages) {
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderCheap(url, pg));
  if (pg.indexable) sitemap.push(`  <url><loc>${SITE}${url}</loc><lastmod>${updated}</lastmod></url>`);
}
if (hubSections.length) {
  fs.mkdirSync(path.join(OUT, HUB_URL), { recursive: true });
  fs.writeFileSync(path.join(OUT, HUB_URL, "index.html"), renderHub());
  if (hubIndexable) sitemap.push(`  <url><loc>${SITE}${HUB_URL}</loc><lastmod>${updated}</lastmod></url>`);
}
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join("\n")}\n</urlset>\n`);
// Eigen 404-pagina: wijst naar de dichtstbijzijnde bestaande pagina (bijv. /lavazza/koffiebonen/ -> /lavazza/)
const known = [...pages.keys(), ...cheapPages.keys(), ...(hubSections.length ? [HUB_URL] : [])];
fs.writeFileSync(path.join(OUT, "404.html"), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pagina niet gevonden | Koffieboonus</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#FFF9E9;color:#2B1B0E;max-width:560px;margin:15vh auto;padding:0 16px}a{color:#4E341B}@media (prefers-color-scheme:dark){body{background:#16110C;color:#F5ECDD}a{color:#F5A25C}}</style></head><body><h1>Hier is nu geen aanbieding</h1><p>Deze pagina bestaat op dit moment niet: er zijn te weinig aanbiedingen voor deze combinatie, of de aanbieding is afgelopen.</p><p id="near"></p><p><a href="/">Bekijk alle koffie-aanbiedingen</a></p><script>const K=${JSON.stringify(known)};let p=location.pathname.replace(/\\/+$/,"").split("/").filter(Boolean);while(p.length){const u="/"+p.join("/")+"/";if(K.includes(u)){document.getElementById("near").innerHTML='Misschien zoek je <a href="'+u+'">een bredere pagina</a>.';break}p.pop()}</script></body></html>`);
console.log(`Pagina's gebouwd: ${pages.size} (in sitemap: ${sitemap.length}), aanbiedingen: ${deals.length}`);
