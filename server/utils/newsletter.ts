import { createHash, randomBytes } from 'node:crypto'
import type pg from 'pg'

export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')

const site = () => useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
export const confirmUrl = (token: string) => `${site()}/api/newsletter/confirm?token=${token}`
export const unsubscribeUrl = (token: string) => `${site()}/api/newsletter/unsubscribe?token=${token}`

const TEXT = {
  fr: {
    confirmSubject: 'Confirmez votre inscription aux nouvelles versions d\'Ipnoria',
    confirmBody: (url: string) => `Bonjour,\n\nPour recevoir un e-mail à chaque nouvelle version d'Ipnoria, confirmez votre adresse :\n\n${url}\n\nSi vous n'avez rien demandé, ignorez ce message : sans confirmation, l'adresse est supprimée au bout de 7 jours.\n`,
    releaseSubject: (v: string, title: string) => `Ipnoria ${v}${title ? ` : ${title}` : ''}`,
    releaseBody: (v: string, title: string, url: string, unsub: string) => `Ipnoria ${v} est disponible.${title ? `\n\n${title}` : ''}\n\nNotes de version : ${url}\n\n--\nNe plus recevoir ces e-mails : ${unsub}\n`,
  },
  en: {
    confirmSubject: 'Confirm your subscription to Ipnoria releases',
    confirmBody: (url: string) => `Hello,\n\nTo get an email for every new Ipnoria release, confirm your address:\n\n${url}\n\nIf you didn't ask for this, ignore this message: unconfirmed addresses are deleted after 7 days.\n`,
    releaseSubject: (v: string, title: string) => `Ipnoria ${v}${title ? `: ${title}` : ''}`,
    releaseBody: (v: string, title: string, url: string, unsub: string) => `Ipnoria ${v} is out.${title ? `\n\n${title}` : ''}\n\nRelease notes (in French): ${url}\n\n--\nStop these emails: ${unsub}\n`,
  },
} as const

export async function sendConfirmation(email: string, locale: 'fr' | 'en', token: string) {
  const tx = TEXT[locale]
  await sendMail({ to: email, subject: tx.confirmSubject, text: tx.confirmBody(confirmUrl(token)) })
}

const LOCK_ID = 7_340_222

/**
 * Annonce une nouvelle version aux abonnés confirmés. Au premier passage, mémorise seulement la version courante
 * (pas d'envoi rétroactif). Un verrou consultatif évite un double envoi si plusieurs instances tournent.
 * Renvoie le nombre d'e-mails envoyés.
 */
export async function announceNewRelease(pool: pg.Pool, latest: { version: string, title: string } | null): Promise<number> {
  if (!latest || !hasSmtp()) return 0
  const client = await pool.connect()
  try {
    const { rows: [lock] } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_ID])
    if (!lock?.ok) return 0
    try {
      const { rows: [state] } = await client.query<{ value: string }>(`SELECT value FROM site_state WHERE key = 'announced_version'`)
      if (!state) {
        await client.query(`INSERT INTO site_state (key, value) VALUES ('announced_version', $1)`, [latest.version])
        return 0
      }
      if (!isNewer(latest.version, state.value)) return 0

      // La version est marquée annoncée AVANT l'envoi : en cas d'arrêt au milieu, on n'envoie jamais deux fois le même e-mail
      await client.query(`UPDATE site_state SET value = $1, updated_at = now() WHERE key = 'announced_version'`, [latest.version])
      const { rows } = await client.query<{ email: string, locale: 'fr' | 'en', token_hash: string, id: string }>(
        `SELECT id, email, locale, token_hash FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`,
      )
      let sent = 0
      for (const s of rows) {
        // Nouveau jeton de désinscription à chaque envoi (on ne conserve que des empreintes)
        const token = newToken()
        await client.query('UPDATE newsletter_subscribers SET token_hash = $1 WHERE id = $2', [hashToken(token), s.id])
        const tx = TEXT[s.locale]
        const unsub = unsubscribeUrl(token)
        try {
          await sendMail({
            to: s.email,
            subject: tx.releaseSubject(latest.version, latest.title),
            text: tx.releaseBody(latest.version, latest.title, `${site()}/nouveautes/${latest.version}`, unsub),
            headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          })
          sent++
        }
        catch (err) {
          console.error(`[newsletter] envoi à l'abonné ${s.id} impossible :`, (err as Error).message)
        }
      }
      console.info(`[newsletter] version ${latest.version} annoncée à ${sent} abonné(s)`)
      return sent
    }
    finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
    }
  }
  finally {
    client.release()
  }
}

export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}
