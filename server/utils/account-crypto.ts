import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'

// Primitives des comptes, sans dépendance à Nitro (testables seules).

/** Jeton aléatoire (256 bits) en base64url : sessions, liens envoyés par e-mail, défis. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** Empreinte SHA-256 en hexadécimal : seule forme stockée des jetons. */
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Clé AES-256 dérivée du secret des comptes (HKDF-SHA256), une par usage. */
export function deriveKey(secret: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret), Buffer.alloc(0), `ipnoria:${purpose}`, 32))
}

/** Chiffrement authentifié AES-256-GCM : iv.tag.données, en base64url. */
export function seal(plain: Buffer, key: Buffer): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([c.update(plain), c.final()])
  return [iv, c.getAuthTag(), data].map(b => b.toString('base64url')).join('.')
}

export function unseal(sealed: string, key: Buffer): Buffer {
  const [iv, tag, data] = sealed.split('.').map(s => Buffer.from(s, 'base64url'))
  if (!iv || !tag || !data) throw new Error('sealed value malformed')
  const d = createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(data), d.final()])
}

/** Codes de secours : 10 codes de 10 caractères (≈ 50 bits), lisibles, groupés par 5. */
const RC_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function recoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const b = randomBytes(10)
    const s = Array.from(b, x => RC_ALPHABET[x % RC_ALPHABET.length]).join('')
    return `${s.slice(0, 5)}-${s.slice(5)}`
  })
}
export const normalizeRecovery = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
