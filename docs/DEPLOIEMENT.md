# Déploiement

Le déploiement passe par Ansible (`deploy/ansible`) : socle système, Docker, site, sauvegardes. Un serveur Debian ou Ubuntu récent, joignable en SSH par mot de passe, avec un compte sudo.

## Première installation

```bash
cd deploy/ansible
ansible-galaxy collection install -r requirements.yml
cp inventories/production/hosts.yml.example inventories/production/hosts.yml          # adresse du serveur
cp inventories/production/group_vars/all/vault.yml.example inventories/production/group_vars/all/vault.yml
# remplir vault.yml (secrets : openssl rand -hex 32), puis le chiffrer :
ansible-vault encrypt inventories/production/group_vars/all/vault.yml
# régler le domaine, le SMTP, les mentions légales… dans group_vars/all/main.yml
ansible-playbook site.yml --ask-vault-pass --check --diff    # voir ce qui va changer
ansible-playbook site.yml --ask-vault-pass
```

Deux noms : `website_domain` (externe, `www.ipnoria.tech`, certificat Let's Encrypt) et `website_internal_domain` (interne, `ipnoria.ar-systems.fr`, certificat local de Caddy). Le nom externe, et `stats.<apex>` si les statistiques sont activées, doit pointer vers le serveur avant le premier passage. Le contrôle de santé utilise le nom interne.

| Rôle | Ce qu'il fait |
|---|---|
| `common` | paquets de base, fuseau horaire, mises à jour de sécurité automatiques, SSH par mot de passe (pas de root), fail2ban, pare-feu (22 limité, 80, 443 TCP/UDP) |
| `docker` | Docker Engine et Compose depuis le dépôt officiel signé, journaux bornés, `no-new-privileges` par défaut |
| `website` | `/opt/ipnoria-website` : compose, Caddyfile, `.env` (0600), connexion à ghcr.io, démarrage, contrôle de santé à travers Caddy |
| `backup` | `pg_dump` vérifié chaque nuit (minuteur systemd), rotation 14 jours, copie `rsync` hors serveur facultative |

Le playbook est idempotent : un second passage ne change rien (vérifié par `deploy/ansible/tests/run-container-test.sh`).

## Mise à jour du site

Automatique : pousser un tag `vX.Y.Z` construit, signe et publie l'image (`release.yml`), puis la déploie par SSH si les secrets `DEPLOY_*` existent.
Avec Ansible : `ansible-playbook site.yml --ask-vault-pass --tags website` (tire la dernière image).

## Comptes utilisateurs et feuille de route

1. Le SMTP doit fonctionner (vérification d'adresse, réinitialisation, alertes de sécurité, notifications des idées).
2. Dans le vault : `vault_accounts_secret` (`openssl rand -hex 32`). Il chiffre les secrets des applications d'authentification : ne le changez plus une fois des comptes créés.
3. Facultatif, connexion GitHub : créer une application OAuth (URL de retour `https://<domaine>/api/account/github/callback`), renseigner `website_accounts_github_client_id` et `vault_accounts_github_client_secret`.
4. Les idées de l'équipe (ancienne feuille de route) sont importées au premier démarrage ; elles se modèrent ensuite dans `/admin`, comme les idées proposées.

## Programme bêta

Les images bêta se déposent dans `beta-files/` à côté de `docker-compose.yml` (par exemple avec `rsync`), puis se déclarent dans `/admin`, rubrique « Programme bêta », onglet « Versions » : le serveur calcule taille et SHA-256, et prévient les testeurs à la première publication. Les testeurs téléchargent par un lien personnel signé, valable 24 heures. Les objectifs de recrutement par secteur se règlent dans l'onglet « Candidatures ». Changer `BETA_AGREEMENT_VERSION` (`shared/beta.ts`) oblige chaque testeur à accepter la nouvelle version de l'accord.

## Références clients

Dans `/admin`, rubrique « Références clients » : fiche (secteur, taille, services, témoignage, étude de cas en français et en anglais), logo (PNG, WebP ou JPEG, 300 Ko au plus). Une référence ne peut être publiée qu'une fois l'accord du client renseigné (qui, quand) : gardez la trace écrite de cet accord. La page et les bandeaux de l'accueil restent masqués tant qu'aucune référence n'est publiée.

## Pages d'erreur et maintenance

Quand l'application ne répond pas (redémarrage, mise à jour), Caddy sert lui-même une page « le site redémarre » (502, 503, 504), en français ou en anglais selon l'adresse. Pour une intervention plus longue :

```sh
ansible-playbook site.yml -e website_maintenance=true    # page de maintenance (503, Retry-After)
ansible-playbook site.yml                                # retour à la normale
```

Sans Ansible : créer ou supprimer `caddy-errors/maintenance.on` à côté de `docker-compose.yml`. Les pages se régénèrent avec `tools/caddy_errors.py`.

## Espace d'administration (`/admin`)

1. Renseigner `website_admin_emails` (une adresse telle quelle, ou une liste pour plusieurs) et, dans le vault, `vault_session_password` et `vault_accounts_secret` (32 caractères au moins chacun).
2. Premier compte : `vault_admin_password` (12 caractères ou plus, pas un mot de passe déjà vu dans une fuite). Il crée uniquement la première adresse de la liste, et seulement si elle n'a pas encore de mot de passe. Au premier passage sur `/admin`, l'application d'authentification est obligatoire. Retirez ensuite `vault_admin_password`.
3. Autre compte : la personne crée d'abord son compte sur le site, puis son adresse est ajoutée à `website_admin_emails`. Une adresse déjà listée ne peut pas s'inscrire par le formulaire public.
4. Chaque connexion exige le mot de passe puis un second facteur du compte (application d'authentification, code de secours ou clé d'accès). La liste d'adresses est relue à chaque requête. La session dure 8 heures. Les actions sont journalisées (rubrique « Sécurité » de `/admin`).

## Réservation de démonstrations (`/rendez-vous`)

1. Le SMTP doit fonctionner (confirmation, rappel la veille, annulation, invitation jointe).
2. `website_booking_enabled: true`, puis régler jours, heures, fuseau et lien de visio (`website_booking_*`).
3. Facultatif, dans le vault : `vault_booking_busy_ics_url` (adresse iCalendar secrète de votre agenda : ses occupations retirent les créneaux) et `vault_booking_feed_key` (`openssl rand -hex 24`). Abonnez ensuite votre agenda à `https://<domaine>/api/booking/feed.ics?key=<clé>` pour y voir les démonstrations réservées.
4. Les rendez-vous sont effacés 90 jours après leur date ; ils apparaissent aussi dans `/admin`.

## Statistiques (Umami)

1. `website_analytics_enabled: true`, secrets `vault_umami_db_password` et `vault_umami_app_secret`, puis un passage du playbook.
2. Ouvrir `https://stats.<domaine>`, se connecter avec `admin` / `umami`, **changer ce mot de passe tout de suite**, ajouter le site.
3. Copier l'identifiant du site dans `website_analytics_website_id`, repasser le playbook.

## Sauvegardes

Fichiers dans `/var/backups/ipnoria-website` (lisibles par root seulement). Restauration :

```bash
cd /opt/ipnoria-website
docker compose exec -T db pg_restore -U site -d site --clean --if-exists < /var/backups/ipnoria-website/site-AAAAMMJJ-HHMMSS.dump
```

Sauvegarde immédiate : `systemctl start ipnoria-website-backup`. Prochaine exécution : `systemctl list-timers ipnoria-website-backup.timer`.

## Supervision externe

Le workflow `uptime.yml` vérifie chaque heure la santé, la page d'accueil et l'échéance du certificat, et ouvre un ticket « incident » en cas d'échec. Variable du dépôt à définir : `SITE_URL`.

## Sans Ansible

`docker-compose.yml`, `Caddyfile` et `.env.example` suffisent : `cp .env.example .env`, remplir, `docker compose up -d --wait` (ajouter `--profile analytics` pour Umami).
