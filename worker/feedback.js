// Koffieboonus feedback-tellertje (Cloudflare Worker "koffieboonus-feedback").
// Ontvangt van koffieboonus.nl alleen: soort (duim/tekst/klik/filter/sort/deel/via), waarde en pagina.
// deel = er is iets gedeeld ("pagina" of "aanbieding: winkel | product"); via = iemand kwam binnen via een gedeelde link ("deel") of het beginscherm ("app"); app = klik op "Zet op beginscherm" ("knop"), op de melding ("melding") of echt geïnstalleerd ("geinstalleerd", alleen Android).
// Bewaart GEEN IP-adres (het adres wordt alleen vergeleken met de thuis-wifi van Maurits, zie isThuis), cookie, browsergegevens of tijdstip: alleen de datum.
// E-mailadressen en telefoonnummers in getypte tekst worden weggehaald voordat iets wordt opgeslagen.
const SOORTEN = { duim: 10, tekst: 500, klik: 80, filter: 120, sort: 40, deel: 120, via: 10, app: 20 };
const HERKOMST = ["https://koffieboonus.nl", "https://www.koffieboonus.nl"];

export function schoon(t) {
  return String(t)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, "[e-mail weggehaald]")
    .replace(/(\+31|0031|0)[\s-]?6([\s-]?\d){8}/g, "[nummer weggehaald]")
    .replace(/(\+31|0031|0)[\s-]?[1-9]\d{1,2}([\s-]?\d){6,7}/g, "[nummer weggehaald]")
    .replace(/\s+/g, " ")
    .trim();
}

export function controleer(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const max = SOORTEN[o.t];
  if (!max) return null;
  const p = typeof o.p === "string" && o.p.startsWith("/") ? o.p.slice(0, 200).replace(/[^\w\-/.%]/g, "") : "/";
  let v = typeof o.v === "string" ? o.v.slice(0, max) : "";
  if (o.t === "duim" && v !== "ja" && v !== "nee") return null;
  if (o.t === "via" && v !== "deel" && v !== "app") return null;
  if (o.t === "app" && !["knop", "melding", "geinstalleerd"].includes(v)) return null;
  if (o.t === "tekst") { v = schoon(v); if (!v) return null; }
  else v = v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  return { t: o.t, p, v };
}

// Thuis-wifi van Maurits: bezoeken van dat adres tellen niet mee (akkoord Maurits, nov 2026).
// Het adres staat alleen als geheime instelling THUIS_IP bij Cloudflare (komma's ertussen), nooit in deze openbare code.
// IPv4 moet precies gelijk zijn; IPv6 telt als thuis als de eerste 4 groepen (het /64-netwerk) gelijk zijn.
// Er wordt niets opgeslagen: het adres van de bezoeker wordt alleen vergeleken.
function v6net(ip) {
  const [kop, staart = ""] = ip.toLowerCase().split("::");
  const a = kop ? kop.split(":") : [], b = staart ? staart.split(":") : [];
  if (!ip.includes("::") && a.length !== 8) return null;
  const vol = [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  if (vol.length !== 8 || vol.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return vol.slice(0, 4).map((g) => parseInt(g, 16)).join(":");
}
export function isThuis(ip, lijst) {
  if (!ip || !lijst) return false;
  return String(lijst).split(",").map((x) => x.trim()).filter(Boolean).some((t) => {
    if (t.includes(":") || ip.includes(":")) { const a = v6net(ip), b = v6net(t); return !!a && a === b; }
    return t === ip;
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const herkomst = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": HERKOMST.includes(herkomst) ? herkomst : HERKOMST[0], "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
    const thuis = isThuis(req.headers.get("CF-Connecting-IP") || "", env.THUIS_IP);
    if (url.pathname === "/thuis" && req.method === "GET") {
      return new Response(thuis ? "1" : "0", { headers: { ...cors, "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    }
    if (url.pathname !== "/e" || req.method !== "POST") return new Response("Koffieboonus feedback", { status: 404 });
    if (!HERKOMST.includes(herkomst)) return new Response(null, { status: 403 });
    const tekst = await req.text();
    if (tekst.length > 2048) return new Response(null, { status: 413, headers: cors });
    let o; try { o = JSON.parse(tekst); } catch { return new Response(null, { status: 400, headers: cors }); }
    const r = controleer(o);
    if (!r) return new Response(null, { status: 400, headers: cors });
    if (thuis) return new Response(null, { status: 204, headers: cors }); // thuis-wifi: niet opslaan
    const dag = new Date().toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO events (dag, t, p, v) VALUES (?1, ?2, ?3, ?4)").bind(dag, r.t, r.p, r.v).run();
    return new Response(null, { status: 204, headers: cors });
  },
};
