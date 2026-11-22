// Espace testeur : renvoie vers la page bêta (ou l'accord) si le compte n'y a pas accès.
export function testerRedirect(err: unknown): string | null {
  const code = apiErrorCode(err)
  return code === 'agreement_required' ? 'beta-accord' : code === 'not_tester' || code === 'unverified' ? 'beta' : null
}
