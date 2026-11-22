#!/usr/bin/env bash
# Création du dépôt PRIVÉ sur GitHub et réglages de sécurité, avec la CLI gh (gh auth login au préalable).
#   tools/github-setup.sh [propriétaire/nom]     défaut : vincenttisseront/ipnoria-website
# Idempotent : relancé, il ne recrée rien et réapplique les réglages.
set -euo pipefail

REPO="${1:-vincenttisseront/ipnoria-website}"
cd "$(dirname "$0")/.."

command -v gh >/dev/null || { echo "gh (GitHub CLI) est requis : https://cli.github.com" >&2; exit 1; }
gh auth status >/dev/null

if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Dépôt $REPO déjà présent"
else
  gh repo create "$REPO" --private --source . --remote origin --description "Site vitrine d'Ipnoria (FR/EN)" --disable-wiki
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
git push -u origin main

echo "== Réglages du dépôt"
gh api -X PATCH "repos/$REPO" \
  -F delete_branch_on_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false -F allow_squash_merge=true \
  -F has_projects=false -F has_wiki=false >/dev/null

echo "== Alertes et correctifs Dependabot"
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null || echo "  (alertes Dependabot : à activer dans Settings › Code security)"
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null || true

echo "== Protection de main (PR obligatoire, contrôles verts, historique linéaire, pas de force-push)"
# Sur un dépôt privé, la protection de branche demande GitHub Pro / Team : en offre gratuite, l'API répond 403.
if ! gh api -X PUT "repos/$REPO/branches/main/protection" --input - >/dev/null <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["quality", "gitleaks (historique complet)", "npm audit", "Trivy (dépôt)", "hadolint", "Semgrep (SAST)", "Trivy (image) + SBOM"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "require_code_owner_reviews": false },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
then
  echo "  Protection refusée : sur un dépôt privé, il faut GitHub Pro (compte personnel) ou Team (organisation)."
  echo "  En attendant : le pre-commit gitleaks (lefthook) et la CI restent actifs."
fi

cat <<EOF

À faire à la main (une fois) :
  1. Secrets Actions (Settings › Secrets and variables › Actions) :
       SONAR_TOKEN              jeton SonarQube (et SONAR_HOST_URL si serveur auto-hébergé)
       DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY, DEPLOY_KNOWN_HOSTS   (déploiement automatique)
     ex. : gh secret set SONAR_TOKEN --repo $REPO
  2. Environnement « production » (Settings › Environments) : restreindre aux tags v*.
  3. SonarQube Cloud : importer le projet et désactiver « Automatic Analysis » (l'analyse vient de la CI).
EOF
