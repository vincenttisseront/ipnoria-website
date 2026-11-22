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

## Espace d'administration (`/admin`)

1. Déclarer un client OpenID Connect chez votre fournisseur d'identité : type confidentiel (ou public avec PKCE), URL de retour `https://<domaine>/auth/callback`, portées `openid email profile`.
2. Renseigner `website_oidc_issuer`, `website_oidc_client_id`, `website_admin_emails` et, dans le vault, `vault_oidc_client_secret` et `vault_session_password` (32 caractères au moins).
3. Seules les adresses listées (e-mail vérifié par le fournisseur) entrent ; la liste est relue à chaque requête.

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
