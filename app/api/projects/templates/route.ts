import { requireAuth } from '@/lib/auth/session'
import { listAvailableTemplates, loadTemplate } from '@/lib/templates/loader'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAuth()
  const slugs = listAvailableTemplates()
  const templates = slugs
    .map((slug) => {
      const tpl = loadTemplate(slug)
      if (!tpl) return null
      return {
        slug,
        displayName: tpl.displayName,
        specialty: tpl.specialty,
        defaultKeywords: tpl.defaultKeywords,
        defaultCategories: tpl.defaultCategories,
        seasonalTopics: tpl.seasonalTopics,
        hwgHighRiskCategories: tpl.hwgHighRiskCategories,
        defaultCta: tpl.defaultCta,
        defaultFunnelDistribution: tpl.defaultFunnelDistribution,
      }
    })
    .filter(Boolean)
  return NextResponse.json(templates)
}
