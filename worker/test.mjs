import assert from "node:assert/strict";
import w, { schoon, controleer } from "./feedback.js";
const rows = [];
const env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => rows.push(a) }) }) } };
const req = (body, origin = "https://koffieboonus.nl", path = "/e", method = "POST") =>
  new Request("https://x.workers.dev" + path, { method, body: method === "POST" ? body : undefined, headers: origin ? { Origin: origin } : {} });
const st = async (r) => (await w.fetch(r, env)).status;

assert.equal(await st(req(JSON.stringify({ t: "duim", v: "nee", p: "/cups/" }))), 204);
assert.equal(await st(req(JSON.stringify({ t: "tekst", v: "Mail me op jan@voorbeeld.nl of 06-12345678, ik mis Kruidvat", p: "/" }))), 204);
assert.equal(await st(req(JSON.stringify({ t: "klik", v: "PLUS", p: "/cups/" }))), 204);
assert.equal(await st(req(JSON.stringify({ t: "filter", v: "shop:Albert Heijn", p: "/" }))), 204);
assert.equal(await st(req(JSON.stringify({ t: "duim", v: "misschien" }))), 400, "onbekende duim");
assert.equal(await st(req(JSON.stringify({ t: "hack", v: "x" }))), 400, "onbekende soort");
assert.equal(await st(req("geen json")), 400);
assert.equal(await st(req("x".repeat(3000))), 413);
assert.equal(await st(req(JSON.stringify({ t: "duim", v: "ja" }), "https://andere-site.nl")), 403, "vreemde herkomst");
assert.equal(await st(req(JSON.stringify({ t: "duim", v: "ja" }), null)), 403, "zonder herkomst");
assert.equal(await st(req("", "https://koffieboonus.nl", "/", "GET")), 404);
assert.equal(rows.length, 4);
assert.deepEqual(rows[0].slice(1), ["duim", "/cups/", "nee"]);
assert.equal(rows[1][3], "Mail me op [e-mail weggehaald] of [nummer weggehaald], ik mis Kruidvat");
assert.match(rows[0][0], /^\d{4}-\d{2}-\d{2}$/);
assert.equal(schoon("bel 010 123 4567 aub"), "bel [nummer weggehaald] aub");
assert.equal(controleer({ t: "tekst", v: "   " }), null, "lege tekst");
assert.equal(controleer({ t: "klik", v: "<b>AH</b>", p: "/a\"b/" }).v, "bAH/b");
console.log("Alle tests geslaagd:", rows.length, "rijen opgeslagen");
