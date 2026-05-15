import type { HedyTranscript } from './client'

export function prepareTranscriptForPrompt(transcript: HedyTranscript): string {
  const text = transcript.text.trim()

  const normalized = text
    .replace(/SPEAKER_00:/g, 'Moderator:')
    .replace(/SPEAKER_\d+:/g, 'Teilnehmer:')
    .replace(/\[inaudible\]/gi, '[unverständlich]')
    .replace(/\n{3,}/g, '\n\n')

  if (normalized.length <= 12_000) return normalized

  const half = 5_500
  return `${normalized.slice(0, half)}\n\n[... Mittelteil gekürzt für Token-Budget ...]\n\n${normalized.slice(-half)}`
}
