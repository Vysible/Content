'use client'

import { useEffect, useRef, useCallback } from 'react'
import { signOut } from 'next-auth/react'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 Minuten
const EVENTS = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'] as const

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login' }).catch(() => {
        window.location.href = '/login'
      })
    }, TIMEOUT_MS)
  }, [])

  useEffect(() => {
    resetTimer()

    for (const event of EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const event of EVENTS) {
        window.removeEventListener(event, resetTimer)
      }
    }
  }, [resetTimer])

  return <>{children}</>
}
