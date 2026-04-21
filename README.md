# CuliQuiz website

Statische website voor CuliQuiz, klaar om op Netlify te deployen.

## Structuur

```
Website/
├── index.html              Homepage
├── wat-leveren-we.html     Onze aanpak
├── nieuws.html             Nieuwsoverzicht
├── top100.html             CuliQuiz Top 100
├── ambassadeurs.html       Ambassadeurs
├── 404.html                Pagina niet gevonden
├── style.css               Alle styling
├── script.js               Interactiviteit (menu, floating bullets)
├── netlify.toml            Netlify configuratie
├── robots.txt              Crawler regels
├── assets/                 Logo's, iPhone-render, partnerlogo's, fonts
├── nieuws/                 Losse nieuwsartikelen
└── bronmateriaal/          Originele bronbestanden (niet deployed)
```

## Deployen op Netlify

### Optie 1: Drag and drop

1. Ga naar https://app.netlify.com/drop
2. Sleep de hele `Website/` map op het vlak
3. Klaar. Netlify host de site direct. De map `bronmateriaal/` wordt niet publiek getoond dankzij `robots.txt`, maar voor echte afscherming zie optie 2.

### Optie 2: Via Git (aanbevolen voor updates)

1. Maak een GitHub repository en push deze map. De `.gitignore` zorgt dat `bronmateriaal/` niet meegaat.
2. Verbind de repository met Netlify.
3. Build settings: laat leeg (geen build command). Publish directory: `.` (de root van de repo).
4. Bij elke push naar main wordt de site automatisch opnieuw gedeployed.

## Lokaal bekijken

Open `index.html` direct in de browser, of start een lokale server:

```
python3 -m http.server 8080
```

En bezoek http://localhost:8080.

## Bronmateriaal

De map `bronmateriaal/` bevat briefings, originele logo's, webarchives van de oude site, screenshots en PowerPoints. Deze bestanden hoor je niet mee te deployen en worden niet gepusht naar Git.
