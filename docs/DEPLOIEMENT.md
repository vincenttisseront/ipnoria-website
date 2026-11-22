# Déploiement

Le déploiement passe par Ansible (`deploy/ansible`) : socle système, Docker, site, sauvegardes. Un serveur Debian ou Ubuntu récent, joignable en SSH par clé, avec un compte sudo.

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

Le nom DNS du site (et `stats.<domaine>` si les statistiques sont activées) doit pointer vers le serveur avant le premier passage : Caddy obtient alors le certificat Let's Encrypt.

| Rôle | Ce qu'il fait |
|---|---|
| `common` | paquets de base, fuseau horaire, mises à jour de sécurité automatiques, SSH par clé seulement, fail2ban, pare-feu (22 limité, 80, 443 TCP/UDP) |
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

1. Déclarer un client OpenID Connect chez votre fournisseur d'identité : type confidentiel (ou public avec PKCE), URL de retour `https://<domaine>/auth/callback`, portées `openid email profile`.
2. Renseigner `website_oidc_issuer`, `website_oidc_client_id`, `website_admin_emails` et, dans le vault, `vault_oidc_client_secret` et `vault_session_password` (32 caractères au moins).
3. Seules les adresses listées (e-mail vérifié par le fournisseur) entrent ; la liste est relue à chaque requête.

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
