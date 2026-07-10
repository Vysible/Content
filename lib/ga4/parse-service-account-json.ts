export interface Ga4ServiceAccountKey {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  token_uri: string
}

function normalizePrivateKey(key: string): string {
  // Coolify speichert manchmal literal \n statt echter Newlines
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key
}

/**
 * Normalisiert den Rohtext aus process.env / Coolify vor JSON.parse.
 * Unterstützt: sauberes JSON, .env mit Single-Quotes, Coolify mit escaped Quotes (\").
 */
export function normalizeGa4ServiceAccountJsonString(raw: string): string {
  let s = raw.trim()
  if (!s) {
    return s
  }

  // .env: GA4_SERVICE_ACCOUNT_JSON='{...}'
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim()
  }

  // Outer double-quotes: "{...}" oder "{\"type\":...}"
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim()
  }

  // Coolify: literal \" statt "
  if (s.includes('\\"')) {
    s = s.replace(/\\"/g, '"')
  }

  return s
}

export function parseGa4ServiceAccountJson(raw: string): Ga4ServiceAccountKey {
  const normalized = normalizeGa4ServiceAccountJsonString(raw)
  if (!normalized) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON ist leer')
  }

  let parsed: Ga4ServiceAccountKey
  try {
    parsed = JSON.parse(normalized) as Ga4ServiceAccountKey
  } catch {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON ist kein valides JSON')
  }

  if (!parsed.private_key || !parsed.client_email || !parsed.token_uri) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON: Pflichtfelder fehlen (private_key, client_email, token_uri)')
  }

  parsed.private_key = normalizePrivateKey(parsed.private_key)
  return parsed
}
