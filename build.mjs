// Bouwt elke nacht de hele site: startpagina + een pagina per soort, merk, systeem, supermarkt en combinatie.
// Gebruik: node build.mjs [uitmap]   (leest deals.json en index.html, schrijft sitemap.xml en alle pagina's)
import fs from "node:fs";
import path from "node:path";
import { BF_ON, BF_URL, bfHomeLink, writeBlackFriday } from "./black-friday.mjs";
import { feedbackInject } from "./feedback.mjs";
import { INFO_ON, INFO_URLS, footerLinks, writeInfoPages } from "./extra-paginas.mjs"; // Over ons, Contact, Privacy, Hoe verdienen we geld (site-gegevens.json)
import { G, footerStatic, homeFaqExtra, SITE_DESC, MK_URL, mkLinkItem, mkIndexable, writeMeerkoop } from "./groei.mjs";
import { NU, isCombo, nudgeInject } from "./nudge.mjs"; // nudging (nudge.json). Uit = site ongewijzigd.
import { BN, VINDBAAR, brandNote, autoShopHead } from "./bijna.mjs"; // bijna op pagina 1 (bijna.json). Uit = site ongewijzigd.
import { ZT, HEAD_TERMS, headOf as headOf0 } from "./zoektermen.mjs"; // grote zoektermen (zoektermen.json). Uit = site ongewijzigd.
import { gemakInject, writeManifest } from "./gemak.mjs";
import { KM_URLS, KM_SLUG, kmInject, kmBack, kmBlackFriday, writeKoffiemachines } from "./koffiemachines.mjs"; // koffiemachines (koffiemachines.json + coolblue.json). Uit = site ongewijzigd.
import { DC, DC_URL, DC_SLUG, markDecaf, decafTag, decafInject, decafPage, decafLink } from "./cafeinevrij.mjs"; // cafeïnevrije koffie (cafeinevrij.json). Uit = site ongewijzigd. // favoriete supermarkt, beginscherm, delen (gemak.json). Uit = site ongewijzigd.
// Verbeteringen voor meer bezoekers (groeiplan): elk met een schakelaar in groei.json. Alles uit = site zoals daarvoor.
// Black Friday-pagina /black-friday-koffie/: aan/uit en instellingen in black-friday.json (zie black-friday.mjs).

const SITE = "https://koffieboonus.nl";
const OUT = process.argv[2] || "_site";
const raw = JSON.parse(fs.readFileSync("deals.json", "utf8"));
markDecaf(raw.deals); // cafeinevrij.json: herkent cafeïnevrije koffie aan de naam (decaf, decafé, cafeïnevrij ...)
let tpl = fs.readFileSync("index.html", "utf8");
tpl = gemakInject(tpl); // gemak.json: favoriete supermarkt, op beginscherm zetten, delen
tpl = nudgeInject(tpl); // nudge.json: labels onder de productnaam, eerste scherm op de telefoon, laatste dag
tpl = decafInject(tpl); // cafeinevrij.json: label 'Cafeïnevrij' en de pagina /cafeinevrije-koffie/
tpl = feedbackInject(tpl); // feedback.json: duimpjes + "Wat miste je?" + anonieme kliktelling. Uit = pagina's ongewijzigd.
tpl = tpl.replace("</div></footer>", () => footerLinks() + "</div></footer>"); // links naar de informatiepagina's onderaan elke pagina (alleen als ze bestaan)
tpl = kmInject(tpl); // koffiemachines.json: menu 'Koffie' / 'Koffiemachines' in de kop van elke pagina
if (ZT.paginas) tpl = tpl.replace("</style>", () => ".zt{margin:28px 0 0}.zt h2{font-size:20px;color:var(--title);margin:0 0 8px}.zt h3{font-size:16px;color:var(--title);margin:16px 0 4px}.zt p{margin:0 0 8px;max-width:70ch}.ztwrap{overflow-x:auto}.zttab{border-collapse:separate;border-spacing:0;width:100%;max-width:720px;background:var(--card);border:1px solid var(--line);border-radius:12px;font-size:15px}.zttab th,.zttab td{padding:8px 12px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}.zttab th:first-child{text-align:left;white-space:normal}.zttab thead th{font-size:13px;color:var(--mute);font-weight:600}.zttab tbody tr:last-child th,.zttab tbody tr:last-child td{border-bottom:0}.zttab a{color:var(--ink);font-weight:600}@media (max-width:480px){.zttab th,.zttab td{padding:8px 7px}.zttab thead th{white-space:normal}}</style>");
if (NU.goedkoopste) tpl = tpl.replace("</style>", () => ".hublist{margin:8px 0 0;padding-left:20px}.hublist li{margin:2px 0}.hublist a{color:var(--ink);font-weight:600}.hubsec{scroll-margin-top:12px}</style>");
if (BN.systemen || BN.vindbaar) tpl = tpl.replace("</style>", () => ".sysline{margin:10px 0 0;max-width:70ch}.sysline a{color:var(--ink);font-weight:600}.hubsec.nxt{margin-top:24px}</style>");
const today = new Date().toISOString().slice(0, 10);
const updated = (raw.updated || today).slice(0, 10);
const deals = raw.deals.filter(d => (!d.end || d.end >= today) && !(d.next && d.from > today));
const upcoming = BN.vindbaar ? raw.deals.filter(d => d.next && d.from > today) : []; // bijna.json "vindbaar": aanbiedingen van volgende week op een lege pagina

// ---------- vaste lijsten ----------
const SHOPS = ["Albert Heijn", "Jumbo", "PLUS", "Dirk", "DekaMarkt", "Hoogvliet", "Poiesz", "Vomar", "Aldi", "Lidl", "Coop", "Ekoplaza", "Nettorama", "SPAR", "Dagwinkel", "Boon's Markt", "MCD"];
// bijna.json "winkels": elke supermarktpagina krijgt de opzet van /jumbo/ en /albert-heijn/
const headOf = p => headOf0(p) || (BN.winkels && ZT.paginas && p.shop && Object.keys(p).length === 1 && SHOPS.includes(p.shop) ? autoShopHead(p.shop) : null);
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
const cap = s => /^ij/i.test(s) ? "IJ" + s.slice(2) : s.charAt(0).toUpperCase() + s.slice(1);
const low = s => s.charAt(0).toLowerCase() + s.slice(1);
const nl = n => String(n);
const dateNL = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const js = v => JSON.stringify(v).replace(/</g, "\\u003c"); // JSON veilig binnen <script>
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
tpl = footerStatic(tpl, dateNL(updated)); // groei.json "voetregel": datum en bronvermelding direct in de HTML
// Merknaam gelijk aan de vaste lijst, ongeacht hoofdletters (sync.mjs levert "illy", de lijst en de filters op de site gebruiken "Illy").
// Zonder dit kreeg "illy" geen eigen adres en overschreef de pagina de startpagina. De filters in index.html doen hetzelfde (canon/bkey).
// Ook andere merken met twee schrijfwijzen ("Cafe Nova"/"Café Nova") worden één merk: de vaste lijst, anders de meest gebruikte schrijfwijze met een hoofdletter.
{ const bk = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""), cn = new Map(MAIN_BRANDS.map(b => [bk(b), b]));
  const cnt = {}; deals.forEach(d => { if (d.brand && !cn.has(bk(d.brand))) { const k = bk(d.brand); (cnt[k] = cnt[k] || {})[d.brand] = (cnt[k][d.brand] || 0) + 1; } });
  for (const [k, v] of Object.entries(cnt)) { const e = Object.entries(v).sort((a, b) => b[1] - a[1]); cn.set(k, (e.find(([n]) => n !== n.toLowerCase()) || e[0])[0]); }
  deals.forEach(d => { if (d.brand && cn.has(bk(d.brand))) d.brand = cn.get(bk(d.brand)); }); }

// ---------- waardes en slugs (zonder botsingen) ----------
const brandCount = {};
deals.forEach(d => { if (d.brand) brandCount[d.brand] = (brandCount[d.brand] || 0) + 1; });
const BRANDS = [...MAIN_BRANDS, ...Object.keys(brandCount).filter(b => !MAIN_BRANDS.includes(b) && b !== "Overig" && brandCount[b] >= MIN_BRAND_DEALS).sort()]
  .filter(b => b !== "Senseo"); // Senseo is een systeem-pagina (/senseo/)
const taken = new Map(); // slug -> dim
const dict = { brand: new Map(), sys: new Map(), type: new Map(), shop: new Map() };
// Vaste adressen van de site zelf ("Goedkoopste ..."-pagina's, Black Friday): die mag een merk nooit innemen.
const RESERVED = s => /^goedkoopste-/.test(s) || ["black-friday-koffie", "koffie-1-plus-1-gratis", "go", "over", "contact", "privacy", "hoe-verdienen-we-geld", DC_SLUG].includes(s) || s === KM_SLUG;
function reg(dim, values, slugFn = slug) {
  for (const v of values) {
    const s = slugFn(v);
    if (!s || taken.has(s) || RESERVED(s)) { console.warn(`Slug-botsing overgeslagen: ${dim} ${v} -> ${s}`); continue; }
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
  // Waarde zonder slug (bijv. na een slug-botsing): geen pagina maken, anders zou hij een andere pagina (zelfs de startpagina) overschrijven.
  if ((p.brand && !slugOf("brand", p.brand)) || (p.sys && !slugOf("sys", p.sys)) || (p.type && !slugOf("type", p.type)) || (p.shop && !slugOf("shop", p.shop))) return;
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

// ---------- vaste adressen: een pagina die ooit bestond, blijft (tijdelijk) bestaan ----------
// Zo krijgt niemand (ook Google niet) een 404 als de aanbiedingen voor een merk of combinatie tijdelijk op zijn.
// Zonder genoeg aanbiedingen: melding + alternatieven, "noindex" en niet in de sitemap.
// Na KEEP_DAYS dagen zonder aanbieding verdwijnt de pagina alsnog (dan is het geen tijdelijk gat meer).
// Het geheugen: vaste-paginas.json (in de repo) plus /paginas.json van de live site (wat de vorige build publiceerde).
// /paginas.json onthoudt per pagina ook wanneer de inhoud voor het laatst veranderde (voor de sitemap en IndexNow).
const KEEP_DAYS = 90;
const KNOWN_PAGES = {}; // url -> {p, seen, h, mod}
const norm = v => v && typeof v === "object" && v.p !== undefined ? v : { p: v };
try { for (const [u, v] of Object.entries(JSON.parse(fs.readFileSync("vaste-paginas.json", "utf8")))) KNOWN_PAGES[u] = norm(v); } catch { console.warn("vaste-paginas.json niet gevonden"); }
let memoryOk = false;
for (let i = 1; i <= 3 && !memoryOk; i++) {
  try {
    const r = await fetch(process.env.KB_MEMORY_URL || SITE + "/paginas.json", { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "koffieboonus-build" } });
    if (r.status === 404) { console.log("Nog geen /paginas.json op de live site (eerste keer)."); memoryOk = true; break; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    for (const [u, v] of Object.entries(await r.json())) KNOWN_PAGES[u] = { ...(KNOWN_PAGES[u] || {}), ...norm(v) };
    memoryOk = true;
  } catch (e) {
    if (i === 3) { const msg = `Geheugen (/paginas.json) niet opgehaald na 3 pogingen (${e.message}); alleen vaste-paginas.json gebruikt.`; console.warn(msg); if (process.env.GITHUB_ACTIONS) { console.log("::error title=Vaste adressen::" + msg + " Build gestopt, de huidige site blijft staan."); process.exit(1); } }
    else await new Promise(r => setTimeout(r, 3000 * i));
  }
}
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
let keptN = 0, expiredN = 0;
for (const [u, k] of Object.entries(KNOWN_PAGES)) {
  const p0 = k.p;
  if (pages.has(u) || !p0 || typeof p0 !== "object") continue;
  const p = {};
  for (const key of ["brand", "sys", "type", "shop"]) if (typeof p0[key] === "string" && p0[key]) p[key] = p0[key];
  if (!Object.keys(p).length) continue;
  if (p.brand && !slugOf("brand", p.brand)) { const s = slug(p.brand); if (s && !taken.has(s) && !RESERVED(s)) { taken.set(s, "brand"); dict.brand.set(s, p.brand); } }
  if (urlOf(p) !== u) { console.warn(`Vast adres overgeslagen (klopt niet meer): ${u}`); continue; }
  const list = dealsFor(p);
  if (!list.length && k.seen && daysBetween(k.seen, updated) > KEEP_DAYS) { expiredN++; continue; }
  pages.set(u, { p, list, indexable: false, kept: true, t: k.t });
  keptN++;
}

// bijna.json "vindbaar": pagina's waar mensen aantoonbaar op zoeken blijven in Google staan, ook als er even geen (of maar één) aanbieding is.
// Bestaat zo'n pagina nog niet (ook niet in het geheugen), dan maken we hem: zo komt een verdwenen pagina terug.
for (const u of VINDBAAR) {
  let pg = pages.get(u);
  if (!pg) {
    const parts = u.split("/").filter(Boolean), p = {};
    let ok = parts.length > 0;
    for (const s of parts) { const dim = taken.get(s); if (!dim || p[dim] || (dim === "brand" && p.sys) || (dim === "sys" && p.brand)) { ok = false; break; } p[dim] = dict[dim].get(s); }
    if (!ok || urlOf(p) !== u) { console.warn(`Vindbare pagina overgeslagen (adres onbekend): ${u}`); continue; }
    pg = { p, list: dealsFor(p), indexable: false, kept: true }; pages.set(u, pg);
  }
  if (!pg.indexable) { pg.indexable = true; pg.vind = true; }
}

// Alternatieven voor een pagina zonder aanbiedingen: steeds één onderdeel weglaten (eerst de supermarkt, dan het merk/systeem, dan de soort).
function alternativesOf(p, hintType) {
  const tries = [];
  const drop = (...ks) => { const q = { ...p }; ks.forEach(k => delete q[k]); return q; };
  if (p.shop) tries.push(drop("shop"));
  // Merk of systeem zonder soort: eerst dezelfde soort koffie die dit merk meestal had (bijv. Lavazza -> koffiebonen)
  if (!p.type && hintType && TYPES.includes(hintType)) { tries.push({ ...drop("brand", "sys"), type: hintType }); if (p.shop) tries.push({ type: hintType }); }
  if (p.brand || p.sys) tries.push(drop("brand", "sys"));
  if (p.type && (p.brand || p.sys)) tries.push(drop("type"));
  if (p.shop && (p.brand || p.sys || p.type)) tries.push(drop("brand", "sys", "type"));
  tries.push({});
  const seen = new Set();
  for (const q of tries) {
    const u = urlOf(q); if (seen.has(u) || u === urlOf(p)) continue; seen.add(u);
    const list = dealsFor(q);
    if (list.length) return { q, u, list };
  }
  return null;
}

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
  const ranked = list.filter(d => d.pp != null && d.pu === c.unit && !isCombo(d)).sort((a, b) => a.pp - b.pp || b.pct - a.pct);
  cheapPages.set(`/${c.slug}/`, { c, list, ranked, indexable: ranked.length >= MIN_CHEAP });
}
// Overzichtspagina "Goedkoopste koffie": per soort de 3 goedkoopste, met links naar de volledige lijsten.
const HUB_URL = "/goedkoopste-koffie/";
const hubSections = ["goedkoopste-koffiebonen", "goedkoopste-gemalen-koffie", "goedkoopste-koffiecups", "goedkoopste-koffiepads"].map(s => cheapPages.get(`/${s}/`)).filter(g => g && g.ranked.length);
const hubIndexable = hubSections.filter(g => g.indexable).length >= 2;
const cheapLinks = p => {
  const home = !Object.keys(p).length;
  const single = Object.keys(p).length === 1 && (p.brand || p.shop); // groei.json "links": ook op pagina's per merk en per supermarkt
  const match_ = g => home || (p.type && !p.sys && !p.brand && !p.shop && g.c.f.type === p.type && !g.c.f.sys) || (p.sys && !p.brand && !p.shop && !p.type && g.c.f.sys === p.sys) || (G.links && single && !g.c.f.sys);
  const li = [...cheapPages].filter(([, g]) => g.indexable && match_(g)).map(([u, g]) => `<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a> <span class="meta">(per ${g.c.unit})</span></li>`);
  if ((home || (G.links && single)) && hubIndexable) li.unshift(`<li><a href="${HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  const mk = home || (p.type && Object.keys(p).length === 1) ? mkLinkItem(deals) : ""; // groei.json "meerkoop"
  return (li.length ? `<div class="grp"><h3>Goedkoopste</h3><ul class="links">${li.join("")}</ul></div>` : "") + (mk ? `<div class="grp"><h3>Acties</h3><ul class="links">${mk}</ul></div>` : "");
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

// Meerkoop (1+1, 2+1, 2e halve prijs, "3 voor €10"): toon wat je betaalt voor q stuks.
function multiOf(d) {
  const r = parseFloat(String(d.reg).replace("€", "").replace(",", ".")); let m;
  if (!(r > 0)) return null;
  if (/^1\+1 gratis/.test(d.deal)) return { q: 2, t: r, r };
  if (/^2\+1 gratis/.test(d.deal)) return { q: 3, t: r * 2, r };
  if (/^2e halve prijs/.test(d.deal)) return { q: 2, t: r * 1.5, r };
  if ((m = d.deal.match(/^(\d+) voor €([\d,]+)/))) return { q: +m[1], t: parseFloat(m[2].replace(",", ".")), r };
  return null;
}
const tagS = (d, o = {}) => decafTag(d, o) + (d.vertuo ? ` <span class="tag">Alleen voor Vertuo</span>` : d.compat && d.sys ? ` <span class="tag">Past in ${esc(d.sys)}</span>` : "");
function listHtml(list, o = {}) {
  const sorted = [...list].sort(o.sort || ((a, b) => b.pct - a.pct)).slice(0, o.limit || 80);
  const nowS = d => (d.deal.match(/€[\d,]+/) || [""])[0];
  const SHOPCOL = {"Albert Heijn":"#00ADE6","Jumbo":"#FFC900","Dirk":"#E2001A","PLUS":"#00A651","Aldi":"#2F5BD0","Lidl":"#0050AA","Coop":"#E30613","SPAR":"#009640","Ekoplaza":"#7AB800","Hoogvliet":"#00ACE7","DekaMarkt":"#E30613","Poiesz":"#3DA643","Vomar":"#E20613","Nettorama":"#FFD700","Dagwinkel":"#FF6600","Boon's Markt":"#C8102E","MCD":"#D32F2F","boni":"#E30613","Boni":"#E30613"};
  const chip = s => `<span class="sdot"${SHOPCOL[s] ? ` style="--c:${SHOPCOL[s]}"` : ""}></span>${esc(s)}`;
  return sorted.map((d, i) => {
    const priceType = !d.nodisc && !d.noprice && /^Nu voor/.test(d.deal);
    const mm = multiOf(d);
    const price = d.noprice || d.nodisc ? "" : mm ? `<div class="pnow mk">${mm.q} voor ${eur(mm.t)} <s class="reg">${eur(mm.q * mm.r)}</s></div>` : priceType ? `<div class="pnow">${esc(nowS(d))} <s class="reg">${esc(d.reg)}</s></div>` : `<span class="reg">${esc(d.reg)}</span>`;
    const badge = d.noprice ? d.deal : d.nodisc ? d.deal.replace(/^Nu voor/, "Actieprijs") : priceType ? `${d.pct}% korting` : mech(d);
    const note = d.noprice ? `<div class="meta sub">Prijs onbekend, check de winkel</div>` : d.nodisc ? `<div class="meta sub">Normale prijs onbekend</div>` : "";
    return `<div class="row" data-k="${esc(d.id + "~" + d.shop)}"><div class="name">${o.rank ? `<span class="rk">${i + 1}.</span> ` : ""}${esc(d.name)}<div class="meta bt">${esc(d.brand)} · ${esc(d.type)}</div>${NU.label && tagS(d, o) ? `<div class="tags">${tagS(d, o)}</div>` : ""}</div><div class="who"><div class="shop">${chip(d.shop)}<span class="wd"> · ${esc(d.until)}</span>${NU.label ? "" : tagS(d, o)}</div></div><div class="act"><span class="deal">${esc(badge)}</span><div class="meta">${esc(d.until)}</div></div><div class="pr">${price}${d.pp!=null?`<div class="meta ppu">${eur(d.pp)} per ${d.pu}</div>`:""}${note}</div>${d.url ? `<div class="gocell"><a class="go" href="${esc(d.url)}" target="_blank" rel="sponsored nofollow noopener" aria-label="Bekijk bij ${esc(d.shop)}">Bekijk<span class="gs"> bij ${esc(d.shop)}</span> ›</a></div>` : `<div class="gocell"></div>`}</div>`;
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
    const kiloShop = BN.vragen && u === "kilo" && p.shop && Object.keys(p).length === 1; // bijna.json "vragen": zo vragen mensen het ("wat kost de koffie bij nettorama")
    if (kiloShop) arr.splice(0, arr.length, ...arr.filter(d => d.type === "Bonen" || d.type === "Gemalen koffie")); // "een kilo koffie" = bonen of gemalen, geen oploskoffie
    if (arr.length < (kiloShop ? 1 : 2)) continue;
    const lo = arr.reduce((m, d) => d.pp < m.pp ? d : m);
    const word = u === "kilo" ? "kilo" : u;
    if (kiloShop) { ppFaq.push([`Wat kost een kilo koffie bij ${p.shop} deze week?`, `In de aanbieding vanaf ${eur(lo.pp)} per kilo: ${nameOf(lo)} (${mech(lo)}, ${lo.until}). Dat is de laagste prijs per kilo van de koffie die op ${dateNL(updated)} bij ${p.shop} in de aanbieding is. De prijs is berekend uit de verpakkingsgrootte; controleer hem altijd bij de winkel.`]); continue; }
    ppFaq.push([`Wat is nu de laagste prijs per ${word} voor ${sl}?`, `Op ${dateNL(updated)} is dat ${eur(lo.pp)} per ${word}: ${nameOf(lo)} bij ${lo.shop} (${mech(lo)}, ${lo.until}). De prijs is berekend uit de verpakkingsgrootte; controleer hem altijd bij de winkel.`]);
  }
  if (BN.vragen && n && p.shop && Object.keys(p).length === 1) { // bijna.json "vragen": "jumbo koffie 1+1 gratis"
    const k11 = list.filter(d => /^1\+1 gratis/.test(d.deal)), other = list.filter(d => /^(2\+1 gratis|2e halve prijs|\d+ voor €)/.test(d.deal)).length;
    const names = [...new Set(k11.map(nameOf))].slice(0, 3);
    ppFaq.unshift([`Is er deze week koffie 1+1 gratis bij ${p.shop}?`, k11.length
      ? `Ja. Op ${dateNL(updated)} ${k11.length === 1 ? "is er 1 aanbieding" : `zijn er ${k11.length} aanbiedingen`} met 1+1 gratis bij ${p.shop}${names.length ? `, onder andere ${names.join(", ")}` : ""}. Je betaalt dan voor twee pakken de prijs van één.`
      : `Nee, op ${dateNL(updated)} niet.${other ? ` Wel ${other === 1 ? "is er 1 andere actie" : `zijn er ${other} andere acties`} waarbij je meer pakken tegelijk koopt, zoals 2+1 gratis of 2e halve prijs.` : ""} Op de pagina ‘Koffie 1+1 gratis en 2e halve prijs’ staan de acties van alle supermarkten.`]);
  }
  return [
    [p.shop ? `Wat is er nu bij ${p.shop} in de aanbieding${Object.keys(p).length > 1 ? ` voor ${sl.replace(` bij ${p.shop}`, "")}` : ""}?` : `Waar vind je nu ${sl} in de aanbieding?`, a1],
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
  if (!Object.keys(p).length || (p.type && Object.keys(p).length === 1 && ["Bonen", "Gemalen koffie", "Cups", "Pads"].includes(p.type))) { const dl = decafLink(deals); if (dl) groups.splice(cg ? 1 : 0, 0, dl); } // cafeinevrij.json "link": direct na Goedkoopste/Acties
  { const pop = ztPopular(url, p); if (pop) groups.push(pop); } // zoektermen.json "populair"
  if (!Object.keys(p).length || (G.links && p.type && Object.keys(p).length === 1)) { const bf = bfHomeLink(); if (bf) groups.unshift(bf); } // alleen op de startpagina, kort voor en tijdens Black Friday
  return groups.length ? `<section class="more"><h2>Ook bekijken</h2>${groups.join("")}</section>` : "";
}

// ---------- grote zoektermen (zoektermen.json) ----------
// "Populair": links met de zoekterm als linktekst naar de pagina's voor de grote zoektermen (niet naar de pagina zelf).
// Alleen op de startpagina, de 8 zoektermpagina's zelf, de pagina's per supermarkt en de speciale pagina's (Goedkoopste, Black Friday).
// Niet op de ±190 combinatiepagina's (bijv. /lavazza/koffiebonen/jumbo/): daar is het te veel en voegt het weinig toe.
function ztPopular(url, p) {
  if (!ZT.populair) return "";
  if (p && Object.keys(p).length && !headOf(p) && !(p.shop && Object.keys(p).length === 1)) return "";
  const li = HEAD_TERMS.map(h => { const u = urlOf(h.p), pg = pages.get(u); return u !== url && pg && pg.indexable && pg.list.length ? `<li><a href="${u}">${esc(h.term)}</a></li>` : ""; }).filter(Boolean);
  return li.length ? `<div class="grp"><h3>Populair</h3><ul class="links">${li.join("")}</ul></div>` : "";
}
// Overzicht per supermarkt + korte uitleg, alleen op de pagina's voor de grote zoektermen.
function ztBlocks(p, list) {
  const h = ZT.paginas ? headOf(p) : null;
  if (!h || !list.length) return "";
  if (h.by === "type") return ztByType(h, p, list);
  const rows = counts(list, "shop").map(([s, c]) => {
    const ls = list.filter(d => d.shop === s), disc = ls.filter(d => !d.nodisc && d.pct > 0);
    const max = disc.length ? Math.max(...disc.map(d => d.pct)) : 0;
    const pp = h.unit ? ls.filter(d => d.pp != null && d.pu === h.unit).map(d => d.pp) : [];
    const u = urlOf({ ...p, shop: s }), pg = pages.get(u);
    const name = pg && pg.indexable && pg.list.length ? `<a href="${u}">${esc(s)}</a>` : esc(s);
    return `<tr><th scope="row">${name}</th><td>${c}</td><td>${max ? max + "%" : "–"}</td>${h.unit ? `<td>${pp.length ? eur(Math.min(...pp)) : "–"}</td>` : ""}</tr>`;
  });
  const table = `<section class="zt"${NU.sprong ? ' id="overzicht"' : ""}><h2>${esc(h.term)} per supermarkt</h2><p>Op ${dateNL(updated)} zijn er aanbiedingen bij ${plural(rows.length, "supermarkt", "supermarkten")}. Klik op een supermarkt voor alle aanbiedingen daar.</p><div class="ztwrap"><table class="zttab"><thead><tr><th scope="col">Supermarkt</th><th scope="col">Aanbiedingen</th><th scope="col">Hoogste korting</th>${h.unit ? `<th scope="col">Laagste prijs per ${h.unit}</th>` : ""}</tr></thead><tbody>${rows.join("")}</tbody></table></div></section>`;
  const gids = `<section class="zt"><h2>Waar let je op bij ${esc(sentLabel(p))} in de aanbieding?</h2>${h.gids.map(([t, x]) => `<h3>${esc(t)}</h3><p>${esc(x)}</p>`).join("")}</section>`;
  return table + gids;
}

// Supermarktpagina's: overzicht per soort koffie (de supermarkt staat al vast).
const UNIT_OF_TYPE = { "Bonen": "kilo", "Gemalen koffie": "kilo", "Pads": "pad", "Cups": "cup" };
function ztByType(h, p, list) {
  const rows = TYPES.map(t => [t, list.filter(d => d.type === t)]).filter(([, ls]) => ls.length).map(([t, ls]) => {
    const disc = ls.filter(d => !d.nodisc && d.pct > 0), max = disc.length ? Math.max(...disc.map(d => d.pct)) : 0;
    const unit = UNIT_OF_TYPE[t], pp = unit ? ls.filter(d => d.pp != null && d.pu === unit).map(d => d.pp) : [];
    const u = urlOf({ ...p, type: t }), pg = pages.get(u), lab = cap(low(labelOf({ type: t })));
    const name = pg && pg.indexable && pg.list.length ? `<a href="${u}">${esc(lab)}</a>` : esc(lab);
    return `<tr><th scope="row">${name}</th><td>${ls.length}</td><td>${max ? max + "%" : "–"}</td><td>${pp.length ? `${eur(Math.min(...pp))}/${unit}` : "–"}</td></tr>`;
  });
  if (!rows.length) return "";
  const k11 = BN.vragen ? list.filter(d => /^1\+1 gratis/.test(d.deal)).length : 0;
  const mkTxt = k11 ? ` ${k11 === 1 ? "Eén daarvan is" : `${k11} daarvan zijn`} 1+1 gratis${G.meerkoop && mkIndexable(deals) ? ` (<a href="${MK_URL}">alle 1+1-acties</a>)` : ""}.` : "";
  let gidsList = h.gids;
  if (h.auto) { const un = counts(list.filter(d => d.until), "until")[0]; if (un) gidsList = [["Tot wanneer lopen de aanbiedingen?", `De meeste aanbiedingen bij ${p.shop} lopen nu ${un[0]}. Onder ‘Volgende week’ zie je de nieuwe aanbiedingen zodra ze bekend zijn.`], ...h.gids]; }
  const table = `<section class="zt"${NU.sprong ? ' id="overzicht"' : ""}><h2>${esc(h.term)} per soort</h2><p>Op ${dateNL(updated)} heeft ${esc(p.shop)} ${plural(list.length, "koffieaanbieding", "koffieaanbiedingen")}.${mkTxt} Klik op een soort voor alle aanbiedingen daarvan.</p><div class="ztwrap"><table class="zttab"><thead><tr><th scope="col">Soort</th><th scope="col">Aantal</th><th scope="col">Max. korting</th><th scope="col">Laagste prijs</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></section>`;
  const gids = `<section class="zt"><h2>Waar let je op bij koffie in de aanbieding bij ${esc(p.shop)}?</h2>${gidsList.map(([t, x]) => `<h3>${esc(t)}</h3><p>${esc(x)}</p>`).join("")}</section>`;
  return table + gids;
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

function render(url, pg) {
  const { p, list, indexable } = pg;
  const n = list.length, home = url === "/";
  const sl = sentLabel(p), Label = labelOf(p);
  const disc = list.filter(d => !d.nodisc);
  const max = disc.length ? Math.max(...disc.map(d => d.pct)) : 0;
  const top = disc.length ? disc.find(d => d.pct === max) : null;
  const shopsN = new Set(list.map(d => d.shop)).size;
  let title, h1, desc, intro;
  if (home) {
    title = G.titels ? "Koffie aanbieding deze week: alle supermarkten | Koffieboonus" : "Koffie in de aanbieding: alle supermarkten op één plek | Koffieboonus";
    h1 = "Koffie in de aanbieding bij alle supermarkten";
    desc = `Nu ${n} koffie-aanbiedingen bij Nederlandse supermarkten${max ? `, tot ${max}% korting` : ""}. Filter op supermarkt, merk en soort koffie. Dagelijks bijgewerkt.`;
    if (G.titels) desc = `Welke koffie is deze week in de aanbieding of in de bonus? Nu ${n} aanbiedingen bij ${shopsN} supermarkten${max ? `, tot ${max}% korting` : ""}, met prijs per kilo, cup en pad.`;
  } else {
    title = n ? `${Label} aanbieding: ${n} deals nu | Koffieboonus` : `${Label} aanbieding | Koffieboonus`;
    if (title.length > 62) title = `${Label} aanbieding | Koffieboonus`;
    if (G.titels) {
      // "Koffie aanbieding Albert Heijn" (zo zoeken mensen) in plaats van "Koffie bij Albert Heijn aanbieding"
      const t = p.shop ? `${labelOf({ ...p, shop: undefined })} aanbieding ${p.shop}` : `${Label} aanbieding`;
      title = n ? `${t}: ${n} ${n === 1 ? "deal" : "deals"} nu | Koffieboonus` : `${t} | Koffieboonus`;
      if (title.length > 62) title = `${t} | Koffieboonus`;
    }
    if (G.dealtitels && n && top && max >= 10) {
      // De beste deal van dat moment in de titel: valt op in Google en wisselt mee met elke folderwissel.
      const t = p.shop ? `${labelOf({ ...p, shop: undefined })} aanbieding ${p.shop}` : `${Label} aanbieding`;
      // Volgorde van voorkeur: zoekwoord + korting + merk; past dat niet, dan zoekwoord + korting (Google toont de sitenaam zelf al);
      // daarna zoekwoord + aantal deals; als laatste alleen het zoekwoord. Het zoekwoord staat altijd vooraan.
      const A = `${t}: tot ${max}% korting | Koffieboonus`;
      const A2 = `${t}: tot ${max}% korting`;
      const B = `${t}: ${n} ${n === 1 ? "deal" : "deals"} nu | Koffieboonus`;
      title = A.length <= 62 ? A : A2.length <= 58 ? A2 : B.length <= 62 ? B : `${t} | Koffieboonus`;
    }
    h1 = `${Label} in de aanbieding`;
    { const h = ZT.paginas ? headOf(p) : null; if (h && n) h1 = `${h.term} deze week`; } // zoektermen.json "paginas"
    desc = n
      ? `Nu ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl}${p.shop ? "" : ` bij ${plural(shopsN, "supermarkt", "supermarkten")}`}${max ? `, tot ${max}% korting` : ""}. Dagelijks bijgewerkt op Koffieboonus.`
      : `Op dit moment is er geen aanbieding voor ${sl}. Bekijk alle koffie-aanbiedingen van Nederlandse supermarkten op Koffieboonus.`;
    if (G.titels && n) {
      const units = [...new Set(list.filter(d => d.pp != null).map(d => d.pu))].slice(0, 2);
      const shopTxt = p.shop ? (p.shop === "Albert Heijn" ? " (AH Bonus en andere acties)" : "") : ` bij ${plural(shopsN, "supermarkt", "supermarkten")}`;
      const what = p.type === "Cups" ? sl.replace("koffiecups", "koffiecups (capsules)") : sl;
      desc = `${cap(what)} in de aanbieding: nu ${plural(n, "aanbieding", "aanbiedingen")}${shopTxt}${max ? `, tot ${max}% korting` : ""}.${units.length ? ` Met prijs per ${units.join(" en ")}.` : ""} Elke nacht bijgewerkt.`;
      if (G.dealtitels && top && max >= 10) {
        // Beste deal concreet noemen (product, winkel, korting, einddatum); past het niet in ±155 tekens, dan vallen onderdelen af.
        const nm = nameOf(top).length > 46 ? nameOf(top).slice(0, 46).replace(/\s+\S*$/, "").replace(/(\s+\d+([.,]\d+)?)+$/, "") : nameOf(top); // kort af bij een woord, zonder losse getallen aan het eind
        const best = `Beste deal: ${nm}${p.shop ? "" : ` bij ${top.shop}`}, ${mech(top)}${top.until ? ` (${top.until})` : ""}.`;
        const count = ` Nu ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl}${shopTxt}.`;
        const unitTxt = units.length ? ` Met prijs per ${units.join(" en ")}.` : "";
        const lead = `${cap(what)} in de aanbieding.`;
        desc = [lead + " " + best + count + unitTxt, lead + " " + best + count, lead + " " + best, best].find(x => x.length <= 158) || desc;
      }
    }
  }
  if (n) {
    intro = home
      ? `Op ${dateNL(updated)} zijn er ${n} koffie-aanbiedingen bij ${shopsN} supermarkten. Kies hieronder je supermarkt, merk of soort koffie, of bekijk de goedkoopste koffiebonen, cups en pads.`
      : `Op ${dateNL(updated)} ${n === 1 ? "is" : "zijn"} er ${plural(n, "aanbieding", "aanbiedingen")} voor ${sl}${p.shop ? "" : ` bij ${plural(shopsN, "supermarkt", "supermarkten")}`}.${top ? ` De grootste korting is ${max}%: ${nameOf(top)}${p.shop ? "" : ` bij ${top.shop}`}.` : ""}${NU.eerstescherm ? "" : " Hieronder staan alle aanbiedingen, de filters kun je zelf aanpassen."}`;
  } else intro = `Op ${dateNL(updated)} is er geen aanbieding voor ${sl}. Zodra er weer een is, staat die hier. Bekijk intussen de andere aanbiedingen.`;
  // bijna.json "vindbaar": eerlijk antwoord op een lege pagina + de aanbiedingen van volgende week
  const nxt = pg.vind && !n ? upcoming.filter(d => match(d, p)) : [];
  if (pg.vind && !n) intro = nxt.length
    ? `Op ${dateNL(updated)} is er geen aanbieding voor ${sl}. Die komt er wel: ${nxt[0].fromTxt || "binnenkort"} ${nxt.length === 1 ? "is er 1 aanbieding" : `zijn er ${nxt.length} aanbiedingen`}. Hieronder staan ze, met daaronder wat er nu wel in de aanbieding is.`
    : `Op ${dateNL(updated)} is er geen aanbieding voor ${sl}. Hieronder staat wat er nu wel in de aanbieding is. Deze pagina wordt elke nacht bijgewerkt: zodra er weer een aanbieding is, staat die hier.`;
  { const note = brandNote(p); if (note) intro += " " + note; } // bijna.json "merknotities"

  const canon = SITE + url;
  const faq = faqOf(p, list);
  if (home) faq.unshift(...homeFaqExtra(deals).filter(([q]) => !(INFO_ON && q === "Wie zit er achter Koffieboonus?"))); // groei.json "uitleg"; "Wie zit er achter" staat op /over/ zodra die bestaat
  const trail = crumbs(p);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  if (home) ld.push(G.uitleg ? { "@context": "https://schema.org", "@type": "WebSite", name: "Koffieboonus", url: SITE + "/", description: SITE_DESC, inLanguage: "nl-NL" } : { "@context": "https://schema.org", "@type": "WebSite", name: "Koffieboonus", url: SITE + "/" });
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
  let extra = "";
  { const h = NU.sprong && ZT.paginas && n ? headOf(p) : null; if (h) extra += `<p class="jump"><a href="#overzicht">${h.by === "type" ? "Overzicht per soort" : "Overzicht per supermarkt"} ↓</a></p>`; } // nudge.json "sprong"
  if (NU.nubij && n && p.brand && Object.keys(p).length === 1 && !headOf(p)) { // nudge.json "nubij"
    const parts = counts(list, "shop").map(([s, c]) => { const u = urlOf({ ...p, shop: s }), pg2 = pages.get(u); return `${pg2 && pg2.indexable && pg2.list.length ? `<a href="${u}">${esc(s)}</a>` : esc(s)} (${c})`; });
    if (parts.length > 1) extra += `<p class="jump">Nu bij: ${parts.join(" · ")}</p>`;
  }
  const top_ = `<section class="pagehead">${crumbHtml}<h1>${esc(h1)}</h1><p class="intro">${home && n ? esc(intro).replace("goedkoopste koffiebonen, cups en pads", `<a href="${HUB_URL}">goedkoopste koffiebonen, cups en pads</a>`) : esc(intro)}</p>${extra}</section>`;
  let altHtml = "";
  if (!n) {
    const alt = alternativesOf(p, pg.t || KNOWN_PAGES[url]?.t || (p.sys ? { "Dolce Gusto": "Cups", Nespresso: "Cups", Senseo: "Pads", Tassimo: "Cups" }[p.sys] : null));
    if (alt) {
      const what = Object.keys(alt.q).length ? labelOf(alt.q) : "";
      const head2 = !what ? "Wel in de aanbieding: andere koffie" : p.shop && !alt.q.shop ? `Wel in de aanbieding: ${what} bij andere supermarkten` : `Wel in de aanbieding: ${(alt.q.brand || alt.q.sys) ? what : low(what)}`;
      altHtml = `<section class="hubsec alt"><h2>${esc(head2)}</h2>${listHtml(alt.list, { limit: 6 })}<p><a href="${alt.u}">${alt.u === "/" ? "Bekijk alle koffie-aanbiedingen" : `Bekijk alle ${alt.list.length} aanbiedingen voor ${esc(what ? ((alt.q.brand || alt.q.sys) ? what : low(what)) : "koffie")}`} ›</a></p></section>`;
    }
  }
  if (nxt.length) altHtml = `<section class="hubsec nxt"><h2>${esc(cap(nxt[0].fromTxt || "Volgende week"))}: ${esc((p.brand || p.sys) ? Label : low(Label))}</h2>${listHtml(nxt.map(d => ({ ...d, until: d.fromTxt || d.until })), { limit: 8 })}</section>` + altHtml;
  const bottom = kmBack(url, deals) + altHtml + ztBlocks(p, list) + relatedHtml(url, p) + `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const preset = { brand: p.brand ? [p.brand] : [], sys: p.sys ? [p.sys] : [], type: p.type ? [p.type] : [], shop: p.shop ? [p.shop] : [] };
  const presetJs = `<script>window.PRESET=${js(preset)};window.PLABEL=${home ? "null" : js(Label)};window.STATIC=${n ? "true" : "false"};</script>`;
  const body = n ? listHtml(list) : `<div class="empty"><strong>Nu geen aanbiedingen</strong> voor ${esc(sl)}.<br>Zodra er weer een is, staat die hier. Hieronder vind je vergelijkbare aanbiedingen.</div>`;
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
    [`Wat ${/(bonen|cups|pads)$/.test(c.word) ? "zijn" : "is"} nu de goedkoopste ${c.word}?`, n ? `Op ${dateNL(updated)} is dat ${nameOf(lo)} bij ${lo.shop}: ${eur(lo.pp)} per ${u} (${mech(lo)}, ${lo.until}). Controleer de prijs altijd bij de winkel.` : `Op dit moment is er geen aanbieding waarvan we de prijs per ${u} kunnen berekenen.`],
    ["Hoe vergelijken jullie de prijzen?", `We rekenen de aanbiedingsprijs om naar een prijs per ${u}, op basis van de verpakkingsgrootte in de productnaam. Alleen producten waarvan die grootte zeker is, doen mee.`],
    [`${/(bonen|cups|pads)$/.test(c.word) ? "Zijn dit ook de goedkoopste" : "Is dit ook de goedkoopste"} ${c.word} buiten de aanbieding?`, "Niet per se. We vergelijken alleen producten die nu in de aanbieding zijn. Een product met een lage vaste prijs staat hier alleen tussen als de winkel het als aanbieding aanmerkt."],
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
  // bijna.json "systemen": cups passen niet in elkaars machine, dus per machine de laagste prijs per cup
  let sysLine = "";
  if (BN.systemen && c.slug === "goedkoopste-koffiecups" && n) {
    const parts = SYSTEMS.map(sy => { const r = ranked.filter(d => d.sys === sy && !d.vertuo); if (!r.length) return ""; const g = [...cheapPages].find(([, x]) => x.c.f.sys === sy && x.c.f.type === "Cups"); const href = g && g[1].indexable ? g[0] : urlOf({ sys: sy }); return `<a href="${href}">${esc(sy)}</a> vanaf ${eur(r[0].pp)} per cup`; }).filter(Boolean);
    if (parts.length) sysLine = `<p class="sysline">Cups passen niet in elkaars machine. Per machine: ${parts.join(" · ")}.</p>`;
  }
  const top_ = `<section class="pagehead">${crumbHtml}<h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p>${sysLine}</section>`;
  // Ook bekijken: de gewone pagina, de andere "goedkoopste"-pagina's en de startpagina
  const items = [];
  const plain = pages.get(urlOf(c.f));
  if (plain && plain.list.length) items.push(`<li><a href="${urlOf(c.f)}">Alle ${esc(low(labelOf(c.f)))} in de aanbieding</a> <span class="meta">(${plain.list.length})</span></li>`);
  for (const [u2, g] of cheapPages) if (u2 !== url && g.indexable) items.push(`<li><a href="${u2}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  if (hubIndexable) items.push(`<li><a href="${HUB_URL}">Goedkoopste koffie: overzicht per soort</a></li>`);
  { const mk = mkLinkItem(deals); if (mk) items.push(mk); } // groei.json "meerkoop"
  items.push(`<li><a href="/">Alle koffie-aanbiedingen</a></li>`);
  const bfg = G.links ? bfHomeLink() : ""; // groei.json "links": Black Friday-link in november
  const more = `<section class="more"><h2>Ook bekijken</h2>${bfg}<div class="grp"><ul class="links">${items.join("")}</ul></div>${ztPopular(url)}</section>`;
  const bottom = more + `<section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const preset = { brand: [], sys: c.f.sys ? [c.f.sys] : [], type: c.f.type ? [c.f.type] : [], shop: [] };
  const presetJs = `<script>window.PRESET=${js(preset)};window.PLABEL=${js(`Goedkoopste ${c.word}`)};window.SORT="pp";window.STATIC=${list.length ? "true" : "false"};</script>`;
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
  const top_ = `<section class="pagehead"><nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">Goedkoopste koffie</span></nav><h1>${esc(h1)}</h1>${NU.goedkoopste
    ? `<p class="intro">De goedkoopste aanbiedingen van ${dateNL(updated)}, per soort koffie. We rekenen om naar een prijs per kilo of per stuk.</p><ul class="hublist">${hubSections.map(g => `<li><a href="#g-${g.c.slug}">${esc(cap(g.c.word))}</a>: vanaf ${eur(g.ranked[0].pp)} per ${g.c.unit} bij ${esc(g.ranked[0].shop)}</li>`).join("")}</ul>`
    : `<p class="intro">${esc(intro)}</p>`}</section>`;
  const body = hubSections.map(g => `<section class="hubsec"${NU.goedkoopste ? ` id="g-${g.c.slug}"` : ""}><h2>Goedkoopste ${esc(g.c.word)}</h2>${listHtml(g.ranked, { sort: byPP, limit: 3, rank: true })}<p><a href="/${g.c.slug}/">Bekijk alle goedkoopste ${esc(g.c.word)} ›</a></p></section>`).join("");
  const items = [...cheapPages].filter(([, g]) => g.indexable).map(([u, g]) => `<li><a href="${u}">Goedkoopste ${esc(g.c.word)}</a></li>`);
  { const mk = mkLinkItem(deals); if (mk) items.push(mk); } // groei.json "meerkoop"
  items.push(`<li><a href="/">Alle koffie-aanbiedingen</a></li>`);
  const bottom = `<section class="more"><h2>Ook bekijken</h2><div class="grp"><ul class="links">${items.join("")}</ul></div>${ztPopular(HUB_URL)}</section><section class="faq"><h2>Veelgestelde vragen</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const presetJs = `<script>window.PRESET=null;window.PLABEL=null;window.HUB=true;window.STATIC=true;</script>`;
  return tpl
    .replace("<body>", '<body class="hub">')
    .replace("{{HEAD}}", () => head)
    .replace("{{PRESETJS}}", () => presetJs)
    .replace("{{TOP}}", () => top_)
    .replace("{{LIST}}", () => body)
    .replace("{{BOTTOM}}", () => bottom);
}

// ---------- wat is er echt veranderd? (voor de sitemap-datum en IndexNow) ----------
const hashOf = list => { const t = list.map(d => [d.id, d.deal, d.pct, d.end, d.pp, d.shop].join("~")).sort().join("|"); let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 ^ t.charCodeAt(i)) >>> 0; return h.toString(36); };
const memo = {}; const changed = [];
function track(url, list, p, indexable) {
  const prev = KNOWN_PAGES[url] || {};
  const h = hashOf(list);
  const mod = prev.h === h && prev.mod ? prev.mod : updated;
  const seen = list.length ? updated : (prev.seen || updated);
  let t = prev.t;
  if (list.length) { const c = {}; list.forEach(d => { c[d.type] = (c[d.type] || 0) + 1; }); t = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; }
  memo[url] = { p: p ?? null, seen, h, mod, ...(t ? { t } : {}) };
  if (indexable && mod === updated && prev.mod !== updated) changed.push(SITE + url);
  return mod;
}
// ---------- schrijven ----------
fs.mkdirSync(OUT, { recursive: true });
const sitemap = [];
for (const [url, pg] of pages) {
  const html = render(url, pg);
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  const mod = track(url, pg.list, Object.keys(pg.p).length ? pg.p : null, pg.indexable);
  if (pg.indexable) sitemap.push(`  <url><loc>${SITE}${url}</loc><lastmod>${mod}</lastmod></url>`);
}
for (const [url, pg] of cheapPages) {
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderCheap(url, pg));
  const mod = track(url, pg.ranked.length ? pg.ranked : pg.list, null, pg.indexable);
  if (pg.indexable) sitemap.push(`  <url><loc>${SITE}${url}</loc><lastmod>${mod}</lastmod></url>`);
}
if (hubSections.length) {
  fs.mkdirSync(path.join(OUT, HUB_URL), { recursive: true });
  fs.writeFileSync(path.join(OUT, HUB_URL, "index.html"), renderHub());
  const mod = track(HUB_URL, hubSections.flatMap(g => g.ranked.slice(0, 3)), null, hubIndexable);
  if (hubIndexable) sitemap.push(`  <url><loc>${SITE}${HUB_URL}</loc><lastmod>${mod}</lastmod></url>`);
}
{ const mk = writeMeerkoop(OUT, tpl, { deals, updated, dateNL, listHtml, nameOf, cheapPages, hubIndexable, HUB_URL });
  if (mk) { const mod = track(MK_URL, mk.list, null, mk.indexable); if (mk.indexable) sitemap.push(`  <url><loc>${SITE}${MK_URL}</loc><lastmod>${mod}</lastmod></url>`); } }
{ const bfList = writeBlackFriday(OUT, tpl, { deals, updated, listHtml, eur, nameOf, mech, hubSections, cheapPages, HUB_URL, hubIndexable, pages, urlOf, labelOf, popular: ztPopular("/black-friday-koffie/"), km: kmBlackFriday() });
  if (bfList) sitemap.push(`  <url><loc>${SITE}${BF_URL}</loc><lastmod>${track(BF_URL, bfList, null, true)}</lastmod></url>`); }
{ const dp = decafPage(tpl, { deals, upcoming: raw.deals.filter(d => d.next && d.from > today), updated, dateNL, listHtml, nameOf, eur, esc, js, SITE, NU, popular: ztPopular(DC_URL), cheapLinks: cheapLinks({}) }); // cafeinevrij.json "pagina"
  if (dp) { fs.mkdirSync(path.join(OUT, DC_URL), { recursive: true }); fs.writeFileSync(path.join(OUT, DC_URL, "index.html"), dp.html);
    const mod = track(DC_URL, dp.list, null, dp.indexable); if (dp.indexable) sitemap.push(`  <url><loc>${SITE}${DC_URL}</loc><lastmod>${mod}</lastmod></url>`);
    console.log(`Cafeïnevrij: ${dp.list.length} aanbiedingen nu, pagina ${dp.indexable ? "in Google" : "noindex"}`); } }
sitemap.push(...writeKoffiemachines(OUT, tpl, { deals, pages, updated, dateNL, track })); // koffiemachines.json: /koffiemachines/ + soortpagina's (vóór de informatiepagina's, zodat 'Hoe verdienen we geld?' Coolblue noemt)
sitemap.push(...writeInfoPages(OUT, tpl)); // informatiepagina's: vaste datum (privacy_datum), niet in het geheugen van de vaste adressen
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join("\n")}\n</urlset>\n`);
// Eigen 404-pagina: wijst naar de dichtstbijzijnde bestaande pagina (bijv. /lavazza/koffiebonen/ -> /lavazza/)
const known = [...pages.keys(), ...cheapPages.keys(), ...(hubSections.length ? [HUB_URL] : []), ...(BF_ON ? [BF_URL] : []), ...(G.meerkoop ? [MK_URL] : []), ...(INFO_ON ? INFO_URLS : []), ...(DC.pagina ? [DC_URL] : []), ...KM_URLS];
writeManifest(OUT); // gemak.json "beginscherm": manifest.webmanifest (naam, kleuren, pictogrammen)
fs.writeFileSync(path.join(OUT, "404.html"), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pagina niet gevonden | Koffieboonus</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#FFF9E9;color:#2B1B0E;max-width:560px;margin:15vh auto;padding:0 16px}a{color:#4E341B}@media (prefers-color-scheme:dark){body{background:#16110C;color:#F5ECDD}a{color:#F5A25C}}</style></head><body><h1>Hier is nu geen aanbieding</h1><p>Deze pagina bestaat op dit moment niet: er zijn te weinig aanbiedingen voor deze combinatie, of de aanbieding is afgelopen.</p><p id="near"></p><p><a href="/">Bekijk alle koffie-aanbiedingen</a></p><script>const K=${js(known)};let p=location.pathname.replace(/\\/+$/,"").split("/").filter(Boolean);while(p.length){const u="/"+p.join("/")+"/";if(K.includes(u)){document.getElementById("near").innerHTML='Misschien zoek je <a href="'+u+'">een bredere pagina</a>.';break}p.pop()}</script></body></html>`);
fs.writeFileSync(path.join(OUT, "paginas.json"), JSON.stringify(memo));
fs.writeFileSync("gewijzigd.json", JSON.stringify(changed)); // voor indexnow.mjs (staat niet op de site)
console.log(`Pagina's gebouwd: ${pages.size} (in sitemap: ${sitemap.length}, vaste adressen zonder genoeg aanbiedingen: ${keptN}, verlopen na ${KEEP_DAYS} dagen: ${expiredN}, gewijzigd: ${changed.length}), aanbiedingen: ${deals.length}`);
