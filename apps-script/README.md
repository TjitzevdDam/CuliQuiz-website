# Top 100 Nominatie-webhook (Google Apps Script)

Het nominatieformulier op `top100.html` stuurt inzendingen naar een Google Apps Script, dat ze wegschrijft naar de Top 100 Google Sheet.

Dit moet eenmalig worden gedeployed. Daarna werkt het formulier automatisch.

## Stap 1 — Script koppelen aan de sheet

1. Open de spreadsheet: https://docs.google.com/spreadsheets/d/1SiwtGrz78Sm-CH77mK_2wo9QBIa_FK6xGvBb4cMWZ7k/edit
2. Menu → **Extensies** → **Apps Script**
3. Vervang de code in `Code.gs` door de inhoud van [`Code.gs`](./Code.gs) in deze map
4. Controleer onderin `SHEET_NAME` — als het tabblad van de nominaties anders heet dan `Blad1`, pas aan (bv. `Formulierreacties 1`)
5. Klik op 💾 **Opslaan**

## Stap 2 — Deployen als web app

1. Klik rechtsboven op **Implementeren** → **Nieuwe implementatie**
2. Bij *type* kies **Web-app**
3. Instellingen:
   - *Beschrijving:* `Top 100 nominatie-webhook`
   - *Uitvoeren als:* **Ikzelf** (`hallo@tjitzevanderdam.com`)
   - *Wie heeft toegang:* **Iedereen** (zonder Google-login)
4. Klik **Implementeren** en geef toestemming (eenmalig). Je krijgt een waarschuwing "Google heeft deze app niet geverifieerd" → klik **Geavanceerd** → **Ga naar \<project> (onveilig)** → **Toestaan**
5. Kopieer de **Web-app-URL** (ziet eruit als `https://script.google.com/macros/s/AKfycb.../exec`)

## Stap 3 — URL in de site plakken

Open `script.js` in deze repo, zoek de regel:

```js
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbz__VERVANG_DIT__/exec';
```

Vervang met de echte URL uit stap 2, commit + push. Vercel deployt de nieuwe versie automatisch.

## Testen

- Plak de Web-app-URL in je browser — je hoort `{"ok":true,"service":"CuliQuiz Top 100 webhook"}` te zien
- Vul het formulier op de live site in en kijk of er een regel bijkomt in de sheet

## Updates in de code

Als je later `Code.gs` aanpast: nieuwe **Implementatie → Implementatie beheren → potloodje → Nieuwe versie → Implementeren**. De URL blijft hetzelfde.
