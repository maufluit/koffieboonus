// Advertentieblok Roastmarket op de Black Friday-pagina (instellingen: roastmarket.json, data: roastmarket-feed.json uit feed-roastmarket.mjs).
// Uit, of geen feed, of advertentielinks uit = rmBlackFriday() geeft null en de site is letter voor letter gelijk aan daarvoor.
// Testen: KB_RM=<instellingen> KB_RM_FEED=<roastmarket-feed.json>.
import fs from "node:fs";
import { GO_ON, addGoLinks, goHref } from "./extra-paginas.mjs";

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const CFG = readJson(process.env.KB_RM || "roastmarket.json", { aan: false });
const FEED = CFG.aan === true ? readJson(process.env.KB_RM_FEED || "roastmarket-feed.json", null) : null;
const ITEMS = FEED && Array.isArray(FEED.items) ? FEED.items.filter(x => x && x.go && x.link) : [];
export const RM_ON = CFG.aan === true && GO_ON && ITEMS.length > 0;
if (CFG.aan === true) console.log(`Roastmarket-blok: ${RM_ON ? `aan, ${ITEMS.length} zakken` : `uit (${!GO_ON ? "advertentielinks staan uit" : "geen zakken in de aanbieding"})`}`);
if (RM_ON) addGoLinks(ITEMS.map(x => ({ id: x.go, winkel: "Roastmarket", netwerk: "Awin", url: x.link })));
export const RM_FOTOS = RM_ON ? ITEMS.map(x => x.foto).filter(f => /^\/rm-fotos\/[a-z0-9-]+\.(jpg|png|webp)$/.test(f || "")) : [];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const eur = n => "€\u00a0" + n.toFixed(2).replace(".", ",");
const ct = n => Math.round(n * 100) + " cent";
const gew = g => (g >= 1000 ? (g / 1000).toString().replace(".", ",") + " kg" : Math.round(g) + " g");
const dag = d => new Date(d + "T12:00:00Z").toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });
const CSS = ".rmsec .rmnote{font-size:14px;line-height:1.5;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0;max-width:70ch}.rmnote a{color:inherit;font-weight:600}.rmtag{display:inline-block;margin-right:6px;padding:1px 8px;border-radius:999px;background:var(--brown);color:var(--brownink);font-size:12px;font-weight:700;vertical-align:1px}.rmgrid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.rmcard{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}.rmcard img{width:76px;height:76px;object-fit:contain;border-radius:8px;background:#fff;flex:none}.rmbody{min-width:0;display:grid;gap:2px;font-size:14px}.rmmerk{font-size:12px;color:var(--mute);font-weight:600}.rmnaam{font-weight:700;color:var(--title);font-size:15px;line-height:1.3}.rmprijs{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin-top:2px}.rmprijs strong{font-size:17px}.rmprijs s{color:var(--mute)}.rmpct{background:var(--deal);color:var(--dealink);border-radius:6px;padding:0 6px;font-weight:700;font-size:13px}.rmkop{font-weight:600}.rmmeta{color:var(--mute);font-size:12px}.rmcard .go{justify-self:start;margin-top:6px}";

// Geeft { css, block } voor black-friday.mjs, of null (dan verandert er niets).
export function rmBlackFriday() {
  if (!RM_ON) return null;
  const minKop = Math.min(...ITEMS.map(x => x.kop)), maxPct = Math.max(...ITEMS.map(x => x.pct));
  const bar = Number(CFG.koffiebar_prijs) > 0 ? ` In een koffiebar betaal je voor één kop al snel ${eur(Number(CFG.koffiebar_prijs)).replace(",00", "")} of meer.` : "";
  const cards = ITEMS.map(x => {
    const h = goHref(x.go);
    return `<div class="rmcard">${x.foto && RM_FOTOS.includes(x.foto) ? `<img src="${esc(x.foto)}" alt="" width="76" height="76" loading="lazy">` : ""}<div class="rmbody"><span class="rmmerk">${esc(x.merk)}</span><span class="rmnaam">${esc(x.naam.toLowerCase().startsWith(x.merk.toLowerCase() + " ") ? x.naam.slice(x.merk.length + 1) : x.naam)}</span><span class="rmmeta">${esc(x.soort)} · ${gew(x.gram)}</span><span class="rmprijs"><strong>${eur(x.prijs)}</strong><s>${eur(x.oud)}</s><span class="rmpct">-${x.pct}%</span></span><span class="rmkop">Ongeveer ${ct(x.kop)} per kop</span><span class="rmmeta">${eur(x.kilo)} per kilo · actie t/m ${dag(x.tot)}${x.verzend > 0 ? ` · verzendkosten ${eur(x.verzend)}` : ""}</span>${h ? `<a class="go" href="${h}" target="_blank" rel="sponsored nofollow noopener">Bekijk bij Roastmarket</a>` : ""}</div></div>`;
  }).join("");
  const block = `<section class="bfsec rmsec"><h2>Koffiebonen in de aanbieding bij Roastmarket</h2><p class="rmnote"><span class="rmtag">Advertentie</span>Koop je via deze links bij Roastmarket, dan krijgen wij een klein deel. Jij betaalt niets extra. Welke koffie we laten zien, kiezen wij zelf: de grootste korting, daarna de laagste prijs per kilo. <a href="/hoe-verdienen-we-geld/">Hoe verdienen we geld?</a></p><p>Roastmarket is een webshop met koffie van meer dan 100 merken en branderijen. Nu tot ${maxPct}% korting, al vanaf ongeveer ${ct(minKop)} per kop.${bar}</p><div class="rmgrid">${cards}</div><p class="rmmeta">Prijzen en van-prijzen van Roastmarket op ${dag(FEED.datum)}. Prijs per kop met ${CFG.gram_per_kopje || 8} gram koffie per kop.</p></section>`;
  return { css: CSS, block };
}
