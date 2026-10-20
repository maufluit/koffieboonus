// Haalt elke nacht de koffie-aanbiedingen op bij PrijsProfeet en schrijft deals.json
import fs from "node:fs";
const BASE="https://www.prijsprofeet.nl/api/v1/search";
const KEY=process.env.PRIJSPROFEET_API_KEY||"";
const SHOPS={albert_heijn:"Albert Heijn",jumbo:"Jumbo",plus:"PLUS",dirk:"Dirk",dekamarkt:"DekaMarkt",hoogvliet:"Hoogvliet",poiesz:"Poiesz",vomar:"Vomar",aldi:"Aldi",lidl:"Lidl",ekoplaza:"Ekoplaza",coop:"Coop",gewoon_coop:"Coop",dagwinkel:"Dagwinkel",spar:"SPAR",boons_markt:"Boon's Markt",mcd:"MCD",nettorama:"Nettorama"};
const COFFEE=/koffie|coffee|espresso|cappuccino|latte|macchiato|lungo|ristretto|nespresso|dolce gusto|senseo|mocca|mokka|decaf|café|cafe\b|starbucks|lavazza|illy|segafredo|l'or\b|nescafé?|douwe egberts|bialetti|melitta|kanis/i;
const BLOCK=/^(absolut|smirnoff|bacardi|baileys|pickwick|pukka|lipton|twinings|teekanne|ariel|dreft|glade|lenor|sun|lucovitaal|persil|robijn|ajax|finish|calgon|vanish|febreze|ambi pur|bref|domestos|andrelon|andrélon)$/i;
const SKIP=/\b(earl grey|thee|tea|rooibos|koffiemelk|creamer|koffiefilters?|filterzakjes|koek(je|jes)?|broodje|wasmiddel|wasverzachter|vaatwas\w*|afwas\w*|allesreiniger|luchtverfrisser|toiletreiniger|tabletten|vitamine\w*|supplement\w*|ontkalk\w*|reiniger|mokken?|glazen?|servies|apparaat|machine|bonbons?|snoep|chocolade|repen|reep|kaas|yoghurt|kwark|vla|pudding|cake|taart|likeur|bier|wijn|roomijs|stroopwafels?)\b/i;
const DAYS=["zo","ma","di","wo","do","vr","za"],MON=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const E=n=>"€"+Number(n).toFixed(2).replace(".",",");
const until=iso=>{const d=new Date(iso+"T12:00:00Z");return `t/m ${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`};
const fromT=iso=>{const d=new Date(iso+"T12:00:00Z");return `vanaf ${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`};
export function typeOf(p){
  const s=(p.name||"").toLowerCase(),b=(p.brand||"").toLowerCase(),q=(p.quantity||"").toLowerCase().replace(/\s+/g," ");
  if(/oploskoffie|oposkoffie|verwenkoffie|instant|koppen|sticks|zakjes/.test(s))return "Oploskoffie";
  if(/capsule|koffiecups?|\bcups?\b|nespresso|dolce gusto/.test(s))return "Cups";
  if(/pads?\b|senseo/.test(s))return "Pads";
  if(/concentrate|ijskoffie|\bice\b|iced|chilled|frappuccino|frappe|doubleshot|warm of koud/.test(s))return "IJskoffie & koffiedrank";
  if(/bonen|beans|boontjes|grani\b/.test(s))return "Bonen";
  if(/maling|gemalen|filterkoffie|snelfilter/.test(s))return "Gemalen koffie";
  if(p.unit==="L"||/\bml\b/.test(q))return "IJskoffie & koffiedrank";
  if(/starbucks/.test(b+" "+s)&&/latte|macchiato|cappuccino/.test(s))return /\d\s?g\b/.test(q)?"Cups":"IJskoffie & koffiedrank";
  if(/espresso|lungo|ristretto|decaf/.test(s)&&/stuks?/.test(s+" "+q))return "Cups";
  if(/cappuccino|latte|macchiato|cafe au|café au/.test(s))return "Oploskoffie";
  return null;
}
export function dealOf(p){
  const q=p.multi_buy_quantity,t=p.promotion_type,kw=(p.promotional_keywords||[]).join(" ");
  if(t==="one_plus_one"&&q===3)return ["2+1 gratis",3];
  if(t==="one_plus_one"&&q===2)return ["1+1 gratis",2];
  if(/volume/i.test(kw))return ["Volume voordeel: "+E(p.price),1];
  if(/halve prijs/i.test(kw))return ["2e halve prijs",2];
  if(q>1&&p.multi_buy_price>0)return [`${q} voor ${E(p.multi_buy_price)}`,q];
  if(t==="multi_buy")return [`Nu voor ${E(p.price)} (check voorwaarden)`,1];
  return [`Nu voor ${E(p.price)}`,1];
}
// Huismerk is alleen voor producten zonder eigen merknaam (bijv. "AH koffiebonen", "Dirk koffiebonen").
// Heeft een huismerk-product een eigen naam (Perla, Bellarom...), dan staat het onder die naam.
const STORE_BRAND=/^(ah|albert heijn|jumbo|plus|dirk|dekamarkt|deka|hoogvliet|poiesz|vomar|aldi|lidl|coop|ekoplaza|spar|dagwinkel|nettorama|boni|boon'?s markt|huismerk|eigen merk|private label)$/i;
// Eigen merknamen van supermarkten die niet in het merkveld staan maar wel in de productnaam. Uitbreiden kan hier.
const SUBBRANDS=[[/^perla\b/i,"Perla"],[/^(ah )?excellent\b/i,"AH Excellent"],[/^bellarom\b/i,"Bellarom"],[/^expressi\b/i,"Expressi"]];
export function brandOf(p){
  const b=(p.brand||"").trim();
  if(!p.private_label)return b;
  if(b&&!STORE_BRAND.test(b))return b;
  const n=(p.name||"").trim();
  for(const [re,label] of SUBBRANDS)if(re.test(n))return label;
  return "Huismerk";
}
export const guessed=[],noBrand=[];
const KNOWN=[[/douwe\s*egberts/i,"Douwe Egberts"],[/nescaf[eé]/i,"Nescafé"],[/\bl['’]or\b/i,"L'OR"],[/lavazza/i,"Lavazza"],[/senseo/i,"Senseo"],[/starbucks/i,"Starbucks"],[/segafredo/i,"Segafredo"],[/\billy\b/i,"illy"],[/jacobs/i,"Jacobs"],[/\bperla\b/i,"Perla"],[/buisman/i,"Buisman"],[/kanis/i,"Kanis & Gunnink"],[/smit\s*(&|en)\s*dorlas/i,"Smit & Dorlas"]];
function guessBrand(p){
  const txt=JSON.stringify(p);
  const hits=[...new Set(KNOWN.filter(([re])=>re.test(txt)).map(([,l])=>l))];
  return hits.length===1?hits[0]:"";
}
// Prijs per kilo / cup / pad / liter, berekend uit de verpakkingsgrootte in de productnaam.
// We rekenen alleen als alles zeker is; bij twijfel (geen gewicht of aantal, voorwaardelijke actie) laten we het weg.
const numS=v=>parseFloat(String(v).replace(",","."));
const UNIT_RE="kg|gr|gram|g|ml|cl|l|liter|stuks?|st|capsules?|cups?|pads?|zakjes|sticks?|koffiecups?|koffiecapsules?|koffiepads?";
function parseSize(text){
  let t=" "+text.toLowerCase().replace(/(\d),(\d)/g,"$1.$2")+" ",grams=0,ml=0,count=0;
  const add=(v,u)=>{
    if(u==="kg")grams+=v*1000;else if(/^(g|gr|gram)$/.test(u))grams+=v;
    else if(u==="l"||u==="liter")ml+=v*1000;else if(u==="cl")ml+=v*10;else if(u==="ml")ml+=v;
    else count+=v;
  };
  t=t.replace(new RegExp("(\\d+)\\s?[x×]\\s?(\\d+(?:\\.\\d+)?)\\s?("+UNIT_RE+")(?![a-z])","g"),(m,a,b,u)=>{add(+a*+b,u);return " "});
  for(const m of t.matchAll(new RegExp("(\\d+(?:\\.\\d+)?)\\s?("+UNIT_RE+")(?![a-z])","g")))add(+m[1],m[2]);
  return {grams,ml,count};
}
export function unitPrice(o){
  const raw=o.deal||"",reg=numS(String(o.reg).replace("€",""));
  let price=null,m;
  if(/check voorwaarden|^Volume/i.test(raw))return null;
  if((m=raw.match(/^Nu voor €([\d,]+)/)))price=numS(m[1]);
  else if(/^1\+1 gratis/.test(raw))price=reg/2;
  else if(/^2\+1 gratis/.test(raw))price=reg*2/3;
  else if(/^2e halve prijs/.test(raw))price=reg*0.75;
  else if((m=raw.match(/^(\d+) voor €([\d,]+)/)))price=numS(m[2])/+m[1];
  if(!(price>0))return null;
  const sz=parseSize(o.name||"");
  let v=null,pu=null,lo,hi;
  if(["Bonen","Gemalen koffie","Oploskoffie"].includes(o.type)&&sz.grams>=50){v=price/(sz.grams/1000);pu="kilo";lo=3;hi=150}
  else if(o.type==="Oploskoffie"&&sz.count>=4){v=price/sz.count;pu="portie";lo=0.03;hi=3}
  else if((o.type==="Cups"||o.type==="Pads")&&sz.count>=4){v=price/sz.count;pu=o.type==="Cups"?"cup":"pad";lo=0.05;hi=3}
  else if(o.type==="IJskoffie & koffiedrank"&&sz.ml>=100){v=price/(sz.ml/1000);pu="liter";lo=1;hi=40}
  if(v==null||!(v>=lo&&v<=hi))return null;
  return {pp:Math.round(v*1000)/1000,pu};
}
function mapOne(p,today){
  const up=p.promotion_status==="upcoming";
  if(!p.is_promotional||!(p.promotion_status==="active"||up)||!p.valid_until||p.valid_until<today)return null;
  if(up){const lim=new Date(today+"T12:00:00Z");lim.setUTCDate(lim.getUTCDate()+9);if(!p.valid_from||p.valid_from>lim.toISOString().slice(0,10))return null}
  const raw=p.name||"";
  if(BLOCK.test((p.brand||"").trim())||!COFFEE.test(raw+" "+(p.brand||""))||SKIP.test(raw))return null;
  const orig=p.original_price,price=p.price;
  // Geen normale prijs bekend (bijv. Lidl-eigenmerk, sommige folderketens): we tonen de actieprijs zonder percentage.
  const nodisc=!(orig>0)&&price>0;
  const pct=nodisc?0:Math.round(p.savings_percentage??(orig>price?(1-price/orig)*100:0));
  if(!nodisc&&!(pct>=10))return null;
  let type=typeOf(p);
  if(!type&&p.retailer==="jumbo"&&p.promotion_type==="one_plus_one"&&/\b(450|500|1000) ?g\b|\b1 ?kg\b/i.test(raw+" "+(p.quantity||"")))type="Bonen";
  if(!type)return null;
  let brand=brandOf(p),name=raw.replace(/^alle\s+/i,"");
  if(!brand){ // sommige winkels (bijv. Vomar) leveren geen merk mee: zoek een bekend merk in de rest van de productgegevens
    const g=guessBrand(p);
    if(g){brand=g;guessed.push(`${p.retailer}: ${raw} -> ${g}`)}
    else noBrand.push(JSON.stringify(p).slice(0,700));
  }
  if(brand&&brand!=="Huismerk"&&name.toLowerCase().startsWith(brand.toLowerCase()))name=name.slice(brand.length).trim();
  name=name.charAt(0).toUpperCase()+name.slice(1);
  const qt=(p.quantity||"").trim();
  if(qt&&!name.toLowerCase().replace(/\s/g,"").includes(qt.toLowerCase().replace(/\s/g,"")))name+=" "+qt;
  const [deal,qty]=dealOf(p);
  const o={id:p.base_product_id||p.product_id,pct,qty,shop:SHOPS[p.retailer]||p.retailer,brand,type,name,reg:E(orig||price),deal,until:until(p.valid_until),end:p.valid_until};
  const unit=unitPrice(o);if(unit){o.pp=unit.pp;o.pu=unit.pu}
  if(nodisc)o.nodisc=true;
  if(up){o.next=true;o.from=p.valid_from;o.fromTxt=fromT(p.valid_from)}
  if(p.online_only===true)o.online=true;
  if(p.in_store_only===true)o.store=true;
  return o;
}
export const mapItem=mapOne;
// "X of Y" in de naam betekent in de praktijk: allebei zijn in de aanbieding. We maken er twee aanbiedingen van.
export const combined=[];
export function mapItems(p,today){
  // Gecombineerde aanbieding van twee merken ("Douwe Egberts / L'Or"): een aanbieding per merk.
  const bs=(p.brand||"").split(/\s+\/\s+/).map(x=>x.trim()).filter(Boolean);
  if(bs.length>1){
    const out=[];
    bs.forEach((b,i)=>{const m=mapOne({...p,brand:b},today);if(m){m.id=`${m.id}-b${i}`;out.push(m)}});
    if(out.length)combined.push(`${p.retailer}: ${p.name} (${p.brand})`);
    return out;
  }
  const parts=(p.name||"").split(/\s+of\s+/i);
  if(parts.length!==2){const m=mapOne(p,today);return m?[m]:[]}
  const [l,r]=parts.map(x=>x.trim()),rw=r.split(/\s+/);
  let names,brandCase=false;
  if(r.startsWith("-")){const w=l.split(/\s+/);const last=w[w.length-1],rest=r.slice(1);names=[l,[...w.slice(0,-1),/^koffie/i.test(last)?"koffie"+rest:rest].join(" ")]}
  else if(!/\s/.test(l)&&rw.length>=2&&/^[A-Z]/.test(r)){names=[l+" "+rw.slice(1).join(" "),r];brandCase=true}
  else names=[l,r];
  const out=[];
  names.forEach((n,i)=>{
    const q={...p,name:n};
    if(brandCase&&!p.brand&&!p.private_label)q.brand=n.split(/\s+/)[0];
    const m=mapOne(q,today);
    if(m){m.id=`${m.id}-${i}`;out.push(m)}
  });
  return out;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchAll(params){
  const out=[];
  for(let n=1;n<=40;n++){
    const u=BASE+"?"+new URLSearchParams({q:"*",page:n,page_size:100,...params});
    const r=await fetch(u,{headers:{"X-API-Key":KEY,"User-Agent":"koffieboonus-sync/1.0 (+https://koffieboonus.nl)"}});
    if(!r.ok)throw new Error(`API ${r.status} bij ${u}`);
    const j=await r.json(),res=j.results||[];
    out.push(...res);
    if(res.length<(j.page_size||100)||out.length>=(j.total||1e9))break;
    await sleep(600);
  }
  return out;
}
async function main(){
  if(!KEY)throw new Error("PRIJSPROFEET_API_KEY ontbreekt");
  const today=new Date().toISOString().slice(0,10);
  const searches=[{category:"koffie-thee"},...["koffie","espresso","capsules","koffiecups","koffiepads","nespresso","dolce gusto","senseo","ijskoffie","starbucks","oploskoffie","cappuccino","latte"].map(q=>({q}))];
  const seen=new Map(),skipped=new Set();let raw=0;
  for(const s of searches){
    const items=await fetchAll(s);raw+=items.length;
    for(const p of items){const ms=mapItems(p,today);if(ms.length){for(const m of ms){const k=m.id+(m.next?"n":"");if(!seen.has(k))seen.set(k,m)}}else if(p.is_promotional&&COFFEE.test(p.name||"")&&!SKIP.test(p.name||""))skipped.add(`${p.retailer}: ${p.name} (${p.savings_percentage}%, ${p.promotion_status}, vanaf ${p.valid_from})`)}
    await sleep(600);
  }
  const deals=[...seen.values()];
  // Submerken horen onder het hoofdmerk (één filter per merk), per geval bekeken:
  // Perla Biologisch/Huisblends/Superiore -> Perla; Nescafé Dolce Gusto -> Nescafé (het systeem blijft in de productnaam);
  // Douwe Egberts Senseo -> Senseo (apart gezocht); Jumbo's -> Huismerk; Excellent -> AH Excellent.
  const FAMILIES=[[/^douwe egberts senseo(?!\p{L})/iu,"Senseo"],[/^jumbo['’]?s?$/iu,"Huismerk"],[/^excellent$/iu,"AH Excellent"],[/^perla(?!\p{L})/iu,"Perla"],[/^douwe egberts(?!\p{L})/iu,"Douwe Egberts"],[/^nescaf[eé](?!\p{L})/iu,"Nescafé"],[/^l['’]?or(?!\p{L})/iu,"L'OR"],[/^lavazza(?!\p{L})/iu,"Lavazza"],[/^senseo(?!\p{L})/iu,"Senseo"],[/^starbucks(?!\p{L})/iu,"Starbucks"],[/^segafredo(?!\p{L})/iu,"Segafredo"],[/^illy(?!\p{L})/iu,"illy"],[/^jacobs(?!\p{L})/iu,"Jacobs"],[/^buisman(?!\p{L})/iu,"Buisman"],[/^kanis(?!\p{L})/iu,"Kanis & Gunnink"],[/^smit(?!\p{L})/iu,"Smit & Dorlas"]];
  deals.forEach(d=>{const b=(d.brand||"").trim();const hay=b+" "+(d.name||"");const sys=/dolce gusto/i.test(hay)?"Dolce Gusto":/nespresso/i.test(hay)?"Nespresso":/senseo/i.test(hay)?"Senseo":/tassimo/i.test(hay)?"Tassimo":null;if(sys)d.sys=sys;for(const [re,l] of FAMILIES)if(re.test(b)){d.brand=l;break}});
  const key=b=>b.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const CANON={lor:"L'OR",nescafe:"Nescafé",cafeintencion:"Café Intención",illy:"illy",kanisgunnink:"Kanis & Gunnink",smitdorlas:"Smit & Dorlas",smitendorlas:"Smit & Dorlas",douweegberts:"Douwe Egberts",cafenova:"Café Nova",laplace:"La Place",fairtrade:"Fairtrade",fairtradeoriginal:"Fairtrade Original"};
  const cnt={};deals.forEach(d=>{const k=key(d.brand);(cnt[k]=cnt[k]||{})[d.brand]=(cnt[k][d.brand]||0)+1});
  deals.forEach(d=>{const k=key(d.brand);if(!k){d.brand="Overig";return}const v=Object.entries(cnt[k]).sort((a,b)=>b[1]-a[1]);d.brand=CANON[k]||(v.find(([n])=>n!==n.toLowerCase())||v[0])[0]});
  console.log("Controle twijfelmerken:\n"+deals.filter(d=>/^(Oatly|Pickwick|Roots|Illimani|Overig|The Cup factory|Lazarro)$/.test(d.brand)).map(d=>`${d.brand}: ${d.name} (${d.shop})`).join("\n"));
  console.log("Gecombineerde merken (gesplitst):\n"+combined.slice(0,20).join("\n"));
  console.log("Merk afgeleid uit overige productgegevens:\n"+guessed.slice(0,30).join("\n"));
  console.log("Zonder merk (ruwe gegevens, eerste 5):\n"+noBrand.slice(0,5).join("\n"));
  console.log(`Prijs per eenheid berekend voor ${deals.filter(d=>d.pp!=null).length} van ${deals.length} aanbiedingen. Zonder (eerste 25):\n`+deals.filter(d=>d.pp==null&&!d.next).slice(0,25).map(d=>`${d.shop}: ${d.name} [${d.type}, ${d.deal}]`).join("\n"));
  console.log("Controle huismerk (zonder eigen merknaam):\n"+deals.filter(d=>d.brand==="Huismerk").slice(0,40).map(d=>`${d.shop}: ${d.name}`).join("\n"));
  console.log("Alle merken:",[...new Set(deals.map(d=>d.brand))].sort().join(" | "));
  console.log(`Opgehaald: ${raw} rijen, bruikbaar: ${deals.length} (waarvan volgende week: ${deals.filter(d=>d.next).length})`);
  const by={};deals.forEach(d=>{by[d.shop]=(by[d.shop]||0)+1});console.log("Per winkel:",JSON.stringify(by));
  console.log("Overgeslagen (eerste 30):\n"+[...skipped].slice(0,30).join("\n"));
  if(deals.filter(d=>!d.next).length<30)throw new Error("Te weinig aanbiedingen; deals.json blijft ongewijzigd.");
  let prev=null;try{prev=JSON.parse(fs.readFileSync("deals.json","utf8"))}catch{}
  if(prev&&JSON.stringify(prev.deals)===JSON.stringify(deals)){console.log("Geen wijzigingen: deals.json blijft zoals het was.");return}
  fs.writeFileSync("deals.json",JSON.stringify({updated:new Date().toISOString(),source:"PrijsProfeet",deals}));
  console.log("deals.json bijgewerkt.");
}
if(process.argv[1]&&process.argv[1].endsWith("sync.mjs"))main().catch(e=>{console.error(e.message);process.exit(1)});
