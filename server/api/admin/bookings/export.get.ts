// Démonstrations encore à venir, pour les préparer hors du site.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const zone = bookingZone()
  const { rows } = await useDb().query<{
    starts_at: Date, name: string, email: string, company: string, notes: string, locale: string
  }>(
    `SELECT starts_at, name, email, company, notes, locale FROM bookings
      WHERE status = 'confirmed' AND starts_at > now() ORDER BY starts_at LIMIT 1000`,
  )
  const when = (d: Date) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: zone }).format(d)
  const csv = toCsv([
    ['Début', 'Nom', 'Adresse', 'Société', 'Langue', 'Notes'],
    ...rows.map(r => [when(r.starts_at), r.name, r.email, r.company, r.locale === 'en' ? 'anglais' : 'français', r.notes]),
  ])
  setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="demonstrations.csv"')
  setResponseHeader(event, 'cache-control', 'no-store')
  return csv
})
