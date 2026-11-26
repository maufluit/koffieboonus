// Verbeteringen "bijna op pagina 1" (Fable-weekend blok 1, 14 nov 2026). Schakelaars in bijna.json.
// Alles uit = de site is letter voor letter gelijk aan daarvoor. De titels en omschrijvingen in Google veranderen niet.
//   winkels:      alle supermarktpagina's krijgen de opzet van /jumbo/ en /albert-heijn/.
//   vindbaar:     pagina's waar mensen aantoonbaar op zoeken blijven in Google staan als er even geen aanbieding is.
//   vragen:       vragen over 1+1 gratis en de prijs per kilo op supermarktpagina's.
//   systemen:     laagste prijs per cup per machine op /goedkoopste-koffiecups/.
//   merknotities: een vaste zin bij een merk.
//   systeem_winkel: (26 nov, wens Maurits) elke machine bij elke supermarkt (bijv. /dolce-gusto/jumbo/) blijft vindbaar, ook zonder aanbieding, met de opzet van de proef.
//   verrijken:    (26 nov, akkoord Maurits) combinatiepagina's met een supermarkt: vergelijking met andere supermarkten, vragen, vaste feiten,
//                 Roastmarket op lege bonen-/gemalen-pagina's, en een vangnet (systeem × supermarkt > 28 dagen leeg = uit Google).
//   proef:        (24 nov) extra pagina's die vindbaar blijven zonder aanbieding, met "nu geen aanbieding" en alternatieven bovenaan.
import fs from "node:fs";

let C = { aan: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_BIJNA || "bijna.json", "utf8")) }; } catch { /* geen bestand = uit */ }
const on = k => C.aan === true && C[k] === true;
export const BN = { winkels: on("winkels"), vindbaar: on("vindbaar"), vragen: on("vragen"), systemen: on("systemen"), merknotities: on("merknotities"), proef: on("vindbaar") && on("proef"), systeemWinkel: on("vindbaar") && on("systeem_winkel"), verrijken: on("verrijken") };
export const PROEF = new Set(BN.proef && Array.isArray(C.proef_paginas) ? C.proef_paginas : []);
export const VINDBAAR = new Set([...(BN.vindbaar && Array.isArray(C.vindbaar_paginas) ? C.vindbaar_paginas : []), ...PROEF]);

// Vaste zin bij een merk (alleen feiten die niet veranderen).
const NOTES = { Perla: "Perla is het huismerk van Albert Heijn. De aanbiedingen lopen daar van maandag tot en met zondag." };
export const brandNote = p => BN.merknotities && p.brand && NOTES[p.brand] ? NOTES[p.brand] : "";

// Supermarktpagina zonder eigen tekst in zoektermen.mjs: dezelfde opzet, met algemene uitleg.
// De eerste uitlegregel ("Tot wanneer lopen de aanbiedingen?") vult build.mjs in uit de aanbiedingen van die dag.
export const autoShopHead = shop => ({
  p: { shop }, term: `${shop} koffie aanbieding`, unit: null, by: "type", auto: true,
  gids: [
    ["Vergelijk de prijs per kilo, pad of cup", "Pakken en doosjes hebben verschillende maten. Daarom zetten we de prijs per kilo, pad of cup erbij, als we die zeker weten."],
    ["Aanbiedingen in de app", `Hier staan de aanbiedingen uit de folder van ${shop}. Persoonlijke aanbiedingen in een app of met een klantenkaart kunnen ontbreken.`],
  ],
});
