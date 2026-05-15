import type { EmailTrigger } from '../mailer'

const TRIGGER_SUBJECTS: Record<EmailTrigger, string> = {
  generation_complete: 'Vysible: Generierung abgeschlossen',
  draft_uploaded: 'Vysible: Entwurf hochgeladen',
  published: 'Vysible: Content veröffentlicht',
  share_approved: 'Vysible: Freigabe erteilt',
  cost_threshold_exceeded: 'Vysible: Kosten-Schwellwert überschritten',
  monthly_report: 'Vysible: Automatischer Monatsreport verfügbar',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function getNotificationSubject(trigger: EmailTrigger): string {
  return TRIGGER_SUBJECTS[trigger]
}

export function buildNotificationHtml(trigger: EmailTrigger, projectName: string, details?: string): string {
  const subject = getNotificationSubject(trigger)
  const safeSubject = escapeHtml(subject)
  const safeProjectName = escapeHtml(projectName)
  const safeDetails = details ? escapeHtml(details) : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1a1a2e; background: #f5f4f0; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
    <p style="font-size: 11px; color: #6b7280; margin: 0 0 10px;">VYSIBLE · KI-Content-Plattform</p>
    <h1 style="font-size: 20px; margin: 0 0 16px; color: #1a1a2e;">${safeSubject}</h1>
    <p style="font-size: 14px; margin: 0 0 6px; color: #374151;">
      <strong>Projekt:</strong> ${safeProjectName}
    </p>
    ${safeDetails ? `<p style="font-size: 14px; margin: 10px 0 0; color: #4b5563;">${safeDetails}</p>` : ''}
  </div>
</body>
</html>`
}
