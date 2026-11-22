import { fold } from '#shared/docs'

// Idées proches d'un titre en cours de saisie : évite les doublons avant même la proposition.
const STOP = new Set(['avec', 'dans', 'pour', 'sans', 'les', 'des', 'une', 'aux', 'par', 'sur', 'the', 'and', 'for', 'with', 'from', 'that', 'this'])
export default defineEventHandler(async (event) => {
  if (!hasDb()) return []
  const words = [...new Set(fold(String(getQuery(event).q ?? '').slice(0, 120)).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w)))].slice(0, 8)
  if (!words.length) return []
  const r = await useDb().query(
    `SELECT i.id::text, i.title, i.status, (SELECT count(*)::int FROM idea_votes v WHERE v.idea_id = i.id) AS votes, score
       FROM ideas i, LATERAL (SELECT count(*) AS score FROM unnest($1::text[]) w
                               WHERE translate(lower(i.title::text), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc') LIKE '%' || w || '%') m
      WHERE NOT i.hidden AND i.status <> 'duplicate' AND score > 0
      ORDER BY score DESC, votes DESC LIMIT 5`,
    [words],
  )
  return r.rows.map(({ score: _s, ...x }) => x)
})
