// Koffiemachines van Coolblue ophalen (productfeed via Awin) en opslaan in coolblue.json (staat NIET in git, net als deals.json).
// Gebruik (in de workflow): node feed-coolblue.mjs
//   COOLBLUE_FEED_URL = de Awin-feedlink (bevat een sleutel: alleen als GitHub-secret, nooit in een bestand).
//   KB_FEED_FILE      = (alleen voor testen) een lokaal feedbestand (.csv of .csv.gz) in plaats van de link.
//   KB_KM             = (alleen voor testen) ander instellingenbestand dan koffiemachines.json.
// Ontbreekt de link of gaat er iets mis, dan komt er een waarschuwing in het log en GEEN coolblue.json.
// De build slaat de sectie Koffiemachines dan over; de rest van de site wordt gewoon gebouwd. Dit script stopt nooit met een fout.
import fs from "node:fs";
import zlib from "node:zlib";

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
const CFG = readJson(process.env.KB_KM || "koffiemachines.json", {});
const OUT = CFG.feed_bestand || "coolblue.json";
const K = { link: "aw_deep_link", naam: "product_name", id: "aw_product_id", winkel_id: "merchant_product_id", foto: "merchant_image_url", foto_reserve: "aw_image_url", omschrijving: "description", categorie: "merchant_category", categorie_reserve: "category_name", prijs: "search_price", normale_prijs: "rrp_price", normale_prijs_reserve: "store_price", merk: "brand_name", voorraad: "in_stock", bezorgkosten: "delivery_cost", bijgewerkt: "last_updated", ...(CFG.kolommen || {}) };
const warn = msg => { console.warn("Koffiemachines-feed: " + msg); if (process.env.GITHUB_ACTIONS) console.log("::warning title=Koffiemachines-feed::" + msg + " De sectie Koffiemachines wordt overgeslagen."); };

// CSV lezen: komma, puntkomma, tab of | als scheidingsteken; velden tussen "..." mogen komma's, enters en "" bevatten.
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const nl = text.indexOf("\n"), firstLine = nl < 0 ? text : text.slice(0, nl);
  const sep = [",", "\t", "|", ";"].map(s => [s, firstLine.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"' && f === "") q = true;
    else if (c === sep) { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f.replace(/\r$/, "")); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f.replace(/\r$/, "")); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const money = v => { if (v == null || v === "") return null; const s = String(v).replace(/[^\d.,-]/g, ""); const n = parseFloat(/,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };
const yes = v => /^(1|y|yes|ja|true|in stock|instock|op voorraad)$/i.test(String(v || "").trim());
const get = (r, key) => r[K[key]] ?? "";

export function toProducts(rows) {
  const cat = new RegExp(CFG.categorie_filter || "koffie|espresso", "i");
  const out = new RegExp(CFG.uitsluiten || "^$", "i");
  const minP = Number(CFG.min_prijs) || 20;
  const seen = new Set(), list = [];
  let skipCat = 0, skipStock = 0, skipBad = 0;
  for (const r of rows) {
    const name = get(r, "naam"), c = get(r, "categorie") || get(r, "categorie_reserve");
    if (!cat.test(c + " " + name) || out.test(name)) { skipCat++; continue; }
    if (K.voorraad && r[K.voorraad] !== undefined && !yes(r[K.voorraad])) { skipStock++; continue; }
    const price = money(get(r, "prijs")), rrp0 = money(get(r, "normale_prijs")) ?? money(get(r, "normale_prijs_reserve"));
    const link = get(r, "link"), id = get(r, "id") || get(r, "winkel_id");
    if (!name || !id || !(price >= minP) || !/^https:\/\//.test(link)) { skipBad++; continue; }
    if (seen.has(name.toLowerCase())) continue; // dezelfde machine twee keer in de feed: de eerste houden
    seen.add(name.toLowerCase());
    // Coolblue levert foto's van 2048x2048 (±250 KB); op de site zijn ze hoogstens 84 px breed. 500x500 is ±30 KB (getest 16 nov 2026; 300x300 bestaat niet).
    const foto = (get(r, "foto") || get(r, "foto_reserve")).replace(/^(https:\/\/image\.coolblue\.nl\/max\/)\d+x\d+\//, "$1500x500/");
    const dc = get(r, "bezorgkosten");
    list.push({
      id: String(id), name, brand: get(r, "merk"), cat: c, price,
      rrp: rrp0 && rrp0 > price ? rrp0 : null,
      img: /^(https:\/\/|\/)/.test(foto) ? foto : "",
      link, desc: get(r, "omschrijving").slice(0, 3000), // alleen om kenmerken (bar, liter, gram) te herkennen; wordt nooit getoond
      ship: dc === "" ? null : money(dc),
      upd: get(r, "bijgewerkt"),
    });
  }
  console.log(`Koffiemachines-feed: ${rows.length} regels, ${list.length} koffiemachines op voorraad (overgeslagen: ${skipCat} geen koffiemachine, ${skipStock} niet op voorraad, ${skipBad} onvolledig).`);
  return list;
}

async function main() {
  let buf;
  try {
    if (process.env.KB_FEED_FILE) buf = fs.readFileSync(process.env.KB_FEED_FILE);
    else {
      const url = process.env.COOLBLUE_FEED_URL;
      if (!url) { warn("COOLBLUE_FEED_URL ontbreekt (nog geen GitHub-secret)."); return; }
      const r = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { "User-Agent": "koffieboonus-build" } });
      if (!r.ok) throw new Error("HTTP " + r.status); // de link zelf nooit in het log zetten: daar zit de sleutel in
      buf = Buffer.from(await r.arrayBuffer());
    }
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
    const products = toProducts(parseCsv(buf.toString("utf8")));
    if (!products.length) { warn("geen enkele koffiemachine in de feed gevonden (kloppen de kolomnamen en categorie_filter in koffiemachines.json?)."); return; }
    fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), source: "Coolblue via Awin", products }));
    console.log(`Koffiemachines-feed: ${products.length} machines opgeslagen in ${OUT}.`);
  } catch (e) {
    warn(`ophalen of lezen mislukt (${String(e.message || e).replace(/https?:\/\/\S+/g, "[link]")}).`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
