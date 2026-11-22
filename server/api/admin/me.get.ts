// État de connexion pour la page /admin : jamais d'erreur, pour que la page sache quoi afficher
export default defineEventHandler(async (event) => {
  if (!oidcEnabled()) return { enabled: false, user: null }
  const session = await useAdminSession(event)
  const { email, name } = session.data
  return { enabled: true, user: email && allowedAdmin(email) ? { email, name: name ?? email } : null }
})
