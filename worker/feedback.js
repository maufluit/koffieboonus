// Koffieboonus feedback-tellertje (Cloudflare Worker "koffieboonus-feedback").
// Ontvangt van koffieboonus.nl alleen: soort (duim/tekst/klik/filter/sort), waarde en pagina.
// Bewaart GEEN IP-adres, cookie, browsergegevens of tijdstip: alleen de datum.
// E-mailadressen en telefoonnummers in getypte tekst worden weggehaald voordat iets wordt opgeslagen.
const SOORTEN = { duim: 10, tekst: 500, klik: 80, filter: 120, sort: 40 };
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
  if (o.t === "tekst") { v = schoon(v); if (!v) return null; }
  else v = v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  return { t: o.t, p, v };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const herkomst = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": HERKOMST.includes(herkomst) ? herkomst : HERKOMST[0], "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
    if (url.pathname !== "/e" || req.method !== "POST") return new Response("Koffieboonus feedback", { status: 404 });
    if (!HERKOMST.includes(herkomst)) return new Response(null, { status: 403 });
    const tekst = await req.text();
    if (tekst.length > 2048) return new Response(null, { status: 413, headers: cors });
    let o; try { o = JSON.parse(tekst); } catch { return new Response(null, { status: 400, headers: cors }); }
    const r = controleer(o);
    if (!r) return new Response(null, { status: 400, headers: cors });
    const dag = new Date().toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO events (dag, t, p, v) VALUES (?1, ?2, ?3, ?4)").bind(dag, r.t, r.p, r.v).run();
    return new Response(null, { status: 204, headers: cors });
  },
};
