'use client'

import { useState, useEffect } from 'react'

export default function CostThresholdConfig() {
  const [monthlyAlertEur, setMonthlyAlertEur] = useState(50.0)
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      const res = await fetch('/api/settings/cost-threshold')
      if (res.ok) {
        const data = (await res.json()) as { monthlyAlertEur: number; alertEnabled: boolean }
        setMonthlyAlertEur(data.monthlyAlertEur)
        setAlertEnabled(data.alertEnabled)
      }
      setLoading(false)
    }
    void loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings/cost-threshold', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyAlertEur, alertEnabled }),
    })
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Lade Einstellungen...</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
            Monatlicher Schwellwert (€)
          </label>
          <input
            type="number"
            id="threshold"
            value={monthlyAlertEur}
            onChange={(e) => setMonthlyAlertEur(parseFloat(e.target.value) || 0)}
            step="1"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Warnungen aktiv</span>
          </label>
        </div>
      </div>

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>

      <p className="text-xs text-gray-500">
        Wenn die monatlichen Kosten eines Projekts den Schwellwert überschreiten, wird eine E-Mail an die
        konfigurierten Empfänger gesendet.
      </p>
    </div>
  )
}
