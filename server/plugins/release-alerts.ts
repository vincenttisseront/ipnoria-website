// Toutes les heures : si une nouvelle version est publiée sur GitHub, e-mail aux abonnés confirmés.
// Purge aussi les inscriptions jamais confirmées depuis plus de 7 jours.
const HOUR = 60 * 60 * 1000

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender || !hasDb()) return
  const tick = async () => {
    try {
      const pool = useDb()
      await pool.query(`DELETE FROM newsletter_subscribers WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`)
      const [latest] = await fetchReleases()
      if (!latest) return
      const entry = (await loadChangelog().catch(() => [])).find(e => e.version === latest.version)
      await announceNewRelease(pool, { version: latest.version, title: entry?.title ?? '' })
    }
    catch (err) {
      console.error('[newsletter] vérification des versions impossible :', (err as Error).message)
    }
  }
  // Premier passage une minute après le démarrage (les migrations sont passées), puis chaque heure
  const first = setTimeout(tick, 60_000)
  const timer = setInterval(tick, HOUR)
  first.unref(); timer.unref()
  nitro.hooks.hook('close', () => { clearTimeout(first); clearInterval(timer) })
})
