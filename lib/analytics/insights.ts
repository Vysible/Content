import { getAnthropicClient } from '@/lib/ai/client'
import { logger } from '@/lib/utils/logger'
import type { GoogleAdsMetrics } from '@/lib/google-ads/client'

export interface AdsInsight {
  kategorie: 'Stärke' | 'Risiko' | 'Potenzial'
  titel: string
  text: string
}

export interface AdsRecommendation {
  titel: string
  text: string
}

export interface AdsInsights {
  insights: AdsInsight[]
  empfehlungen: AdsRecommendation[]
}

export async function generateAdsInsights(
  googleAds: GoogleAdsMetrics,
  praxisName: string,
): Promise<AdsInsights | null> {
  try {
    const client = await getAnthropicClient()

    const ctr = googleAds.totalImpressions > 0
      ? (googleAds.totalClicks / googleAds.totalImpressions * 100).toFixed(2)
      : '0'
    const ctc = googleAds.totalConversions > 0
      ? (googleAds.totalSpend / googleAds.totalConversions).toFixed(2)
      : null

    const prevBlock = googleAds.prev
      ? `Vorperiode: ${googleAds.prev.totalImpressions.toLocaleString('de-DE')} Impressionen, ` +
        `${googleAds.prev.totalClicks.toLocaleString('de-DE')} Klicks, ` +
        `${googleAds.prev.totalConversions} Conversions, ` +
        `€ ${googleAds.prev.totalSpend.toFixed(2)} Ausgaben`
      : 'Keine Vorperiodendaten verfügbar'

    const campaignBlock = googleAds.campaigns.slice(0, 5).map(c =>
      `- ${c.name} (${c.status === 'ENABLED' ? 'Aktiv' : 'Pausiert'}): ` +
      `${Math.round(c.conversions)} Conv., € ${c.spend.toFixed(2)}, ` +
      `Anrufe ${c.conversionBreakdown.anrufe} / Mails ${c.conversionBreakdown.mails} / Buchungen ${c.conversionBreakdown.buchungen}`
    ).join('\n')

    const prompt = `Du bist ein Google-Ads-Spezialist bei der Agentur VYSIBLE. Analysiere die folgenden Kampagnendaten für "${praxisName}" und erstelle genau 3 strategische Insights und genau 4 Handlungsempfehlungen.

AKTUELLE PERIODE (letzte 28 Tage):
- Impressionen: ${googleAds.totalImpressions.toLocaleString('de-DE')}
- Klicks: ${googleAds.totalClicks.toLocaleString('de-DE')}
- CTR: ${ctr} %
- Conversions: ${googleAds.totalConversions} (Anrufe: ${googleAds.conversionBreakdown.anrufe}, Mails: ${googleAds.conversionBreakdown.mails}, Buchungen: ${googleAds.conversionBreakdown.buchungen})
- Ausgaben: € ${googleAds.totalSpend.toFixed(2)}
${ctc ? `- Kosten pro Conversion: € ${ctc}` : ''}

${prevBlock}

KAMPAGNEN:
${campaignBlock}

Antworte NUR mit gültigem JSON in diesem exakten Format, kein Markdown, kein Text davor oder danach:
{
  "insights": [
    {"kategorie": "Stärke", "titel": "...", "text": "..."},
    {"kategorie": "Risiko", "titel": "...", "text": "..."},
    {"kategorie": "Potenzial", "titel": "...", "text": "..."}
  ],
  "empfehlungen": [
    {"titel": "...", "text": "..."},
    {"titel": "...", "text": "..."},
    {"titel": "...", "text": "..."},
    {"titel": "...", "text": "..."}
  ]
}

Regeln:
- Genau 3 Insights (eine Stärke, ein Risiko, ein Potenzial)
- Genau 4 Empfehlungen mit konkreten, umsetzbaren Schritten
- Texte auf Deutsch, professionell aber verständlich
- Jeder Text max. 2 Sätze
- Beziehe dich auf konkrete Zahlen aus den Daten`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const parsed = JSON.parse(raw) as AdsInsights

    if (!Array.isArray(parsed.insights) || parsed.insights.length !== 3) {
      throw new Error('Ungültige Insights-Anzahl')
    }
    if (!Array.isArray(parsed.empfehlungen) || parsed.empfehlungen.length !== 4) {
      throw new Error('Ungültige Empfehlungen-Anzahl')
    }

    return parsed
  } catch (err) {
    logger.warn({ err, praxisName }, '[insights] KI-Insights konnten nicht generiert werden')
    return null
  }
}
