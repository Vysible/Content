import { describe, it, expect } from 'vitest'
import {
  normalizeGa4ServiceAccountJsonString,
  parseGa4ServiceAccountJson,
} from '@/lib/ga4/parse-service-account-json'

const MINIMAL_SA = {
  type: 'service_account',
  project_id: 'vysible-499921',
  private_key_id: 'key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\\nLINE1\\n-----END PRIVATE KEY-----\\n',
  client_email: 'vysible@vysible-499921.iam.gserviceaccount.com',
  token_uri: 'https://oauth2.googleapis.com/token',
}

function toJson(obj: typeof MINIMAL_SA): string {
  return JSON.stringify(obj)
}

describe('normalizeGa4ServiceAccountJsonString', () => {
  it('lässt sauberes JSON unverändert', () => {
    const raw = toJson(MINIMAL_SA)
    expect(normalizeGa4ServiceAccountJsonString(raw)).toBe(raw)
  })

  it('entfernt äußere Single-Quotes (.env)', () => {
    const inner = toJson(MINIMAL_SA)
    expect(normalizeGa4ServiceAccountJsonString(`'${inner}'`)).toBe(inner)
  })

  it('entfernt äußere Double-Quotes', () => {
    const inner = toJson(MINIMAL_SA)
    expect(normalizeGa4ServiceAccountJsonString(`"${inner}"`)).toBe(inner)
  })

  it('normalisiert Coolify-escaped Quotes', () => {
    const coolify =
      '{\\"type\\": \\"service_account\\", \\"project_id\\": \\"vysible-499921\\", \\"private_key_id\\": \\"key\\", \\"private_key\\": \\"-----BEGIN PRIVATE KEY-----\\\\nABC\\\\n-----END PRIVATE KEY-----\\\\n\\", \\"client_email\\": \\"a@b.iam.gserviceaccount.com\\", \\"token_uri\\": \\"https://oauth2.googleapis.com/token\\"}'
    const normalized = normalizeGa4ServiceAccountJsonString(coolify)
    expect(() => JSON.parse(normalized)).not.toThrow()
    expect(JSON.parse(normalized).type).toBe('service_account')
  })
})

describe('parseGa4ServiceAccountJson', () => {
  it('parst sauberes JSON', () => {
    const parsed = parseGa4ServiceAccountJson(toJson(MINIMAL_SA))
    expect(parsed.project_id).toBe('vysible-499921')
    expect(parsed.client_email).toContain('@')
    expect(parsed.private_key).toContain('LINE1')
    expect(parsed.private_key).toContain('\n')
  })

  it('parst .env-Format mit Single-Quotes', () => {
    const parsed = parseGa4ServiceAccountJson(`'${toJson(MINIMAL_SA)}'`)
    expect(parsed.project_id).toBe('vysible-499921')
  })

  it('parst Coolify-Format mit escaped Quotes (Smoke Prod)', () => {
    const coolify =
      '{\\"type\\": \\"service_account\\", \\"project_id\\": \\"vysible-499921\\", \\"private_key_id\\": \\"key-id\\", \\"private_key\\": \\"-----BEGIN PRIVATE KEY-----\\\\nLINE1\\\\n-----END PRIVATE KEY-----\\\\n\\", \\"client_email\\": \\"vysible@vysible-499921.iam.gserviceaccount.com\\", \\"token_uri\\": \\"https://oauth2.googleapis.com/token\\"}'
    const parsed = parseGa4ServiceAccountJson(coolify)
    expect(parsed.project_id).toBe('vysible-499921')
    expect(parsed.private_key).toMatch(/-----BEGIN PRIVATE KEY-----/)
    expect(parsed.private_key).toContain('\nLINE1\n')
  })

  it('wirft bei leerem String', () => {
    expect(() => parseGa4ServiceAccountJson('   ')).toThrow(/leer/)
  })

  it('wirft bei ungültigem JSON', () => {
    expect(() => parseGa4ServiceAccountJson('not-json')).toThrow(/kein valides JSON/)
  })

  it('wirft wenn Pflichtfelder fehlen', () => {
    expect(() => parseGa4ServiceAccountJson('{"type":"service_account"}')).toThrow(/Pflichtfelder/)
  })
})
