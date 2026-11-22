// Toutes les heures : si une nouvelle version est publiée sur GitHub, e-mail aux abonnés confirmés ;
// rappel des démonstrations du lendemain ; purge des inscriptions et votes jamais confirmés depuis plus de 7 jours.
const HOUR = 60 * 60 * 1000

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender || !hasDb()) return
  const tick = async () => {
    try {
      const pool = useDb()
      await pool.query(`DELETE FROM newsletter_subscribers WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`)
      await pool.query(`DELETE FROM roadmap_votes WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`)
      // Rendez-vous passés depuis plus de 90 jours : effacés (données personnelles)
      await pool.query(`DELETE FROM bookings WHERE ends_at < now() - interval '90 days'`)
      await remindBookings(pool)
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
