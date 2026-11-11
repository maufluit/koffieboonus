// Feedback van bezoekers: duimpjes, vakje "Wat miste je?" en anonieme klik-/filtertelling.
// Schakelaar en adres in feedback.json. Uit (of zonder url) = de pagina's blijven letter voor letter gelijk.
import fs from "node:fs";
let F = { aan: false, url: "" };
try { F = { ...F, ...JSON.parse(fs.readFileSync("feedback.json", "utf8")) }; } catch { /* geen bestand = uit */ }
export const FB_ON = !!(F.aan && /^https:\/\/[^"'<>\s]+$/.test(F.url || ""));

const CSS = `<style>
.fb{margin:26px 0 0;padding:16px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.fb-q{margin:0 0 10px;font-weight:700;color:var(--title)}
.fb-btns{display:flex;gap:8px;flex-wrap:wrap}
.fb-b,.fb-send{font:inherit;font-weight:600;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:var(--chip);color:var(--ink);cursor:pointer}
.fb-b:hover,.fb-b:focus-visible,.fb-send:hover,.fb-send:focus-visible{border-color:var(--ink)}
.fb-b:focus-visible,.fb-send:focus-visible,.fb textarea:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.fb-more label{display:block;font-weight:600;margin:0 0 6px}
.fb textarea{display:block;width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);resize:vertical;min-height:84px}
.fb-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap}
.fb-send{background:var(--brown);color:var(--brownink);border-color:var(--brown)}
.fb-small{margin:8px 0 0;font-size:13px;color:var(--mute)}
.fb-thx{margin:0;font-weight:600}
.fb-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.fb [hidden]{display:none}
</style>`;

const HTML = `<section class="fb" id="fb" aria-labelledby="fb-q">
<p class="fb-q" id="fb-q">Vond je wat je zocht?</p>
<div class="fb-btns" id="fb-btns"><button type="button" class="fb-b" data-v="ja"><span aria-hidden="true">👍</span> Ja</button><button type="button" class="fb-b" data-v="nee"><span aria-hidden="true">👎</span> Nee</button></div>
<div class="fb-more" id="fb-more" hidden>
<label for="fb-t">Wat miste je? <span class="fb-small">(mag ook leeg blijven)</span></label>
<textarea id="fb-t" maxlength="500" rows="3" placeholder="Bijvoorbeeld een merk, een winkel, of iets wat niet goed werkte"></textarea>
<div class="fb-hp" aria-hidden="true"><label for="fb-w">Laat dit leeg</label><input id="fb-w" type="text" tabindex="-1" autocomplete="off"></div>
<div class="fb-row"><button type="button" class="fb-send" id="fb-send">Verstuur</button><span class="fb-small" id="fb-n">0 / 500</span></div>
<p class="fb-small">Anoniem: we bewaren geen naam, e-mailadres of IP-adres. Zet hier geen persoonlijke gegevens in.</p>
</div>
<p class="fb-thx" id="fb-thx" role="status" hidden></p>
</section>`;

// Klein script: stuurt alleen {soort, waarde, pagina} naar het eigen tellertje, zonder cookies.
const JS = (url) => `<script>(function(){var U=${JSON.stringify(url)},P=location.pathname;
function s(o){o.p=P;try{var b=JSON.stringify(o);if(navigator.sendBeacon&&navigator.sendBeacon(U,b))return;fetch(U,{method:"POST",body:b,keepalive:true,mode:"no-cors"})}catch(e){}}
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[rel~="sponsored"]');if(!a)return;var m=/Bekijk bij (.+)$/.exec(a.getAttribute("aria-label")||""),r=a.closest(".row"),w=m?m[1]:(r&&r.querySelector(".shop")?r.querySelector(".shop").textContent.trim():"");s({t:"klik",v:w})});
document.addEventListener("change",function(e){var i=e.target;if(i.dataset&&i.dataset.k&&i.checked)s({t:"filter",v:i.dataset.k+":"+i.value});else if(i.id==="sort")s({t:"sort",v:i.value})});
var f=document.getElementById("fb");if(!f)return;
var bt=document.getElementById("fb-btns"),mo=document.getElementById("fb-more"),ta=document.getElementById("fb-t"),hp=document.getElementById("fb-w"),th=document.getElementById("fb-thx"),n=document.getElementById("fb-n");
function klaar(t){bt.hidden=true;mo.hidden=true;th.textContent=t;th.hidden=false}
ta.addEventListener("input",function(){n.textContent=ta.value.length+" / 500"});
f.addEventListener("click",function(e){var b=e.target.closest("[data-v]");
if(b){s({t:"duim",v:b.dataset.v});if(b.dataset.v==="nee"){bt.hidden=true;mo.hidden=false;ta.focus()}else klaar("Fijn om te horen, bedankt!");return}
if(e.target.closest("#fb-send")){var t=ta.value.trim();if(t&&!hp.value)s({t:"tekst",v:t.slice(0,500)});klaar("Bedankt! We lezen elke reactie en gebruiken het om Koffieboonus beter te maken.")}});
})();</script>`;

export function feedbackInject(tpl) {
  return tpl.replace("{{FEEDBACK}}", () => (FB_ON ? CSS + HTML + JS(F.url) : ""));
}
