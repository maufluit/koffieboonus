// Haalt de Roastmarket-feed op (Awin, 1 verzoek) en kiest de zakken voor het advertentieblok (zie roastmarket.json).
// Schrijft roastmarket-feed.json (alleen de gekozen zakken) en hun foto's in rm-fotos/. Beide komen nooit in git.
// Feedlink alleen uit het secret ROASTMARKET_FEED_URL. Testen: KB_FEED_FILE=<bestand.csv(.gz)> KB_RM=<instellingen> KB_DATUM=JJJJ-MM-DD.
import fs from "node:fs";
import zlib from "node:zlib";

const CFG = JSON.parse(fs.readFileSync(process.env.KB_RM || "roastmarket.json", "utf8"));
if (CFG.aan !== true && !process.env.KB_RM) { console.log("Roastmarket: uit (roastmarket.json), feed niet opgehaald."); process.exit(0); }
const TODAY = /^\d{4}-\d{2}-\d{2}$/.test(process.env.KB_DATUM || "") ? process.env.KB_DATUM : new Date().toISOString().slice(0, 10);

async function load() {
  if (process.env.KB_FEED_FILE) return fs.readFileSync(process.env.KB_FEED_FILE);
  const u = process.env.ROASTMARKET_FEED_URL;
  if (!u) throw new Error("geen secret ROASTMARKET_FEED_URL");
  const r = await fetch(u, { signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return Buffer.from(await r.arrayBuffer());
}
export function parseCsv(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const h = rows.shift() || [];
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}
const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function choose(rows, cfg, today) {
  const cats = cfg.categorieen || ["Derde koffie", "Eigen merk"];
  const c = [];
  for (const r of rows) {
    if (!cats.includes(r.merchant_category) || String(r.in_stock).trim() !== "1") continue;
    const parts = r.product_name.split(" | ").map(s => s.trim());
    const all = parts.join(" ");
    if (/capsul|kapsel|\bpads?\b|e\.s\.e|cups?\b|oplos|instant/i.test(all)) continue;
    const kind = /gemalen|gemahlen|filterma/i.test(all) ? "Gemalen" : /bo(o|h)n|bohne/i.test(all) ? "Hele bonen" : null;
    if (!kind) continue;
    const g = (r.base_price_text || "").match(/^([\d.]+)\s*g$/); const gram = g ? num(g[1]) : NaN;
    if (!(gram >= 100 && gram <= 5000)) continue;
    const prijs = num(r.search_price), oud = num(r.product_price_old), pct = Math.round(100 * (1 - prijs / oud));
    const actie = r.savings_percent.trim() && r.valid_to && r.valid_to.slice(0, 10) >= today && (!r.valid_from || r.valid_from.slice(0, 10) <= today);
    if (!actie || !(prijs > 0) || !(oud > prijs) || pct < 5) continue;
    const kilo = prijs / gram * 1000;
    const link = r.aw_deep_link; if (!/^https:\/\/www\.awin1\.com\//.test(link)) continue;
    c.push({ id: r.aw_product_id, merk: r.brand_name.trim(), naam: parts[0], soort: kind, gram, prijs, oud, pct, kilo, kop: kilo * (cfg.gram_per_kopje || 8) / 1000,
      tot: r.valid_to.slice(0, 10), verzend: num(r.delivery_cost), link, foto: r.merchant_image_url || r.aw_image_url });
  }
  c.sort((a, b) => b.pct - a.pct || a.kilo - b.kilo);
  const out = [], merken = new Set();
  for (const id of cfg.vast || []) { const x = c.find(z => z.id === String(id)); if (x && !merken.has(x.merk)) { out.push(x); merken.add(x.merk); } }
  for (const x of c) { if (out.length >= (cfg.aantal || 3)) break; if (!merken.has(x.merk)) { out.push(x); merken.add(x.merk); } }
  return { kandidaten: c.length, items: out.slice(0, cfg.aantal || 3) };
}

async function main() {
  let b = await load(); if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  const rows = parseCsv(b.toString("utf8"));
  const { kandidaten, items } = choose(rows, CFG, TODAY);
  fs.mkdirSync("rm-fotos", { recursive: true });
  for (const x of items) {
    const s0 = slug(x.naam.toLowerCase().startsWith(x.merk.toLowerCase()) ? x.naam : x.merk + " " + x.naam);
    x.go = "roastmarket-" + (s0.length > 48 ? s0.slice(0, 48).replace(/-[^-]*$/, "") : s0);
    try { // foto zelf opslaan: geen verzoek van de bezoeker naar Roastmarket of Awin (cookievrij)
      const r = await fetch(x.foto, { signal: AbortSignal.timeout(30000) });
      const t = r.headers.get("content-type") || "";
      if (r.ok && /^image\/(jpeg|png|webp)/.test(t)) { const ext = t.split("/")[1].replace("jpeg", "jpg"); fs.writeFileSync(`rm-fotos/${x.go}.${ext}`, Buffer.from(await r.arrayBuffer())); x.foto = `/rm-fotos/${x.go}.${ext}`; }
      else x.foto = null;
    } catch { x.foto = null; }
  }
  fs.writeFileSync("roastmarket-feed.json", JSON.stringify({ bijgewerkt: new Date().toISOString(), datum: TODAY, producten: rows.length, kandidaten, items }));
  console.log(`Roastmarket: ${rows.length} producten, ${kandidaten} zakken in de aanbieding, ${items.length} gekozen, ${items.filter(x => x.foto).length} foto's.`);
}
if (process.argv[1] && process.argv[1].endsWith("feed-roastmarket.mjs")) main().catch(e => { console.log("Roastmarket-feed mislukt:", String(e.message).replace(/https?:\/\/\S+/g, "[link]")); process.exit(0); });
