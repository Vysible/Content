'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEur } from '@/lib/utils'

interface ApiKey {
  id: string
  name: string
  provider: string
  model: string | null
  active: boolean
  createdAt: string
}

interface TestResult {
  success: boolean
  model?: string
  inputTokens?: number
  outputTokens?: number
  costEur?: number
  packageEstimateEur?: number
  message?: string
  error?: string
}

const PROVIDER_COLORS: Record<string, string> = {
  ANTHROPIC: 'bg-orange-100 text-orange-800',
  OPENAI:    'bg-green-100 text-green-800',
  DATASEO:   'bg-blue-100 text-blue-800',
  KLICKTIPP: 'bg-red-100 text-red-800',
  WORDPRESS: 'bg-indigo-100 text-indigo-800',
  HEDY:      'bg-purple-100 text-purple-800',
  CANVA:     'bg-pink-100 text-pink-800',
}

export function ApiKeyList({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter()
  const [keys, setKeys] = useState(initialKeys)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  async function handleTest(id: string) {
    setTesting((p) => ({ ...p, [id]: true }))
    setTestResults((p) => ({ ...p, [id]: undefined as unknown as TestResult }))

    try {
      const res = await fetch(`/api/api-keys/${id}/test`, { method: 'POST' })
      const data: TestResult = await res.json()
      setTestResults((p) => ({ ...p, [id]: data }))
    } catch {
      setTestResults((p) => ({ ...p, [id]: { success: false, error: 'Netzwerkfehler' } }))
    } finally {
      setTesting((p) => ({ ...p, [id]: false }))
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/api-keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) {
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: !active } : k)))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`API-Key „${name}" wirklich löschen?`)) return
    setDeleting((p) => ({ ...p, [id]: true }))
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id))
      router.refresh()
    }
    setDeleting((p) => ({ ...p, [id]: false }))
  }

  if (keys.length === 0) {
    return (
      <div className="text-center py-12 text-stahlgrau text-sm">
        Noch keine API-Keys konfiguriert. Klicke auf &bdquo;Key hinzufügen&ldquo;.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const result = testResults[key.id]
        const isTestLoading = testing[key.id]

        return (
          <div
            key={key.id}
            className={`bg-white border rounded-xl p-4 transition ${key.active ? 'border-stone' : 'border-stone opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROVIDER_COLORS[key.provider] ?? 'bg-gray-100 text-gray-700'}`}>
                    {key.provider}
                  </span>
                  <span className="font-medium text-sm text-nachtblau truncate">{key.name}</span>
                  {!key.active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inaktiv</span>
                  )}
                </div>
                {key.model && (
                  <p className="text-xs text-stahlgrau mt-1 font-mono">{key.model}</p>
                )}
                <p className="text-xs text-stahlgrau mt-1">
                  Hinzugefügt {new Date(key.createdAt).toLocaleDateString('de-DE')}
                </p>
              </div>

              {/* Aktionen */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleTest(key.id)}
                  disabled={isTestLoading || !key.active}
                  className="text-xs px-3 py-1.5 bg-tiefblau hover:bg-nachtblau text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestLoading ? 'Teste …' : 'Test'}
                </button>
                <button
                  onClick={() => handleToggleActive(key.id, key.active)}
                  className="text-xs px-3 py-1.5 bg-stone hover:bg-gray-200 text-anthrazit rounded-lg transition"
                >
                  {key.active ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <button
                  onClick={() => handleDelete(key.id, key.name)}
                  disabled={deleting[key.id]}
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-bordeaux rounded-lg transition disabled:opacity-50"
                >
                  Löschen
                </button>
              </div>
            </div>

            {/* Test-Ergebnis */}
            {result && (
              <div className={`mt-3 p-3 rounded-lg text-xs ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.success ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-green-800">✓ {result.message}</p>
                    <div className="text-green-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <span>Modell: <span className="font-mono">{result.model}</span></span>
                      <span>Test-Kosten: {formatEur(result.costEur ?? 0)}</span>
                      <span>Input-Tokens: {result.inputTokens}</span>
                      <span>Output-Tokens: {result.outputTokens}</span>
                    </div>
                    {result.packageEstimateEur !== undefined && (
                      <p className="text-green-600 mt-1 border-t border-green-200 pt-1">
                        Kostenvoranschlag Content-Paket (6 Monate, alle Kanäle): <strong>{formatEur(result.packageEstimateEur)}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-bordeaux font-medium">✗ {result.error}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
