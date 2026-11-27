// État de connexion pour la page /admin : jamais d'erreur, pour que la page sache quoi afficher.
export default defineEventHandler(async (event) => {
  if (!adminEnabled()) return { enabled: false, user: null, pending: null, passkey: false }
  try {
    const user = await requireAdmin(event)
    return { enabled: true, user, pending: null, passkey: false }
  }
  catch (err) {
    if ((err as { statusCode?: number }).statusCode !== 401) throw err
    const pending = await adminPendingStep(event)
    return { enabled: true, user: null, pending: pending?.step ?? null, passkey: pending?.passkey ?? false }
  }
})
