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
| Workflows | zizmor ; actions épinglées par empreinte de commit (Dependabot les met à jour) ; permissions minimales ; `persist-credentials: false` | `.github/workflows/` |
| Publication | image signée sans clé (cosign / Sigstore), attestation de provenance, SBOM, déploiement par empreinte et non par tag | `release.yml` |
| Image | base épinglée par empreinte, npm retiré, utilisateur non root, fichiers en lecture seule | `Dockerfile` |
| Exécution | `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites mémoire/processus, base sur réseau interne sans Internet | `docker-compose.yml` |
| HTTP | HTTPS automatique (Caddy), HSTS, CSP stricte avec nonce, COOP/COEP/CORP, `X-Frame-Options: DENY`, Permissions-Policy | `nuxt.config.ts`, `Caddyfile` |
| Formulaire | validation zod partagée client/serveur, contrôle d'origine (anti-CSRF), JSON seulement, limite de taille, limite de débit (mémoire + base), piège à robots, aucun HTML rendu, refus des retours à la ligne dans les en-têtes d'e-mail | `server/api/contact.post.ts`, `shared/contact.ts` |
| Administration | OpenID Connect avec PKCE, state et nonce ; e-mail vérifié et liste d'autorisation relue à chaque requête ; session chiffrée HttpOnly SameSite=Lax de 8 h ; contrôle d'origine sur toute écriture ; confirmation dans l'interface avant effacement | `server/utils/auth.ts`, `server/api/admin/` |
| Alertes de version | double opt-in, jetons à usage unique conservés seulement en empreinte SHA-256, expiration à 7 jours, désinscription en un clic (RFC 8058) qui efface l'adresse, aucune énumération des inscrits | `server/api/newsletter/` |
| Documentation affichée | Markdown rendu sans HTML brut, liens javascript: refusés, liste fermée de fichiers lisibles dans le dépôt produit, images servies par le site | `server/utils/markdown.ts`, `server/utils/github.ts` |
| Serveur | SSH par clé seulement, fail2ban, pare-feu (22 limité, 80, 443), mises à jour de sécurité automatiques, Docker du dépôt officiel signé, sauvegardes vérifiées chaque nuit | `deploy/ansible/` |
| Supervision | test externe horaire (santé, accueil, échéance du certificat) avec ticket d'incident | `uptime.yml` |
| Données personnelles | IP jamais stockée (empreinte salée), purge automatique après la durée de conservation, aucun cookie tiers, polices auto-hébergées | `server/plugins/database.ts` |
