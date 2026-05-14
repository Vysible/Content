'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'STAFF'
  active: boolean
  createdAt: string
}

export function UserManagementClient() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Benutzer konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function updateUser(id: string, changes: { active?: boolean; role?: 'ADMIN' | 'STAFF' }) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Update fehlgeschlagen')
        return
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)))
    } catch {
      setError('Netzwerkfehler beim Update.')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div className="text-sm text-stahlgrau py-8 text-center">Lädt …</div>
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-xs text-bordeaux bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white rounded-xl border border-stone overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-creme border-b border-stone">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Name / E-Mail</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Rolle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stahlgrau">Erstellt</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {users.map((user) => {
              const isSelf = user.id === session?.user?.id
              const isUpdating = updating === user.id

              return (
                <tr key={user.id} className="hover:bg-creme/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-anthrazit">{user.name ?? '—'}</div>
                    <div className="text-xs text-stahlgrau">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={isSelf || isUpdating}
                      onChange={(e) =>
                        updateUser(user.id, { role: e.target.value as 'ADMIN' | 'STAFF' })
                      }
                      className="text-xs border border-stone rounded px-2 py-1 bg-white text-anthrazit disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-stone text-stahlgrau'
                      }`}
                    >
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stahlgrau">
                    {new Date(user.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateUser(user.id, { active: !user.active })}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                          user.active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {isUpdating ? '…' : user.active ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                    )}
                    {isSelf && (
                      <span className="text-xs text-stahlgrau italic">Eigenes Konto</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
