// Au démarrage : migrations, puis purge quotidienne des messages expirés. Sans base configurée, le site fonctionne mais le formulaire répond 503.
const DAY_MS = 24 * 60 * 60 * 1000

export default defineNitroPlugin(async (nitro) => {
  if (import.meta.prerender) return
  if (!hasDb()) {
    console.warn('[db] NUXT_DATABASE_URL absent : le formulaire de contact est désactivé')
    return
  }
  const pool = useDb()
  const { contactRetentionDays } = useRuntimeConfig()

  const storage = useStorage('assets:migrations')
  const keys = (await storage.getKeys()).filter(k => k.endsWith('.sql'))
  const migrations = await Promise.all(keys.map(async k => ({ name: k, sql: String(await storage.getItem(k)) })))

  // Quelques tentatives : PostgreSQL peut finir de démarrer juste après le conteneur de l'application
  for (let attempt = 1; ; attempt++) {
    try {
      const applied = await runMigrations(pool, migrations)
      if (applied.length) console.info(`[db] migrations appliquées : ${applied.join(', ')}`)
      break
    }
    catch (err) {
      if (attempt >= 10) { console.error('[db] migrations impossibles :', (err as Error).message); throw err }
      await new Promise(r => setTimeout(r, attempt * 1000))
    }
  }

  const purge = () => purgeOldMessages(pool, Number(contactRetentionDays))
    .then(n => n && console.info(`[db] purge RGPD : ${n} message(s) supprimé(s)`))
    .catch(err => console.error('[db] purge impossible :', err.message))
  await purge()
  const timer = setInterval(purge, DAY_MS)
  timer.unref()

  nitro.hooks.hook('close', async () => {
    clearInterval(timer)
    await closeDb()
  })
})
