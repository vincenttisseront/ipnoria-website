// Annule une démonstration confirmée et prévient le visiteur.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid booking' })
  const row = (await useDb().query<{
    id: string, starts_at: Date, ends_at: Date, name: string, email: string, company: string, notes: string, locale: 'fr' | 'en'
  }>(
    `UPDATE bookings SET status = 'cancelled'
      WHERE id = $1 AND status = 'confirmed'
      RETURNING id::text, starts_at, ends_at, name, email, company, notes, locale`,
    [id],
  )).rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  let mailed = true
  try {
    await sendBookingMails({
      id: row.id, start: row.starts_at, end: row.ends_at, name: row.name, email: row.email,
      company: row.company, notes: row.notes, locale: row.locale === 'en' ? 'en' : 'fr',
    }, 'cancelled')
  }
  catch { mailed = false }
  await adminAudit(event, admin, 'booking.cancel', 'booking', id, { mailed })
  return { ok: true, mailed }
})
