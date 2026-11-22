import { changeEmailSchema } from '#shared/account'

// Changer d'adresse : lien de confirmation envoyé à la nouvelle adresse ; l'ancienne reste active d'ici là.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const { email } = await readJson(event, changeEmailSchema)
  if (email === s.user.email.toLowerCase()) throw fail(400, 'same_email')
  const taken = await useDb().query('SELECT 1 FROM users WHERE lower(email) = $1', [email])
  // Adresse déjà prise : réponse identique, aucun e-mail (pas d'énumération)
  if (!taken.rowCount) await mailEmailChange(email, s.user.locale, await issueToken(s.user.id, 'email', 24, email))
  return { ok: true }
})
