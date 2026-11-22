import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { purgeOldMessages, runMigrations } from '../server/utils/migrate'

// Contre un vrai PostgreSQL (service de la CI, ou base locale) : TEST_DATABASE_URL. Sans elle, ces tests sont sautés.
const url = process.env.TEST_DATABASE_URL
const dir = join(import.meta.dirname, '../server/database/migrations')
const migrations = readdirSync(dir).filter(f => f.endsWith('.sql')).map(name => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))

describe.skipIf(!url)('migrations et purge (PostgreSQL réel)', () => {
  let pool: pg.Pool
  const schema = `test_${process.pid}`

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, max: 3, options: `-c search_path=${schema}` })
    await pool.query(`CREATE SCHEMA ${schema}`)
  })
  afterAll(async () => {
    await pool.query(`DROP SCHEMA ${schema} CASCADE`)
    await pool.end()
  })

  it('applique les migrations une seule fois, même lancées en parallèle', async () => {
    const [a, b] = await Promise.all([runMigrations(pool, migrations), runMigrations(pool, migrations)])
    expect([...a, ...b].sort()).toEqual(migrations.map(m => m.name).sort())
    expect(await runMigrations(pool, migrations)).toEqual([])
  })

  it('refuse en base ce que le schéma refuse (contraintes CHECK)', async () => {
    await expect(pool.query(
      `INSERT INTO contact_messages (locale, name, email, topic, message, consent_at, ip_hash) VALUES ('fr','A','a@b.fr','demo','message valide',now(),'h')`,
    )).rejects.toThrow(/check/i)
  })

  it('purge uniquement les messages plus anciens que la durée de conservation', async () => {
    const insert = `INSERT INTO contact_messages (created_at, locale, name, email, topic, message, consent_at, ip_hash)
                    VALUES (now() - make_interval(days => $1), 'fr', 'Test', 't@t.fr', 'demo', 'message de test', now(), 'h')`
    await pool.query(insert, [400])
    await pool.query(insert, [10])
    expect(await purgeOldMessages(pool, 365)).toBe(1)
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM contact_messages')
    expect(rows[0].n).toBe(1)
  })

  it('annule une migration fautive sans l\'enregistrer', async () => {
    await expect(runMigrations(pool, [{ name: '999_casse.sql', sql: 'CREATE TABLE ( ;' }])).rejects.toThrow(/999_casse/)
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM schema_migrations WHERE name = '999_casse.sql'`)
    expect(rows[0].n).toBe(0)
  })
})
