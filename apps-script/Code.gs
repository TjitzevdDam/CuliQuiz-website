/**
 * CuliQuiz Top 100 - Nominatie-webhook
 *
 * Ontvangt POSTs vanaf top100.html en schrijft ze als nieuwe regel in
 * de Top 100 nominaties Google Sheet.
 *
 * Deploy: zie apps-script/README.md
 */

// ID van de spreadsheet met de nominaties.
// Je vindt 'm in de URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
const SHEET_ID = '1SiwtGrz78Sm-CH77mK_2wo9QBIa_FK6xGvBb4cMWZ7k';

// Naam van het tabblad waarin de nominaties worden weggeschreven.
// Pas aan als je tab anders heet (default is vaak 'Blad1' of 'Formulier reacties 1').
const SHEET_NAME = 'Blad1';

function doPost(e) {
  try {
    const params = (e && e.parameter) || {};

    // Timestamp in het format dat in de sheet al gebruikt wordt (MM/dd/yyyy HH:mm:ss)
    const tz = Session.getScriptTimeZone() || 'Europe/Amsterdam';
    const timestamp = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy HH:mm:ss');

    const row = [
      timestamp,                                 // A  - timestamp
      params.jouw_naam || '',                    // B  - Jouw naam
      params.email || '',                        // C  - Email (inzender)
      params.naam_genomineerde || '',            // D  - Naam genomineerde
      params.functie_bedrijf || '',              // E  - Functie en/of bedrijf
      params.motivatie || '',                    // F  - Motivatie
      params.toestemming || '',                  // G  - Toestemming
      params.email_genomineerde || '',           // H  - Mailadres genomineerde
      ''                                         // I  - (duplicate kolom in bestaande sheet, leeg laten)
    ];

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handige test-endpoint om in de browser te checken of de deploy draait
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'CuliQuiz Top 100 webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}
