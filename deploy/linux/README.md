# Linux Deploy For banner.vnws.org

This package is prepared for a manual Nginx deployment on a Linux host using a reverse-proxy layout.

## Contents

- `site/` contains the frontend production build.
- `backend/` contains the FastAPI backend source.
- `nginx/banner.vnws.org.conf` is the virtual host config for `banner.vnws.org`.
- `systemd/` contains ready-to-install service units.
- `serve_frontend.py` serves the static frontend with SPA fallback on port `8788`.
- `install_banner_vnws.sh` installs frontend, backend, systemd services, and nginx in one run.

## Recommended Target Layout

- Frontend service: `127.0.0.1:8788`
- Backend API service: `127.0.0.1:8789`
- Deployment folder: `/var/www/generator`
- `/etc/nginx/sites-available/banner.vnws.org.conf`

## Fast Install

If the archive is already unpacked, run:

```bash
cd /var/www/generator
sudo bash install_banner_vnws.sh
```

After that, make sure `backend/.env` contains the correct vAMSYS credentials and restart the backend service if needed.

## Manual Install

1. Point the `banner.vnws.org` DNS record to the server IP.
2. Install Nginx and Python.

```bash
sudo apt update
sudo apt install -y nginx python3 python3-venv
```

3. Upload the archive to the server and unpack it.

```bash
sudo mkdir -p /var/www/generator
sudo unzip -o banner.vnws.org-single.zip -d /var/www/generator
sudo chown -R www-data:www-data /var/www/generator
```

4. Create the backend virtual environment and install dependencies:

```bash
cd /var/www/generator/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

5. Create `backend/.env` with your vAMSYS credentials.

6. Install the systemd services:

```bash
sudo cp /var/www/generator/systemd/banner-vnws-backend.service /etc/systemd/system/banner-vnws-backend.service
sudo cp /var/www/generator/systemd/banner-vnws-frontend.service /etc/systemd/system/banner-vnws-frontend.service
sudo systemctl daemon-reload
sudo systemctl enable --now banner-vnws-backend.service
sudo systemctl enable --now banner-vnws-frontend.service
```

7. Install the Nginx site config.

```bash
sudo cp /var/www/generator/nginx/banner.vnws.org.conf /etc/nginx/sites-available/banner.vnws.org.conf
sudo ln -sf /etc/nginx/sites-available/banner.vnws.org.conf /etc/nginx/sites-enabled/banner.vnws.org.conf
sudo nginx -t
sudo systemctl reload nginx
```

8. If `ufw` is enabled, open web traffic.

```bash
sudo ufw allow 'Nginx Full'
```

9. Issue and install the TLS certificate.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d banner.vnws.org
```

## Updating

Replace the files in `/var/www/generator` with a newer archive and reload Nginx.

```bash
sudo rm -rf /var/www/generator/*
sudo unzip -o banner.vnws.org-single.zip -d /var/www/generator
sudo chown -R www-data:www-data /var/www/generator
cd /var/www/generator/backend
.venv/bin/pip install -r requirements.txt
sudo systemctl restart banner-vnws-backend.service
sudo systemctl restart banner-vnws-frontend.service
sudo nginx -t
sudo systemctl reload nginx
```

## Health Check

After deployment, `http://banner.vnws.org/healthz` should return `ok`.

Useful checks:

```bash
sudo systemctl status banner-vnws-backend.service --no-pager
sudo systemctl status banner-vnws-frontend.service --no-pager
sudo ss -ltnp | grep -E ':8788|:8789'
curl -I http://127.0.0.1:8788
curl -I http://127.0.0.1:8789/api/health
```