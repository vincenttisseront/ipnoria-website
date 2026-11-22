# ddibuntu-site

Site vitrine de [DDI-Buntu](https://github.com/vincenttisseront/ddibuntu), en français et en anglais : présentation du produit, visite de la console, documentation (liens vers le dépôt), formulaire de contact.

**Pile** : Nuxt 4 (SSR), Tailwind CSS 4, @nuxtjs/i18n, nuxt-security, PostgreSQL 17, Caddy, Docker Compose.

## Démarrer en développement

```bash
npm ci
npx lefthook install          # crochets : gitleaks + ESLint avant commit, typage + tests avant push
docker run -d --name site-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=site -p 5432:5432 postgres:17-alpine
NUXT_DATABASE_URL=postgres://postgres:dev@localhost:5432/site NUXT_IP_HASH_SALT=dev npm run dev
```

Sans `NUXT_DATABASE_URL`, le site s'affiche mais le formulaire répond 503.

## Commandes

| Besoin | Commande |
|---|---|
| Lint / typage | `npm run lint` · `npm run typecheck` |
| Tests unitaires (+ base réelle si `TEST_DATABASE_URL`) | `npm test` · `npm run test:coverage` |
| Test de fumée du serveur construit | `npm run build && node .output/server/index.mjs &` puis `npm run test:smoke` |
| Tous les contrôles de sécurité | `tools/security-scan.sh` (Docker requis) |
| Scan de l'image + SBOM | `docker build -t site . && tools/security-scan.sh image site` |
| Créer le dépôt GitHub privé et ses protections | `tools/github-setup.sh` |

## Organisation

```
app/            pages, composants, styles (jetons dans assets/css/main.css)
i18n/locales/   textes FR et EN (aucun texte en dur dans les composants)
server/         API Nitro : contact, version publiée, santé ; migrations SQL ; purge RGPD
shared/         schéma du formulaire (client + serveur), liens GitHub
tests/          vitest (schéma, migrations sur base réelle) et test de fumée
tools/          scans de sécurité, création du dépôt GitHub
.claude/skills/ règles de design et d'UX à suivre pour toute retouche visuelle
```

## Déploiement et sécurité

Voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) et [SECURITY.md](SECURITY.md).

## Avant la mise en ligne

- Renseigner les mentions légales (`LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_HOST` dans `.env`) : obligatoires en France.
- Créer les secrets GitHub (`SONAR_TOKEN`, secrets `DEPLOY_*`), voir la fin de `tools/github-setup.sh`.
