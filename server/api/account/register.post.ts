import { MIN_FILL_MS } from '#shared/contact'
import { registerSchema } from '#shared/account'

// Inscription : même réponse que l'adresse soit libre ou non (pas d'énumération des comptes).
// Adresse libre : compte créé, session ouverte, lien de vérification envoyé. Adresse prise : le titulaire est prévenu.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const raw = (await readBody(event)) ?? {}
  if ((typeof raw.website === 'string' && raw.website) || (typeof raw.startedAt === 'number' && Date.now() - raw.startedAt < MIN_FILL_MS)) {
    return { ok: true }
  }
  const d = registerSchema.safeParse(raw)
  if (!d.success) throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: { fields: [...new Set(d.error.issues.map(i => String(i.path[0])))] } })
  const { email, password, displayName, locale } = d.data
  await checkNewPassword(password, email)

  const db = useDb()
  const existing = await db.query('SELECT id, locale FROM users WHERE lower(email) = $1', [email])
  if (existing.rowCount) {
    await hashPassword(password) // même durée de traitement qu'une vraie inscription
    await mailAlreadyRegistered(email, existing.rows[0].locale).catch(err => console.error('[account]', err.message))
    return { ok: true }
  }
  let id: string
  try {
    const r = await db.query<{ id: string }>(
      'INSERT INTO users (email, password_hash, display_name, locale) VALUES ($1, $2, $3, $4) RETURNING id::text',
      [email, await hashPassword(password), displayName, locale],
    )
    id = r.rows[0]!.id
  }
  catch (err) {
    if ((err as { code?: string }).code === '23505') return { ok: true }
    throw err
  }
  await createSession(event, id)
  await recordEvent(event, { id, email, locale }, 'register')
  await mailVerify(email, locale, displayName, await issueToken(id, 'verify', 24)).catch(err => console.error('[account]', err.message))
  return { ok: true }
})
