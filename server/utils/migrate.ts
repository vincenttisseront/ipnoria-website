import type pg from 'pg'

// Verrou consultatif : deux conteneurs qui démarrent ensemble n'appliquent pas deux fois la même migration
const LOCK_ID = 7_340_221

export interface Migration { name: string, sql: string }

/** Applique, dans l'ordre et chacune dans sa transaction, les migrations pas encore jouées. Renvoie leurs noms. */
export async function runMigrations(pool: pg.Pool, migrations: Migration[]): Promise<string[]> {
  const client = await pool.connect()
  const applied: string[] = []
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const done = new Set(rows.map(r => r.name))
    for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
      if (done.has(m.name)) continue
      await client.query('BEGIN')
      try {
        await client.query(m.sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [m.name])
        await client.query('COMMIT')
        applied.push(m.name)
      }
      catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`migration ${m.name} : ${(err as Error).message}`, { cause: err })
      }
    }
    return applied
  }
  finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    client.release()
  }
}

/** Purge RGPD : supprime les messages plus anciens que la durée de conservation. */
export async function purgeOldMessages(pool: pg.Pool, retentionDays: number): Promise<number> {
  const days = Math.max(1, Math.floor(retentionDays))
  const res = await pool.query(
    `DELETE FROM contact_messages WHERE created_at < now() - make_interval(days => $1)`,
    [days],
  )
  return res.rowCount ?? 0
}
