# Sécurité

## Signaler une vulnérabilité

Écrivez à l'adresse indiquée dans les mentions légales du site, sans ouvrir de ticket public. Réponse sous 5 jours ouvrés.

## Mesures en place

| Domaine | Mesure | Où |
|---|---|---|
| Secrets | gitleaks avant chaque commit et sur tout l'historique en CI ; `.env` ignoré par git | `lefthook.yml`, `.gitleaks.toml`, `security.yml` |
| Dépendances | `npm audit` (production, high+), vérification des signatures npm, Dependabot hebdomadaire (npm, Docker, Actions) | `security.yml`, `dependabot.yml` |
| Code | SonarQube avec porte qualité bloquante, Semgrep (JS/TS/Node, secrets, Docker), ESLint, TypeScript strict | `ci.yml`, `security.yml` |
| Conteneur | hadolint ; Trivy sur le dépôt et sur l'image (bloquant HIGH/CRITICAL) ; SBOM CycloneDX ; provenance signée de l'image | `security.yml`, `release.yml` |
| Workflows | zizmor ; permissions minimales ; `persist-credentials: false` | `security.yml` |
| Image | base épinglée par empreinte, npm retiré, utilisateur non root, fichiers en lecture seule | `Dockerfile` |
| Exécution | `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites mémoire/processus, base sur réseau interne sans Internet | `docker-compose.yml` |
| HTTP | HTTPS automatique (Caddy), HSTS, CSP stricte avec nonce, COOP/COEP/CORP, `X-Frame-Options: DENY`, Permissions-Policy | `nuxt.config.ts`, `Caddyfile` |
| Formulaire | validation zod partagée client/serveur, contrôle d'origine (anti-CSRF), JSON seulement, limite de taille, limite de débit (mémoire + base), piège à robots, aucun HTML rendu, refus des retours à la ligne dans les en-têtes d'e-mail | `server/api/contact.post.ts`, `shared/contact.ts` |
| Données personnelles | IP jamais stockée (empreinte salée), purge automatique après la durée de conservation, aucun cookie tiers, polices auto-hébergées | `server/plugins/database.ts` |
