'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CommentThread } from '@/components/praxis/CommentThread'
import { ApprovalButton } from '@/components/praxis/ApprovalButton'

interface TextResult {
  topic: string
  blog?: { title: string; html: string }
  newsletter?: { subject: string; body: string }
  socialPosts?: string[]
  blogStatus?: string
}

interface Session {
  userId: string
  name: string
  projectId: string
  projectName: string
  textResults: TextResult[]
}

export default function PraxisReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    fetch('/api/praxis/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setSession(data)
      })
      .catch(() => setError('Verbindungsfehler'))
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone/30">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow">
          <p className="text-red-600 font-medium mb-2">Zugang nicht möglich</p>
          <p className="text-sm text-stahlgrau">{error}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone/30">
        <p className="text-stahlgrau animate-pulse">Lade…</p>
      </div>
    )
  }

  const results = session.textResults ?? []
  const current = results[activeIdx]

  return (
    <div className="min-h-screen bg-stone/20">
      <header className="bg-white border-b border-stone px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-nachtblau">{session.projectName}</h1>
          <p className="text-xs text-stahlgrau">Hallo {session.name} — Inhalte zur Freigabe</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {results.length === 0 ? (
          <p className="text-center text-stahlgrau mt-16">Noch keine Inhalte zur Freigabe vorhanden.</p>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="col-span-1 space-y-1">
              {results.map((r: TextResult, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${
                    i === activeIdx ? 'bg-tiefblau text-white' : 'hover:bg-stone/40 text-nachtblau'
                  }`}
                >
                  {r.topic}
                </button>
              ))}
            </div>

            {/* Content */}
            {current && (
              <div className="col-span-3 space-y-6">
                <div className="bg-white rounded-xl border border-stone p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-nachtblau">{current.topic}</h2>
                    <ApprovalButton
                      token={token}
                      projectId={session.projectId}
                      contentIndex={activeIdx}
                      initialStatus={current.blogStatus}
                    />
                  </div>

                  {current.blog && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-stahlgrau mb-2 uppercase tracking-wide">Blogartikel</h3>
                      <p className="font-medium text-nachtblau mb-2">{current.blog.title}</p>
                      <div
                        className="prose prose-sm max-w-none text-anthrazit"
                        dangerouslySetInnerHTML={{ __html: current.blog.html }}
                      />
                    </div>
                  )}

                  {current.newsletter && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-stahlgrau mb-2 uppercase tracking-wide">Newsletter</h3>
                      <p className="font-medium text-nachtblau mb-2">Betreff: {current.newsletter.subject}</p>
                      <div
                        className="prose prose-sm max-w-none text-anthrazit"
                        dangerouslySetInnerHTML={{ __html: current.newsletter.body }}
                      />
                    </div>
                  )}

                  {current.socialPosts && current.socialPosts.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-stahlgrau mb-2 uppercase tracking-wide">Social Media</h3>
                      <div className="space-y-2">
                        {current.socialPosts.map((post: string, j: number) => (
                          <div key={j} className="p-3 bg-stone/30 rounded-lg text-sm">{post}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-stone p-4">
                  <h3 className="text-sm font-semibold text-nachtblau mb-3">Kommentare</h3>
                  <CommentThread token={token} projectId={session.projectId} contentIndex={activeIdx} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
