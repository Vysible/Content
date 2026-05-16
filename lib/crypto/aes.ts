import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKeyV1(): Buffer {
  const hex = process.env.ENCRYPTION_SECRET_V1 ?? process.env.ENCRYPTION_SECRET
  if (!hex || hex.length !== 64) {
    throw new Error('[Vysible] ENCRYPTION_SECRET_V1 oder ENCRYPTION_SECRET muss ein 64-Zeichen Hex-String sein (32 Bytes / 256 Bit)')
  }
  return Buffer.from(hex, 'hex')
}

// Rückgabe-Format: v1:iv:authTag:ciphertext (alles hex-kodiert)
export function encrypt(plaintext: string): string {
  const key = getKeyV1()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  let ivHex: string, tagHex: string, dataHex: string

  if (ciphertext.startsWith('v1:')) {
    // Neues Format: v1:iv:tag:cipher
    const parts = ciphertext.slice(3).split(':')
    if (parts.length !== 3) throw new Error('Ungültiges v1-Ciphertext-Format')
    ;[ivHex, tagHex, dataHex] = parts
  } else if (ciphertext.startsWith('v2:')) {
    throw new Error('[Vysible] AES v2-Schlüssel noch nicht implementiert')
  } else {
    // Legacy-Format: iv:tag:cipher (wird nach Datenmigration entfernt)
    const parts = ciphertext.split(':')
    if (parts.length !== 3) throw new Error('Ungültiges Legacy-Ciphertext-Format')
    ;[ivHex, tagHex, dataHex] = parts
  }

  const key = getKeyV1()

  const iv = Buffer.from(ivHex!, 'hex')
  const tag = Buffer.from(tagHex!, 'hex')
  const data = Buffer.from(dataHex!, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
