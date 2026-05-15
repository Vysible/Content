export interface KtNewsletterInput {
  subject: string
  preheader: string
  bodyText: string
  ctaText?: string
  ctaUrl?: string
  praxisName: string
  praxisWebsite: string
}

export function formatForKlickTipp(input: KtNewsletterInput): string {
  const body = markdownToEmailHtml(input.bodyText)

  const ctaSection =
    input.ctaText
      ? `<tr>
            <td align="center" style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#2563eb;border-radius:6px;">
                    <a href="${input.ctaUrl ?? '#'}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;
                              font-weight:bold;text-decoration:none;font-size:16px;">
                      ${escapeHtml(input.ctaText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f4f0;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;max-width:600px;">

          <tr>
            <td style="padding:32px 40px;color:#1a1a2e;font-size:16px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          ${ctaSection}

          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e5e7eb;
                       font-size:12px;color:#6b7280;text-align:center;">
              <p style="margin:0 0 8px;">${escapeHtml(input.praxisName)}<br>
              ${escapeHtml(input.praxisWebsite)}</p>
              <p style="margin:0;">
                <a href="{{unsubscribe_link}}" style="color:#6b7280;">
                  Newsletter abbestellen
                </a>
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

function markdownToEmailHtml(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;margin:24px 0 8px;color:#1a1a2e;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:17px;margin:20px 0 6px;color:#374151;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;">')
    .replace(/^/, '<p style="margin:0 0 16px;">')
    .replace(/$/, '</p>')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
