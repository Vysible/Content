'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiKeyList } from '@/components/api-keys/ApiKeyList'
import { ApiKeyForm } from '@/components/api-keys/ApiKeyForm'
import { SocialTokenStatusSection } from './SocialTokenStatusSection'

interface ApiKey {
  id: string
  name: string
  provider: string
  model: string | null
  active: boolean
  createdAt: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/api-keys')
    if (res.ok) {
      const data = await res.json()
      setKeys(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  return (
    <div className="space-y-8">

      {/* KI & Drittanbieter ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stahlgrau">
              KI &amp; Drittanbieter
            </p>
            <p className="text-xs text-stahlgrau mt-0.5">
              Verschlüsselt gespeichert (AES-256). Klartexte werden nie zurückgegeben.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-cognac hover:bg-cognacDark text-black text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              + Key hinzufügen
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white border border-stone rounded-xl p-5 mb-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-nachtblau mb-4">Neuer API-Key</h3>
            <ApiKeyForm
              onSuccess={() => { setShowForm(false); loadKeys() }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="text-sm text-stahlgrau py-8 text-center">Lädt …</div>
        ) : (
          <ApiKeyList initialKeys={keys} />
        )}

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>Phase 3 (geplant):</strong> DataForSEO, Klick-Tipp, WordPress, Hedy und Canva können bereits als
          Provider angelegt werden — werden aber erst ab Phase 3 aktiv genutzt.
        </div>
      </section>

      {/* Social Media ───────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-stahlgrau mb-4">
          Social Media Verbindungen
        </p>
        <SocialTokenStatusSection />
      </section>

    </div>
  )
}
