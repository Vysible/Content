import crypto from 'crypto'

/** Erzeugt einen kryptographisch sicheren Code-Verifier (RFC 7636). */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Berechnet den Code-Challenge aus dem Verifier (SHA-256, Base64URL). */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}
