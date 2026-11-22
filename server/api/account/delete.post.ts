import { deleteAccountSchema } from '#shared/account'

// Suppression du compte : confirmation d'identité récente et saisie de l'adresse. Les idées et commentaires
// restent publiés sans auteur (« compte supprimé ») ; votes, sessions, clés et journal sont effacés.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const { email } = await readJson(event, deleteAccountSchema)
  if (email !== s.user.email.toLowerCase()) throw fail(400, 'email_mismatch')
  await useDb().query('DELETE FROM users WHERE id = $1', [s.user.id])
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
