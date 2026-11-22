import { ROADMAP } from '#shared/roadmap'

// Éléments de la feuille de route et nombre de voix confirmées
export default defineEventHandler(async () => {
  const counts = new Map<string, number>()
  if (hasDb()) {
    const { rows } = await useDb().query<{ item: string, n: number }>(
      'SELECT item, count(*)::int AS n FROM roadmap_votes WHERE confirmed_at IS NOT NULL GROUP BY item',
    )
    for (const r of rows) counts.set(r.item, r.n)
  }
  return {
    votingOpen: hasDb() && hasSmtp(),
    items: ROADMAP.map(i => ({ ...i, votes: counts.get(i.id) ?? 0 })).sort((a, b) => b.votes - a.votes),
  }
})
