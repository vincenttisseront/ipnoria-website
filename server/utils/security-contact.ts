/** Adresse de signalement des vulnérabilités : configurée, sinon celle des mentions légales. */
export function securityContact(): string {
  const { disclosure, public: { legal } } = useRuntimeConfig()
  return String(disclosure.contact || legal.email || '')
}
