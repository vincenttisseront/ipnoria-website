import { createHash } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'

// Mots de passe : Argon2id (paramètres OWASP : 19 Mio, 2 passes), longueur 12 à 128,
// refus des mots de passe connus dans des fuites (service Have I Been Pwned, par k-anonymat :
// seuls les 5 premiers caractères de l'empreinte SHA-1 quittent le serveur).

const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }
export const hashPassword = (pw: string) => hash(pw, OPTS)
export async function verifyPassword(stored: string | null, pw: string): Promise<boolean> {
  // Sans mot de passe enregistré, on calcule quand même un hachage : même durée que pour un compte réel
  if (!stored) { await hash(pw, OPTS); return false }
  try { return await verify(stored, pw) }
  catch { return false }
}

export type PasswordProblem = 'length' | 'email' | 'common' | 'breached'
const COMMON = /^(.)\1+$|^(?:0123456789|1234567890|azertyuiop|qwertyuiop|motdepasse|password)/i

/** Problème du mot de passe, ou null s'il convient (sans le contrôle des fuites). */
export function passwordProblem(pw: string, email = ''): PasswordProblem | null {
  if (pw.length < 12 || pw.length > 128) return 'length'
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  if (local.length >= 4 && pw.toLowerCase().includes(local)) return 'email'
  if (COMMON.test(pw)) return 'common'
  return null
}

/** Nombre d'apparitions du mot de passe dans des fuites connues ; 0 si le service ne répond pas. */
export async function breachCount(pw: string, fetcher: typeof fetch = fetch): Promise<number> {
  const h = createHash('sha1').update(pw).digest('hex').toUpperCase()
  try {
    const res = await fetcher(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'ipnoria-website' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return 0
    for (const line of (await res.text()).split('\n')) {
      const [suffix, count] = line.trim().split(':')
      if (suffix === h.slice(5)) return Number(count) || 0
    }
    return 0
  }
  catch { return 0 } // service injoignable : on n'empêche pas l'inscription
}

/** Libellé court de l'appareil à partir de l'User-Agent : « Firefox, Windows ». */
export function deviceLabel(ua = ''): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser}, ${os}` : browser
}
