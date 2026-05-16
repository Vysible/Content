'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardLayout } from './WizardLayout'
import { Step1Url } from './Step1Url'
import { Step2Planning } from './Step2Planning'
import { Step3Context } from './Step3Context'

export interface WizardData {
  // Step 1
  praxisUrl: string
  praxisName: string
  urlValidated: boolean
  robotsAllowed: boolean
  // Step 2
  projectName: string
  planningStart: string  // "YYYY-MM"
  planningEnd: string    // "YYYY-MM"
  durationMonths: number
  channels: string[]
  // Step 3
  fachgebiet: string
  positioningDocument: string
  keywords: string[]
  themenPool: string
  canvaFolderId: string | null
  canvaFolderName: string | null
  ga4PropertyId: string
}

function buildDefaultProjectName(praxisName: string, start: string): string {
  const [year, month] = start.split('-')
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const m = monthNames[Number(month) - 1] ?? ''
  return `${praxisName} – ${m} ${year}`
}

function getDefaultStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(yearMonth: string, months: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const initialStart = getDefaultStart()

const INITIAL: WizardData = {
  praxisUrl: '',
  praxisName: '',
  urlValidated: false,
  robotsAllowed: true,
  projectName: '',
  planningStart: initialStart,
  planningEnd: addMonths(initialStart, 6),
  durationMonths: 6,
  channels: ['BLOG', 'NEWSLETTER', 'SOCIAL_INSTAGRAM'],
  fachgebiet: '',
  positioningDocument: '',
  keywords: [],
  themenPool: '',
  canvaFolderId: null,
  canvaFolderName: null,
  ga4PropertyId: '',
}

export function NewProjectWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function update(updates: Partial<WizardData>) {
    setData((prev) => {
      const next = { ...prev, ...updates }
      // Projektname auto-generieren, solange er noch dem Auto-Format entspricht
      if ('praxisName' in updates || 'planningStart' in updates) {
        next.projectName = buildDefaultProjectName(next.praxisName, next.planningStart)
      }
      return next
    })
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.projectName,
        praxisUrl: data.praxisUrl,
        praxisName: data.praxisName,
        fachgebiet: data.fachgebiet || undefined,
        planningStart: `${data.planningStart}-01`,
        planningEnd: `${data.planningEnd}-01`,
        channels: data.channels,
        positioningDocument: data.positioningDocument || undefined,
        themenPool: data.themenPool || undefined,
        keywords: data.keywords,
        canvaFolderId: data.canvaFolderId ?? undefined,
        ga4PropertyId: data.ga4PropertyId || undefined,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Fehler beim Erstellen des Projekts')
      return
    }

    const project = await res.json()
    router.push(`/projects/${project.id}`)
  }

  return (
    <WizardLayout currentStep={step}>
      {step === 1 && (
        <Step1Url data={data} onChange={update} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <Step2Planning data={data} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <>
          <Step3Context
            data={data}
            onChange={update}
            locationForKeywordReview={data.praxisName}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
          {error && (
            <p className="mt-3 text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </>
      )}
    </WizardLayout>
  )
}
