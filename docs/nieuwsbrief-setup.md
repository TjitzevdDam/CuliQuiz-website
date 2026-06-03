# Nieuwsbrief — wat er live staat en wat jij nog moet doen

## Wat er nu staat (zonder dat jij iets hoeft te doen)

**Op de site:**
- Een nieuwsbrief-blok onderaan op 6 hoofdpagina's: home, wat-leveren-we,
  scholen, top100, nieuws, ambassadeurs
- Velden: e-mail + "Ik ben…"-dropdown (5 opties, dezelfde als bij het
  contactformulier)
- Een opt-in checkbox op het contactformulier — "Houd me ook op de hoogte
  via de CuliQuiz-nieuwsbrief (1× per maand)"
- Bedanktpagina `/nieuwsbrief-bedankt`
- Auto-reply mail via Formsubmit (direct na inschrijving)

**In Zoho CRM (automatisch):**
- Elke inschrijving wordt een Lead met `Lead Source = "Nieuwsbrief — [rol]"`
- Opt-in via contactformulier maakt **een tweede lead** aan met dezelfde
  Nieuwsbrief Lead Source — zo komt dezelfde persoon in de juiste
  mailing-lijst zonder dat de offerteaanvraag in de war raakt

**Tracking:** GA4 event `newsletter_signup` met `source` (newsletter_form
vs contact_form) en `rol`. Zie je terug in GA4 onder Events.

---

## Wat jij moet doen (eenmalig, 30–45 min)

### Stap 1 — Lead Source-dropdown uitbreiden in Zoho CRM

Voeg deze 5 waarden toe aan het `Lead Source`-pickvalue veld (Leads-module):

- `Nieuwsbrief — Horecaondernemer`
- `Nieuwsbrief — Toeleverancier of Producent`
- `Nieuwsbrief — Docent`
- `Nieuwsbrief — Student`
- `Nieuwsbrief — Anders`

**Hoe:**
1. Zoho CRM → Setup → Customization → Modules and Fields → Leads
2. Klik op het `Lead Source`-veld
3. Voeg bovenstaande waarden toe (één per regel)
4. Opslaan

> Belangrijk: schrijf ze **exact** zo (incl. lange streep `—` en spaties).
> Als de waarden niet kloppen, weigert Zoho de webform-submit en valt
> hij terug op blanco — en dan zit hij in geen enkel segment.

### Stap 2 — Zoho Campaigns activeren

Als je Zoho Campaigns nog niet aan hebt:

1. Ga naar https://campaigns.zoho.eu/
2. Log in met je Zoho-account
3. Activeer (gratis tot 2000 contacten / 6000 mails per maand)
4. Bij de eerste setup: koppel je Zoho CRM-account

### Stap 3 — Sender-domein verifiëren

Anders komen je mails in spam.

1. Zoho Campaigns → Settings → Senders & Domains
2. Voeg `info@culiquiz.nl` toe als sender (of nieuw: `nieuwsbrief@culiquiz.nl`)
3. Verifieer via de mail die Zoho stuurt
4. SPF + DKIM-records toevoegen aan je DNS (Zoho geeft de waardes)

Domein zit bij: weet niet zeker — checken in je registrar.

### Stap 4 — 5 mailing-lijsten maken

1. Zoho Campaigns → Contacts → Mailing Lists → Create Mailing List
2. Maak deze vijf:
   - `CQ — Horeca` — koppelen aan Lead Source bevat "Horecaondernemer"
   - `CQ — Merken` — Lead Source bevat "Toeleverancier of Producent"
   - `CQ — Docenten` — Lead Source bevat "Docent"
   - `CQ — Studenten` — Lead Source bevat "Student"
   - `CQ — Anders` — Lead Source bevat "Anders"

3. Per lijst → Settings → CRM Sync → Source = "Leads" → Criteria zoals
   hierboven → Save

> Tip: vink "Auto-sync" aan, dan komen nieuwe leads automatisch in de lijst.

### Stap 5 — Welkomstmails als autoresponder zetten

De templates staan klaar in `docs/nieuwsbrief-welkomstmails.md`.

1. Zoho Campaigns → Automation → Workflows → Create
2. Per lijst (5×):
   - Trigger: "New contact added to list"
   - Actie: "Send email" → paste de template
3. Sender: Team CuliQuiz <info@culiquiz.nl>
4. Activeer

### Stap 6 — Test

1. Schrijf jezelf in via www.culiquiz.nl met een test-mailadres
2. Check:
   - Komt er een lead in Zoho CRM met juiste Lead Source?
   - Komt die binnen 5 min in de juiste mailing-lijst?
   - Krijgt het test-adres de welkomstmail?
3. Zo ja: klaar.

---

## Wat ik **niet** heb gebouwd (en waarom niet)

- **GDPR double opt-in:** niet meteen ingebouwd. Voor B2B-marketing in
  Nederland is single opt-in juridisch verdedigbaar mits je een duidelijke
  privacyverklaring linkt en uitschrijven makkelijk is — beide doe je.
  Als je strikt wil zitten (vooral richting Duitsland): zet in Zoho
  Campaigns "Double opt-in" aan op lijst-niveau. Dan stuurt Zoho zelf
  een bevestigingsmail.

- **Geen aparte /nieuwsbrief landingspagina:** het inschrijfblok zit al
  op 6 pagina's. Een dedicated landing voegt nu niets toe. Kan altijd
  later voor specifieke ads-campagnes.

- **Geen Brevo:** je gebruikt Zoho-stack al. Tweede tool = dubbel onderhoud.
  Pas overstappen als je iets nodig hebt dat Zoho Campaigns niet biedt
  (bv. zeer geavanceerde automation flows).

---

## Vragen of foutmeldingen

Stuur me een screenshot. Verder kun je in script.js de console-logs zien
(`Zoho newsletter post failed`) als er iets mis is met de POST naar
Zoho — meestal betekent dat dat een Lead Source-waarde niet bestaat
in het dropdown (zie Stap 1).
