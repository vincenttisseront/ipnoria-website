// Renvoyer le lien de vérification (une fois par minute au plus, en plus de la limite par IP).
export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  if (s.user.emailVerified) return { ok: true }
  const recent = await useDb().query(
    `SELECT 1 FROM user_tokens WHERE user_id = $1 AND purpose = 'verify' AND created_at > now() - interval '1 minute'`, [s.user.id],
  )
  if (recent.rowCount) throw fail(429, 'too_soon')
  await mailVerify(s.user.email, s.user.locale, s.user.displayName, await issueToken(s.user.id, 'verify', 24))
  return { ok: true }
})
