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

function listHtml(list) {
  const sorted = [...list].sort((a, b) => b.pct - a.pct).slice(0, 80);
  return sorted.map(d => `<div class="row"><div class="name">${esc(d.name)}</div><div><div class="shop">${esc(d.shop)}</div><div class="meta">${esc(d.brand)} · ${esc(d.type)}</div></div><div>${d.nodisc ? "" : `<span class="reg">${esc(d.reg)}</span>`}${d.pp!=null?`<div class="meta ppu">${eur(d.pp)} per ${d.pu}</div>`:""}<div class="meta">${esc(d.until)}</div></div><div><span class="deal">${esc(mech(d))}</span></div></div>`).join("");
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
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join("\n")}\n</urlset>\n`);
// Eigen 404-pagina: wijst naar de dichtstbijzijnde bestaande pagina (bijv. /lavazza/koffiebonen/ -> /lavazza/)
const known = [...pages.keys()];
fs.writeFileSync(path.join(OUT, "404.html"), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pagina niet gevonden | Koffieboonus</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#FFF9E9;color:#2B1B0E;max-width:560px;margin:15vh auto;padding:0 16px}a{color:#4E341B}@media (prefers-color-scheme:dark){body{background:#16110C;color:#F5ECDD}a{color:#F5A25C}}</style></head><body><h1>Hier is nu geen aanbieding</h1><p>Deze pagina bestaat op dit moment niet: er zijn te weinig aanbiedingen voor deze combinatie, of de aanbieding is afgelopen.</p><p id="near"></p><p><a href="/">Bekijk alle koffie-aanbiedingen</a></p><script>const K=${JSON.stringify(known)};let p=location.pathname.replace(/\\/+$/,"").split("/").filter(Boolean);while(p.length){const u="/"+p.join("/")+"/";if(K.includes(u)){document.getElementById("near").innerHTML='Misschien zoek je <a href="'+u+'">een bredere pagina</a>.';break}p.pop()}</script></body></html>`);
console.log(`Pagina's gebouwd: ${pages.size} (in sitemap: ${sitemap.length}), aanbiedingen: ${deals.length}`);
