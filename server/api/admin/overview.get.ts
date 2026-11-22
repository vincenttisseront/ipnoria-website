import { ROADMAP } from '#shared/roadmap'

// Vue d'ensemble pour l'administration : démonstrations à venir et votes de la feuille de route
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const [{ rows: bookings }, { rows: votes }] = await Promise.all([
    db.query(`SELECT id, starts_at, name, email, company, notes, locale FROM bookings
               WHERE status = 'confirmed' AND starts_at > now() - interval '1 day' ORDER BY starts_at LIMIT 100`),
    db.query<{ item: string, n: number, pending: number }>(
      `SELECT item, count(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS n, count(*) FILTER (WHERE confirmed_at IS NULL)::int AS pending
         FROM roadmap_votes GROUP BY item`,
    ),
  ])
  const byItem = new Map(votes.map(v => [v.item, v]))
  return {
    bookings,
    votes: ROADMAP.map(i => ({ id: i.id, title: i.title.fr, votes: byItem.get(i.id)?.n ?? 0, pending: byItem.get(i.id)?.pending ?? 0 }))
      .sort((a, b) => b.votes - a.votes),
  }
})
