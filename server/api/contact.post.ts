import { contactSchema, invalidFields, MIN_FILL_MS } from '#shared/contact'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (!getRequestHeader(event, 'content-type')?.startsWith('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported Media Type' })
  }
  if (!hasDb()) throw createError({ statusCode: 503, statusMessage: 'Contact form unavailable' })

  const raw = await readBody(event)
  const parsed = contactSchema.safeParse(raw)

  // Robot probable (champ piège rempli, ou formulaire rempli en moins de 3 s) : réponse identique à un succès, rien n'est stocké
  const r = (raw ?? {}) as { website?: unknown, startedAt?: unknown }
  const tooFast = typeof r.startedAt === 'number' && Date.now() - r.startedAt < MIN_FILL_MS
  if ((typeof r.website === 'string' && r.website.length > 0) || tooFast) {
    return { ok: true }
  }

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form', data: { fields: invalidFields(parsed.error) } })
  }
  await verifyPow(event, (raw as { pow?: string })?.pow)
  const data = parsed.data
  const ipHash = clientIpHash(event)
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 300)
  const db = useDb()

  // Deuxième garde-fou, persistant (la limite de nuxt-security est en mémoire) : 20 messages par jour et par empreinte d'IP
  const { rows: [count] } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM contact_messages WHERE ip_hash = $1 AND created_at > now() - interval '1 day'`,
    [ipHash],
  )
  if ((count?.n ?? 0) >= 20) throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })

  const { rows: [row] } = await db.query<{ id: string }>(
    `INSERT INTO contact_messages (locale, name, email, company, topic, message, consent_at, ip_hash, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8) RETURNING id`,
    [data.locale, data.name, data.email, data.company, data.topic, data.message, ipHash, userAgent],
  )
  const id = row!.id

  // La notification ne doit jamais faire échouer l'envoi : le message est déjà en base
  try {
    if (await notifyContact(id, data)) {
      await db.query('UPDATE contact_messages SET notified_at = now() WHERE id = $1', [id])
    }
  }
  catch (err) {
    console.error(`[contact] notification du message ${id} impossible :`, (err as Error).message)
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
