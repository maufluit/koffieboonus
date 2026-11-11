# Feedback-tellertje (Cloudflare Worker)

- `feedback.js`: ontvangt duimpjes, getypte reacties ("Wat miste je?"), klikken op "Bekijk bij [winkel]" en gekozen filters van koffieboonus.nl en bewaart ze in Cloudflare D1 (database `koffieboonus-feedback`).
- Privacy: geen cookies, geen IP-adres, geen tijdstip (alleen de datum), geen bezoekers-id. E-mailadressen en telefoonnummers in getypte tekst worden weggehaald vóór opslag. Alleen verzoeken van koffieboonus.nl worden aangenomen.
- Publiceren gebeurt vanuit de privé-repo maufluit/projecten (workflow "Koffieboonus feedback-tellertje publiceren"), met een Cloudflare-sleutel die alleen daar staat. Hier staan geen sleutels.
- De site gebruikt het tellertje pas als `feedback.json` op `"aan": true` staat met het juiste adres.
- Testen: `node worker/test.mjs`.
