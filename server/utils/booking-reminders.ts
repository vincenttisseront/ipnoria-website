import type pg from 'pg'

/** Rappel par e-mail des démonstrations qui ont lieu dans les 24 heures (une seule fois par rendez-vous). */
export async function remindBookings(pool: pg.Pool): Promise<number> {
  if (!hasSmtp()) return 0
  const { rows } = await pool.query<{ id: string, starts_at: Date, ends_at: Date, name: string, email: string, locale: 'fr' | 'en' }>(
    `UPDATE bookings SET reminded_at = now()
      WHERE status = 'confirmed' AND reminded_at IS NULL AND starts_at BETWEEN now() + interval '1 hour' AND now() + interval '24 hours'
      RETURNING id, starts_at, ends_at, name, email, locale`,
  )
  for (const b of rows) {
    try { await sendBookingMails({ ...b, start: new Date(b.starts_at), end: new Date(b.ends_at) }, 'reminder') }
    catch (err) { console.error(`[booking] rappel ${b.id} impossible :`, (err as Error).message) }
  }
  return rows.length
}
