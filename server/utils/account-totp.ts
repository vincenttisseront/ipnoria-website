import { createHmac, randomBytes } from 'node:crypto'

// TOTP (RFC 6238) : HMAC-SHA1, 6 chiffres, pas de 30 s, tolérance d'un pas de chaque côté.
// Le dernier pas accepté est mémorisé par l'appelant pour refuser le rejeu d'un même code.

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(out)
}

export function hotp(secret: Buffer, counter: number, digits = 6, algo: 'sha1' | 'sha256' | 'sha512' = 'sha1'): string {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const h = createHmac(algo, secret).update(msg).digest()
  const off = h[h.length - 1]! & 0x0f
  const bin = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!
  return String(bin % 10 ** digits).padStart(digits, '0')
}

export const totpStep = (now = Date.now(), period = 30) => Math.floor(now / 1000 / period)

/** Vérifie un code ; renvoie le pas accepté, ou null. Refuse tout pas ≤ lastStep (rejeu). */
export function verifyTotp(secret: Buffer, code: string, opts: { now?: number, lastStep?: number | null, window?: number } = {}): number | null {
  const c = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(c)) return null
  const cur = totpStep(opts.now)
  const w = opts.window ?? 1
  for (let d = -w; d <= w; d++) {
    const step = cur + d
    if (opts.lastStep != null && step <= opts.lastStep) continue
    if (hotp(secret, step) === c) return step
  }
  return null
}

export const newTotpSecret = () => randomBytes(20)

export function otpauthUri(secret: Buffer, account: string, issuer = 'Ipnoria'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const q = new URLSearchParams({ secret: base32Encode(secret), issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${q}`
}
