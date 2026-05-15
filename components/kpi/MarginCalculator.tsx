'use client'

import { useState } from 'react'

interface Props {
  avgCostPerPackage: number
}

export default function MarginCalculator({ avgCostPerPackage }: Props) {
  const [customerPrice, setCustomerPrice] = useState(5.0)

  const margin = customerPrice > 0 ? ((customerPrice - avgCostPerPackage) / customerPrice) * 100 : 0
  const profit = customerPrice - avgCostPerPackage

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerPrice" className="block text-sm font-medium text-gray-700">
            Kundenpreis/Monat (€)
          </label>
          <input
            type="number"
            id="customerPrice"
            value={customerPrice}
            onChange={(e) => setCustomerPrice(parseFloat(e.target.value) || 0)}
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Ø Kosten pro Paket</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{avgCostPerPackage.toFixed(2)} €</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-700">Marge</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{margin.toFixed(1)} %</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Gewinn/Monat</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{profit.toFixed(2)} €</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
        <p className="font-medium">Referenzwert (aus plan.md):</p>
        <p className="mt-1">
          Bei 5,00 € Kundenpreis und {avgCostPerPackage.toFixed(2)} € Kosten ergibt sich eine Marge von{' '}
          {margin.toFixed(1)} % und ein Gewinn von {profit.toFixed(2)} € pro Monat.
        </p>
      </div>
    </div>
  )
}
