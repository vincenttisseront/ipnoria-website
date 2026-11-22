# ipnoria-website

Site vitrine d'[Ipnoria](https://github.com/vincenttisseront/ipnoria), en français et en anglais.

**Pile** : Nuxt 4 (SSR), Tailwind CSS 4, @nuxtjs/i18n, nuxt-security, PostgreSQL 17, Caddy, Docker Compose, Ansible.

## Ce que contient le site

| Partie | Détail |
|---|---|
| Accueil | Visite de la console, démonstration IPAM interactive, schéma du cluster, construction de l'ISO |
| Documentation | Documents du dépôt produit rendus dans le site (Markdown sûr, sans HTML brut), table des matières, recherche plein texte |
| Nouveautés | Journal des modifications par version, flux RSS (`/rss.xml`), alertes par e-mail en double opt-in |
| Guides | Migrer un DHCP Windows, remplacer un NPS : commandes exactes, coexistence, bascule, retour arrière |
| Comparatif | Ipnoria face aux rôles DNS, DHCP, NPS et AD CS de Windows Server, honnête dans les deux sens |
| Recherche | Palette `Ctrl+K` / `⌘K` / `/` sur pages, outils, guides, documentation, versions |
| Outils | Checklist avant installation (gardée dans le navigateur, imprimable), dimensionnement, aperçu de l'import DHCP Windows (fichier lu dans le navigateur, mêmes règles que la console), calculatrice de sous-réseaux avec export CSV |
| Visite guidée | Quatre parcours annotés sur captures de la console, au clavier |
| Pour qui | Pages PME, collectivités, enseignement |
| Feuille de route | Votes confirmés par e-mail, une voix par adresse et par élément, adresse non conservée (empreinte HMAC) |
| Rendez-vous | Réservation de démonstration : créneaux, invitation iCalendar, rappel la veille, annulation, flux d'agenda privé |
| Thème | Sombre, clair ou celui du système (cookie de préférence, sans flash) ; styles d'impression et PDF |
| Démo | S'active dès que `NUXT_PUBLIC_DEMO_URL` est défini |
| Contact | Formulaire protégé (origine, débit, piège à robots), stockage PostgreSQL, notification SMTP, purge RGPD |
| Administration | `/admin` : connexion OpenID Connect (PKCE), lecture, réponse par e-mail, marquage, effacement |
| Référencement | `sitemap.xml` avec hreflang, `robots.txt`, images d'aperçu par section, données structurées schema.org |
| Statistiques | Umami auto-hébergé, sans cookie, « Ne pas me pister » respecté (facultatif) |

## Démarrer en développement

```bash
npm ci
npx lefthook install          # gitleaks + ESLint avant commit, typage + tests avant push
docker run -d --name site-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=site -p 5432:5432 postgres:17-alpine
NUXT_DATABASE_URL=postgres://postgres:dev@localhost:5432/site NUXT_IP_HASH_SALT=dev npm run dev
```

Sans base, le site s'affiche et le formulaire répond 503. Pour lire la documentation sans réseau : `NUXT_DOCS_LOCAL_DIR=/chemin/vers/ipnoria`.
Toutes les variables sont décrites dans `nuxt.config.ts` (bloc `runtimeConfig`) et `.env.example`.

## Commandes

| Besoin | Commande |
|---|---|
| Lint / typage | `npm run lint` · `npm run typecheck` |
| Tests unitaires (+ base réelle si `TEST_DATABASE_URL`) | `npm test` · `npm run test:coverage` |
| Test de fumée du serveur construit | `npm run build && node .output/server/index.mjs &` puis `npm run test:smoke` |
| Contrôles de sécurité | `tools/security-scan.sh` (Docker requis) |
| Images d'aperçu (après un changement de titre) | `python3 tools/og_images.py` |
| Déploiement | voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) (Ansible) |
| Essai du playbook sur conteneur | `deploy/ansible/tests/run-container-test.sh` |

## Organisation

```
app/              pages, composants, styles (jetons dans assets/css/main.css)
i18n/locales/     textes FR et EN
server/           API Nitro (contact, docs, versions, newsletter, admin), routes (auth OIDC, RSS, sitemap), migrations SQL
shared/           schémas partagés client/serveur, liste des documents, guides, comparatif
deploy/ansible/   playbook : socle, Docker, site, sauvegardes
tests/            vitest (schémas, rendu Markdown, migrations sur base réelle) et test de fumée
tools/            scans de sécurité, images d'aperçu, création du dépôt GitHub
.claude/skills/   règles de design et d'UX à suivre pour toute retouche visuelle
```

Sécurité : [SECURITY.md](SECURITY.md).
