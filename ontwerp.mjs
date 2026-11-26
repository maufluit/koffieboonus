// Ontwerp van de rest van de site (akkoord Maurits 26 nov 2026; de aanbiedingsblokken zelf blijven zoals ze zijn).
// Schakelaar in ontwerp.json ("aan"). Uit = de site is gelijk aan daarvoor.
// - Ook bekijken: groepen als kaartjes, rustige knoppen zonder onderstreping, lange groepen ingeklapt ("Toon alle").
//   Alle links blijven in de pagina staan (ook voor Google); alleen het tonen verandert.
// - Overzichtstabellen (per soort / per supermarkt) als prijsladder, net als de rekenpagina. Zelfde tekst en links.
// - Veelgestelde vragen met een pijltje, voettekst in rijen, toolbar op de telefoon op één lijn, uitleg onder de lijst inklapbaar,
//   links in de huisstijl (geen standaard-blauw), contactknop, kaartjes op /goedkoopste-koffie/, 404 in huisstijl.
import fs from "node:fs";

let C = { aan: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_ONTWERP || "ontwerp.json", "utf8")) }; } catch { /* geen bestand = uit */ }
export const OW = C.aan === true;
const MAX_ZICHTBAAR = Number.isInteger(C.ook_bekijken_zichtbaar) ? C.ook_bekijken_zichtbaar : 6;

const CSS = `
/* Ook bekijken */
.more{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;align-items:start}.more h2{grid-column:1/-1;margin:0 0 2px}
.more .grp{margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.more .grp h3{margin:0 0 8px;font-size:14px;color:var(--mute);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.more .links{gap:6px}.more .links li{position:relative;padding:5px 12px;background:var(--bg);border:1px solid var(--line);font-size:14px;line-height:1.3;transition:border-color .15s}
.more .links li:hover,.more .links li:focus-within{border-color:var(--ink)}.more .links a{text-decoration:none;color:var(--ink);font-weight:500}.more .links a::after{content:"";position:absolute;inset:0;border-radius:999px}
.more .links .meta{font-size:12px}.more .links .n{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;background:var(--line);color:var(--ink);font-size:12px;font-weight:600}
.more .links.kort li.verborgen{display:none}.ob-meer{margin:8px 0 0;padding:2px 0;border:0;background:none;color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.ob-meer:focus-visible,.faq summary:focus-visible,.uitleg summary:focus-visible,.btn:focus-visible,.more .links a:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
/* Prijsladder in plaats van tabel */
.lad{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}.lad li{position:relative;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.lad li.top{border-color:var(--brown);box-shadow:0 0 0 1px var(--brown)}.lad-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.lad-naam{font-weight:600;font-size:16px}.lad-naam a{text-decoration:none}.lad-naam a::after{content:"";position:absolute;inset:0;border-radius:12px}.lad li:hover:has(a){border-color:var(--ink)}
.lad-naam a:focus-visible{outline:3px solid var(--orange);outline-offset:2px}.lad-naam .pijl{color:var(--mute);margin-left:4px}
.lad-max{font-weight:700;color:var(--title);white-space:nowrap}.lad-max.geen{font-weight:400;color:var(--mute);font-size:14px}
.lad-bar{height:7px;border-radius:999px;background:var(--line);margin:8px 0 6px;overflow:hidden}.lad-bar span{display:block;height:100%;border-radius:999px;background:var(--deal);opacity:.75}.lad li.top .lad-bar span{opacity:1}
.lad-sub{font-size:14px;color:var(--mute)}.lad-max small{font-size:13px;font-weight:400;color:var(--mute)}.lad-tag.hier{background:var(--orange);color:var(--orangeink)}.lad-bar.prijs span{background:var(--brown);opacity:.5}.lad li.top .lad-bar.prijs span{opacity:1}.zt#vergelijk ~ .zt p a,.zt p a{color:var(--ink);font-weight:600}.lad-tag{display:inline-block;margin:0 0 6px;padding:1px 8px;border-radius:999px;background:var(--brown);color:var(--brownink);font-size:12px;font-weight:600}
/* Veelgestelde vragen */
.faq details{padding:0;border-radius:12px;overflow:hidden}.faq summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 16px}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"";flex:none;width:8px;height:8px;border-right:2px solid var(--mute);border-bottom:2px solid var(--mute);transform:rotate(45deg) translate(-2px,-2px);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(-135deg) translate(-2px,-2px)}.faq details[open] summary{border-bottom:1px solid var(--line)}.faq details p{margin:0;padding:12px 16px 14px;color:var(--ink)}.faq summary:hover{background:color-mix(in srgb,var(--line) 35%,transparent)}
/* Uitleg onder de lijst */
.uitleg{margin:14px 0 0;font-size:14px;color:var(--mute)}.uitleg summary{cursor:pointer;display:inline-flex;align-items:center;gap:6px;list-style:none}.uitleg summary::-webkit-details-marker{display:none}
.uitleg summary::before{content:"i";display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--mute);font:700 11px/1 var(--font);font-style:normal}
.uitleg[open] summary{margin-bottom:6px}.uitleg p{margin:0 0 6px;max-width:70ch}.uitleg #hint,.uitleg #ppnote{margin:0 0 6px}
/* Voettekst */
footer .wrap{display:flex;flex-direction:column;align-items:center;gap:10px}footer .ft-nav{order:-1;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 18px;font-size:14px}
footer .ft-nav a{color:var(--ink);font-weight:500;text-decoration:none}footer .ft-nav a:hover{text-decoration:underline}footer .ft-txt{margin:0;max-width:62ch;line-height:1.55}
footer .kb-a2hsw{margin:2px 0 0}footer .kb-a2hs{padding:6px 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);text-decoration:none;font-weight:600;font-size:13px}
/* Knoppen in tekst (contact, 404) */
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:var(--brown);color:var(--brownink);font-weight:600;text-decoration:none}.btn:hover{opacity:.92}
.btn.licht{background:var(--card);color:var(--ink);border:1px solid var(--line)}.prose a.btn{color:var(--brownink);text-decoration:none}.prose a.btn.licht{color:var(--ink)}.btns{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
/* Goedkoopste koffie: kaartjes per soort */
.hubcards{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.hubcards li{margin:0}
.hubcards a{display:block;height:100%;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--ink)}.hubcards a:hover{border-color:var(--ink)}
.hc-soort{display:block;font-weight:600}.hc-prijs{display:block;font-size:22px;font-weight:700;color:var(--title);margin:2px 0}.hc-prijs small{font-size:13px;font-weight:400;color:var(--mute)}.hc-waar{display:block;font-size:14px;color:var(--mute)}
@media (max-width:860px){
.bar{flex-wrap:wrap;row-gap:6px;margin-top:14px}.bar #count{flex:1 1 100%;font-size:16px}.bar .kb-share.inbar{margin:0}.bar #reset{margin-left:auto;white-space:nowrap}
.sortrow label{white-space:nowrap}.sortrow select{flex:1 1 auto}
.more{grid-template-columns:1fr}.hubcards{grid-template-columns:repeat(2,minmax(0,1fr))}.hc-prijs{font-size:20px}}
`;

const JS = `<script>
/* Ontwerp (ontwerp.mjs): Ook bekijken inklappen, uitleg onder de lijst inklapbaar. Alles staat ook zonder dit script gewoon op de pagina. */
document.addEventListener("DOMContentLoaded",function(){
 var MAX=${MAX_ZICHTBAAR};
 document.querySelectorAll(".more .links").forEach(function(ul){
  var li=ul.children;if(li.length<MAX+3)return; /* alleen inklappen als er minstens 3 verdwijnen */
  for(var i=MAX;i<li.length;i++)li[i].classList.add("verborgen");
  ul.classList.add("kort");
  var b=document.createElement("button");b.type="button";b.className="ob-meer";b.setAttribute("aria-expanded","false");
  b.textContent="Toon alle "+li.length+" ›";
  b.addEventListener("click",function(){var open=ul.classList.toggle("kort");b.setAttribute("aria-expanded",open?"false":"true");b.textContent=open?"Toon alle "+li.length+" ›":"Toon minder"});
  ul.after(b);
 });
 if(document.body.classList.contains("hub"))return;
 var h=document.getElementById("hint"),p=document.getElementById("ppnote");if(!h&&!p)return;
 var d=document.createElement("details");d.className="uitleg";d.innerHTML="<summary>Hoe we sorteren en rekenen</summary>";
 var ref=(h&&p&&(h.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING))?h:(p||h);
 ref.parentNode.insertBefore(d,ref);if(h)d.appendChild(h);if(p)d.appendChild(p);
});
</script>`;

// In het sjabloon: stijl, script en een opgeschoonde voettekst. Aanroepen nádat de footer-links zijn toegevoegd.
export function ontwerpInject(tpl) {
  if (!OW) return tpl;
  // Basiskleur voor links helemaal vooraan (zwakker dan elke bestaande regel); de eigen regels achteraan (winnen van de oude).
  let t = tpl.replace("<style>", () => "<style>a{color:var(--ink)}").replace("</style>", () => CSS + "</style>");
  t = t.replace("</head>", () => JS + "\n</head>");
  t = t.replace(/<footer><div class="wrap">([\s\S]*?)(<nav[^>]*>[\s\S]*?<\/nav>)?<\/div><\/footer>/, (m, txt, nav) =>
    `<footer><div class="wrap"><p class="ft-txt">${txt}</p>${nav ? nav.replace(/<nav style="[^"]*"/, '<nav class="ft-nav"').replace(/<\/a> · /g, "</a>") : ""}</div></footer>`);
  return t;
}

// Tabel (class zttab) omzetten naar een prijsladder. Zelfde namen, links en getallen; gesorteerd op hoogste korting.
export function ladder(tabel) {
  if (!OW) return tabel;
  const kop = [...tabel.matchAll(/<th scope="col">([^<]*)<\/th>/g)].map(m => m[1]);
  const eenheid = (kop[3] || "").match(/per (\w+)$/);
  const rijen = [...tabel.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th><td>([^<]*)<\/td><td>([^<]*)<\/td>(?:<td>([^<]*)<\/td>)?<\/tr>/g)].map(m => ({ naam: m[1], n: +m[2], max: parseInt(m[3], 10) || 0, laag: m[4] && m[4] !== "–" ? m[4] : "" }));
  if (!rijen.length) return tabel;
  rijen.sort((a, b) => b.max - a.max || b.n - a.n);
  const top = Math.max(...rijen.map(r => r.max));
  const li = rijen.map((r, i) => {
    const isTop = i === 0 && r.max > 0 && rijen.filter(x => x.max === r.max).length === 1;
    const naam = r.naam.replace(/<\/a>$/, '<span class="pijl" aria-hidden="true">›</span></a>');
    const laag = r.laag ? ` · vanaf ${r.laag}${eenheid ? " per " + eenheid[1] : ""}`.replace("/", " per ") : "";
    return `<li${isTop ? ' class="top"' : ""}>${isTop ? '<span class="lad-tag">Meeste korting</span>' : ""}<div class="lad-top"><span class="lad-naam">${naam}</span>${r.max ? `<span class="lad-max">tot ${r.max}% korting</span>` : '<span class="lad-max geen">korting onbekend</span>'}</div><div class="lad-bar" aria-hidden="true"><span style="width:${top ? Math.max(r.max ? 4 : 0, Math.round(r.max / top * 100)) : 0}%"></span></div><div class="lad-sub">${r.n} ${r.n === 1 ? "aanbieding" : "aanbiedingen"}${laag}</div></li>`;
  });
  return tabel.replace(/<div class="ztwrap"><table class="zttab">[\s\S]*?<\/table><\/div>/, `<ul class="lad">${li.join("")}</ul>`);
}
