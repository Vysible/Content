/**
 * Typen für die persistierte Ergebnisansicht.
 * Erweitert TextResult um Status-Felder die in textResults JSON mitgespeichert werden.
 */
import type { TextResult } from './texts-schema'

export type BlogStatus = 'ausstehend' | 'in_wordpress' | 'veroeffentlicht'
export type NewsletterStatus = 'ausstehend' | 'kt_kampagne' | 'versendet'
export type SocialStatus = 'ausstehend' | 'hochgeladen' | 'freigegeben'

export interface ContentVersion {
  content: string
  savedAt: string // ISO timestamp
}

export interface StoredTextResult extends TextResult {
  blogStatus?: BlogStatus
  newsletterStatus?: NewsletterStatus
  socialStatus?: SocialStatus
  // Max. 10 Versionen je Artefakt (Slice 8)
  blogVersions?: ContentVersion[]
  newsletterVersions?: ContentVersion[]
}

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  ausstehend: 'Ausstehend',
  in_wordpress: 'In WordPress',
  veroeffentlicht: 'Veröffentlicht',
}

export const NEWSLETTER_STATUS_LABELS: Record<NewsletterStatus, string> = {
  ausstehend: 'Ausstehend',
  kt_kampagne: 'KT-Kampagne erstellt',
  versendet: 'Versendet',
}

export const SOCIAL_STATUS_LABELS: Record<SocialStatus, string> = {
  ausstehend: 'Ausstehend',
  hochgeladen: 'Hochgeladen',
  freigegeben: 'Freigegeben',
}
