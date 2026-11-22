import { sha256 } from '../../../utils/account-crypto'

import { resetSchema } from '#shared/account'

// Nouveau mot de passe depuis le lien reçu : toutes les sessions sont fermées, le verrou est levé.
// Le second facteur reste actif : la connexion suivante le demandera.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const { token, password } = await readJson(event, resetSchema)
  const db = useDb()
  // Contrôle du mot de passe avant de consommer le lien : une erreur de saisie ne le brûle pas
  const peek = await db.query(
    `SELECT u.email FROM user_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.purpose = 'reset' AND t.used_at IS NULL AND t.expires_at > now()`, [sha256(token)],
  )
  if (!peek.rowCount) throw fail(400, 'invalid_token')
  await checkNewPassword(password, peek.rows[0].email)
  const t = await consumeToken(token, 'reset')
  if (!t) throw fail(400, 'invalid_token')
  const r = await db.query(
    `UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL, updated_at = now(),
            email_verified_at = COALESCE(email_verified_at, now())
      WHERE id = $1 RETURNING id::text, email, locale`,
    [t.userId, await hashPassword(password)],
  )
  await db.query('DELETE FROM user_sessions WHERE user_id = $1', [t.userId])
  await recordEvent(event, r.rows[0], 'password_reset')
  return { ok: true }
})
