// Sectie Koffiemachines (preview 16 nov 2026, plan Maurits): /koffiemachines/ met keuzehulp en kostenvergelijking,
// en per soort een pagina met "Onze 3 keuzes" (volautomaat, Nespresso, Senseo, Dolce Gusto, filterkoffie).
// Schakelaar: koffiemachines.json ("aan"). Uit, of geen coolblue.json = de site is letter voor letter gelijk aan daarvoor.
// De machines komen uit de Coolblue-feed (via Awin), die feed-coolblue.mjs elke nacht in coolblue.json zet (niet in git).
// Knoppen naar Coolblue zijn partnerlinks (commissie per verkoop): alleen via /go/ (extra-paginas.mjs), met één melding adNotice() boven elk blok.
// Geen scripts, pixels of banners van Awin of Coolblue; teksten schrijven we zelf (alleen de productfoto komt uit de feed).
// Alleen voor testen en previews: KB_KM=<pad> (ander instellingenbestand) en KB_KM_FEED=<pad> (ander feedbestand).
import fs from "node:fs";
import path from "node:path";
import { GO_ON, goHref, adLink, adNotice, AD_CSS, partsOf, addGoLinks, writeGoPages, addPrivacyNote } from "./extra-paginas.mjs";
import { isCombo } from "./nudge.mjs";

const SITE = "https://koffieboonus.nl";
export const KM_URL = "/koffiemachines/";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const js = v => JSON.stringify(v).replace(/</g, "\\u003c");
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (fs.existsSync(file)) console.warn(`Kan ${file} niet lezen: ${e.message}`); return fallback; } };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "en").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const eur = n => "€" + n.toFixed(2).replace(".", ",");
const eur0 = n => "€" + Math.round(n).toLocaleString("nl-NL");
const eurP = n => (Number.isInteger(n) ? eur0(n) : eur(n)); // machineprijs: €349 of €349,99

const CFG = readJson(process.env.KB_KM || "koffiemachines.json", { aan: false });
const CUPS_DAY = Number(CFG.kopjes_per_dag) > 0 ? Number(CFG.kopjes_per_dag) : 3;
const YEARS = Number(CFG.jaren) > 0 ? Number(CFG.jaren) : 3;
const GRAM = Number(CFG.gram_per_kopje) > 0 ? Number(CFG.gram_per_kopje) : 8;
const WINKEL = CFG.winkel || "Coolblue", NETWERK = CFG.netwerk || "Awin";

// ---------- vaste teksten per soort (eigen woorden) ----------
// f = welke supermarktkoffie in deze machine past (zelfde filters als build.mjs), unit = prijs per kilo/cup/pad.
const SOORT = {
  volautomaat: {
    label: "Volautomaat", kort: "volautomaat", machine: "een volautomaat", chart: "Volautomaat", een: "een volautomaat", term: "Volautomaat aanbieding",
    f: { type: "Bonen" }, unit: "kilo", page: "/koffiebonen/", word: "bonen", fit: ["zwart", "espresso", "melk"],
    uitleg: "Een volautomaat maalt voor elk kopje verse bonen en zet dan espresso, koffie of (met een melksysteem) cappuccino. Duurder om te kopen, maar per kopje het goedkoopst.",
    voorwie: "Voor wie elke dag meerdere kopjes drinkt en van verse koffie houdt.",
    tips: [
      ["Met of zonder melksysteem?", "Drink je vaak cappuccino of latte, kies dan een machine die zelf melk opschuimt. Drink je vooral zwart, dan betaal je voor een melksysteem iets wat je niet gebruikt."],
      ["Kijk hoe je hem schoonmaakt", "Een zetgroep die eruit kan, kun je zelf onder de kraan afspoelen. Een melksysteem met weinig losse delen is sneller schoon."],
      ["Ontkalken hoort erbij", "Elke volautomaat moet je af en toe ontkalken. Een waterfilter maakt dat minder vaak nodig, maar die filters kosten ook geld."],
      ["Reken met de prijs per kopje", "Met bonen in de aanbieding kost een kopje vaak maar een paar cent. Daardoor verdien je een duurdere machine na een paar jaar terug, vergeleken met cups."],
      ["Geluid", "Elke volautomaat maakt geluid bij het malen. Staat hij in een open keuken, let dan op wat andere kopers over het geluid zeggen."],
    ],
  },
  nespresso: {
    label: "Nespresso", kort: "Nespresso", machine: "een Nespresso-machine", chart: "Nespresso", een: "een Nespresso", term: "Nespresso machine aanbieding",
    f: { sys: "Nespresso", type: "Cups" }, unit: "cup", page: "/nespresso/", word: "cups", fit: ["zwart", "espresso", "melk"],
    uitleg: "Een Nespresso zet espresso en lungo met een cup. Snel, schoon en klein. In deze machines (Original) passen ook de cups van supermarktmerken.",
    voorwie: "Voor wie 1 of 2 kopjes per dag drinkt en het makkelijk wil hebben.",
    tips: [
      ["Original of Vertuo?", "Wij laten alleen Original-machines zien. Daarin passen ook goedkope cups van supermarkten. In een Vertuo passen alleen de dure Vertuo-cups."],
      ["Melk erbij?", "Sommige machines hebben een melkopschuimer erbij. Los kopen kan ook, maar samen is vaak goedkoper."],
      ["Reken met de prijs per cup", "De machine is goedkoop, de cups niet. Met cups in de aanbieding scheelt het per jaar flink."],
      ["Klein waterreservoir", "Kleine machines hebben een klein waterreservoir. Drink je meer dan een paar kopjes per dag, dan vul je vaak bij."],
    ],
  },
  "dolce-gusto": {
    label: "Dolce Gusto", kort: "Dolce Gusto", machine: "een Dolce Gusto-machine", chart: "Dolce Gusto", een: "een Dolce Gusto", term: "Dolce Gusto machine aanbieding",
    f: { sys: "Dolce Gusto", type: "Cups" }, unit: "cup", page: "/dolce-gusto/", word: "cups", fit: ["zwart", "espresso", "melk"], melk2: true,
    uitleg: "Een Dolce Gusto maakt met cups niet alleen koffie, maar ook cappuccino, latte en chocolademelk. De machines zijn goedkoop.",
    voorwie: "Voor wie afwisseling wil, of een huis met ook theedrinkers en kinderen die chocolademelk lusten.",
    tips: [
      ["Melkdranken kosten twee cups", "Voor een cappuccino of latte gebruik je vaak een koffiecup én een melkcup. Per kopje betaal je dan het dubbele."],
      ["Handmatig of automatisch", "Bij een handmatige machine stop je zelf het water. Bij een automatische stel je de hoeveelheid in en loopt hij vanzelf vol."],
      ["Supermarktcups passen ook", "Cups met ‘geschikt voor Dolce Gusto’ op de verpakking passen ook. Die zijn vaak goedkoper."],
      ["Reken met de prijs per cup", "Een Dolce Gusto is per kopje de duurste soort. Drink je veel, dan is een andere machine na een tijdje goedkoper."],
    ],
  },
  senseo: {
    label: "Senseo", kort: "Senseo", machine: "een Senseo", chart: "Padmachine", een: "een padmachine (Senseo)", term: "Senseo machine aanbieding",
    f: { sys: "Senseo", type: "Pads" }, unit: "pad", page: "/senseo/", word: "pads", fit: ["zwart"],
    uitleg: "Een padmachine zoals de Senseo zet met een koffiepad in een halve minuut een mild kopje koffie. Goedkoop om te kopen en simpel in gebruik.",
    voorwie: "Voor wie gewone zwarte koffie drinkt en geen gedoe wil.",
    tips: [
      ["Eén of twee kopjes tegelijk", "Bijna elke padmachine zet 1 of 2 kopjes tegelijk. Voor een grote mok gebruik je twee pads."],
      ["Pads van elk merk", "Gewone koffiepads van supermarktmerken passen in een Senseo. Die zijn vaak in de aanbieding."],
      ["Ontkalken", "Ook een padmachine moet je af en toe ontkalken. Sommige machines geven een seintje als het tijd is."],
      ["Geen espresso", "Een padmachine zet geen echte espresso. Wil je dat wel, kijk dan naar een volautomaat of Nespresso."],
    ],
  },
  filterkoffie: {
    label: "Filterkoffie", kort: "filterkoffie", machine: "een filterkoffiezetapparaat", chart: "Filterkoffie", een: "een filterkoffiezetapparaat", term: "Koffiezetapparaat aanbieding",
    f: { type: "Gemalen koffie" }, unit: "kilo", page: "/gemalen-koffie/", word: "gemalen koffie", fit: ["zwart"],
    uitleg: "Een filterkoffiezetapparaat zet in één keer een hele kan koffie met gewone gemalen koffie. Goedkoop in aanschaf en per kopje.",
    voorwie: "Voor wie veel zwarte koffie drinkt, of vaak bezoek heeft.",
    tips: [
      ["Glazen kan of thermoskan", "Op een warmhoudplaat wordt koffie na een half uur bitter. In een thermoskan blijft hij langer lekker."],
      ["Hoeveel kopjes?", "Kijk hoeveel kopjes er in één keer in gaan. Een grote kan is handig als je veel drinkt of bezoek hebt."],
      ["Gaat hij vanzelf uit?", "Een machine die na een tijdje vanzelf uitgaat, is veiliger en zuiniger."],
      ["Goedkoop per kopje", "Met gemalen koffie in de aanbieding kost een kopje maar een paar cent."],
    ],
  },
};
const SOORT_KEYS = Object.keys(CFG.soorten || {}).filter(k => SOORT[k]);
const DRINK = { zwart: "Zwarte koffie", espresso: "Espresso", melk: "Met melk" };

// ---------- feed: machines per soort ----------
const FEED = CFG.aan === true ? readJson(process.env.KB_KM_FEED || CFG.feed_bestand || "coolblue.json", null) : null;
const BY = {}; // soort -> [product]
if (FEED && Array.isArray(FEED.products)) {
  const rx = s => (s ? new RegExp(s, "i") : null);
  for (const p of FEED.products) {
    if (!p || typeof p.name !== "string" || !(p.price > 0) || !p.id || !/^https:\/\//.test(p.link || "")) continue;
    const t = p.name + " " + (p.cat || "");
    for (const k of SOORT_KEYS) {
      const s = CFG.soorten[k];
      if (!rx(s.herkennen)?.test(t)) continue;
      if (!rx(s.niet)?.test(t)) (BY[k] = BY[k] || []).push(p); // bijv. Vertuo: past niet bij de supermarktcups, dus helemaal niet tonen
      break;
    }
  }
}
const ACTIVE = SOORT_KEYS.filter(k => (BY[k] || []).length);
export const KM_ON = CFG.aan === true && ACTIVE.length > 0;
if (CFG.aan === true) console.log(KM_ON ? `Koffiemachines: aan, ${ACTIVE.map(k => `${k} ${BY[k].length}`).join(", ")}` : "Koffiemachines: staat aan, maar er is geen (bruikbare) coolblue.json. Sectie overgeslagen.");
if (KM_ON && !GO_ON) console.warn("Koffiemachines: partnerlinks (/go/) staan uit, dus de kaartjes krijgen geen knop 'Bekijk bij Coolblue'.");
const urlOf = k => `${KM_URL}${k}/`;
export const KM_URLS = KM_ON ? [KM_URL, ...ACTIVE.map(urlOf)] : [];
export const KM_SLUG = KM_ON ? "koffiemachines" : null; // vast adres: geen merk mag dit innemen

// ---------- rekenen ----------
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
const match = (d, f) => (!f.type || d.type === f.type) && (!f.sys || d.sys === f.sys);
// Goedkoopste aanbieding van deze week voor de koffie die in deze machine past -> prijs per kopje.
function cheapest(k, deals) {
  const s = SOORT[k];
  const ok = deals.filter(d => match(d, s.f) && d.pp != null && d.pu === s.unit && !isCombo(d) && !d.vertuo && !d.next);
  if (!ok.length) return null;
  const lo = ok.reduce((m, d) => (d.pp < m.pp ? d : m));
  return { d: lo, cpk: s.unit === "kilo" ? lo.pp * GRAM / 1000 : lo.pp };
}
const isMelk = p => /melk|latte|cappuccino|milk|lattego|opschuim/i.test(p.name + " " + (p.desc || ""));
const isCompact = p => /compact|mini\b|slim|smal|klein|stil/i.test(p.name + " " + (p.desc || ""));
const num = s => parseFloat(String(s).replace(",", "."));

// Kenmerken in gewone taal, in onze eigen woorden. Alleen getallen en functies uit de feed, nooit de tekst van de winkel.
function kenmerken(p, k) {
  const t = p.name + " " + (p.desc || ""), out = [];
  const add = s => { if (s && !out.includes(s)) out.push(s); };
  let m;
  if (k === "volautomaat" || k === "nespresso") {
    if (isMelk(p)) add(k === "nespresso" ? "Met melkopschuimer voor cappuccino" : "Maakt zelf melkschuim: cappuccino met één knop");
    if ((m = t.match(/(\d{1,2})\s*(?:verschillende\s+)?(?:dranken|koffiespecialiteiten|recepten|koffievariaties|koffiesoorten)/i)) && +m[1] >= 2 && +m[1] <= 40) add(`${m[1]} soorten koffie met één knop`);
  }
  if ((m = t.match(/bonen(?:reservoir|bak|container|houder)[^.\d]{0,30}(\d{2,4})\s*(?:g\b|gram)/i)) && +m[1] >= 100 && +m[1] <= 700) add(`Bonenbak van ${m[1]} gram`);
  if ((m = t.match(/water(?:reservoir|tank|bak)[^.\d]{0,30}(\d(?:[.,]\d{1,2})?)\s*(?:l\b|liter)/i)) && num(m[1]) >= 0.3 && num(m[1]) <= 4) add(`Waterreservoir van ${String(num(m[1])).replace(".", ",")} liter`);
  if (k === "filterkoffie" && (m = t.match(/(\d{1,2})\s*(?:kopjes|koppen)/i)) && +m[1] >= 2 && +m[1] <= 20) add(`Zet tot ${m[1]} kopjes in één keer`);
  if (k === "filterkoffie" && /thermos/i.test(t)) add("Thermoskan: koffie blijft warm zonder bitter te worden");
  if (/2 kopjes tegelijk|twee kopjes tegelijk/i.test(t) && k !== "filterkoffie") add("Zet 2 kopjes tegelijk");
  if (/automatische? uitschakel|schakelt (?:zichzelf |automatisch )?uit|auto[- ]?off/i.test(t)) add("Gaat vanzelf uit");
  if (/\bapp\b|bluetooth|wifi|wi-fi/i.test(t)) add("Ook te bedienen met een app");
  if (p.ship === 0) add("Gratis bezorgd");
  return out;
}

// Keuze-regel (zonder vastgezette machine in koffiemachines.json "keuzes"):
//  Onze keuze  = in de middelste prijsband (tussen 25% en 75% van de prijzen) de machine met de meeste herkende kenmerken,
//                +1 punt als hij nu in de aanbieding is; bij gelijkspel de goedkoopste. Geen enkele rol voor vergoeding.
//  Goedkoopst  = laagste prijs (niet getoond als Onze keuze zelf al de goedkoopste is).
//  Derde       = 'melk': naam/omschrijving noemt melk, latte of cappuccino; 'compact': noemt compact, mini, slim of stil. Anders geen derde.
function choose(k) {
  const list = BY[k] || [], pins = (CFG.keuzes || {})[k] || {}, s = CFG.soorten[k] || {};
  const used = new Set(), out = [];
  const pinOf = slot => { const pn = pins[slot]; if (!pn || !pn.id) return null; const p = list.find(x => String(x.id) === String(pn.id)); if (!p) console.warn(`koffiemachines.json: vastgezette ${slot} (${k}) id ${pn.id} niet in de feed; de regel kiest.`); return p ? { p, pin: pn } : null; };
  const score = p => kenmerken(p, k).length + (p.rrp ? 1 : 0);
  const prices = list.map(p => p.price), lo = pct(prices, 0.25), hi = pct(prices, 0.75);
  const free = l => l.filter(p => !used.has(p.id));
  const best = l => [...l].sort((a, b) => score(b) - score(a) || a.price - b.price)[0];
  // 1. Onze keuze
  let top = pinOf("onze_keuze");
  if (!top) { const band = free(list.filter(p => p.price >= lo && p.price <= hi)); const p = best(band.length ? band : free(list)); top = p ? { p } : null; }
  if (top) { used.add(top.p.id); out.push({ slot: "onze_keuze", badge: "Onze keuze", ...top }); }
  // 2. Goedkoopst
  let cheap = pinOf("goedkoopst");
  const minP = Math.min(...prices);
  if (!cheap) { const p = free(list).sort((a, b) => a.price - b.price)[0]; cheap = p && !(top && top.p.price <= p.price) ? { p } : null; }
  if (cheap && !used.has(cheap.p.id)) { used.add(cheap.p.id); out.push({ slot: "goedkoopst", badge: "Goedkoopst", ...cheap }); }
  // 3. Voor melkdrinkers / Stil en compact
  const kind = s.derde === "melk" ? "melk" : s.derde === "compact" ? "compact" : "";
  let third = kind ? pinOf("derde") : null;
  if (kind && !third) { const p = best(free(list.filter(kind === "melk" ? isMelk : isCompact))); third = p ? { p } : null; }
  if (third && !used.has(third.p.id)) { used.add(third.p.id); out.push({ slot: "derde", badge: kind === "melk" ? "Voor melkdrinkers" : "Stil en compact", ...third }); }
  return { picks: out, topIsCheapest: !!top && top.p.price <= minP };
}

// ---------- opmaak ----------
const KM_CSS = [
  ":root{--kmm:#4E341B;--kmk:#C9A77F;--kmt:#EFE5D0;--kmsoft:#F4EEDF}",
  '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--kmm:#E9D3B0;--kmk:#8C6A47;--kmt:#2E241B;--kmsoft:#261D15}}',
  ':root[data-theme="dark"]{--kmm:#E9D3B0;--kmk:#8C6A47;--kmt:#2E241B;--kmsoft:#261D15}',
  // Menu in de kop, onder de naam: twee tekstlinks, de actieve donker met een oranje streep die op de lijn onder de kop staat.
  ".kmnav{display:flex;gap:22px;margin:6px 0 -20px;font-size:15px;font-weight:600;line-height:1.3}",
  ".kmnav a{display:block;padding:2px 0 9px;border-bottom:3px solid transparent;color:var(--mute);text-decoration:none}.kmnav a.on{color:var(--title);border-bottom-color:var(--orange)}.kmnav a:not(.on):hover{color:var(--ink)}.kmnav a:focus-visible{outline:3px solid var(--orange);outline-offset:2px}",
  "@media (max-width:860px){.kmnav{gap:18px;margin:2px 0 -10px;font-size:14.5px}.kmnav a{padding:1px 0 5px}}",
  ".kmbf{list-style:none;margin:0;padding:0;display:grid;gap:10px}.kmbf li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:4px 12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.kmbf img{width:64px;height:72px;object-fit:contain;background:#fff;border-radius:6px}.kmbf strong{display:block;color:var(--ink)}.kmbf .kmbtn{grid-column:1/-1;justify-self:start;margin-top:4px}.kmbf s{color:var(--mute);margin-right:4px}.nw{white-space:nowrap}",
  ".kmbtn{display:inline-block;background:var(--brown);color:var(--brownink);font-weight:700;border-radius:10px;padding:10px 16px;text-decoration:none}.kmbtn:hover,.kmbtn:focus-visible{text-decoration:underline}",
  ".kmsale{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:5px;background:var(--deal);color:var(--dealink);font-size:12px;font-weight:700;vertical-align:2px;white-space:nowrap}",
  ".kmback{background:var(--kmsoft);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:24px 0 0;max-width:720px}.kmback p{margin:0}.kmback strong{color:var(--title)}.kmback a{display:inline-block;margin-top:6px;color:var(--ink);font-weight:700}",
].join("");
// koffiemachines.json "compacte_tabbalk": de tabbalk 'Nu in de aanbieding / Volgende week' op de telefoon op één regel,
// zodat het menu in de kop (Koffie | Koffiemachines) het eerste aanbod niet verder omlaag duwt. Gekozen tabblad blijft oranje.
const TAB_CSS = "@media (max-width:860px){.tabs{gap:6px;margin:0 0 14px;flex-wrap:nowrap}.tabs button{flex:1 1 auto;padding:7px 8px;font-size:14.5px;border-radius:10px;white-space:nowrap;line-height:1.3}.tabs small{margin-left:3px;font-size:13px}}@media (max-width:374px){.tabs button{font-size:13.5px;padding:7px 5px}.tabs small{font-size:12px}}@media (max-width:339px){.tabs button{white-space:normal}}";
const PAGE_CSS = [
  ".kmlead{margin:0;max-width:70ch}.nw{white-space:nowrap}.km h2{font-size:20px;color:var(--title);margin:30px 0 10px}.km h3{margin:0}.km p{max-width:70ch}",
  ".kmq{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 10px}.kmq legend{float:left;width:100%;font-weight:700;font-size:17px;margin:0 0 8px;padding:0}.kmq legend+*{clear:both}.kmq legend small{display:block;font-weight:400;font-size:13px;color:var(--mute)}.kmq fieldset{margin:0}.kmq .chips{position:relative;flex-wrap:wrap;overflow:visible;margin:0;padding:0}",
  "@media (min-width:860px){.kmqs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 10px}.kmqs .kmq{margin:0}}.kmres{background:var(--kmsoft);border-left:4px solid var(--orange);border-radius:8px;padding:12px 14px;margin:0 0 10px;max-width:none}.kmres[hidden]{display:none}.kmres strong{color:var(--title)}.kmres a{color:var(--ink);font-weight:700}",
  ".kmcost{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0}.kmcost>p{margin:0 0 8px;font-size:14px;color:var(--mute)}",
  ".kmbars{list-style:none;margin:0;padding:0}.kmbars li{display:grid;grid-template-columns:7.2em minmax(0,1fr) 4.2em;align-items:center;gap:8px;margin:7px 0;font-size:15px}.kmbars li.on span:first-child{font-weight:700}",
  ".kmbar{position:relative;height:16px;border-radius:4px;background:var(--kmt);overflow:hidden}.kmbar i{position:absolute;top:0;bottom:0;left:0;background:var(--kmm)}.kmbar b{position:absolute;top:0;bottom:0;background:var(--kmk)}.kmbars .v{text-align:right;font-weight:700}",
  ".kmkey{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 0;font-size:13px;color:var(--mute)}.kmkey i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}",
  ".kmsoort{display:grid;gap:10px;margin:0;padding:0;list-style:none}@media (min-width:700px){.kmsoort{grid-template-columns:1fr 1fr}}",
  ".kmsoort a{display:block;height:100%;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--ink);text-decoration:none}.kmsoort a:hover,.kmsoort a:focus-visible{border-color:var(--ink)}.kmsoort strong{font-size:17px;color:var(--title)}.kmsoort a>span{display:block;font-size:14px;color:var(--mute)}.kmsoort em{font-style:normal;font-weight:600;color:var(--ink)}",
  ".kmcards{display:grid;gap:12px}@media (min-width:860px){.kmcards{grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}}",
  ".kmc{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:84px minmax(0,1fr);gap:4px 12px;scroll-margin-top:12px}.kmc.top{border:2px solid var(--orange);padding:11px 13px}",
  ".kmb{grid-column:1/-1;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mute)}.kmc.top .kmb{color:var(--orange)}",
  ".kmimg{width:84px;height:96px;border-radius:8px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden}.kmimg img{max-width:100%;max-height:100%;object-fit:contain}",
  ".kmc h3{font-size:17px;line-height:1.3;color:var(--ink);overflow-wrap:anywhere}.kmp{margin:4px 0;font-size:19px;font-weight:700}.kmp s{font-size:14px;font-weight:400;color:var(--mute);margin-right:4px}",
  ".kmc ul{margin:4px 0;padding-left:18px;font-size:15px}.kmc li{margin:0 0 2px}.kmcpk{margin:4px 0 0;font-size:14px;font-weight:600;color:color-mix(in srgb,var(--ok) 60%,var(--ink))}",
  ".kmcon{grid-column:1/-1;margin:6px 0 0;font-size:14px;color:var(--mute)}.kmgo{grid-column:1/-1;margin-top:8px}",
  ".kmnote{font-size:13px;color:var(--mute);margin:8px 0 0}.kmcoffee{display:block;margin:16px 0 0;background:var(--kmsoft);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--ink);font-weight:700;text-decoration:none;max-width:720px}.kmcoffee:hover{border-color:var(--ink)}",
  ".kmtips h3{font-size:16px;color:var(--title);margin:14px 0 2px}.kmtips p{margin:0}",
  "@media (max-width:480px){.kmc{grid-template-columns:72px minmax(0,1fr)}.kmimg{width:72px;height:84px}.kmbars li{grid-template-columns:6.4em minmax(0,1fr) 3.9em;font-size:14px}}",
].join("");
const ICON = `<svg width="40" height="54" viewBox="0 0 44 58" aria-hidden="true"><rect x="5" y="3" width="34" height="52" rx="6" fill="#6E5F53"/><rect x="11" y="10" width="22" height="8" rx="2" fill="#E8DCC2"/><rect x="16" y="30" width="12" height="7" rx="1" fill="#2B1B0E"/><rect x="12" y="44" width="20" height="5" rx="2" fill="#E8DCC2"/></svg>`;

const NAV_ANCHOR = '</p></div><button class="theme"';
const nav = on => `<nav class="kmnav" aria-label="Onderdelen van Koffieboonus"><a href="/"${on === "koffie" ? ' class="on" aria-current="true"' : ""}>Koffie</a><a href="${KM_URL}"${on === "machines" ? ' class="on" aria-current="true"' : ""}>Koffiemachines</a></nav>`;
// Menu in de kop van elke pagina + opmaak (alleen als de sectie aan staat en er machines zijn).
export function kmInject(tpl) {
  if (!KM_ON) return tpl;
  if (!tpl.includes(NAV_ANCHOR)) { console.warn("koffiemachines.mjs: plek voor het menu in de kop niet gevonden, geen menu."); return tpl; }
  return tpl.replace(NAV_ANCHOR, () => "</p>" + nav("koffie") + "</div><button class=\"theme\"").replace("</style>", () => KM_CSS + (CFG.compacte_tabbalk === true ? TAB_CSS : "") + (GO_ON ? AD_CSS : "") + "</style>");
}

// Rustig blok onderaan /nespresso/, /dolce-gusto/, /senseo/ en /koffiebonen/: naar onze eigen soortpagina (GEEN partnerlink).
export function kmBack(url, deals) {
  if (!KM_ON) return "";
  const k = (CFG.koppeling || {})[url];
  if (!k || !ACTIVE.includes(k)) return "";
  const s = SOORT[k], c = cheapest(k, deals);
  const kop = k === "volautomaat" ? "Koffiebonen, maar nog geen volautomaat?" : `Nog geen ${s.label}, of toe aan een nieuwe?`;
  const prijs = c ? ` Met de ${s.word} van deze week kost een kopje vanaf ${eur(c.cpk)}.` : "";
  const verg = k === "volautomaat" ? "Vergelijk een volautomaat met cups of pads." : k === "senseo" ? "Vergelijk hem met een volautomaat of filterkoffie." : "Vergelijk hem met een volautomaat of padmachine.";
  return `<aside class="kmback"><p>☕ <strong>${esc(kop)}</strong>${esc(prijs)} ${esc(verg)}</p><a href="${urlOf(k)}">Zo kies je een machine ›</a></aside>`;
}

// ---------- keuzes en partnerlinks (bij het laden, zodat ook de Black Friday-pagina ze kan gebruiken) ----------
// Elke getoonde machine krijgt een eigen /go/coolblue-<naam>/ (alleen als de partnerlinks aan staan, anders geen knop).
const GO_IDS = new Map(), GO_TAKEN = new Set();
function goOf(p) {
  if (GO_IDS.has(p.id)) return GO_IDS.get(p.id);
  let id = ("coolblue-" + slug(p.name)).slice(0, 60).replace(/-+$/, ""), n = 2;
  while (GO_TAKEN.has(id)) id = id.replace(/-\d+$/, "") + "-" + n++;
  GO_TAKEN.add(id);
  const ok = GO_ON && addGoLinks([{ id, url: p.link, winkel: WINKEL, netwerk: NETWERK, actief: true }]) === 1;
  GO_IDS.set(p.id, ok && goHref(id) ? id : null);
  return GO_IDS.get(p.id);
}
const PICKS = new Map();
if (KM_ON) for (const k of ACTIVE) { const ch = choose(k); ch.picks.forEach(pk => { pk.go = goOf(pk.p); }); PICKS.set(k, ch); }
// Black Friday: de machines met de grootste prijsverlaging (volgens de normale prijs in de feed), hoogstens 3, uit verschillende soorten.
const BF_PICKS = [];
if (KM_ON) {
  const sale = ACTIVE.flatMap(k => BY[k].filter(p => p.rrp).map(p => ({ k, p, pct: 1 - p.price / p.rrp }))).sort((a, b) => b.pct - a.pct);
  const seenK = new Set();
  for (const x of sale) { if (BF_PICKS.length >= 3) break; if (seenK.has(x.k)) continue; seenK.add(x.k); x.go = goOf(x.p); BF_PICKS.push(x); }
}
// Privacyverklaring: de productfoto's laden rechtstreeks van Coolblue.
if (KM_ON && FEED.products.some(p => p.img)) addPrivacyNote(`<h2>Foto's van koffiemachines</h2><p>Op de pagina's over koffiemachines laden de productfoto's rechtstreeks van de servers van ${esc(WINKEL)}. Je browser maakt dan contact met ${esc(WINKEL)}, die daardoor je IP-adres ziet. We sturen daarbij niet mee van welke pagina je komt. Koffieboonus plaatst zelf geen cookies.</p>`);

// Stuk voor de Black Friday-pagina (black-friday.mjs). null als de sectie uit staat: dan blijft die pagina gelijk.
export function kmBlackFriday() {
  if (!KM_ON) return null;
  const intro = `<p>Welke machine past bij jou, en wat kost een kopje met de koffie van deze week? Dat zie je bij <a href="${KM_URL}">Koffiemachines kiezen en vergelijken</a>. En deze tips:</p>`;
  if (CFG.black_friday_blok !== true || !BF_PICKS.length) return { intro, block: "" }; // besluit 16 nov (optie A): standaard geen Coolblue-blok op de Black Friday-pagina
  const nBtn = BF_PICKS.filter(x => x.go).length;
  const li = BF_PICKS.map(x => `<li>${x.p.img ? `<img src="${esc(x.p.img)}" alt="" width="64" height="72" loading="lazy" referrerpolicy="no-referrer" decoding="async">` : ICON}<div><strong>${esc(x.p.name)}</strong><span class="nw"><s>${eurP(x.p.rrp)}</s><b>${eurP(x.p.price)}</b></span><span class="kmsale">In de aanbieding</span><br><a href="${urlOf(x.k)}" style="color:var(--ink);font-size:14px">${esc(SOORT[x.k].label)}: ${(PICKS.get(x.k)?.picks.length || 0) > 1 ? `onze ${PICKS.get(x.k).picks.length} keuzes` : "onze keuze"} ›</a></div>${x.go ? adLink(x.go, `Bekijk bij ${WINKEL}`, { cls: "kmbtn" }) : ""}</li>`).join("");
  const block = `<section class="bfsec"><h2>Koffiemachines in de aanbieding bij ${esc(WINKEL)}</h2>${nBtn ? adNotice({ knop: nBtn === 1 ? "de knop" : "een knop", keuze: "welke machines we hier laten zien, bepalen wij zelf: per soort de grootste prijsverlaging" }) : ""}<ul class="kmbf">${li}</ul><p class="meta">${esc(WINKEL)} noemt de doorgestreepte prijs de normale prijs. Of dat ook de laagste prijs van de afgelopen 30 dagen is, weten we niet. Vergelijk daarom altijd even.</p></section>`;
  return { intro, block };
}

// ---------- pagina's ----------
function page(tpl, { url, title, desc, trail, body, ld, script = "" }) {
  const { start, footer, theme } = partsOf(tpl);
  const canon = SITE + url;
  const crumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: SITE + t.url })) };
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<link rel="canonical" href="${canon}">`,
    `<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="Koffieboonus">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}">`,
    `<meta property="og:image" content="${SITE}/logo-volledig.png"><meta name="twitter:card" content="summary">`,
    ...[crumbLd, ...ld].map(o => `<script type="application/ld+json">${js(o)}</script>`),
  ].join("\n");
  const top = start.replace("{{HEAD}}", () => head).replace(nav("koffie"), () => nav("machines")).replace("</style>", () => PAGE_CSS + "</style>");
  const crumbs = `<nav class="crumbs" aria-label="Kruimelpad">${trail.map((t, i) => i < trail.length - 1 ? `<a href="${t.url}">${esc(t.name)}</a>` : `<span aria-current="page">${esc(t.name)}</span>`).join(" › ")}</nav>`;
  return `${top}<main><div class="wrap km">\n${crumbs}${body}\n</div></main>\n${footer}\n<script>\n${theme}\n${script}</script>\n</body>\n</html>\n`;
}

function stats(deals) {
  const cups = CUPS_DAY * 365 * YEARS;
  return ACTIVE.map(k => {
    const list = BY[k], c = cheapest(k, deals), med = Math.round(median(list.map(p => p.price)));
    // Machineprijs in de rekensom = de prijs van onze keuze (wat we aanraden), niet de mediaan van alle machines (16 nov, Maurits: 'doe wat het meest eerlijk is').
    const top = PICKS.get(k)?.picks.find(x => x.slot === "onze_keuze")?.p;
    const mach = top ? Math.round(top.price) : med;
    return { k, s: SOORT[k], list, c, med, mach, top, min: Math.min(...list.map(p => p.price)), total: c ? mach + cups * c.cpk : null, koffie: c ? cups * c.cpk : null };
  });
}

function costChart(st) {
  const rows = st.filter(x => x.total != null).sort((a, b) => a.total - b.total);
  if (!rows.length) return "";
  const max = Math.max(...rows.map(x => x.total));
  const w = v => (v / max * 100).toFixed(1);
  const cpks = rows.map(x => x.c.cpk), lo = Math.min(...cpks), hi = Math.max(...cpks);
  const li = rows.map(x => `<li data-k="${x.k}"><span>${esc(x.s.chart)}</span><span class="kmbar" role="img" aria-label="${esc(`${x.s.chart}: machine ${eur0(x.mach)} plus koffie ${eur0(x.koffie)}, samen ${eur0(x.total)}`)}"><i style="width:${w(x.mach)}%"></i><b style="left:${w(x.mach)}%;width:${w(x.koffie)}%"></b></span><span class="v">${eur0(x.total)}</span></li>`).join("");
  return `<section aria-labelledby="km-kost"><h2 id="km-kost">Wat kost een kopje? ${YEARS} jaar, ${CUPS_DAY} kopjes per dag</h2><div class="kmcost"><p>Machine + koffie met de goedkoopste aanbieding van deze week</p><ul class="kmbars">${li}</ul><div class="kmkey"><span><i style="background:var(--kmm)"></i>machine</span><span><i style="background:var(--kmk)"></i>koffie (${lo === hi ? eur(lo) : `${eur(lo)}–${eur(hi).slice(1)}`} per kopje)</span></div></div><p class="kmnote">Machine: de prijs van onze keuze voor die soort bij ${esc(WINKEL)} (zie de pagina per soort). Koffie: de goedkoopste aanbieding van deze week die in de machine past (bij bonen en gemalen koffie rekenen we ${GRAM} gram per kopje). Losse kosten zoals ontkalker en melk tellen we niet mee.</p></section>`;
}

function keuzehulp(st) {
  const data = st.filter(x => x.c).map(x => ({ k: x.k, n: x.s.een, u: urlOf(x.k), f: x.s.fit, c: +x.c.cpk.toFixed(4), m2: !!x.s.melk2, p: x.list.map(p => p.price).sort((a, b) => a - b), pm: x.list.filter(isMelk).map(p => p.price).sort((a, b) => a - b), kp: (PICKS.get(x.k)?.picks || []).map(pk => ({ p: pk.p.price, m: isMelk(pk.p) ? 1 : 0, n: pk.p.name, top: pk.slot === "onze_keuze" ? 1 : 0 })) }));
  if (data.length < 2) return { html: "", script: "" };
  const q = (n, name, legend, opts) => `<fieldset class="kmq"><legend><small>Vraag ${n} van 3</small>${legend}</legend><div class="chips">${opts.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}"><span>${t}</span></label>`).join("")}</div></fieldset>`;
  const html = `<section id="kmhulp" hidden aria-label="Keuzehulp"><div class="kmqs">${q(1, "drink", "Wat drink je meestal?", Object.entries(DRINK))}${q(2, "cups", "Hoeveel kopjes per dag, thuis?", [["1.5", "1–2"], ["3.5", "3–4"], ["6", "5 of meer"]])}${q(3, "budget", "Hoeveel wil je uitgeven aan de machine?", [["100", "Tot €100"], ["300", "Tot €300"], ["0", "Maakt niet uit"]])}</div><p class="kmres" id="kmres" aria-live="polite" hidden></p></section>`;
  // Klein eigen script, zonder opslag en zonder cookies. Zonder JavaScript blijft de keuzehulp verborgen en staan de soorten hieronder als links.
  const script = `(function(){var S=${js(data)},Y=${YEARS},h=document.getElementById("kmhulp"),r=document.getElementById("kmres");if(!h)return;h.hidden=false;
var e=function(n){return"€"+Math.round(n).toLocaleString("nl-NL")},md=function(a){var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2};
function go(){var g=function(n){var i=h.querySelector('input[name="'+n+'"]:checked');return i?i.value:null},d=g("drink"),c=g("cups"),b=g("budget");if(!d||!c||!b)return;c=+c;b=+b||1e9;
var cups=c*365*Y,o=[];S.forEach(function(s){if(s.f.indexOf(d)<0)return;var melk=d==="melk"&&s.pm.length&&s.k!=="dolce-gusto",pr=(melk?s.pm:s.p).filter(function(p){return p<=b});if(!pr.length)return;var kp=s.kp.filter(function(q){return q.p<=b&&(!melk||q.m)}),pk=kp.filter(function(q){return q.top})[0]||kp.sort(function(a,b){return a.p-b.p})[0],m=pk?pk.p:md(pr),k=cups*s.c*(d==="melk"&&s.m2?2:1);o.push({s:s,m:m,k:k,t:m+k,melk:melk,pk:pk})});
o.sort(function(a,b){return a.t-b.t});document.querySelectorAll(".kmbars li").forEach(function(li){li.classList.toggle("on",!!o[0]&&li.getAttribute("data-k")===o[0].s.k)});r.hidden=false;
if(!o.length){r.innerHTML="<strong>Binnen dit budget hebben we nu geen machine die past.</strong> Kies een hoger budget, of bekijk hieronder alle soorten.";return}
var a=o[0],x=a.s.k==="volautomaat"&&a.melk?" met melksysteem":a.s.k==="nespresso"&&a.melk?" met melkopschuimer":"";
r.innerHTML="<strong>Past bij jou: "+a.s.n+x+".</strong> Over "+Y+" jaar kost dat ongeveer "+e(a.t)+": "+e(a.m)+(a.pk?" voor de machine ("+(a.pk.top?"onze keuze":"een van onze keuzes")+": "+a.pk.n+")":" voor een machine binnen je budget")+" en "+e(a.k)+" voor de koffie, met de aanbiedingen van deze week."+(d==="melk"&&a.s.m2?" (Melkdranken kosten twee cups.)":"")+(o[1]?" Op twee: "+o[1].s.n+" (ongeveer "+e(o[1].t)+").":"")+' <a href="'+a.s.u+'">Bekijk onze '+(a.s.kp.length>1?a.s.kp.length+" keuzes":"keuze")+' ›</a>'}
h.addEventListener("change",go)})();\n`;
  return { html, script };
}

const soortCard = (x) => `<li><a href="${urlOf(x.k)}"><strong>${esc(x.s.label)}</strong><span>${esc(x.s.voorwie)}</span><span><em>vanaf ${eurP(x.min)}</em>${x.c ? ` · <span class="nw">±${eur(x.c.cpk)}</span> per kopje` : ""} · ${x.list.length} ${x.list.length === 1 ? "machine" : "machines"}</span></a></li>`;
const howWe = () => `<section aria-labelledby="km-hoe"><h2 id="km-hoe">Hoe kiezen wij?</h2><p>We kiezen per soort zelf twee of drie machines uit het aanbod van ${esc(WINKEL)}: <strong>onze keuze</strong> (een machine die voor de meeste mensen goed past, zonder onnodig duur te zijn), de <strong>goedkoopste</strong>, en soms een machine voor een speciale wens, zoals melk. We kiezen op wat de machine kan, volgens de productinformatie van ${esc(WINKEL)}. De kenmerken en nadelen schrijven we zelf.${GO_ON ? ` Koop je via onze knop, dan krijgen wij een kleine commissie van de winkel. Dat bepaalt nooit welke machines we kiezen of in welke volgorde, en de winkel betaalt ons niet om hier te staan.` : ""} Prijzen kunnen veranderen: controleer de prijs altijd bij de winkel.</p></section>`;

function startPage(tpl, st, upd, deals) {
  const kh = keuzehulp(st);
  const body = [
    `<section class="pagehead"><h1>Welke koffiemachine past bij jou?</h1><p class="kmlead">${kh.html ? "Drie vragen, en je ziet wat een machine je écht kost: de aankoop plus je koffie, met de aanbiedingen van deze week." : "Zie wat een machine je écht kost: de aankoop plus je koffie, met de aanbiedingen van deze week."}</p></section>`,
    kh.html, costChart(st),
    `<section aria-labelledby="km-soort"><h2 id="km-soort">Kies een soort machine</h2><ul class="kmsoort">${st.map(soortCard).join("")}</ul></section>`,
    howWe(),
  ].join("\n");
  const ld = [{ "@context": "https://schema.org", "@type": "ItemList", name: "Soorten koffiemachines", itemListElement: st.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.s.label, url: SITE + urlOf(x.k) })) }];
  const lo = Math.min(...st.map(x => x.min));
  return page(tpl, {
    url: KM_URL, title: "Koffiemachine aanbieding: welke past bij jou? | Koffieboonus",
    desc: `Welke koffiemachine past bij jou? Vergelijk volautomaat, Nespresso, Senseo, Dolce Gusto en filterkoffie: wat kost een kopje met de koffieaanbiedingen van deze week? Machines vanaf ${eurP(lo)}.`,
    trail: [{ name: "Koffieboonus", url: "/" }, { name: "Koffiemachines", url: KM_URL }], body, ld, script: kh.script,
  });
}

function card(x, st, pick, i) {
  const { p, pin = {}, badge, slot } = pick;
  const s = CFG.soorten[x.k] || {};
  const feats = (Array.isArray(pin.kenmerken) && pin.kenmerken.length ? pin.kenmerken : [...kenmerken(p, x.k), ...(s.algemeen || [])]).filter((v, j, a) => a.indexOf(v) === j).slice(0, 3);
  const nadeel = pin.nadeel || (s.nadeel || {})[slot] || "";
  const goId = pick.go;
  const img = p.img ? `<img src="${esc(p.img)}" alt="" width="84" height="96" loading="lazy" referrerpolicy="no-referrer" decoding="async">` : ICON;
  const price = p.rrp ? `<s>${eurP(p.rrp)}</s>${eurP(p.price)}<span class="kmsale">In de aanbieding</span>` : eurP(p.price);
  const cpk = x.c ? `<p class="kmcpk"><span class="nw">±${eur(x.c.cpk)}</span> per kopje met ${esc(x.s.word)} in de aanbieding</p>` : "";
  const btn = goId ? adLink(goId, `Bekijk bij ${WINKEL}`, { cls: "kmbtn" }) : "";
  return `<article class="kmc${i === 0 && slot === "onze_keuze" ? " top" : ""}" id="${esc(goId || "m-" + slug(p.name))}"><div class="kmb">${slot === "onze_keuze" ? "★ " : ""}${esc(badge)}</div><div class="kmimg">${img}</div><div><h3>${esc(p.name)}</h3><p class="kmp">${price}</p>${feats.length ? `<ul>${feats.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}${cpk}</div>${nadeel ? `<p class="kmcon">Nadeel: ${esc(nadeel.replace(/^nadeel:\s*/i, "").replace(/^./, c => c.toLowerCase()))}</p>` : ""}${btn ? `<div class="kmgo">${btn}</div>` : ""}</article>`;
}

function soortPage(tpl, x, st, picks, h) {
  const { pages, dateNL, upd } = h;
  const s = x.s, k = x.k, url = urlOf(k);
  const cups = CUPS_DAY * 365 * YEARS;
  const kost = x.c ? `<p>Met de ${esc(s.word)} van deze week kost een kopje <span class="nw">±${eur(x.c.cpk)}</span>. Over ${YEARS} jaar met ${CUPS_DAY} kopjes per dag is dat samen ongeveer <strong>${eur0(x.total)}</strong>: ${eur0(x.mach)} voor ${x.top ? `onze keuze, de ${esc(x.top.name)},` : "een machine van de middelste prijs"} en ${eur0(x.koffie)} voor de koffie. <a href="${KM_URL}">Vergelijk met andere soorten ›</a></p>` : "";
  const cards = picks.picks.map((pk, i) => card(x, st, pk, i)).join("");
  const pg = pages.get(s.page), n = pg && pg.indexable ? pg.list.length : 0;
  const coffee = n ? `<a class="kmcoffee" href="${s.page}">${esc(s.word.charAt(0).toUpperCase() + s.word.slice(1))} voor deze machine in de aanbieding: ${n} deze week →</a>` : "";
  const others = st.filter(y => y.k !== k).map(y => `<li><a href="${urlOf(y.k)}">${esc(y.s.label)}</a></li>`).join("");
  const body = [
    `<section class="pagehead"><h1>${esc(s.term)}: onze ${picks.picks.length === 1 ? "keuze" : `${picks.picks.length} keuzes`}</h1><p class="kmlead">${esc(s.uitleg)} ${esc(s.voorwie)}</p></section>`,
    kost,
    `<section aria-labelledby="km-keus"><h2 id="km-keus">Onze ${picks.picks.length === 1 ? "keuze" : `${picks.picks.length} keuzes`}: ${esc(s.kort)}</h2>${picks.picks.some(pk => pk.go) ? adNotice({ knop: picks.picks.filter(pk => pk.go).length === 1 ? "de knop" : "een knop", keuze: "welke machines we kiezen en in welke volgorde, bepalen wij zelf" }) : ""}<div class="kmcards">${cards}</div><p class="kmnote">${picks.topIsCheapest && picks.picks[0]?.slot === "onze_keuze" ? "Onze keuze is nu ook de goedkoopste. " : ""}Prijzen bij ${esc(WINKEL)} op ${esc(dateNL(upd))}. Ze kunnen veranderen: controleer de prijs altijd bij de winkel.</p>${coffee}</section>`,
    `<section class="kmtips" aria-labelledby="km-tips"><h2 id="km-tips">Waar let je op bij ${esc(s.machine)}?</h2>${s.tips.map(([t, p]) => `<h3>${esc(t)}</h3><p>${esc(p)}</p>`).join("")}</section>`,
    howWe(),
    `<section class="more"><h2>Andere soorten machines</h2><ul class="links">${others}<li><a href="${KM_URL}">Welke machine past bij jou?</a></li></ul></section>`,
  ].join("\n");
  const ld = [{ "@context": "https://schema.org", "@type": "ItemList", name: `${s.term}: onze keuzes`, itemListElement: picks.picks.map((pk, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Product", name: pk.p.name, ...(pk.p.img && /^https:/.test(pk.p.img) ? { image: pk.p.img } : {}), ...(pk.p.brand ? { brand: { "@type": "Brand", name: pk.p.brand } } : {}), offers: { "@type": "Offer", price: pk.p.price.toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock", url: SITE + url + "#" + (pk.go || "m-" + slug(pk.p.name)), seller: { "@type": "Organization", name: WINKEL } } } })) }];
  const lo = Math.min(...x.list.map(p => p.price));
  return page(tpl, {
    url, title: picks.picks.length > 1 ? `${s.term}: onze ${picks.picks.length} keuzes | Koffieboonus` : `${s.term}: onze keuze | Koffieboonus`,
    desc: `${s.term}: ${picks.picks.length > 1 ? `onze ${picks.picks.length} keuzes` : "onze keuze"}, machines vanaf ${eurP(lo)}${x.c ? `, met wat een kopje kost (nu ±${eur(x.c.cpk)} met ${s.word} in de aanbieding)` : ""}. Eerlijk vergeleken, met voor- en nadelen.`,
    trail: [{ name: "Koffieboonus", url: "/" }, { name: "Koffiemachines", url: KM_URL }, { name: s.label, url }], body, ld,
  });
}

// Schrijft /koffiemachines/ en de soortpagina's (+ de /go/-pagina's van de gekozen machines). Geeft de sitemapregels terug.
// h = hulpmiddelen uit build.mjs: deals (van nu), pages (koffiepagina's), updated, dateNL.
export function writeKoffiemachines(out, tpl, h) {
  if (!KM_ON) return [];
  const { deals } = h;
  const upd = (FEED.updated || h.updated || "").slice(0, 10) || h.updated;
  const st = stats(deals);
  const lines = [];
  // Geheugen (koffiemachines.json uitleg "geheugen"): met h.track komt elke pagina in /paginas.json. De sitemapdatum verandert dan
  // alleen als de gekozen machines, hun prijzen of de goedkoopste prijs per kopje veranderen; build.mjs meldt die pagina's dan aan IndexNow.
  // Zonder h.track (oude build.mjs): datum van de feed, zoals eerst.
  const asList = xs => xs.filter(Boolean).map(x => ({ id: x.p.id, deal: x.p.price, pct: x.p.rrp || 0, end: x.slot || "", pp: x.c ? +x.c.cpk.toFixed(4) : null, shop: x.k || "", type: "Koffiemachine" }));
  const listOf = x => asList([...(PICKS.get(x.k)?.picks || []).map(pk => ({ ...pk, k: x.k, c: x.c })), { p: { id: "soort", price: x.min }, k: x.k, c: x.c }]);
  const write = (url, html, list) => { const dir = path.join(out, url); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), html); const mod = h.track ? h.track(url, list, null, true) : upd; lines.push(`  <url><loc>${SITE}${url}</loc><lastmod>${mod}</lastmod></url>`); };
  write(KM_URL, startPage(tpl, st, upd, deals), st.flatMap(listOf));
  for (const x of st) write(urlOf(x.k), soortPage(tpl, x, st, PICKS.get(x.k), { ...h, upd }), listOf(x));
  const nGo = writeGoPages(out, tpl);
  console.log(`Koffiemachines: ${lines.length} pagina's, ${[...PICKS.values()].reduce((a, c) => a + c.picks.length, 0)} gekozen machines, /go/-pagina's: ${nGo}`);
  return lines;
}
