/** Filtre et recherche des messages reçus. Le terme est un paramètre, jamais concaténé tel quel. */
export function inboxWhere(filtre: unknown, q: unknown): { sql: string, args: unknown[] } {
  const where = filtre === 'traites' ? 'handled_at IS NOT NULL' : filtre === 'tous' ? 'TRUE' : 'handled_at IS NULL'
  const term = String(q ?? '').trim().slice(0, 120)
  if (!term) return { sql: where, args: [] }
  const like = `%${term.replace(/[\\%_]/g, m => `\\${m}`)}%`
  return {
    sql: `${where} AND (name ILIKE $1 ESCAPE '\\' OR email ILIKE $1 ESCAPE '\\' OR company ILIKE $1 ESCAPE '\\')`,
    args: [like],
  }
}
