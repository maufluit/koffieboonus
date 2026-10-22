# Voorbereiding Koffieboonus: 50 uur (22–24 oktober 2026)

Maurits is afwezig tot zondag 25 okt, 18:00. In die tijd bereiden zes Claude-sessies Koffieboonus voor op meer bezoekers en affiliate-inkomsten. **Er gaat niets live.** Alles wacht op het akkoord van Maurits.

## Waar staat dit bestand? (lees dit eerst, volgende sessie)
- **Vanaf 22 okt 22:45 staat alles in de branch `voorbereiding` van maufluit/koffieboonus** (aangemaakt door de hoofdsessie van Maurits, met het werk van sessie 1). Werk hier verder. Push NOOIT naar `main`.
- Sessie 1 kon de branch zelf niet pushen (koffieboonus zat niet in de GitHub-toegang van die sessie). Een kopie van het werk van sessie 1 staat ook in maufluit/projecten → `Koffieboonus/Bestanden/Voorbereiding/`.
- **Kun jij niet pushen naar koffieboonus?** Dan geldt de noodroute: de repo is openbaar, dus klonen, bouwen en testen lukt altijd (`git clone https://github.com/maufluit/koffieboonus`, `git checkout voorbereiding`). Sla je codewerk dan op in maufluit/projecten → `Koffieboonus/Bestanden/Voorbereiding/code/` (zelfde mapstructuur) plus een patch `code/voorbereiding.patch` ten opzichte van de branch `voorbereiding`, en werk `VOORBEREIDING.md` daar bij. Haal eerst de nieuwste versie op (`git pull --rebase`), want andere sessies schrijven daar ook. De volgende sessie met pushtoegang zet het in de branch.
- Nieuw sinds sessie 1: Maurits heeft de oude Netlify-kopie uitgeschakeld (22 okt). Cloudflare-cijfers (10 bezoeken in 24 uur; bronnen direct, Google, PrijsProfeet, ChatGPT) en de Search Console-controle staan in maufluit/projecten → Koffieboonus/LOGBOEK.md. Maurits is terug op **zondag 25 okt 18:00**.

## Overzicht van de zes onderdelen

| # | Onderdeel | Status | Sessie |
|---|---|---|---|
| 1 | Affiliate-onderzoek | ✅ klaar | 1 (22 okt) |
| 2 | Juridische pagina's + `/go/`-doorverwijzing | ⏳ open | 2 |
| 3 | Black Friday-pagina | ⏳ open | 3 |
| 4 | Meer bezoekers / SEO | ⏳ open | 4 |
| 5 | Kwaliteitscontrole | ⏳ open | 5 |
| 6 | Eindoverzicht voor Maurits | ⏳ open | 6 |

---

## 1. Affiliate-onderzoek: ✅ klaar
- **Wat gedaan:** onderzoek met actuele bronnen (oktober 2026) naar bol, Coolblue, Amazon.nl, Nespresso, Dolce Gusto, Philips/Senseo, De'Longhi, koffiewebshops (Koffiestore, Koffie Loods, Koffievoordeel, Koffiediscounter), HEMA, supermarkten (AH, Jumbo, PLUS) en de netwerken Awin, Daisycon, TradeTracker en Partnerize. Ook uitgezocht: wat er wettelijk op de site moet staan (reclame, cookies/AVG, KvK).
- **Bestand:** `affiliate/AFFILIATE-ONDERZOEK.md`
- **Belangrijkste uitkomst:**
  - Supermarkten leveren via affiliate bijna niets op. Alleen AH heeft een programma (traag), Jumbo is gestopt. De aanbiedingen blijven dus gratis informatie.
  - Het geld zit in koffiemachines (Coolblue, De'Longhi, Philips), capsules online (Nespresso 7%), koffiewebshops (Koffiestore, Koffie Loods) en bol (8% op koffie).
  - Aanmeldvolgorde: Awin (Coolblue, Nespresso, De'Longhi) → bol → Daisycon → TradeTracker (HEMA, Koffievoordeel) → Partnerize (Philips, AH).
  - HEMA heeft een officieel programma **met productfeed** via TradeTracker. Dat is de legale route uit de beslissing "geen scraping van HEMA".
  - Er is een concurrent: koffiekorting.com doet al iets vergelijkbaars met Awin, TradeTracker en Daisycon.
- **Wat Maurits moet beslissen:**
  1. Akkoord met de opzet (supermarkten gratis, affiliate in aparte herkenbare onderdelen)?
  2. Akkoord met de aanmeldvolgorde, en aanmelden pas nadat de juridische pagina's live staan?
  3. Als particulier beginnen of eerst KvK? (advies: laten adviseren zodra er inkomsten zijn)
  4. Welk contactadres komt op de site?
  5. HEMA-feedvoorwaarden laten uitzoeken na goedkeuring?
- **Tips voor de volgende sessies:**
  - **Sessie 2:** maak de affiliate-melding dicht bij de links en zichtbaar op mobiel. Maak een pagina "Hoe verdient Koffieboonus geld?". Leg in de privacyverklaring uit wat er gebeurt na een klik op een advertentielink. Laad geen scripts, banners of pixels van netwerken (dan blijft de site zonder cookies). Gebruik `/go/` met `rel="sponsored nofollow"`. Zet op de site dat de volgorde nooit door commissie wordt bepaald. Coolblue verbiedt kortingscodes en cashback op de site.
  - **Sessie 3:** Black Friday kan het best rond koffiemachines (Coolblue, bol, De'Longhi, Philips) en Nespresso. Laat de supermarktaanbiedingen apart en gratis.

## 2. Juridische pagina's + `/go/`-doorverwijzing: ⏳ open
_(sessie 2 vult dit in)_

## 3. Black Friday-pagina: ⏳ open
_(sessie 3 vult dit in)_

## 4. Meer bezoekers / SEO: ⏳ open
_(sessie 4 vult dit in)_

## 5. Kwaliteitscontrole: ⏳ open
_(sessie 5 vult dit in)_

## 6. Eindoverzicht: ⏳ open
_(sessie 6 vult dit in)_

---

## Logboek van de sessies
- 2026-10-22, sessie 1: affiliate-onderzoek geschreven. Branch `voorbereiding` in koffieboonus kon niet worden gepusht (geen toegang), dus het werk staat in maufluit/projecten → `Koffieboonus/Bestanden/Voorbereiding/`.
