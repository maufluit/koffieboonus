// Laat Bing (en andere zoekmachines die IndexNow ondersteunen) na elke update weten welke pagina's er zijn.
import fs from "node:fs";
const KEY="f9653690eb8d828652b2a85679de7801",HOST="koffieboonus.nl";
const xml=fs.readFileSync("_site/sitemap.xml","utf8");
const urlList=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).slice(0,10000);
const r=await fetch("https://api.indexnow.org/IndexNow",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({host:HOST,key:KEY,keyLocation:`https://${HOST}/${KEY}.txt`,urlList})});
console.log("IndexNow:",r.status,urlList.length,"adressen");
