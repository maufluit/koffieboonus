// Pagina's voor de grote zoektermen (groeiplan 12 nov 2026): "koffiebonen aanbieding", "dolce gusto cups aanbieding", enz.
// Schakelaars in zoektermen.json. Alles uit = de site is letter voor letter gelijk aan daarvoor.
//   paginas:  op de pagina's hieronder een kop met de zoekterm ("Koffiebonen aanbieding deze week"),
//             een overzicht per supermarkt en een korte uitleg "Waar let je op?".
//   populair: op elke pagina een blokje "Populair" met links naar deze pagina's (met de zoekterm als linktekst).
// De titels in Google blijven ongewijzigd (die zijn al goed en worden op 17 nov gemeten).
import fs from "node:fs";

let C = { aan: false, paginas: false, populair: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_ZT || "zoektermen.json", "utf8")) }; } catch { /* geen bestand = uit */ }
export const ZT = { paginas: C.aan === true && C.paginas === true, populair: C.aan === true && C.populair === true };

// p = de filters van de pagina (zoals in build.mjs). term = de zoekterm zoals mensen hem typen.
// unit = waarvoor we de laagste prijs tonen. gids = korte, algemene uitleg (geen prijzen of datums: die veranderen).
export const HEAD_TERMS = [
  {
    p: { type: "Bonen" }, term: "Koffiebonen aanbieding", unit: "kilo",
    gids: [
      ["Vergelijk de prijs per kilo", "Koffiebonen zitten in zakken van 250 gram, 500 gram en een kilo. Een kilozak zonder korting is soms goedkoper dan een kleine zak met korting. Daarom zetten we de prijs per kilo erbij, als we die zeker weten."],
      ["1+1 gratis is alleen voordelig als je alles opmaakt", "Een ongeopende zak bonen blijft lang goed: kijk naar de datum op de zak. Na het openen bewaar je bonen het best luchtdicht, koel en donker, en maak je ze binnen een paar weken op."],
      ["Arabica of een melange", "Arabica-bonen smaken meestal milder. Een melange met robusta is krachtiger, geeft vaak meer crema en is vaak goedkoper."],
      ["Huismerk of A-merk", "Ook huismerken, zoals Perla bij Albert Heijn, zijn regelmatig in de aanbieding. Vergelijk daarom niet alleen op merk, maar op prijs per kilo."],
    ],
  },
  {
    p: { sys: "Dolce Gusto" }, term: "Dolce Gusto cups aanbieding", unit: "cup",
    gids: [
      ["Kijk naar de prijs per cup", "Dolce Gusto-cups zitten in doosjes met verschillende aantallen. De prijs per cup laat zien wat je echt betaalt."],
      ["Melkdranken gebruiken vaak twee cups", "Voor een cappuccino of latte macchiato gebruik je vaak een koffiecup én een melkcup. Per kop betaal je dan het dubbele van de prijs per cup."],
      ["Ook andere merken passen", "Capsules met ‘geschikt voor Dolce Gusto’ op de verpakking passen ook in je machine. Die zijn vaak goedkoper dan de cups van het merk zelf."],
    ],
  },
  {
    p: { sys: "Nespresso" }, term: "Nespresso cups aanbieding", unit: "cup",
    gids: [
      ["Original of Vertuo?", "Nespresso heeft twee systemen: Original en Vertuo. De capsules passen niet op elkaars machine. Staat er ‘Vertuo’ op de verpakking, dan zijn ze alleen voor een Vertuo-machine. Ook Starbucks maakt beide soorten. Op deze site krijgen Vertuo-cups het label ‘Alleen voor Vertuo’."],
      ["Veel merken maken Original-capsules", "Voor de Original-machines zijn er capsules van veel merken, zoals L'OR, Perla en huismerken. In de supermarkt zijn dat bijna altijd capsules voor de Original. Op deze pagina staan ze erbij, met het label ‘Past in Nespresso’."],
      ["Kijk naar de prijs per cup", "Doosjes hebben verschillende aantallen capsules. Vergelijk daarom op de prijs per cup."],
    ],
  },
  {
    p: { sys: "Senseo" }, term: "Senseo pads aanbieding", unit: "pad",
    gids: [
      ["Kijk naar de prijs per pad", "Senseo-pads zitten in zakken met verschillende aantallen. De prijs per pad laat zien wat je echt betaalt."],
      ["Een grote mok kost vaak twee pads", "Voor een grote mok gebruik je vaak twee pads, of één speciale XL-pad. Per kop betaal je dan meer dan de prijs per pad."],
      ["Ook andere merken passen", "Pads van andere merken en huismerken passen ook in een Senseo. Ze zijn vaak goedkoper."],
    ],
  },
  {
    p: { type: "Pads" }, term: "Koffiepads aanbieding", unit: "pad",
    gids: [
      ["Kijk naar de prijs per pad", "Zakken met pads hebben verschillende aantallen. De prijs per pad laat zien wat je echt betaalt."],
      ["Pads passen in bijna elke padmachine", "De meeste koffiepads passen in een Senseo en in vergelijkbare padmachines. Voor een grote mok gebruik je vaak twee pads."],
      ["Huismerk of A-merk", "Huismerkpads zijn vaak goedkoper dan Douwe Egberts of Senseo, ook buiten de aanbieding. Vergelijk op prijs per pad."],
    ],
  },
  {
    p: { type: "Cups" }, term: "Koffiecups aanbieding", unit: "cup",
    gids: [
      ["Let op je systeem", "Cups van Nespresso, Dolce Gusto en Tassimo passen niet in elkaars machine. Kies hierboven bij ‘Systeem’ je eigen machine."],
      ["Kijk naar de prijs per cup", "Doosjes hebben verschillende aantallen cups. De prijs per cup laat zien wat je echt betaalt."],
      ["Ook andere merken passen", "Capsules met ‘geschikt voor’ jouw systeem op de verpakking passen ook, en zijn vaak goedkoper."],
    ],
  },
  {
    p: { type: "Gemalen koffie" }, term: "Gemalen koffie aanbieding", unit: "kilo",
    gids: [
      ["Kies de juiste maling", "Voor een filterapparaat koop je snelfiltermaling. Voor een percolator, cafetière of espressopot past een andere maling beter: kijk op de verpakking."],
      ["Vergelijk de prijs per kilo", "Gemalen koffie zit in pakken van 250 gram tot een kilo. Vergelijk daarom op prijs per kilo."],
      ["Bewaren", "Een vacuümpak blijft lang goed. Na het openen bewaar je de koffie luchtdicht, koel en donker."],
    ],
  },
  {
    p: { brand: "Douwe Egberts" }, term: "Douwe Egberts aanbieding", unit: null,
    gids: [
      ["Vergelijk per soort", "Douwe Egberts maakt koffiebonen, filterkoffie, pads en capsules. Kies hierboven bij ‘Type koffie’ je soort, dan zie je de prijs per kilo, pad of cup."],
      ["Aanbiedingen wisselen per supermarkt", "Douwe Egberts is vaak bij één of twee supermarkten tegelijk in de aanbieding. Hieronder zie je per supermarkt wat er nu is."],
    ],
  },
];

const key = p => JSON.stringify(Object.keys(p).sort().map(k => [k, p[k]]));
export const headOf = p => (ZT.paginas || ZT.populair) ? HEAD_TERMS.find(h => key(h.p) === key(p)) || null : null;
