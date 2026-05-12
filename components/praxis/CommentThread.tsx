'use client'

import { useEffect, useState } from 'react'

interface Comment {
  id: string
  contentIndex: number
  text: string
  authorName: string
  authorRole: string
  createdAt: string
}

interface CommentThreadProps {
  token: string
  projectId: string
  contentIndex: number
}

export function CommentThread({ token, projectId, contentIndex }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/praxis/comments?token=${token}&projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setComments(data.filter((c: Comment) => c.contentIndex === contentIndex))
        }
      })
  }, [token, projectId, contentIndex])

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    const res = await fetch('/api/praxis/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, projectId, contentIndex, text }),
    })
    if (res.ok) {
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      setText('')
    }
    setSending(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-xs text-stahlgrau">Noch keine Kommentare</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className={`p-2 rounded-lg text-sm ${c.authorRole === 'praxis' ? 'bg-blue-50 ml-4' : 'bg-stone/40 mr-4'}`}>
            <p className="text-xs font-medium text-stahlgrau mb-1">{c.authorName}</p>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Kommentar eingeben…"
          className="flex-1 border border-stone rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tiefblau"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-3 py-1.5 bg-tiefblau text-white text-sm rounded-lg hover:bg-nachtblau disabled:opacity-50"
        >
          Senden
        </button>
      </div>
    </div>
  )
}
