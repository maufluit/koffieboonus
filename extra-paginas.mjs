// Extra pagina's van Koffieboonus: Over ons, Contact, Privacy, "Hoe verdient Koffieboonus geld?" en de /go/-doorstuurpagina's.
// Wordt gebruikt door build.mjs. Twee instellingen bepalen wat er gebeurt:
//   site-gegevens.json  -> de vier informatiepagina's verschijnen pas als naam en e-mail zijn ingevuld (geen [PLAATSHOUDER] meer).
//   affiliate/go-links.json -> "aan": false (standaard) betekent: geen /go/-pagina's, geen advertentielabels, niets verandert.
// Staat alles uit, dan is de uitvoer van build.mjs precies gelijk aan die van vóór deze module.
// Alleen voor testen en previews: KB_GEGEVENS=<pad> en KB_GO=<pad> gebruiken een ander instellingenbestand.
import fs from "node:fs";
import path from "node:path";

const SITE = "https://koffieboonus.nl";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (fs.existsSync(file)) console.warn(`Kan ${file} niet lezen: ${e.message}`); return fallback; } };
// Een veld telt als ingevuld als het niet leeg is en geen plaatshouder als [NAAM] is.
// KB_PREVIEW=1 (alleen voor previews): plaatshouders tellen dan wél als ingevuld, zodat je ziet waar ze komen.
const PREVIEW = process.env.KB_PREVIEW === "1";
const filled = v => typeof v === "string" && v.trim() !== "" && (PREVIEW || !/^\s*\[.*\]\s*$/.test(v));
const val = v => (filled(v) ? v.trim() : "");

// ---------- gegevens van Maurits ----------
const G = readJson(process.env.KB_GEGEVENS || "site-gegevens.json", {});
const emailOk = filled(G.email) && (PREVIEW || /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(G.email.trim()));
if (filled(G.email) && !emailOk) console.warn("site-gegevens.json: e-mailadres lijkt niet geldig; informatiepagina's worden niet gemaakt.");
export const INFO_ON = filled(G.naam) && emailOk;
const INFO = { naam: val(G.naam), email: emailOk ? G.email.trim() : "", plaats: val(G.plaats), kvk: val(G.kvk), over: val(G.over_mij), datum: /^\d{4}-\d{2}-\d{2}$/.test(G.privacy_datum || "") ? G.privacy_datum : "2026-10-23" };
if (!INFO_ON) console.log("Informatiepagina's (over, contact, privacy, geld): uit, want naam en e-mail in site-gegevens.json zijn nog niet ingevuld.");

// ---------- advertentielinks (/go/) ----------
const GOCFG = readJson(process.env.KB_GO || path.join("affiliate", "go-links.json"), { aan: false, links: [] });
const NETWERKEN = GOCFG.netwerken || {};
const GO_LINKS = new Map(); // id -> link
if (GOCFG.aan === true) {
  for (const l of GOCFG.links || []) {
    if (l.actief !== true) continue;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.id || "")) { console.warn(`go-links.json: ongeldige id "${l.id}" overgeslagen (alleen kleine letters, cijfers en streepjes).`); continue; }
    let u; try { u = new URL(l.url); } catch { u = null; }
    if (!u || u.protocol !== "https:") { console.warn(`go-links.json: link "${l.id}" heeft geen geldige https-url en is overgeslagen.`); continue; }
    if (!filled(l.winkel || "")) { console.warn(`go-links.json: link "${l.id}" mist de winkelnaam en is overgeslagen.`); continue; }
    if (GO_LINKS.has(l.id)) { console.warn(`go-links.json: dubbele id "${l.id}" overgeslagen.`); continue; }
    GO_LINKS.set(l.id, { ...l, url: u.href });
  }
}
// Advertentielinks mogen alleen aan als de uitlegpagina en privacyverklaring er ook zijn (Reclamecode en AVG).
export const GO_ON = GOCFG.aan === true && INFO_ON;
if (GOCFG.aan === true && !INFO_ON) console.warn("go-links.json staat aan, maar de informatiepagina's ontbreken (vul site-gegevens.json in). Advertentielinks blijven daarom UIT.");
console.log(`Advertentielinks (/go/): ${GO_ON ? `aan, ${GO_LINKS.size} actieve link(s)` : "uit"}`);

// Hulpfuncties voor andere pagina's (bijv. de Black Friday-pagina). Staan de advertentielinks uit, dan geven ze niets terug.
export const goHref = id => (GO_ON && GO_LINKS.has(id) ? `/go/${id}/` : null);
export function adLink(id, text, { cls = "go" } = {}) {
  const h = goHref(id);
  if (!h) return "";
  return `<a class="${esc(cls)}" href="${h}" target="_blank" rel="sponsored nofollow noopener">${esc(text)}</a><span class="adlabel">Advertentie</span>`;
}
export const adNotice = () => GO_ON
  ? `<p class="adnote"><strong>Advertentie:</strong> koop je via een link met het label ‘Advertentie’, dan krijgt Koffieboonus een kleine vergoeding van de webshop. Jij betaalt hetzelfde en de volgorde verandert er niet door. <a href="${GELD_URL}">Hoe verdienen we geld?</a></p>`
  : "";
export const AD_CSS = ".adlabel{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:4px;font-size:12px;font-weight:600;background:var(--line);color:var(--ink);vertical-align:middle;white-space:nowrap}.adnote{font-size:13px;color:var(--mute);margin:8px 0 12px;max-width:70ch}.adnote a{color:inherit}";

// ---------- pagina-adressen ----------
const OVER_URL = "/over/", CONTACT_URL = "/contact/", PRIVACY_URL = "/privacy/", GELD_URL = "/hoe-verdienen-we-geld/";
export const INFO_URLS = [OVER_URL, PRIVACY_URL, CONTACT_URL]; // "Hoe verdienen we geld?" pas als er advertentielinks zijn (12 nov: Maurits)

// Links onderaan elke pagina (alleen als de informatiepagina's bestaan).
export const footerLinks = () => INFO_ON
  ? `<nav style="margin-top:8px" aria-label="Over Koffieboonus"><a href="${OVER_URL}">Over ons</a> · ${GO_ON ? `<a href="${GELD_URL}">Hoe verdienen we geld?</a> · ` : ""}<a href="${PRIVACY_URL}">Privacy</a> · <a href="${CONTACT_URL}">Contact</a></nav>`
  : "";

// ---------- opmaak van een informatiepagina, op basis van het sjabloon index.html ----------
export const PAGE_CSS = ".prose{max-width:70ch}.prose h2{font-size:20px;color:var(--title);margin:28px 0 8px}.prose p,.prose ul{margin:0 0 12px}.prose ul{padding-left:22px}.prose li{margin:0 0 4px}.prose a{color:var(--ink)}.box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:0 0 16px}.box p{margin:0 0 4px}.box p:last-child{margin:0}";
export function partsOf(tpl) {
  const need = (cond, what) => { if (!cond) throw new Error(`extra-paginas.mjs: ${what} niet gevonden in index.html. Pas extra-paginas.mjs aan.`); };
  const iMain = tpl.indexOf("<main>");
  need(iMain > 0 && tpl.includes("{{HEAD}}"), "<main> of {{HEAD}}");
  const foot = tpl.match(/<footer>[\s\S]*?<\/footer>/);
  need(foot, "<footer>");
  // In de footer van een informatiepagina is geen datum van de aanbiedingen (ook niet als groei.json "voetregel" aan staat); de bronvermelding staat er altijd.
  const footer = foot[0].replace(/<span id="upd">[^<]*<\/span><span id="upd-sep"> · <\/span>/, "").replace(/<span id="attr" hidden>/, "<span>");
  const t0 = tpl.indexOf("/* Licht/donker schakelaar */"), t1 = tpl.indexOf("syncTheme();\n", t0);
  need(t0 > 0 && t1 > t0, "de licht/donker-schakelaar");
  return { start: tpl.slice(0, iMain), footer, theme: tpl.slice(t0, t1 + "syncTheme();".length) };
}
function page(tpl, { url, title, desc, h1, crumb, body }) {
  const { start, footer, theme } = partsOf(tpl);
  const canon = SITE + url;
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Koffieboonus", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: crumb, item: canon }] };
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="index,follow">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
  const top = start.replace("{{HEAD}}", () => head).replace("</style>", () => PAGE_CSS + "</style>");
  const crumbs = `<nav class="crumbs" aria-label="Kruimelpad"><a href="/">Koffieboonus</a> › <span aria-current="page">${esc(crumb)}</span></nav>`;
  return `${top}<main><div class="wrap">\n<section class="pagehead">${crumbs}<h1>${esc(h1)}</h1></section>\n<article class="prose">${body}</article>\n</div></main>\n${footer}\n<script>\n${theme}\n</script>\n</body>\n</html>\n`;
}

// ---------- teksten ----------
const mail = () => `<a href="mailto:${esc(INFO.email)}">${esc(INFO.email)}</a>`;
const dateNL = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const activeShops = () => [...GO_LINKS.values()];
const usedNetworks = () => [...new Set(activeShops().map(l => l.netwerk).filter(Boolean))];
const ORDER = `<ul><li>Standaard staan de aanbiedingen op <strong>hoogste korting</strong>.</li><li>Op de pagina's ‘Goedkoopste …’ staan ze op <strong>laagste prijs per kilo, cup of pad</strong>.</li><li>We tonen aanbiedingen vanaf 10% korting, en aanbiedingen waarvan de normale prijs onbekend is.</li></ul>`;

function overBody() {
  const wie = INFO.over ? esc(INFO.over) : `Koffieboonus is gemaakt door ${esc(INFO.naam)}${INFO.plaats ? ` uit ${esc(INFO.plaats)}` : ""}.`;
  return [
    `<p>Koffieboonus zet de koffieaanbiedingen van Nederlandse supermarkten op één plek. Gratis, zonder account en zonder cookies.</p>`,
    `<h2>Wie zit erachter?</h2><p>${wie}</p><p>Koffieboonus is geen winkel en verkoopt zelf niets. Ik ben niet verbonden aan de supermarkten of koffiemerken op de site.</p><p>Vragen of ideeën? Mail naar ${mail()}.</p>`,
    `<h2>Waar komen de aanbiedingen vandaan?</h2><p>Elke nacht halen we de aanbiedingen op bij <a href="https://www.prijsprofeet.nl">PrijsProfeet</a>. Waar dat zeker kan, rekenen we de prijs om naar een prijs per kilo, cup of pad, zodat je verschillende verpakkingen eerlijk kunt vergelijken.</p><p>Er kan altijd iets mis zijn met een prijs of actie. Controleer de prijs daarom bij de winkel. Zie je een fout? <a href="${CONTACT_URL}">Laat het ons weten</a>.</p>`,
    `<h2>Hoe bepalen we de volgorde?</h2>${ORDER}`,
    `<h2>Merken en namen</h2><p>De namen van supermarkten en merken zijn van hun eigenaars. We gebruiken ze alleen om te laten zien waar welke aanbieding is.</p>`,
  ].join("\n");
}

function contactBody() {
  const rows = [`<p><strong>Naam:</strong> ${esc(INFO.naam)}</p>`];
  if (INFO.plaats) rows.push(`<p><strong>Plaats:</strong> ${esc(INFO.plaats)}</p>`);
  if (INFO.kvk) rows.push(`<p><strong>KvK-nummer:</strong> ${esc(INFO.kvk)}</p>`);
  rows.push(`<p><strong>E-mail:</strong> ${mail()}</p>`);
  return [
    `<p>Een vraag, een idee of een fout gezien? Mail naar ${mail()}.</p>`,
    `<div class="box">${rows.join("")}</div>`,
    `<h2>Waarvoor kun je mailen?</h2><ul><li>Een fout in een aanbieding. Noem de pagina en de winkel, dan zoeken we het uit.</li><li>Ideeën om Koffieboonus beter te maken.</li><li>Samenwerking of adverteren.</li><li>Vragen over je privacy (zie ook de <a href="${PRIVACY_URL}">privacyverklaring</a>).</li></ul>`,
    `<h2>Vragen over een product of bestelling?</h2><p>Koffieboonus verkoopt zelf niets. Vragen over een product, een bestelling of de prijs in de winkel kun je het beste aan de winkel zelf stellen.</p>`,
  ].join("\n");
}

function geldBody() {
  const always = `<h2>Wat altijd zo blijft</h2><p>De supermarktaanbiedingen blijven gratis te bekijken. En geld bepaalt nooit de volgorde. Zo kiezen we die:</p>${ORDER}`;
  if (!GO_ON) return [
    `<p>Op dit moment verdient Koffieboonus geen geld. Er staan geen advertenties en geen advertentielinks op de site.</p>`,
    `<h2>De knoppen ‘Bekijk bij …’</h2><p>Dat zijn gewone links naar de winkel. Koffieboonus krijgt daar niets voor.</p>`,
    `<h2>Als dat verandert</h2><p>Misschien gaat Koffieboonus later advertentielinks gebruiken, bijvoorbeeld naar webshops met koffiemachines. Dan leggen we dat eerst hier uit, en staat bij elke advertentielink het label ‘Advertentie’.</p>`,
    always,
  ].join("\n");
  const shops = activeShops().map(l => `<li>${esc(l.winkel)}${l.netwerk ? ` (via ${esc(l.netwerk)})` : ""}</li>`);
  const daisy = usedNetworks().some(n => NETWERKEN[n]?.melding) ? `<p>Voor een deel van de advertentielinks gebruiken we de diensten van Daisycon, een netwerk voor advertentielinks.</p>` : "";
  return [
    `<p>Koffieboonus is gratis. We verdienen geld met <strong>advertentielinks</strong> (ook wel affiliatelinks).</p>`,
    `<h2>Hoe werkt een advertentielink?</h2><p>Bij sommige links naar webshops staat het label <span class="adlabel" style="margin-left:0">Advertentie</span>. Klik je daarop en koop je iets, dan krijgt Koffieboonus een kleine vergoeding van die webshop. <strong>Jij betaalt hetzelfde.</strong></p><p>Je koopt bij de webshop, niet bij Koffieboonus. Vragen over een bestelling stel je dus aan de webshop.</p><p>Een link zonder het label ‘Advertentie’ is een gewone link. Daar krijgen we niets voor.</p>`,
    shops.length ? `<h2>Met wie werken we samen?</h2><ul>${shops.join("")}</ul>${daisy}` : daisy,
    always,
    `<h2>Je privacy</h2><p>Koffieboonus plaatst zelf geen cookies, ook niet bij advertentielinks. Wat er gebeurt nadat je op een advertentielink klikt, lees je in de <a href="${PRIVACY_URL}">privacyverklaring</a>.</p>`,
  ].filter(Boolean).join("\n");
}

function privacyBody() {
  // Alleen wat de AVG (art. 13) vraagt: wie, welke gegevens, waarvoor en op welke grond, wie ze krijgt, buiten de EU, hoe lang, je rechten en klachten.
  return [
    `<p>Koffieboonus plaatst geen cookies en je hebt geen account nodig. Persoonsgegevens krijgen we alleen als je ons mailt.</p>`,
    `<h2>Wie is verantwoordelijk?</h2><p>${esc(INFO.naam)}${INFO.kvk ? ` (KvK ${esc(INFO.kvk)})` : ""}, bereikbaar via ${mail()}.</p>`,
    `<h2>Als je ons mailt</h2><p>We gebruiken je e-mailadres en bericht alleen om je te antwoorden (grondslag: gerechtvaardigd belang). Je mail staat bij onze mailprovider Mijndomein en in ons afgeschermde archief bij GitHub. Om mail te sorteren en een antwoord voor te bereiden gebruiken we de AI-assistent Claude van Anthropic; een mens beslist altijd over het antwoord. We bewaren je mail tot uiterlijk een jaar na ons laatste contact.</p>`,
    `<h2>Als je de site bezoekt</h2><p>De site staat bij GitHub Pages. Zoals bij elke website ziet de server je IP-adres; GitHub gebruikt dat voor de beveiliging en wij krijgen het niet. Voor bezoekersaantallen en de duimpjes onder de aanbiedingen gebruiken we Cloudflare, zonder cookies en zonder je IP-adres op te slaan. Wij zien alleen totalen, niet wie je bent. Typ je een e-mailadres of telefoonnummer in het feedbackvakje, dan halen we dat weg voordat het wordt opgeslagen.</p><p>Kies je voor licht of donker, dan onthoudt alleen je eigen browser die keuze.</p>`,
    `<h2>Buiten Europa</h2><p>GitHub, Cloudflare en Anthropic zijn Amerikaanse bedrijven en kunnen gegevens buiten de Europese Unie verwerken. In hun eigen privacyverklaringen staat hoe zij die gegevens beschermen.</p>`,
    `<h2>Je rechten</h2><p>Je mag vragen welke gegevens we van je hebben, en vragen om ze te verbeteren, te verwijderen of over te dragen. Je mag ook bezwaar maken tegen het gebruik ervan. Mail daarvoor naar ${mail()}. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de <a href="https://www.autoriteitpersoonsgegevens.nl">Autoriteit Persoonsgegevens</a>.</p>`,
    `<p class="meta">Laatst bijgewerkt: ${dateNL(INFO.datum)}.</p>`,
  ].join("\n");
}

// ---------- schrijven ----------
// Schrijft de informatiepagina's en geeft de regels voor de sitemap terug (leeg als de pagina's uit staan).
export function writeInfoPages(out, tpl) {
  if (!INFO_ON) return [];
  const defs = [
    { url: OVER_URL, crumb: "Over ons", h1: "Over Koffieboonus", title: "Over Koffieboonus | Koffieboonus", desc: "Wie zit er achter Koffieboonus, waar komen de koffieaanbiedingen vandaan en hoe bepalen we de volgorde?", body: overBody() },
    { url: CONTACT_URL, crumb: "Contact", h1: "Contact", title: "Contact | Koffieboonus", desc: "Een vraag, een idee of een fout gezien op Koffieboonus? Zo neem je contact op.", body: contactBody() },
    { url: PRIVACY_URL, crumb: "Privacy", h1: "Privacyverklaring", title: "Privacyverklaring | Koffieboonus", desc: "Koffieboonus plaatst geen cookies. Lees welke gegevens er wel gebruikt worden, door wie en waarom.", body: privacyBody() },
    GO_ON && { url: GELD_URL, crumb: "Hoe verdienen we geld?", h1: "Hoe verdient Koffieboonus geld?", title: "Hoe verdient Koffieboonus geld? | Koffieboonus", desc: "Koffieboonus is gratis. Lees hoe de site geld verdient en waarom dat nooit de volgorde van de aanbiedingen bepaalt.", body: geldBody() },
  ];
  const lines = [];
  for (const d of defs.filter(Boolean)) {
    const dir = path.join(out, d.url);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), page(tpl, d));
    lines.push(`  <url><loc>${SITE}${d.url}</loc><lastmod>${INFO.datum}</lastmod></url>`);
  }
  return lines;
}

// Schrijft de doorstuurpagina's /go/<id>/ (alleen als de advertentielinks aan staan).
export function writeGoPages(out, tpl) {
  if (!GO_ON) return 0;
  // Dezelfde cookieloze Cloudflare-teller als op de rest van de site, zodat elke klik als paginabezoek van /go/<id>/ telt.
  const beacon = (tpl.match(/<script[^>]*static\.cloudflareinsights\.com[^>]*><\/script>/) || [""])[0].replace("<script", '<script id="cfb"');
  for (const [id, l] of GO_LINKS) {
    const dir = path.join(out, "go", id);
    fs.mkdirSync(dir, { recursive: true });
    const js = JSON.stringify(l.url).replace(/</g, "\\u003c");
    const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Doorsturen naar ${esc(l.winkel)} | Koffieboonus</title><meta http-equiv="refresh" content="3;url=${esc(l.url)}"><style>body{font:16px/1.5 system-ui,sans-serif;background:#FFF9E9;color:#2B1B0E;max-width:560px;margin:15vh auto;padding:0 16px}a{color:#4E341B;font-weight:600}.m{color:#6E5F53;font-size:14px}@media (prefers-color-scheme:dark){body{background:#16110C;color:#F5ECDD}a{color:#F5A25C}.m{color:#B3A395}}</style>${beacon}</head><body><p>Je gaat naar <strong>${esc(l.winkel)}</strong>…</p><p class="m">Dit is een advertentielink. Koop je iets, dan krijgt Koffieboonus een kleine vergoeding. Jij betaalt hetzelfde.</p><p><a href="${esc(l.url)}" rel="sponsored nofollow">Ga verder naar ${esc(l.winkel)} ›</a></p><script>(function(){var T=${js},d=0;function go(){if(d)return;d=1;setTimeout(function(){location.replace(T)},150)}var b=document.getElementById("cfb");if(b){b.addEventListener("load",go);b.addEventListener("error",go)}setTimeout(go,b?1200:0)})();</script></body></html>\n`;
    fs.writeFileSync(path.join(dir, "index.html"), html);
  }
  // Zoekmachines hoeven de doorstuurpagina's niet te bezoeken.
  const rb = path.join(out, "robots.txt");
  if (fs.existsSync(rb)) { const t = fs.readFileSync(rb, "utf8"); if (!/Disallow:\s*\/go\//.test(t)) fs.writeFileSync(rb, t.replace(/(User-agent: \*\s*\n)/, "$1Disallow: /go/\n")); }
  return GO_LINKS.size;
}
