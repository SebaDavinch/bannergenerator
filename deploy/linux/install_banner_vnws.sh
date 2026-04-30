#!/usr/bin/env bash

set -euo pipefail

DEPLOY_ROOT="/var/www/generator"
NGINX_SITE="banner.vnws.org.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

apt update
apt install -y nginx python3 python3-venv

mkdir -p "${DEPLOY_ROOT}"

cp -R "${SCRIPT_DIR}/site" "${DEPLOY_ROOT}/site"
cp -R "${SCRIPT_DIR}/backend" "${DEPLOY_ROOT}/backend"
cp -R "${SCRIPT_DIR}/nginx" "${DEPLOY_ROOT}/nginx"
cp -R "${SCRIPT_DIR}/systemd" "${DEPLOY_ROOT}/systemd"
cp "${SCRIPT_DIR}/serve_frontend.py" "${DEPLOY_ROOT}/serve_frontend.py"
cp "${SCRIPT_DIR}/README.md" "${DEPLOY_ROOT}/README.md"

chown -R www-data:www-data "${DEPLOY_ROOT}"

cd "${DEPLOY_ROOT}/backend"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

cp "${DEPLOY_ROOT}/systemd/banner-vnws-backend.service" /etc/systemd/system/banner-vnws-backend.service
cp "${DEPLOY_ROOT}/systemd/banner-vnws-frontend.service" /etc/systemd/system/banner-vnws-frontend.service
systemctl daemon-reload
systemctl enable --now banner-vnws-backend.service
systemctl enable --now banner-vnws-frontend.service

cp "${DEPLOY_ROOT}/nginx/${NGINX_SITE}" "/etc/nginx/sites-available/${NGINX_SITE}"
ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
nginx -t
systemctl reload nginx

echo
echo "Install complete."
echo "If backend/.env is missing or outdated, place it at ${DEPLOY_ROOT}/backend/.env and restart banner-vnws-backend.service."
echo "Check services with: systemctl status banner-vnws-backend.service --no-pager"
echo "Check services with: systemctl status banner-vnws-frontend.service --no-pager"
echo "Backend health: curl -I http://127.0.0.1:8789/api/health"