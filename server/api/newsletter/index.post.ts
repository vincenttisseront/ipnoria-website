import { MIN_FILL_MS } from '#shared/contact'
import { newsletterSchema } from '#shared/newsletter'

// Inscription en double opt-in. La réponse est la même que l'adresse soit nouvelle, déjà inscrite ou confirmée (pas d'énumération).
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (!getRequestHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415 })
  if (!hasDb() || !hasSmtp()) throw createError({ statusCode: 503, statusMessage: 'Newsletter unavailable' })

  const raw = (await readBody(event)) ?? {}
  if ((typeof raw.website === 'string' && raw.website) || (typeof raw.startedAt === 'number' && Date.now() - raw.startedAt < MIN_FILL_MS)) {
    setResponseStatus(event, 202)
    return { ok: true }
  }
  const parsed = newsletterSchema.safeParse(raw)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map(i => String(i.path[0])))].filter(f => f === 'email' || f === 'consent')
    throw createError({ statusCode: 400, statusMessage: 'Invalid form', data: { fields } })
  }
  const { email, locale } = parsed.data
  const db = useDb()
  const token = newToken()

  // Nouvelle adresse, ou adresse jamais confirmée / désinscrite : (ré)émission d'un jeton et d'un e-mail de confirmation
  const { rows } = await db.query<{ confirmed: boolean }>(
    `INSERT INTO newsletter_subscribers (email, locale, token_hash, ip_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET token_hash = EXCLUDED.token_hash, locale = EXCLUDED.locale, created_at = now(), unsubscribed_at = NULL, confirmed_at = NULL
       WHERE newsletter_subscribers.confirmed_at IS NULL OR newsletter_subscribers.unsubscribed_at IS NOT NULL
     RETURNING (confirmed_at IS NOT NULL) AS confirmed`,
    [email, locale, hashToken(token), clientIpHash(event)],
  )
  if (rows.length) {
    try { await sendConfirmation(email, locale, token) }
    catch (err) {
      console.error('[newsletter] e-mail de confirmation impossible :', (err as Error).message)
      throw createError({ statusCode: 502, statusMessage: 'Mail delivery failed' })
    }
  }
  setResponseStatus(event, 202)
  return { ok: true }
})
