// Verzonnen testfeed met koffiemachines, in de vorm van een Awin-productfeed (CSV). NIET echt: merken en namen zijn verzonnen.
// Gebruik: node test/maak-testfeed.mjs > testfeed.csv          (of: --gzip > testfeed.csv.gz)
//          node test/maak-testfeed.mjs --fotos <map>            (schrijft ook simpele testfoto's als SVG in <map>, voor /testfoto/...)
// Daarna: KB_FEED_FILE=testfeed.csv KB_KM=<testinstellingen> node feed-coolblue.mjs  -> coolblue.json. Nooit committen.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const fotoDir = args.includes("--fotos") ? args[args.indexOf("--fotos") + 1] : null;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const MERK = ["Kofra", "Bonissimo", "Morgenrood", "Tazza", "Brevio"]; // verzonnen merken
const COLS = ["aw_deep_link", "product_name", "aw_product_id", "merchant_product_id", "merchant_image_url", "aw_image_url", "description", "merchant_category", "category_name", "search_price", "rrp_price", "store_price", "brand_name", "in_stock", "delivery_cost", "last_updated"];
const rows = [];
let id = 900100;
function add(soort, cat, name, price, desc, { rrp = null, stock = 1, ship = 0 } = {}) {
  const i = id++;
  rows.push({
    aw_deep_link: `https://www.awin1.com/pclick.php?p=${i}&a=TEST&m=TEST`, product_name: name, aw_product_id: String(i), merchant_product_id: "T" + i,
    merchant_image_url: `/testfoto/${soort}.svg`, aw_image_url: "", description: desc, merchant_category: cat, category_name: "Koffiemachines",
    search_price: price.toFixed(2), rrp_price: rrp ? rrp.toFixed(2) : "", store_price: "", brand_name: name.split(" ")[0], in_stock: String(stock), delivery_cost: String(ship), last_updated: "2026-11-16 03:00:00",
  });
}
const m = () => MERK[Math.floor(rnd() * MERK.length)];
const sale = p => (rnd() < 0.35 ? Math.round(p * (1.15 + rnd() * 0.25)) - 0.01 : null);
// Volautomaten (12)
const VA = [["Basis 2000", 279, false], ["Basis 2200", 309, false], ["Crema 3100", 349, true], ["Crema 3300 Latte", 429, true], ["Barista 4000", 389, false], ["Barista 5200 Cappuccino", 549, true], ["Comfort 600", 459, true], ["Comfort 800 Latte", 649, true], ["Mini Compact", 299, false], ["Premium 9000 Melk", 899, true], ["Silent 3000", 369, false], ["Duo 7000 Latte", 729, true]];
for (const [n, p, melk] of VA) add("volautomaat", "Volautomatische espressomachines", `${m()} Volautomaat ${n}`, p - 0.01, `Testmachine. Pomp van 15 bar. Waterreservoir ${(1.5 + rnd()).toFixed(1).replace(".", ",")} liter, bonenreservoir ${200 + Math.floor(rnd() * 6) * 25} gram. ${2 + Math.floor(rnd() * 12)} koffiespecialiteiten.${melk ? " Met melksysteem voor cappuccino en latte." : ""}${rnd() < 0.5 ? " Schakelt automatisch uit." : ""}`, { rrp: sale(p) });
// Nespresso Original (8) + 2 Vertuo (moeten wegvallen)
const NE = [["Nespresso Mini", 79], ["Nespresso Compact", 99], ["Nespresso Classic", 129], ["Nespresso Melk Duo", 169], ["Nespresso Latte Plus", 229], ["Nespresso Pure", 109], ["Nespresso Slim", 89], ["Nespresso Barista Cappuccino", 279]];
for (const [n, p] of NE) add("nespresso", "Nespresso machines", `${m()} ${n}`, p - 0.01, `Testmachine voor Nespresso Original-cups. 19 bar. Waterreservoir 0,${6 + Math.floor(rnd() * 4)} liter.${/Melk|Latte|Cappuccino/.test(n) ? " Met melkopschuimer." : ""} Gaat na 9 minuten automatisch uit.`, { rrp: sale(p) });
add("nespresso", "Nespresso machines", `${m()} Nespresso Vertuo Next`, 99.99, "Testmachine voor Vertuo-cups.");
add("nespresso", "Nespresso machines", `${m()} Nespresso Vertuo Pop`, 79.99, "Testmachine voor Vertuo-cups.");
// Dolce Gusto (6)
const DG = [["Dolce Gusto Piccolo", 49], ["Dolce Gusto Mini", 59], ["Dolce Gusto Genio", 89], ["Dolce Gusto Infinissima", 69], ["Dolce Gusto Eclipse", 129], ["Dolce Gusto Movenza", 99]];
for (const [n, p] of DG) add("dolce-gusto", "Capsulemachines", `${m()} ${n}`, p - 0.01, `Testmachine voor Dolce Gusto-cups. 15 bar. Waterreservoir 0,8 liter.${rnd() < 0.5 ? " Gaat automatisch uit." : ""}`, { rrp: sale(p) });
// Senseo / padmachines (7)
const SE = [["Senseo Original", 69], ["Senseo Switch", 99], ["Senseo Viva", 79], ["Senseo Select", 109], ["Senseo Compact", 59], ["Senseo Up Mini", 64], ["Senseo Quadrante", 89]];
for (const [n, p] of SE) add("senseo", "Koffiepadmachines", `${m()} ${n}`, p - 0.01, `Testmachine voor koffiepads. Zet 2 kopjes tegelijk. Waterreservoir ${(0.7 + rnd() * 0.5).toFixed(1).replace(".", ",")} liter.`, { rrp: sale(p) });
// Filterkoffie (7)
const FI = [["Koffiezetapparaat Basic", 29], ["Koffiezetapparaat Aroma", 49], ["Filterkoffie Thermos", 79], ["Koffiezetapparaat Grand 15", 59], ["Filterkoffie Duo", 99], ["Koffiezetapparaat Timer", 69], ["Filterkoffie Mini 6", 35]];
for (const [n, p] of FI) add("filterkoffie", "Filterkoffiezetapparaten", `${m()} ${n}`, p - 0.01, `Testmachine voor filterkoffie. Voor ${n.includes("Mini") ? 6 : 10 + Math.floor(rnd() * 6)} kopjes.${n.includes("Thermos") ? " Met thermoskan." : " Met glazen kan."} Schakelt automatisch uit.`, { rrp: sale(p) });
// Moeten allemaal wegvallen: accessoires, niet op voorraad, andere soort
add("volautomaat", "Volautomatische espressomachines", "Kofra Ontkalker voor volautomaten", 14.99, "Testproduct.");
add("volautomaat", "Volautomatische espressomachines", "Kofra Volautomaat Uitverkocht 1000", 399.99, "Testmachine.", { stock: 0 });
add("filterkoffie", "Koffiemolens", "Tazza Koffiemolen elektrisch", 39.99, "Testproduct.");
add("volautomaat", "Waterkokers", "Brevio Waterkoker 1,7 liter", 29.99, "Testproduct.");

const esc = v => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
const csv = [COLS.join(","), ...rows.map(r => COLS.map(c => esc(r[c] ?? "")).join(","))].join("\n") + "\n";
process.stdout.write(args.includes("--gzip") ? zlib.gzipSync(csv) : csv);

if (fotoDir) {
  fs.mkdirSync(fotoDir, { recursive: true });
  const C = { volautomaat: "#4E341B", nespresso: "#2B2B2B", "dolce-gusto": "#B23A1E", senseo: "#1F4E8C", filterkoffie: "#6E5F53" };
  for (const [k, c] of Object.entries(C)) fs.writeFileSync(path.join(fotoDir, k + ".svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="192" viewBox="0 0 168 192"><rect width="168" height="192" fill="#fff"/><rect x="44" y="20" width="80" height="150" rx="12" fill="${c}"/><rect x="58" y="36" width="52" height="18" rx="4" fill="#E8DCC2"/><rect x="70" y="96" width="28" height="18" rx="3" fill="#111"/><rect x="60" y="140" width="48" height="10" rx="4" fill="#E8DCC2"/><text x="84" y="186" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#999">TESTFOTO</text></svg>`);
}
