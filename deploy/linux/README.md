# Linux Deploy For banner.vnws.ru

This package is prepared for a manual Nginx deployment on a Linux host.

## Contents

- `site/` contains the ready-to-serve production build.
- `nginx/banner.vnws.ru.conf` is the virtual host config for `banner.vnws.ru`.

## Recommended Target Layout

- `/var/www/banner.vnws.ru/site`
- `/etc/nginx/sites-available/banner.vnws.ru.conf`

## Manual Install

1. Point the `banner.vnws.ru` DNS record to the server IP.
2. Install Nginx.

```bash
sudo apt update
sudo apt install -y nginx
```

3. Upload the archive to the server and unpack it.

```bash
sudo mkdir -p /var/www/banner.vnws.ru
sudo tar -xzf banner.vnws.ru-linux.tar.gz -C /var/www/banner.vnws.ru --strip-components=1
```

4. Install the Nginx site config.

```bash
sudo cp /var/www/banner.vnws.ru/nginx/banner.vnws.ru.conf /etc/nginx/sites-available/banner.vnws.ru.conf
sudo ln -sf /etc/nginx/sites-available/banner.vnws.ru.conf /etc/nginx/sites-enabled/banner.vnws.ru.conf
sudo nginx -t
sudo systemctl reload nginx
```

5. If `ufw` is enabled, open web traffic.

```bash
sudo ufw allow 'Nginx Full'
```

6. Issue and install the TLS certificate.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d banner.vnws.ru
```

## Updating

Replace the files in `/var/www/banner.vnws.ru` with a newer archive and reload Nginx.

```bash
sudo tar -xzf banner.vnws.ru-linux.tar.gz -C /var/www/banner.vnws.ru --strip-components=1
sudo nginx -t
sudo systemctl reload nginx
```

## Health Check

After deployment, `http://banner.vnws.ru/healthz` should return `ok`.