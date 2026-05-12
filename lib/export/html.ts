import type { StoredTextResult } from '@/lib/generation/results-store'

const WP_HINT = `<!-- Hinweis: In WordPress → Beitrag → HTML-Modus einfügen -->\n`

/**
 * Blog-HTML: semantisch, keine Inline-Styles, HWG-Disclaimer am Ende.
 * Dateierweiterung: .html je Artikel
 */
export function buildBlogHtml(result: StoredTextResult, praxisName: string): string {
  if (!result.blog) return ''

  const disclaimer = `<div class="disclaimer">
<p><strong>Medizinischer Hinweis:</strong> Diese Informationen ersetzen keine ärztliche Beratung.
Bitte konsultieren Sie ${praxisName} oder einen qualifizierten Arzt für eine individuelle Diagnose und Behandlung.</p>
</div>`

  // HWG-Disclaimer einfügen, falls nicht bereits vorhanden
  let html = result.blog.html
  if (!html.includes('class="disclaimer"')) {
    html = html + '\n' + disclaimer
  }

  return WP_HINT + html
}

/**
 * Newsletter-HTML: Inline-CSS, Tabellenlayout, Klick-Tipp-kompatibel.
 * Platzhalter: {{unsubscribe_link}}
 */
export function buildNewsletterHtml(result: StoredTextResult, praxisName: string, praxisAddress = ''): string {
  if (!result.newsletter) return ''
  const nl = result.newsletter

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(nl.betreffA)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding:20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background-color:#1a2b5e;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${escapeHtml(praxisName)}</p>
          </td>
        </tr>

        <!-- Preheader (versteckt) -->
        <tr>
          <td style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
            ${escapeHtml(nl.preheader)}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#1a2b5e;line-height:1.3;">${escapeHtml(nl.betreffA)}</h1>
            ${nl.body
              .split('\n\n')
              .filter(Boolean)
              .map((p) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333333;">${escapeHtml(p)}</p>`)
              .join('\n')}

            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="background-color:#1a2b5e;border-radius:6px;padding:12px 24px;">
                  <a href="#" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">${escapeHtml(nl.cta)}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer (DSGVO) -->
        <tr>
          <td style="background-color:#f4f4f4;padding:20px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0 0 8px 0;font-size:12px;color:#666666;">
              ${praxisAddress ? escapeHtml(praxisAddress) + '<br>' : ''}
              Sie erhalten diese E-Mail, weil Sie sich für unseren Newsletter angemeldet haben.
            </p>
            <p style="margin:0;font-size:12px;color:#666666;">
              <a href="{{unsubscribe_link}}" style="color:#1a2b5e;">Newsletter abbestellen</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
