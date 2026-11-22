import pg from 'pg'

let pool: pg.Pool | null = null

/** Pool PostgreSQL partagé. Lève une erreur claire si NUXT_DATABASE_URL n'est pas défini. */
export function useDb(): pg.Pool {
  if (pool) return pool
  const { databaseUrl } = useRuntimeConfig()
  if (!databaseUrl) throw new Error('NUXT_DATABASE_URL non défini')
  pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: 'ipnoria-website',
  })
  pool.on('error', err => console.error('[db] connexion perdue :', err.message))
  return pool
}

export function hasDb(): boolean {
  return Boolean(useRuntimeConfig().databaseUrl)
}

export async function closeDb(): Promise<void> {
  if (pool) { await pool.end(); pool = null }
}
