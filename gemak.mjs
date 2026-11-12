// Kleine gemakken voor bezoekers (groeiplan 12 nov 2026). Schakelaars in gemak.json; alles uit = site letter voor letter gelijk.
//   favoriet:    "Onthoud Jumbo als mijn supermarkt". Daarna zie je op elke pagina hoeveel aanbiedingen er bij jouw supermarkt zijn,
//                met een knop "Toon alleen Jumbo". Bewaard in de browser zelf (localStorage, zoals de licht/donker-keuze): geen cookie.
//   beginscherm: Koffieboonus als icoontje op het beginscherm van de telefoon (manifest + knop met uitleg onderaan).
//   delen:       knop "Deel deze pagina" onder de inleiding, en "Deel" bij elke aanbieding (deelmenu van de telefoon,
//                anders link kopiëren). Gedeelde links krijgen ?ref=deel, zodat we kunnen zien wat delen oplevert.
// Er wordt niets naar een server gestuurd en er worden geen scripts van anderen geladen.
import fs from "node:fs";
import path from "node:path";
import { FB_ON } from "./feedback.mjs";

let C = { aan: false, favoriet: false, beginscherm: false, delen: false };
try { C = { ...C, ...JSON.parse(fs.readFileSync(process.env.KB_GEMAK || "gemak.json", "utf8")) }; } catch { /* geen bestand = uit */ }
const ON = C.aan === true;
export const GM = { favoriet: ON && C.favoriet === true, beginscherm: ON && C.beginscherm === true, delen: ON && C.delen === true };
// Tellen (alleen als het feedback-tellertje aan staat): wat er gedeeld wordt, en hoe vaak iemand binnenkomt via een gedeelde link of het beginscherm.
let FBURL = "";
try { const f = JSON.parse(fs.readFileSync("feedback.json", "utf8")); if (FB_ON) FBURL = f.url; } catch { /* geen teller */ }

const ICON = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `.kb-share{display:inline-flex;align-items:center;gap:6px;margin:10px 0 0;font:inherit;font-size:14px;font-weight:600;padding:6px 14px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);cursor:pointer}
.kb-share:hover{border-color:var(--ink)}
.gocell{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.kb-rs{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--mute);cursor:pointer;flex:none}
.kb-rs:hover{color:var(--ink);border-color:var(--ink)}
.kb-share:focus-visible,.kb-rs:focus-visible,.kb-fav button:focus-visible,.kb-a2hs:focus-visible{outline:3px solid var(--orange);outline-offset:2px}
.kb-fav{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:10px 0 0;padding:8px 12px;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:14px}
.kb-fav[hidden]{display:none}
.kb-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--banner);color:var(--bannerink);padding:10px 16px;border-radius:10px;font-size:14px;z-index:50;max-width:90vw;text-align:center}
.kb-toast[hidden]{display:none}
.kb-a2hsw{margin-top:10px}.kb-tip{margin:6px auto 0;max-width:46ch}`;

const HEAD = `<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#FFF9E9" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#16110C" media="(prefers-color-scheme: dark)">`;

const JS = f => `<script>(function(){var F=${JSON.stringify(f)},ICON=${JSON.stringify(ICON)},U=${JSON.stringify(FBURL)};
function tel(t,v){if(!U)return;try{var b=JSON.stringify({t:t,v:String(v).slice(0,120),p:location.pathname});if(navigator.sendBeacon&&navigator.sendBeacon(U,b))return;fetch(U,{method:"POST",body:b,keepalive:true,mode:"no-cors"})}catch(e){}}
/* Binnengekomen via een gedeelde link of het beginscherm: één keer tellen en ?ref=… uit de adresbalk halen. */
try{var q=new URLSearchParams(location.search),rf=q.get("ref");if(rf==="deel"||rf==="app"){tel("via",rf);q.delete("ref");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash)}}catch(e){}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
function h(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var main=typeof sel!=="undefined"&&typeof render==="function"&&typeof pick==="function"&&document.getElementById("list");
function toast(t){var el=document.getElementById("kb-toast");if(!el){el=document.createElement("div");el.id="kb-toast";el.className="kb-toast";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=t;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(function(){el.hidden=true},3000)}
function link(){try{var u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("ref","deel");return u.toString()}catch(e){return location.href}}
function share(text,wat){var url=link(),all=text+" "+url;
 if(navigator.share){navigator.share({title:document.title,text:text,url:url}).then(function(){tel("deel",wat)},function(){});return}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(all).then(function(){tel("deel",wat);toast("Link gekopieerd. Plak hem in WhatsApp, een mail of waar je maar wilt.")},function(){tel("deel",wat);window.open("https://wa.me/?text="+encodeURIComponent(all),"_blank","noopener")});return}
 tel("deel",wat);window.open("https://wa.me/?text="+encodeURIComponent(all),"_blank","noopener")}
/* Delen */
if(F.delen){
 var intro=document.querySelector(".pagehead .intro");
 if(intro){var b=document.createElement("button");b.type="button";b.className="kb-share";b.innerHTML=ICON+"<span>Deel deze pagina</span>";
  b.addEventListener("click",function(){var t=document.querySelector("h1");share((t?t.textContent:"Koffie in de aanbieding")+", gevonden op Koffieboonus:","pagina")});intro.insertAdjacentElement("afterend",b)}
 var list=document.getElementById("list");
 var addRow=function(){if(!list)return;list.querySelectorAll(".row").forEach(function(r){if(r.querySelector(".kb-rs"))return;var a=r.querySelector(".gocell");if(!a)return;var x=document.createElement("button");x.type="button";x.className="kb-rs";x.setAttribute("aria-label","Deel deze aanbieding");x.title="Deel deze aanbieding";x.innerHTML=ICON;a.insertBefore(x,a.firstChild)})};
 if(list){addRow();new MutationObserver(addRow).observe(list,{childList:true});
  list.addEventListener("click",function(e){var x=e.target.closest(".kb-rs");if(!x)return;var r=x.closest(".row"),n=r.querySelector(".name"),q=function(s){var el=r.querySelector(s);return el?el.textContent.trim():""};
   var name=n?n.cloneNode(true):null;if(name){name.querySelectorAll(".meta,.rk").forEach(function(m){m.remove()})}
   var until=r.querySelector(".act .meta"),nm=name?name.textContent.trim():"Koffie",sh=q(".shop .sname")||q(".shop").split(" · ")[0];
   share(nm+" bij "+sh+": "+q(".deal")+(until?" ("+until.textContent.trim()+")":"")+". Gevonden op Koffieboonus:","aanbieding: "+sh+" | "+nm)})}
}
/* Favoriete supermarkt */
if(F.favoriet&&main){
 var K="kb-winkel",box=document.createElement("div");box.className="kb-fav";box.id="kb-fav";box.hidden=true;
 var bar=document.querySelector(".bar");if(bar)bar.parentNode.insertBefore(box,bar);
 var upd=function(){if(!DEALS.length){box.hidden=true;return}
  var fav=lsGet(K),one=sel.shop.size===1?Array.from(sel.shop)[0]:null,x="";
  if(fav&&!sel.shop.size){var c=pick(live()).filter(function(d){return d.shop===fav}).length;
   x="<span>★ Jouw supermarkt: <strong>"+h(fav)+"</strong> · "+(c?c+(c===1?" aanbieding":" aanbiedingen")+" op deze pagina":"nu geen aanbieding op deze pagina")+"</span>"+(c?'<button type="button" class="link" data-fav="toon">Toon alleen '+h(fav)+"</button>":"")+'<button type="button" class="link" data-fav="weg">Vergeten</button>'}
  else if(one&&one===fav)x="<span>★ "+h(one)+' is jouw supermarkt</span><button type="button" class="link" data-fav="weg">Vergeten</button>';
  else if(one)x='<button type="button" class="link" data-fav="zet" data-v="'+h(one)+'">☆ Onthoud '+h(one)+" als mijn supermarkt</button>";
  box.innerHTML=x;box.hidden=!x};
 box.addEventListener("click",function(e){var b=e.target.closest("[data-fav]");if(!b)return;var a=b.getAttribute("data-fav");
  if(a==="zet"){lsSet(K,b.getAttribute("data-v"));toast("Onthouden. Je ziet nu op elke pagina wat er bij jouw supermarkt is.")}
  else if(a==="weg")lsSet(K,null);
  else if(a==="toon"){sel.shop=new Set([lsGet(K)]);buildChips();render();return}
  upd()});
 var orig=render;render=function(){orig();upd()};
 upd();
}
/* Op het beginscherm zetten */
if(F.beginscherm){
 var standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone;
 var ft=document.querySelector("footer .wrap");
 if(!standalone&&ft){var dp=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();dp=e});
  var w=document.createElement("div");w.className="kb-a2hsw";var a=document.createElement("button");a.type="button";a.className="link kb-a2hs";a.textContent="Zet Koffieboonus op je beginscherm";
  var tip=document.createElement("p");tip.className="kb-tip";tip.hidden=true;
  a.addEventListener("click",function(){if(dp){dp.prompt();dp=null;return}
   var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
   tip.textContent=ios?"Op een iPhone of iPad: tik in Safari op de deelknop (het vierkantje met de pijl) en kies ‘Zet op beginscherm’.":"Op een Android-telefoon: tik in Chrome rechtsboven op ⋮ en kies ‘Toevoegen aan startscherm’. Op een computer: kies in het menu van je browser ‘Installeren’, of maak een bladwijzer.";
   tip.hidden=!tip.hidden});
  w.appendChild(a);w.appendChild(tip);ft.appendChild(w)}
}
})();</script>`;

export function gemakInject(tpl) {
  if (!GM.favoriet && !GM.beginscherm && !GM.delen) return tpl;
  let t = tpl.replace("</style>", () => CSS + "\n</style>");
  if (GM.beginscherm) t = t.replace('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', m => m + "\n" + HEAD);
  return t.replace("</body>", () => JS(GM) + "\n</body>");
}

export function writeManifest(out) {
  if (!GM.beginscherm) return;
  const m = {
    name: "Koffieboonus: koffie in de aanbieding",
    short_name: "Koffieboonus",
    description: "Alle koffie in de aanbieding bij Nederlandse supermarkten, op één plek.",
    lang: "nl-NL",
    start_url: "/?ref=app",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9E9",
    theme_color: "#4E341B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  fs.writeFileSync(path.join(out, "manifest.webmanifest"), JSON.stringify(m, null, 2));
}
