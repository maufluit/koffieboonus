// Titels en omschrijvingen in Google voor winkelpagina's en de Black Friday-pagina (titels.json). Uit = site ongewijzigd.
import fs from "node:fs";
let C = {};
try { C = JSON.parse(fs.readFileSync(new URL("./titels.json", import.meta.url), "utf8")); } catch { C = {}; }
export const TT = { winkels: C.winkels === true, blackfriday: C.blackfriday === true };

const eur = (n) => "€ " + n.toFixed(2).replace(".", ",");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Goedkoopste per eenheid: eerst bonen/gemalen per kilo, anders cups, anders pads (alleen als de prijs per eenheid zeker is).
function goedkoopste(list) {
  for (const [types, unit, woord] of [[["Bonen"], "kilo", "koffiebonen"], [["Gemalen koffie"], "kilo", "gemalen koffie"], [["Cups"], "cup", "koffiecups"], [["Pads"], "pad", "koffiepads"]]) {
    const c = list.filter((d) => types.includes(d.type) && d.pp != null && d.pu === unit).sort((a, b) => a.pp - b.pp)[0];
    if (c) return `Goedkoopste ${woord}: ${eur(c.pp)} per ${unit}.`;
  }
  return "";
}

// Alleen pagina's van één supermarkt (geen merk, soort of systeem erbij).
export function winkelTitel(p, list, max) {
  if (!TT.winkels || !p.shop || p.type || p.brand || p.sys || !list.length) return null;
  const t = `${p.shop} koffie aanbieding`;
  const A = `${t}: tot ${max}% korting | Koffieboonus`;
  const A2 = `${t}: tot ${max}% korting`;
  const B = `${t}: ${plural(list.length, "deal", "deals")} deze week | Koffieboonus`;
  const title = max >= 10 ? (A.length <= 62 ? A : A2.length <= 58 ? A2 : `${t} | Koffieboonus`) : (B.length <= 62 ? B : `${t} | Koffieboonus`);
  const kern = `${p.shop}: ${plural(list.length, "koffieaanbieding", "koffieaanbiedingen")} deze week${max >= 10 ? `, tot ${max}% korting` : ""}.`;
  const goed = goedkoopste(list);
  const staart = " Met prijs per kilo, cup en pad. Elke nacht bijgewerkt.";
  const desc = [kern + (goed ? " " + goed : "") + staart, kern + (goed ? " " + goed : ""), kern + staart, kern].find((x) => x.length <= 158) || kern;
  return { title, desc };
}

// Black Friday-periode: hoogste korting in de titel, beste deal + eerlijkheid in de omschrijving.
export function bfTitel({ Y, topPct, nameOf, bfDag }) {
  if (!TT.blackfriday || !topPct) return null;
  const A = `Black Friday koffie ${Y}: tot ${topPct.pct}% korting | Koffieboonus`;
  const title = A.length <= 62 ? A : `Black Friday koffie ${Y}: tot ${topPct.pct}% korting`;
  const nm = nameOf(topPct).length > 40 ? nameOf(topPct).slice(0, 40).replace(/\s+\S*$/, "") : nameOf(topPct);
  const kern = `Black Friday ${Y} (${bfDag}): koffie tot ${topPct.pct}% korting bij de supermarkt.`;
  const deal = ` Nu het best: ${nm} bij ${topPct.shop}.`;
  const eerlijk = " Alleen echte aanbiedingen, met prijs per kilo, cup en pad.";
  const desc = [kern + deal + eerlijk, kern + eerlijk, kern + deal, kern].find((x) => x.length <= 158) || kern;
  return { title, desc };
}
