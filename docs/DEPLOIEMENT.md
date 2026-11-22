# Déploiement

## Prérequis du serveur

Linux avec Docker Engine et le plugin Compose, ports 80 et 443 ouverts, un nom DNS qui pointe vers le serveur.

## Première installation

```bash
mkdir -p /opt/ddibuntu-site && cd /opt/ddibuntu-site
# copier docker-compose.yml, Caddyfile et .env.example depuis le dépôt
cp .env.example .env && chmod 600 .env
# remplir .env : SITE_DOMAIN, POSTGRES_PASSWORD et IP_HASH_SALT (openssl rand -base64 32), mentions légales
echo "$GHCR_TOKEN" | docker login ghcr.io -u vincenttisseront --password-stdin   # jeton « read:packages » seulement
docker compose up -d --wait
```

Caddy obtient le certificat Let's Encrypt au premier accès. Les migrations de la base s'appliquent au démarrage de l'application.

## Mise à jour

Automatique : pousser un tag `vX.Y.Z` (voir `.github/workflows/release.yml`). À la main :

```bash
docker compose pull app && docker compose up -d --wait
```

## Essai local complet (HTTPS compris)

```bash
cp .env.example .env            # SITE_DOMAIN=localhost, APP_IMAGE= vide
docker compose up -d --build --wait
# https://localhost (certificat local de Caddy : avertissement du navigateur attendu)
```

## Sauvegarde de la base

```bash
docker compose exec -T db pg_dump -U site -Fc site > "site-$(date +%F).dump"
# restauration : docker compose exec -T db pg_restore -U site -d site --clean < site-AAAA-MM-JJ.dump
```

## Lire les messages reçus

```bash
docker compose exec db psql -U site -d site -c \
  "SELECT id, created_at, topic, name, email, left(message, 80) FROM contact_messages ORDER BY id DESC LIMIT 20"
```
