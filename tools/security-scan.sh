#!/usr/bin/env bash
# Contrôles de sécurité, identiques en local et en CI (.github/workflows/security.yml).
# Chaque outil tourne dans une image Docker épinglée par version et par empreinte : aucun binaire à installer.
#
#   tools/security-scan.sh            tout (sauf l'image)
#   tools/security-scan.sh secrets    gitleaks sur tout l'historique git
#   tools/security-scan.sh deps       npm audit (dépendances de production, sévérité haute et plus)
#   tools/security-scan.sh fs         Trivy : vulnérabilités, secrets et mauvaises configurations du dépôt
#   tools/security-scan.sh config     KICS (compose, Ansible, Dockerfile, sites Caddy) + validation et format du Caddyfile
#   tools/security-scan.sh dockerfile hadolint
#   tools/security-scan.sh sast       Semgrep (règles JavaScript/TypeScript/Node, secrets, Docker)
#   tools/security-scan.sh image IMG  Trivy sur une image construite + SBOM CycloneDX
#
# Les rapports sont écrits dans reports/ (ignoré par git).
set -euo pipefail

GITLEAKS=zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
TRIVY=aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
HADOLINT=hadolint/hadolint:v2.15.1-alpine@sha256:a1d49ae1a4e83c1dbad26b8c1ad7588c8bd1e04f4866b34ad3cac50335198552
KICS=checkmarx/kics:v2.2.1@sha256:49ccc54b6ae7f5d5fc95e96f8f95c18c57f3bba047ab611a03d80792bdff6757
CADDY=caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
SEMGREP=semgrep/semgrep:1.185.0@sha256:67518c174185a2043fdbed16c70631b79209499b3671178e7194379b48295a0d

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORTS="$ROOT/reports"
mkdir -p "$REPORTS"
cd "$ROOT"

run() { docker run --rm -v "$ROOT:/src" -w /src "$@"; }

secrets() {
  echo "== gitleaks (historique complet)"
  run "$GITLEAKS" git /src --config /src/.gitleaks.toml --redact --no-banner \
    --report-format sarif --report-path /src/reports/gitleaks.sarif
}

deps() {
  echo "== npm audit (production, high+)"
  npm audit --omit=dev --audit-level=high
}

fs() {
  echo "== Trivy (dépôt : vulnérabilités, secrets, configuration)"
  run -v trivy-cache:/root/.cache "$TRIVY" fs /src \
    --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed \
    --skip-dirs node_modules,.nuxt,.output,reports --exit-code 1 --no-progress
}

config() {
  echo "== KICS (infrastructure : compose, Ansible, Dockerfile, sites Caddy)"
  # Bloquant dès le niveau moyen. Les exceptions assumées sont annotées sur place (kics-scan), avec leur justification.
  docker run --rm -v "$ROOT:/src:ro" -v "$REPORTS:/reports" "$KICS" scan \
    -p /src/docker-compose.yml -p /src/deploy/ansible -p /src/Dockerfile -p /src/caddy-sites \
    -o /reports --report-formats json,sarif --output-name kics --disable-secrets --no-progress --ci \
    --fail-on high,medium
  echo "== Caddyfile (validation, avec et sans le site des statistiques, puis format)"
  local tmp; tmp="$(mktemp -d)"; cp caddy-sites/stats.caddy.example "$tmp/stats.caddy"
  docker run --rm -e SITE_DOMAIN=exemple.test -v "$ROOT/Caddyfile:/etc/caddy/Caddyfile:ro" "$CADDY" \
    sh -c 'mkdir -p /etc/caddy/sites && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile'
  docker run --rm -e SITE_DOMAIN=exemple.test -v "$ROOT/Caddyfile:/etc/caddy/Caddyfile:ro" -v "$tmp:/etc/caddy/sites:ro" "$CADDY" \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
  rm -rf "$tmp"
  docker run --rm -i "$CADDY" caddy fmt - < Caddyfile | diff -u Caddyfile - || { echo "Caddyfile mal formaté : caddy fmt --overwrite Caddyfile"; return 1; }
}

dockerfile() {
  echo "== hadolint"
  docker run --rm -i -v "$ROOT/.hadolint.yaml:/.config/hadolint.yaml:ro" "$HADOLINT" hadolint - < Dockerfile
}

sast() {
  echo "== Semgrep"
  run "$SEMGREP" semgrep scan --error --metrics=off --quiet \
    --config p/javascript --config p/typescript --config p/nodejsscan --config p/secrets --config p/dockerfile \
    --exclude node_modules --exclude .nuxt --exclude .output --exclude reports --exclude tests \
    --sarif --output /src/reports/semgrep.sarif
}

image() {
  local img="${1:?usage : security-scan.sh image <image>}"
  echo "== Trivy (image $img)"
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro -v trivy-cache:/root/.cache -v "$REPORTS:/reports" "$TRIVY" \
    image "$img" --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --no-progress
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro -v trivy-cache:/root/.cache -v "$REPORTS:/reports" "$TRIVY" \
    image "$img" --format cyclonedx --output /reports/sbom.cdx.json --no-progress
  echo "SBOM : reports/sbom.cdx.json"
}

case "${1:-all}" in
  secrets) secrets ;;
  deps) deps ;;
  fs) fs ;;
  config) config ;;
  dockerfile) dockerfile ;;
  sast) sast ;;
  image) image "${2:-}" ;;
  all) secrets; deps; fs; config; dockerfile; sast ;;
  *) echo "commande inconnue : $1" >&2; exit 2 ;;
esac
