// État de connexion pour l'interface : comptes actifs ?, utilisateur, étape MFA en attente, GitHub disponible.
export default defineEventHandler(async (event) => {
  const enabled = accountsEnabled()
  const s = enabled ? await getAccountSession(event) : null
  const { accounts } = useRuntimeConfig()
  return {
    enabled,
    github: enabled && Boolean(accounts.githubClientId && accounts.githubClientSecret),
    mfaPending: Boolean(s?.mfaPending),
    user: s && !s.mfaPending ? s.user : null,
  }
})
