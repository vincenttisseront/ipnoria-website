#!/usr/bin/env bash
# Essai réel du playbook sur un conteneur Ubuntu avec systemd (sans serveur) :
# socle, Docker (dans le conteneur), site complet derrière Caddy, sauvegarde, puis second passage qui doit ne rien changer.
#   deploy/ansible/tests/run-container-test.sh [image-du-site]
# Prérequis : Docker, ansible-core, collections de requirements.yml. L'image du site est construite si elle n'est pas fournie.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="${1:-ipnoria-website:ansible-test}"
NAME=ipnoria-ansible-test
WORK="$(mktemp -d)"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build -t "$IMAGE" ../..
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --privileged --cgroupns=host -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  --tmpfs /run --tmpfs /run/lock jrei/systemd-ubuntu:24.04 >/dev/null
sleep 4
# Ce qu'un serveur réel a déjà : python3, sudo, sshd
docker exec "$NAME" bash -c 'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq python3 sudo openssh-server >/dev/null'

cat > "$WORK/hosts.yml" <<EOF
website:
  hosts:
    $NAME:
      ansible_connection: community.docker.docker
      ansible_python_interpreter: /usr/bin/python3
EOF
cat > "$WORK/vars.yml" <<EOF
website_domain: localhost
website_internal_domain: ""
website_image: $IMAGE
website_pull: missing
docker_daemon_extra: { "storage-driver": "vfs" }
vault_postgres_password: $(openssl rand -hex 16)
vault_ip_hash_salt: $(openssl rand -hex 16)
vault_ghcr_user: x
vault_ghcr_token: CHANGE-ME
EOF

run() { ANSIBLE_DEPRECATION_WARNINGS=false ansible-playbook site.yml -i "$WORK/hosts.yml" -e @"$WORK/vars.yml" "$@"; }

run --tags common,docker
docker save "$IMAGE" | docker exec -i "$NAME" docker load
run
docker exec "$NAME" systemctl start ipnoria-website-backup.service
docker exec "$NAME" bash -c 'ls /var/backups/ipnoria-website/site-*.dump'
docker exec "$NAME" curl -skf https://localhost/api/health

echo "== Second passage : aucun changement attendu"
out="$(run)"
echo "$out" | tail -3
echo "$out" | grep -q 'changed=0' || { echo "ÉCHEC : le playbook n'est pas idempotent"; exit 1; }
echo "OK"
