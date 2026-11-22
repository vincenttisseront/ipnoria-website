import { verifyTotp } from './account-totp'
import { normalizeRecovery, recoveryCodes, sha256 } from './account-crypto'

/** TOTP (6 chiffres, rejeu refusé) ou code de secours (usage unique). */
export async function checkSecondFactor(userId: string, code: string): Promise<'totp' | 'recovery' | null> {
  const db = useDb()
  const digits = code.replace(/\s/g, '')
  if (/^\d{6}$/.test(digits)) {
    const u = (await db.query('SELECT totp_secret_enc, totp_last_step FROM users WHERE id = $1', [userId])).rows[0]
    if (!u?.totp_secret_enc) return null
    const step = verifyTotp(unsealTotp(u.totp_secret_enc), digits, { lastStep: u.totp_last_step == null ? null : Number(u.totp_last_step) })
    if (step == null) return null
    // Mise à jour conditionnelle : deux requêtes simultanées avec le même code ne passent pas toutes les deux
    const upd = await db.query('UPDATE users SET totp_last_step = $2 WHERE id = $1 AND (totp_last_step IS NULL OR totp_last_step < $2)', [userId, step])
    return upd.rowCount ? 'totp' : null
  }
  const norm = normalizeRecovery(code)
  if (norm.length !== 10) return null
  const r = await db.query(
    'UPDATE user_recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id', [userId, sha256(norm)],
  )
  return r.rowCount ? 'recovery' : null
}

/** Codes de secours : en crée dix s'il n'en reste aucun d'utilisable ; renvoie les codes en clair (une seule fois) ou null. */
export async function ensureRecoveryCodes(userId: string, force = false): Promise<string[] | null> {
  const db = useDb()
  if (!force) {
    const left = await db.query('SELECT 1 FROM user_recovery_codes WHERE user_id = $1 AND used_at IS NULL LIMIT 1', [userId])
    if (left.rowCount) return null
  }
  const codes = recoveryCodes()
  await db.query('DELETE FROM user_recovery_codes WHERE user_id = $1', [userId])
  await db.query(
    'INSERT INTO user_recovery_codes (user_id, code_hash) SELECT $1, unnest($2::text[])',
    [userId, codes.map(c => sha256(normalizeRecovery(c)))],
  )
  return codes
}
