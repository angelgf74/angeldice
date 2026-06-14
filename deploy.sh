#!/bin/bash
# Despliega Angel Dice en el servidor Ubuntu (agfserver-angel)

set -e

SSH_HOST="agfserver-angel"
REMOTE_DIR="/apps/angeldice"

echo "==> Actualizando versión de caché del Service Worker..."
VERSION="angeldice-$(date +%Y%m%d-%H%M%S)"
sed -i "s/const CACHE = '[^']*'/const CACHE = '$VERSION'/" sw.js
echo "    Versión: $VERSION"

echo "==> Creando directorio remoto..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR"

echo "==> Copiando archivos..."
scp -r \
    index.html \
    manifest.json \
    sw.js \
    favicon.svg \
    css \
    js \
    icons \
    "$SSH_HOST:$REMOTE_DIR/"

echo "==> Configurando nginx..."
ssh "$SSH_HOST" bash << 'EOF'
CONF_FILE="/etc/nginx/sites-available/angeldice"

if [ ! -f "$CONF_FILE" ]; then
    echo "   Creando configuración nginx..."
    sudo tee "$CONF_FILE" > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    root /apps/angeldice;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /sw.js {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location ~* \.(ogg|mp3|wav)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \.(js|css|png|svg)$ {
        add_header Cache-Control "public, max-age=86400";
    }

    location = /manifest.json {
        add_header Cache-Control "public, max-age=86400";
    }
}
NGINX
    sudo ln -sf "$CONF_FILE" /etc/nginx/sites-enabled/angeldice
    echo "   Configuración creada y enlazada"
fi

sudo nginx -t && sudo systemctl reload nginx
echo "   nginx recargado correctamente"
EOF

echo ""
echo "==> Despliegue completado."
echo "    http://agfserver-angel/"
