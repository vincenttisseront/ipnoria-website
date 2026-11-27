// Créneaux de démonstration : calculs purs (fuseaux, créneaux, lecture iCalendar, invitations), testables sans Nitro.

export interface BookingSettings {
  timezone: string
  days: number[]            // 1 = lundi … 7 = dimanche
  times: string[]           // « HH:MM » dans le fuseau
  durationMin: number
  horizonDays: number
  minNoticeHours: number
}

/** Décalage (minutes) d'un fuseau à un instant donné, par Intl (gère l'heure d'été). */
export function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).map(p => [p.type, p.value]))
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** Jour calendaire YYYY-MM-DD dans un fuseau. */
export function localDay(at: Date, timeZone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Heure locale d'un fuseau → instant UTC. */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const off = tzOffsetMinutes(guess, timeZone)
  const first = new Date(guess.getTime() - off * 60000)
  const off2 = tzOffsetMinutes(first, timeZone)
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60000)
}

/** Tous les créneaux théoriques à venir (sans tenir compte des réservations ni de l'agenda). */
export function candidateSlots(s: BookingSettings, now = new Date()): Date[] {
  const out: Date[] = []
  const earliest = now.getTime() + s.minNoticeHours * 3600_000
  for (let i = 0; i <= s.horizonDays; i++) {
    const day = new Date(now.getTime() + i * 86400_000)
    const local = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: s.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(day).map(p => [p.type, p.value]))
    const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(local.weekday!) + 1
    if (!s.days.includes(dow)) continue
    for (const t of s.times) {
      const [hh, mm] = t.split(':').map(Number)
      const at = zonedToUtc(Number(local.year), Number(local.month), Number(local.day), hh!, mm!, s.timezone)
      if (at.getTime() >= earliest) out.push(at)
    }
  }
  return [...new Map(out.map(d => [d.getTime(), d])).values()].sort((a, b) => a.getTime() - b.getTime())
}

export interface BusyRange { start: number, end: number }

/**
 * Occupations d'un agenda iCalendar (adresse « secrète » d'un agenda Outlook, Google, Nextcloud…).
 * Gère DTSTART/DTEND en UTC, avec TZID, ou en journée entière. Limite : les événements récurrents (RRULE) ne sont pas développés.
 */
export function parseIcsBusy(ics: string, defaultTz: string): BusyRange[] {
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out: BusyRange[] = []
  let cur: { start?: number, end?: number, transparent?: boolean, cancelled?: boolean } | null = null
  const parse = (line: string): number | undefined => {
    const [head, value] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]
    const tz = /TZID=([^;:]+)/.exec(head)?.[1] ?? defaultTz
    let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value)
    if (m) {
      return m[7] === 'Z'
        ? Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!)
        : zonedToUtc(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, tz).getTime()
    }
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
    if (m) return zonedToUtc(+m[1]!, +m[2]!, +m[3]!, 0, 0, tz).getTime()
    return undefined
  }
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {}
    else if (line === 'END:VEVENT' && cur) {
      if (cur.start !== undefined && !cur.transparent && !cur.cancelled) out.push({ start: cur.start, end: cur.end ?? cur.start + 3600_000 })
      cur = null
    }
    else if (cur && line.startsWith('DTSTART')) cur.start = parse(line)
    else if (cur && line.startsWith('DTEND')) cur.end = parse(line)
    else if (cur && line === 'TRANSP:TRANSPARENT') cur.transparent = true
    else if (cur && line === 'STATUS:CANCELLED') cur.cancelled = true
  }
  return out
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Un événement iCalendar (RFC 5545), lignes repliées à 75 octets. */
export function icsEvent(e: { uid: string, start: Date, end: Date, summary: string, description: string, url?: string, organizer?: string, attendee?: string, method?: 'REQUEST' | 'CANCEL' | 'PUBLISH', status?: string }): string[] {
  const fold = (l: string) => {
    const out: string[] = []
    let rest = l
    while (Buffer.byteLength(rest) > 75) {
      let cut = 75
      while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--
      out.push(rest.slice(0, cut)); rest = ` ${rest.slice(cut)}`
    }
    out.push(rest)
    return out
  }
  return [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.summary)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${icsText(e.url)}`] : []),
    ...(e.organizer ? [`ORGANIZER:mailto:${e.organizer}`] : []),
    ...(e.attendee ? [`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:${e.attendee}`] : []),
    `STATUS:${e.status ?? 'CONFIRMED'}`,
    'END:VEVENT',
  ].flatMap(fold)
}

export function icsCalendar(events: string[][], method?: string): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ipnoria//Site//FR', 'CALSCALE:GREGORIAN', ...(method ? [`METHOD:${method}`] : []), ...events.flat(), 'END:VCALENDAR', ''].join('\r\n')
}
