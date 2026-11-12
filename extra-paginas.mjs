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
export const INFO_URLS = [OVER_URL, GELD_URL, PRIVACY_URL, CONTACT_URL];

// Links onderaan elke pagina (alleen als de informatiepagina's bestaan).
export const footerLinks = () => INFO_ON
  ? `<nav style="margin-top:8px" aria-label="Over Koffieboonus"><a href="${OVER_URL}">Over ons</a> · <a href="${GELD_URL}">Hoe verdienen we geld?</a> · <a href="${PRIVACY_URL}">Privacy</a> · <a href="${CONTACT_URL}">Contact</a></nav>`
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
const ORDER = `<ul><li>Standaard staan de aanbiedingen op <strong>hoogste korting</strong>.</li><li>Op de pagina's ‘Goedkoopste …’ staan ze op <strong>laagste prijs per kilo, cup of pad</strong>.</li><li>We tonen aanbiedingen vanaf 10% korting, en aanbiedingen waarvan de normale prijs onbekend is.</li><li>Niemand kan betalen voor een hogere plek in de lijst.</li></ul>`;

function overBody() {
  const wie = INFO.over ? esc(INFO.over) : `Koffieboonus is gemaakt door ${esc(INFO.naam)}${INFO.plaats ? ` uit ${esc(INFO.plaats)}` : ""}.`;
  return [
    `<p>Koffieboonus zet de koffieaanbiedingen van Nederlandse supermarkten op één plek. Gratis, zonder account en zonder cookies.</p>`,
    `<h2>Wie zit erachter?</h2><p>${wie}</p><p>Koffieboonus is geen winkel en verkoopt zelf niets. Ik ben niet verbonden aan de supermarkten of koffiemerken op de site.</p><p>Vragen of ideeën? Mail naar ${mail()}.</p>`,
    `<h2>Waar komen de aanbiedingen vandaan?</h2><p>Elke nacht halen we de aanbiedingen op bij <a href="https://www.prijsprofeet.nl">PrijsProfeet</a>. Waar dat zeker kan, rekenen we de prijs om naar een prijs per kilo, cup of pad, zodat je verschillende verpakkingen eerlijk kunt vergelijken.</p><p>Er kan altijd iets mis zijn met een prijs of actie. Controleer de prijs daarom bij de winkel. Zie je een fout? <a href="${CONTACT_URL}">Laat het ons weten</a>.</p>`,
    `<h2>Hoe bepalen we de volgorde?</h2>${ORDER}`,
    `<h2>Wat verdienen we eraan?</h2><p>${GO_ON ? "Koffieboonus verdient geld met een paar advertentielinks naar webshops. Die zijn altijd herkenbaar aan het label ‘Advertentie’." : "Op dit moment niets: er staan geen advertenties en geen advertentielinks op de site."} <a href="${GELD_URL}">Lees hoe dat werkt</a>.</p>`,
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
  const nets = usedNetworks().map(n => `<li>${esc(n)}${NETWERKEN[n]?.privacy ? `: <a href="${esc(NETWERKEN[n].privacy)}">privacyverklaring van ${esc(n)}</a>` : ""}</li>`);
  const daisy = usedNetworks().some(n => NETWERKEN[n]?.melding)
    ? `<p>Koffieboonus gebruikt de diensten van Daisycon voor advertentielinks. Daisycon gebruikt een cookie en vergelijkbare gegevens om een aankoop aan Koffieboonus te koppelen, zodat we een vergoeding krijgen. Wij krijgen daarna alleen anonieme gegevens over de aankoop te zien. Volgens Daisycon zijn deze cookies niet schadelijk voor je privacy.</p>`
    : "";
  const ads = GO_ON
    ? `<h2>Advertentielinks</h2><p>Sommige links naar webshops zijn advertentielinks, herkenbaar aan het label ‘Advertentie’ (<a href="${GELD_URL}">uitleg</a>). Zo werkt het als je erop klikt:</p><ul><li>Je gaat eerst naar een korte doorstuurpagina op koffieboonus.nl (een adres dat begint met /go/). Cloudflare Web Analytics telt dat bezoek, net als een gewoon paginabezoek: zonder cookies.</li><li>Daarna stuurt de doorstuurpagina je via het advertentienetwerk door naar de webshop. Het netwerk of de webshop plaatst dan <strong>op hun eigen website</strong> een cookie of gebruikt vergelijkbare techniek. Daarmee kunnen ze zien dat je via Koffieboonus kwam als je iets koopt.</li><li>Koffieboonus krijgt van het netwerk alleen totalen te zien: hoeveel klikken, hoeveel aankopen en welke vergoeding. Wij zien niet wie je bent, wat je naam of adres is of wat je precies koopt.</li></ul>${nets.length ? `<p>We werken met deze netwerken. Hun privacyverklaring legt uit wat zij met gegevens doen:</p><ul>${nets.join("")}</ul>` : ""}${daisy}`
    : `<h2>Advertentielinks</h2><p>Koffieboonus gebruikt nu geen advertentielinks. Gaan we dat wel doen, dan passen we deze privacyverklaring eerst aan.</p>`;
  return [
    `<p>Kort gezegd: Koffieboonus plaatst geen cookies, je hebt geen account nodig en we weten niet wie je bent. Hieronder staat precies welke gegevens er wel gebruikt worden, en door wie.</p>`,
    `<h2>Wie is verantwoordelijk?</h2><p>${esc(INFO.naam)}${INFO.plaats ? `, ${esc(INFO.plaats)}` : ""}${INFO.kvk ? ` (KvK ${esc(INFO.kvk)})` : ""}. Vragen over je privacy? Mail naar ${mail()}.</p>`,
    `<h2>Bezoekersstatistieken: Cloudflare Web Analytics</h2><p>We willen weten welke pagina's bezocht worden, zodat we de site kunnen verbeteren. Daarvoor gebruiken we Cloudflare Web Analytics. Dat werkt <strong>zonder cookies</strong> en zonder opslag in je browser. Volgens Cloudflare worden bezoekers niet herkend of gevolgd via hun IP-adres of browsergegevens.</p><p>Wij zien alleen totalen, zoals: hoeveel bezoeken een pagina had, van welke website bezoekers kwamen, het soort apparaat en browser, het land en hoe snel de pagina laadde. We zien niet wie je bent. We doen dit op basis van ons gerechtvaardigd belang: een site die goed werkt. Meer informatie: <a href="https://www.cloudflare.com/nl-nl/privacypolicy/">privacybeleid van Cloudflare</a>.</p>`,
    `<h2>Hosting: GitHub Pages</h2><p>De website staat op GitHub Pages van GitHub (onderdeel van Microsoft). Zoals bij elke website ziet de server bij een bezoek je IP-adres. GitHub bewaart dat voor de beveiliging. Koffieboonus heeft geen toegang tot die gegevens. Meer informatie: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">privacyverklaring van GitHub</a> (Engels).</p><p>Cloudflare en GitHub zijn Amerikaanse bedrijven en kunnen gegevens ook buiten Europa verwerken. In hun privacyverklaringen staat hoe ze die gegevens beschermen.</p>`,
    `<h2>Feedback en klikken</h2><p>Onder de aanbiedingen kun je laten weten of je vond wat je zocht (duim omhoog of omlaag), en bij een duim omlaag in een vakje typen wat je miste. Ook tellen we anoniem hoe vaak er op ‘Bekijk bij …’ wordt geklikt en welke filters gekozen worden. Zo weten we wat we kunnen verbeteren.</p><p>Daarvoor bewaren we alleen de datum, de pagina en wat er gekozen of getypt is. Geen cookies, geen IP-adres, geen tijdstip en niets waarmee we jou kunnen herkennen. Typ je een e-mailadres of telefoonnummer in het vakje, dan halen we dat weg voordat het wordt opgeslagen. Dit draait op een eigen tellertje bij Cloudflare (Cloudflare Workers en D1).</p>`,
    `<h2>Licht of donker thema</h2><p>Kies je met de schakelaar bovenaan voor licht of donker, dan onthoudt je browser die keuze op je eigen apparaat. Dat is geen cookie, het wordt niet naar ons gestuurd, en je kunt het wissen door je browsergegevens te verwijderen.</p>`,
    `<h2>De aanbiedingen</h2><p>De aanbiedingen komen van <a href="https://www.prijsprofeet.nl">PrijsProfeet</a>. Wij halen ze één keer per nacht op en zetten ze op onze eigen site. Je browser maakt daarvoor geen contact met PrijsProfeet, en we geven geen gegevens over bezoekers aan PrijsProfeet.</p>`,
    `<h2>Links naar winkels</h2><p>Klik je op ‘Bekijk bij …’, dan ga je naar de website van de winkel. Daar gelden het privacy- en cookiebeleid van die winkel.</p>`,
    ads,
    `<h2>Als je ons mailt</h2><p>Mail je naar ${mail()}, dan gebruiken we je e-mailadres en bericht alleen om je te antwoorden. De mailbox staat bij Mijndomein (Soverin, in Europa).</p><p>Om mail te sorteren en een antwoord voor te bereiden, gebruiken we de AI-assistent Claude van Anthropic. Een kopie van de mail staat daarvoor in ons eigen, afgeschermde archief bij GitHub. Er gaat nooit een antwoord weg dat Maurits niet zelf heeft goedgekeurd. Anthropic en GitHub zijn Amerikaanse bedrijven en kunnen gegevens ook buiten Europa verwerken.</p><p>We bewaren je mail niet langer dan nodig, en uiterlijk een jaar na ons laatste contact verwijderen we hem. We verkopen je gegevens niet en gebruiken ze niet voor reclame.</p>`,
    `<h2>Je rechten</h2><p>Je mag vragen welke gegevens we van je hebben, en vragen om ze te verbeteren of te verwijderen. Mail daarvoor naar ${mail()}. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de <a href="https://www.autoriteitpersoonsgegevens.nl">Autoriteit Persoonsgegevens</a>.</p>`,
    `<h2>Wijzigingen</h2><p>Verandert er iets aan de site dat met privacy te maken heeft, dan passen we deze verklaring aan. Laatst bijgewerkt: ${dateNL(INFO.datum)}.</p>`,
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
    { url: GELD_URL, crumb: "Hoe verdienen we geld?", h1: "Hoe verdient Koffieboonus geld?", title: "Hoe verdient Koffieboonus geld? | Koffieboonus", desc: "Koffieboonus is gratis. Lees hoe de site geld verdient en waarom dat nooit de volgorde van de aanbiedingen bepaalt.", body: geldBody() },
  ];
  const lines = [];
  for (const d of defs) {
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
