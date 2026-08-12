// Afscherming van de interne prijspagina's via Vercel Edge Middleware.
// Het wachtwoord staat NIET in de broncode, maar in de omgevingsvariabele
// PRICING_GATE_PW (Vercel dashboard -> Project -> Settings -> Environment
// Variables). Zolang die niet is ingesteld, is de pagina dicht (fail-closed).
//
// Scope is strikt beperkt tot de twee prijspagina's; de rest van de site
// wordt niet geraakt.

export const config = {
  matcher: ['/prijzen', '/prijzen.html', '/en/pricing', '/en/pricing.html'],
};

export default function middleware(request) {
  const expected = process.env.PRICING_GATE_PW;
  const header = request.headers.get('authorization') || '';

  if (expected && header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password === expected) {
        return; // niets teruggeven = doorlaten naar de pagina
      }
    } catch (e) {
      // ongeldige header -> hieronder 401
    }
  }

  return new Response('Deze interne pagina is afgeschermd. Voer het wachtwoord in.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="CuliQuiz Prijzen (intern)", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
