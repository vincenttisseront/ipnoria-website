import { timingSafeEqual } from 'node:crypto'

// Flux iCalendar des rendez-vous à venir, à ajouter dans votre agenda (« s'abonner par URL »). Protégé par NUXT_BOOKING_FEED_KEY.
export default defineEventHandler(async (event) => {
  const s = bookingSettings()
  const key = String(getQuery(event).key ?? '')
  const ok = s.feedKey.length >= 24 && key.length === s.feedKey.length && timingSafeEqual(Buffer.from(key), Buffer.from(s.feedKey))
  if (!ok || !hasDb()) throw createError({ statusCode: 404 })
  const { rows } = await useDb().query<{ id: string, starts_at: Date, ends_at: Date, name: string, email: string, company: string, notes: string }>(
    `SELECT id, starts_at, ends_at, name, email, company, notes FROM bookings
      WHERE status = 'confirmed' AND starts_at > now() - interval '30 days' ORDER BY starts_at`,
  )
  const host = new URL(useRuntimeConfig().public.siteUrl).hostname
  const events = rows.map(b => icsEvent({
    uid: `booking-${b.id}@${host}`,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    summary: `Démonstration Ipnoria : ${b.name}${b.company ? ` (${b.company})` : ''}`,
    description: `${b.email}${b.notes ? `\n\n${b.notes}` : ''}`,
    url: s.meetingUrl || undefined,
  }))
  setResponseHeaders(event, { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300' })
  return icsCalendar(events, 'PUBLISH')
})
