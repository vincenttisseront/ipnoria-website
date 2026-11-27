import { breachCount, hashPassword, passwordProblem } from './account-password'

// Premier compte d'administration : créé une seule fois, si l'adresse n'a pas encore de mot de passe.
// Le secret d'environnement n'écrase jamais un mot de passe déjà choisi.

export async function bootstrapAdminAccount(): Promise<void> {
  const password = String(useRuntimeConfig().adminPassword ?? '')
  const email = adminEmailList()[0]
  if (!email || !password || !adminEnabled()) return
  const problem = passwordProblem(password, email)
  if (problem) {
    console.warn(`[admin] NUXT_ADMIN_PASSWORD refusé (${problem})`)
    return
  }
  if (String(useRuntimeConfig().accounts.breachCheck) !== 'false' && await breachCount(password) > 0) {
    console.warn('[admin] NUXT_ADMIN_PASSWORD refusé : présent dans une fuite connue')
    return
  }
  const db = useDb()
  const existing = await db.query('SELECT id, password_hash IS NOT NULL AS has_password FROM users WHERE lower(email) = $1', [email])
  if (existing.rows[0]?.has_password) return
  const hash = await hashPassword(password)
  const local = email.split('@')[0] ?? ''
  const display = local.length >= 2 ? local.slice(0, 60) : 'Admin'
  let ready = false
  if (!existing.rowCount) {
    try {
      await db.query(
        `INSERT INTO users (email, password_hash, display_name, locale, email_verified_at) VALUES ($1, $2, $3, 'fr', now())`,
        [email, hash, display],
      )
      ready = true
    }
    catch (err) {
      if ((err as { code?: string }).code !== '23505') throw err
    }
  }
  else {
    const upd = await db.query(
      'UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 AND password_hash IS NULL',
      [existing.rows[0].id, hash],
    )
    ready = Boolean(upd.rowCount)
  }
  if (ready) console.info(`[admin] compte local prêt pour ${email}. Activez le second facteur, puis retirez NUXT_ADMIN_PASSWORD.`)
}
