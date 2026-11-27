import { candidateSlots, localDay, parseIcsBusy, type BookingSettings, type BusyRange } from './booking-core'

// Créneaux de démonstration : réglages, occupations de l'agenda, créneaux encore libres.
export function bookingSettings(): BookingSettings & { enabled: boolean, busyIcsUrl: string, meetingUrl: string, feedKey: string } {
  const b = useRuntimeConfig().booking
  const days = String(b.days).split(',').map(Number).filter(n => n >= 1 && n <= 7)
  const times = String(b.times).split(',').map(s => s.trim()).filter(s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s))
  return {
    enabled: String(b.enabled) === 'true' && hasDb() && hasSmtp(),
    timezone: String(b.timezone || 'Europe/Paris'),
    days: days.length ? days : [1, 2, 3, 4, 5],
    times: times.length ? times : ['10:00', '14:00', '16:00'],
    durationMin: Math.min(240, Math.max(15, Number(b.durationMin) || 30)),
    horizonDays: Math.min(60, Math.max(1, Number(b.horizonDays) || 14)),
    minNoticeHours: Math.max(0, Number(b.minNoticeHours) || 24),
    busyIcsUrl: String(b.busyIcsUrl || ''),
    meetingUrl: String(b.meetingUrl || ''),
    feedKey: String(b.feedKey || ''),
  }
}

/** Fuseau des démonstrations, ou Paris si la valeur configurée n'est pas un fuseau. */
export function bookingZone(): string {
  const tz = bookingSettings().timezone
  try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return tz }
  catch { return 'Europe/Paris' }
}

export const fetchBusy = defineCachedFunction(async (url: string, tz: string): Promise<BusyRange[]> => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'ipnoria-website' } })
    if (!res.ok) return []
    const text = await res.text()
    return text.length > 5_000_000 ? [] : parseIcsBusy(text, tz)
  }
  catch { return [] }
}, { name: 'booking-busy', maxAge: 600, staleMaxAge: 3600, getKey: (url: string) => String(url.length) + url.slice(-24) })

export async function availableSlots(now = new Date()) {
  const s = bookingSettings()
  if (!s.enabled) return { enabled: false, slots: [] as string[], durationMin: s.durationMin, timezone: s.timezone }
  const candidates = candidateSlots(s, now)
  const db = useDb()
  const { rows } = await db.query<{ starts_at: Date }>(`SELECT starts_at FROM bookings WHERE status = 'confirmed' AND starts_at > now()`)
  const closedRows = await db.query<{ day: string }>(`SELECT to_char(day, 'YYYY-MM-DD') AS day FROM booking_closures`)
    .then(r => r.rows)
    .catch(() => [] as Array<{ day: string }>)
  const taken = new Set(rows.map(r => new Date(r.starts_at).getTime()))
  const closed = new Set(closedRows.map(r => r.day))
  const busy = s.busyIcsUrl ? await fetchBusy(s.busyIcsUrl, s.timezone) : []
  const dur = s.durationMin * 60000
  const slots = candidates.filter((d) => {
    const a = d.getTime(), b = a + dur
    return !closed.has(localDay(d, s.timezone)) && !taken.has(a) && !busy.some(r => r.start < b && r.end > a)
  })
  return { enabled: true, slots: slots.map(d => d.toISOString()), durationMin: s.durationMin, timezone: s.timezone }
}

