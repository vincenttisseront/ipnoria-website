import { z } from 'zod'

// Annulation par le visiteur, depuis le lien de son e-mail (la page demande une confirmation : pas d'annulation par simple visite du lien)
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (!hasDb()) throw createError({ statusCode: 503 })
  const { token } = z.object({ token: z.string().regex(/^[\w-]{43}$/) }).parse(await readBody(event))
  const { rows: [b] } = await useDb().query<{ id: string, starts_at: Date, ends_at: Date, name: string, email: string, locale: 'fr' | 'en' }>(
    `UPDATE bookings SET status = 'cancelled' WHERE token_hash = $1 AND status = 'confirmed' AND starts_at > now()
     RETURNING id, starts_at, ends_at, name, email, locale`,
    [hashToken(token)],
  )
  if (!b) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  try { await sendBookingMails({ ...b, start: new Date(b.starts_at), end: new Date(b.ends_at) }, 'cancelled') }
  catch (err) { console.error(`[booking] e-mail d'annulation ${b.id} impossible :`, (err as Error).message) }
  return { ok: true }
})
