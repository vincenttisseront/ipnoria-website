import { createHash, createHmac, randomInt } from 'node:crypto'
import { randomToken, safeEqual } from './account-crypto'

// Preuve de travail (anti-robot sans service tiers ni cookie, format compatible ALTCHA) : le navigateur cherche
// le nombre n tel que SHA-256(sel + n) = défi. Coût négligeable pour une personne, dissuasif pour un envoi en masse.
export const POW_MAX = 80_000
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export function createChallenge(secret: string, ttlSeconds = 600, max = POW_MAX) {
  const salt = `${randomToken(12)}?expires=${Math.floor(Date.now() / 1000) + ttlSeconds}`
  const challenge = sha(`${salt}${randomInt(0, max + 1)}`)
  return { algorithm: 'SHA-256', challenge, maxnumber: max, salt, signature: createHmac('sha256', secret).update(challenge).digest('hex') }
}

export type PowPayload = { algorithm: string, challenge: string, number: number, salt: string, signature: string }
/** Vérifie la solution (signature, calcul, expiration). L'anti-rejeu est à la charge de l'appelant. */
export function checkSolution(secret: string, p: PowPayload, now = Date.now()): boolean {
  if (p?.algorithm !== 'SHA-256' || !Number.isInteger(p.number) || p.number < 0 || p.number > 1_000_000) return false
  if (typeof p.salt !== 'string' || typeof p.challenge !== 'string' || typeof p.signature !== 'string') return false
  const exp = Number(/[?&]expires=(\d+)/.exec(p.salt)?.[1])
  if (!exp || exp * 1000 < now) return false
  if (!safeEqual(createHmac('sha256', secret).update(p.challenge).digest('hex'), p.signature)) return false
  return sha(`${p.salt}${p.number}`) === p.challenge
}

/** Résolution (tests et outils) : force brute jusqu'à max. */
export function solve(c: { challenge: string, salt: string, maxnumber: number }): number | null {
  for (let n = 0; n <= c.maxnumber; n++) if (sha(`${c.salt}${n}`) === c.challenge) return n
  return null
}
