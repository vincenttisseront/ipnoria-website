import { MIN_FILL_MS } from '#shared/contact'
import { bookingSchema } from '#shared/forms'

// Réservation d'un créneau : vérifié contre les créneaux encore libres, unicité garantie par la base,
// confirmation par e-mail au visiteur et à l'équipe, avec invitation iCalendar.
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (!getRequestHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415 })
  await assertFeature('booking')
  const s = bookingSettings()
  if (!s.enabled) throw createError({ statusCode: 503, statusMessage: 'Booking unavailable' })

  const raw = (await readBody(event)) ?? {}
  if ((typeof raw.website === 'string' && raw.website) || (typeof raw.startedAt === 'number' && Date.now() - raw.startedAt < MIN_FILL_MS)) {
    setResponseStatus(event, 201)
    return { ok: true }
  }
  const parsed = bookingSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid booking', data: { fields: [...new Set(parsed.error.issues.map(i => String(i.path[0])))] } })
  }
  const d = parsed.data
  await verifyPow(event, raw.pow)
  const start = new Date(d.slot)
  const { slots } = await availableSlots()
  if (!slots.includes(start.toISOString())) throw createError({ statusCode: 409, statusMessage: 'Slot unavailable' })
  const end = new Date(start.getTime() + s.durationMin * 60000)
  const token = newToken()

  let id: string
  try {
    const { rows: [row] } = await useDb().query<{ id: string }>(
      `INSERT INTO bookings (starts_at, ends_at, name, email, company, notes, locale, token_hash, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [start, end, d.name, d.email, d.company, d.notes, d.locale, hashToken(token), clientIpHash(event)],
    )
    id = row!.id
  }
  catch (err) {
    // Créneau pris entre-temps (index unique)
    if ((err as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'Slot unavailable' })
    throw err
  }

  try { await sendBookingMails({ id, start, end, ...d, token }, 'confirmed') }
  catch (err) { console.error(`[booking] e-mails du rendez-vous ${id} impossibles :`, (err as Error).message) }
  setResponseStatus(event, 201)
  return { ok: true, start: start.toISOString(), end: end.toISOString() }
})
