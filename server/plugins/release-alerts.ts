// Toutes les heures : si une nouvelle version est publiée sur GitHub, e-mail aux abonnés confirmés ;
// rappel des démonstrations du lendemain ; purge des inscriptions jamais confirmées, des comptes jamais vérifiés et des données de session expirées.
const HOUR = 60 * 60 * 1000

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender || !hasDb()) return
  const tick = async () => {
    try {
      const pool = useDb()
      await pool.query(`DELETE FROM newsletter_subscribers WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`)
      // Comptes : sessions et liens expirés, journal de plus d'un an, comptes jamais vérifiés après 30 jours
      await pool.query(`DELETE FROM user_sessions WHERE expires_at < now()`)
      await pool.query(`DELETE FROM user_tokens WHERE expires_at < now() - interval '7 days'`)
      await pool.query(`DELETE FROM webauthn_challenges WHERE expires_at < now()`)
      await pool.query(`DELETE FROM user_events WHERE created_at < now() - interval '1 year'`)
      await pool.query(`DELETE FROM users WHERE email_verified_at IS NULL AND created_at < now() - interval '30 days'`)
      // Journal d'administration : deux ans ; preuves de travail expirées
      await pool.query(`DELETE FROM admin_audit WHERE created_at < now() - interval '2 years'`)
      await pool.query(`DELETE FROM pow_used WHERE expires_at < now()`)
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
