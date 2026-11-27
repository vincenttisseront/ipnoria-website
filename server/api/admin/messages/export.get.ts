const TOPICS: Record<string, string> = {
  demo: 'Démonstration', question: 'Question technique', feedback: 'Retour d\'essai', partnership: 'Partenariat', other: 'Autre',
}

// Téléchargement de la vue courante (filtre et recherche), pour la traiter hors du site.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const { sql, args } = inboxWhere(q.filtre, q.q)
  const { rows } = await useDb().query<{
    created_at: Date, name: string, email: string, company: string, topic: string, message: string, handled_at: Date | null
  }>(
    `SELECT created_at, name, email, company, topic, message, handled_at
       FROM contact_messages WHERE ${sql} ORDER BY created_at DESC LIMIT 5000`,
    args,
  )
  const when = (d: Date | null) => d ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(d) : ''
  const csv = toCsv([
    ['Reçu', 'Nom', 'Adresse', 'Société', 'Sujet', 'Message', 'Traité'],
    ...rows.map(r => [when(r.created_at), r.name, r.email, r.company, TOPICS[r.topic] ?? r.topic, r.message, when(r.handled_at)]),
  ])
  setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'content-disposition', 'attachment; filename="messages.csv"')
  setResponseHeader(event, 'cache-control', 'no-store')
  return csv
})
