#!/bin/bash

# 🚀 DEPLOYMENT AUTOMÁTICO A VULTR MÉXICO
# Para FacePay - Control total con servidor en México

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "   🚀 FACEPAY - DEPLOYMENT A VULTR CIUDAD DE MÉXICO"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables (actualizar con tus datos)
SERVER_IP=""
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
DOMAIN="facepay.mx"  # Cambiar por tu dominio
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Función para solicitar datos
get_server_info() {
    echo -e "${BLUE}Configuración del servidor Vultr:${NC}"
    echo ""
    
    if [ -z "$SERVER_IP" ]; then
        read -p "→ IP del servidor Vultr: " SERVER_IP
    fi
    
    read -p "→ Dominio (default: facepay.mx): " input_domain
    if [ ! -z "$input_domain" ]; then
        DOMAIN=$input_domain
    fi
    
    read -p "→ Path a tu SSH key (default: ~/.ssh/id_rsa): " input_ssh
    if [ ! -z "$input_ssh" ]; then
        SSH_KEY_PATH=$input_ssh
    fi
    
    echo ""
    echo -e "${GREEN}Configuración:${NC}"
    echo "  • Servidor: $SERVER_IP"
    echo "  • Dominio: $DOMAIN"
    echo "  • SSH Key: $SSH_KEY_PATH"
    echo ""
    
    read -p "¿Continuar? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo "Deployment cancelado."
        exit 0
    fi
}

# Crear script de setup remoto
create_setup_script() {
    echo -e "${YELLOW}→ Creando script de configuración...${NC}"
    
    cat > /tmp/vultr_setup.sh <<'SCRIPT'
#!/bin/bash

# Actualizar sistema
echo "→ Actualizando sistema..."
apt update && apt upgrade -y

# Instalar dependencias
echo "→ Instalando dependencias..."
apt install -y \
    postgresql postgresql-contrib \
    nginx \
    certbot python3-certbot-nginx \
    git \
    nodejs npm \
    ufw \
    fail2ban \
    redis-server \
    supervisor

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2 para gestión de procesos
npm install -g pm2

# Configurar firewall
echo "→ Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configurar PostgreSQL
echo "→ Configurando PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE facepay_prod;
CREATE USER facepay_user WITH ENCRYPTED PASSWORD 'DB_PASSWORD_PLACEHOLDER';
GRANT ALL PRIVILEGES ON DATABASE facepay_prod TO facepay_user;
ALTER DATABASE facepay_prod OWNER TO facepay_user;
EOF

# Configurar PostgreSQL para producción
cat >> /etc/postgresql/*/main/postgresql.conf <<EOF

# Optimizaciones para producción
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

systemctl restart postgresql

# Crear directorio para la aplicación
mkdir -p /var/www/facepay
cd /var/www/facepay

# Clonar repositorio
echo "→ Clonando repositorio..."
git clone https://github.com/dabtcavila/facepay.git . || echo "Ajusta la URL del repo"

# Instalar dependencias
echo "→ Instalando dependencias de Node.js..."
npm install

# Crear archivo .env.production
echo "→ Configurando variables de entorno..."
cat > .env.production <<ENV
# Base de datos
DATABASE_URL="postgresql://facepay_user:DB_PASSWORD_PLACEHOLDER@localhost:5432/facepay_prod"
DIRECT_URL="postgresql://facepay_user:DB_PASSWORD_PLACEHOLDER@localhost:5432/facepay_prod"

# Seguridad
JWT_SECRET="JWT_SECRET_PLACEHOLDER"
NEXTAUTH_SECRET="NEXTAUTH_SECRET_PLACEHOLDER"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"

# Aplicación
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://DOMAIN_PLACEHOLDER"
NEXTAUTH_URL="https://DOMAIN_PLACEHOLDER"

# WebAuthn
NEXT_PUBLIC_WEBAUTHN_RP_NAME="FacePay"
NEXT_PUBLIC_WEBAUTHN_RP_ID="DOMAIN_PLACEHOLDER"
WEBAUTHN_ORIGIN="https://DOMAIN_PLACEHOLDER"

# Redis para sesiones
REDIS_URL="redis://localhost:6379"

# Monitoring
NEXT_PUBLIC_ENABLE_MONITORING="true"
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
ENV

# Build de producción
echo "→ Compilando aplicación..."
npm run build

# Configurar PM2
echo "→ Configurando PM2..."
pm2 start ecosystem.config.js --env production
pm2 startup systemd -u root --hp /root
pm2 save

# Configurar Nginx
echo "→ Configurando Nginx..."
cat > /etc/nginx/sites-available/facepay <<NGINX
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;
}
NGINX

ln -s /etc/nginx/sites-available/facepay /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Crear script de backup
echo "→ Configurando backups automáticos..."
cat > /usr/local/bin/backup-facepay.sh <<'BACKUP'
#!/bin/bash
BACKUP_DIR="/var/backups/facepay"
mkdir -p $BACKUP_DIR

# Backup de base de datos
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump facepay_prod | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Mantener solo últimos 7 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Opcional: subir a S3 o almacenamiento externo
# aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" s3://tu-bucket/backups/
BACKUP

chmod +x /usr/local/bin/backup-facepay.sh

# Agregar cron para backup diario
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-facepay.sh") | crontab -

# Crear script de monitoreo
cat > /usr/local/bin/monitor-facepay.sh <<'MONITOR'
#!/bin/bash
# Verificar que la app está corriendo
if ! pm2 status | grep -q "online"; then
    pm2 restart all
    echo "$(date): PM2 reiniciado" >> /var/log/facepay-monitor.log
fi

# Verificar espacio en disco
DISK_USAGE=$(df / | grep / | awk '{ print $5 }' | sed 's/%//g')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Alerta: Disco al $DISK_USAGE%" >> /var/log/facepay-monitor.log
    # Enviar alerta por email o webhook
fi
MONITOR

chmod +x /usr/local/bin/monitor-facepay.sh

# Agregar monitoreo cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-facepay.sh") | crontab -

echo "✅ Configuración base completada!"
SCRIPT

    # Reemplazar placeholders
    sed -i "s/DB_PASSWORD_PLACEHOLDER/$DB_PASSWORD/g" /tmp/vultr_setup.sh
    sed -i "s/JWT_SECRET_PLACEHOLDER/$JWT_SECRET/g" /tmp/vultr_setup.sh
    sed -i "s/NEXTAUTH_SECRET_PLACEHOLDER/$NEXTAUTH_SECRET/g" /tmp/vultr_setup.sh
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /tmp/vultr_setup.sh
}

# Ejecutar deployment
deploy() {
    echo ""
    echo -e "${YELLOW}→ Iniciando deployment a Vultr...${NC}"
    
    # Copiar script al servidor
    echo "→ Copiando script de configuración..."
    scp -i $SSH_KEY_PATH /tmp/vultr_setup.sh root@$SERVER_IP:/tmp/
    
    # Ejecutar script
    echo "→ Ejecutando configuración en el servidor..."
    ssh -i $SSH_KEY_PATH root@$SERVER_IP "chmod +x /tmp/vultr_setup.sh && /tmp/vultr_setup.sh"
    
    # SSL con Let's Encrypt
    echo ""
    echo -e "${YELLOW}→ Configurando SSL...${NC}"
    ssh -i $SSH_KEY_PATH root@$SERVER_IP "certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
    
    # Migrar base de datos
    echo ""
    echo -e "${YELLOW}→ Ejecutando migraciones de base de datos...${NC}"
    ssh -i $SSH_KEY_PATH root@$SERVER_IP "cd /var/www/facepay && npx prisma migrate deploy"
    
    # Reiniciar servicios
    echo "→ Reiniciando servicios..."
    ssh -i $SSH_KEY_PATH root@$SERVER_IP "pm2 restart all && systemctl restart nginx"
}

# Mostrar resumen
show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}   ✅ DEPLOYMENT COMPLETADO CON ÉXITO${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📊 Información del servidor:"
    echo "  • IP: $SERVER_IP"
    echo "  • Dominio: https://$DOMAIN"
    echo "  • Base de datos: PostgreSQL local"
    echo "  • SSL: Let's Encrypt (renovación automática)"
    echo ""
    echo "🔐 Seguridad implementada:"
    echo "  • Firewall configurado (UFW)"
    echo "  • Fail2ban activo"
    echo "  • SSL/HTTPS habilitado"
    echo "  • Backups automáticos diarios"
    echo "  • Monitoreo cada 5 minutos"
    echo ""
    echo "🔑 Credenciales guardadas en el servidor:"
    echo "  • Archivo: /var/www/facepay/.env.production"
    echo "  • Base de datos: facepay_prod"
    echo "  • Usuario DB: facepay_user"
    echo ""
    echo "📝 Comandos útiles:"
    echo "  • SSH: ssh root@$SERVER_IP"
    echo "  • Logs: pm2 logs"
    echo "  • Restart: pm2 restart all"
    echo "  • Backup manual: /usr/local/bin/backup-facepay.sh"
    echo ""
    echo "🎯 Próximos pasos:"
    echo "  1. Configurar DNS para apuntar a $SERVER_IP"
    echo "  2. Agregar API keys de Stripe/MercadoPago"
    echo "  3. Configurar email SMTP"
    echo "  4. Probar todas las funcionalidades"
    echo ""
    echo -e "${GREEN}¡FacePay está corriendo en producción con datos 100% bajo tu control!${NC}"
    echo ""
    
    # Guardar información
    cat > deployment-info.txt <<INFO
FACEPAY DEPLOYMENT INFO
=======================
Fecha: $(date)
Servidor: $SERVER_IP
Dominio: https://$DOMAIN
SSH: ssh root@$SERVER_IP

Credenciales de base de datos:
- Database: facepay_prod
- User: facepay_user
- Password: $DB_PASSWORD

Secrets de aplicación:
- JWT_SECRET: $JWT_SECRET
- NEXTAUTH_SECRET: $NEXTAUTH_SECRET

IMPORTANTE: Guarda este archivo en un lugar seguro!
INFO
    
    echo -e "${YELLOW}💾 Información guardada en: deployment-info.txt${NC}"
}

# Función principal
main() {
    echo "Este script configurará FacePay en tu servidor Vultr"
    echo "con base de datos local y control total."
    echo ""
    
    get_server_info
    create_setup_script
    deploy
    show_summary
}

# Ejecutar
main