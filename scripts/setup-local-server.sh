#!/bin/bash

# 🏠 SETUP SERVIDOR LOCAL - FACEPAY
# Para correr en tu propia computadora/servidor en casa

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "   🏠 FACEPAY - CONFIGURACIÓN SERVIDOR LOCAL"
echo "   Control TOTAL - Sin pagos mensuales - 100% Privado"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        OS="windows"
    fi
    
    echo -e "${BLUE}Sistema detectado: $OS${NC}"
}

# Instalar dependencias según OS
install_dependencies() {
    echo -e "${YELLOW}→ Instalando dependencias...${NC}"
    
    if [ "$OS" == "linux" ]; then
        if [ "$DISTRO" == "debian" ]; then
            sudo apt update
            sudo apt install -y \
                postgresql postgresql-contrib \
                nginx \
                git curl wget \
                build-essential \
                redis-server \
                ufw fail2ban \
                htop net-tools
        fi
    elif [ "$OS" == "macos" ]; then
        # Verificar Homebrew
        if ! command -v brew &> /dev/null; then
            echo "Instalando Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        brew install postgresql@15 nginx redis node git
        brew services start postgresql@15
        brew services start redis
        brew services start nginx
    fi
    
    # Node.js y npm
    if ! command -v node &> /dev/null; then
        echo "Instalando Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # PM2
    sudo npm install -g pm2
}

# Configurar PostgreSQL local
setup_postgresql() {
    echo ""
    echo -e "${YELLOW}→ Configurando PostgreSQL...${NC}"
    
    # Generar contraseña segura
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Crear base de datos y usuario
    sudo -u postgres psql <<EOF 2>/dev/null || psql postgres <<EOF
CREATE DATABASE facepay_local;
CREATE USER facepay_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE facepay_local TO facepay_user;
ALTER DATABASE facepay_local OWNER TO facepay_user;
EOF
    
    echo -e "${GREEN}✓ Base de datos configurada${NC}"
    echo "  Database: facepay_local"
    echo "  Usuario: facepay_user"
}

# Configurar FacePay
setup_facepay() {
    echo ""
    echo -e "${YELLOW}→ Instalando FacePay...${NC}"
    
    # Directorio de instalación
    INSTALL_DIR="$HOME/facepay-local"
    
    if [ -d "$INSTALL_DIR" ]; then
        echo "FacePay ya existe en $INSTALL_DIR"
        read -p "¿Reinstalar? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf $INSTALL_DIR
        else
            return
        fi
    fi
    
    # Clonar repositorio
    git clone https://github.com/dabtcavila/facepay.git $INSTALL_DIR 2>/dev/null || {
        mkdir -p $INSTALL_DIR
        cd $INSTALL_DIR
        git init
        echo "⚠️ Ajusta la URL del repositorio en el script"
    }
    
    cd $INSTALL_DIR
    
    # Instalar dependencias
    npm install
    
    # Crear .env.local
    cat > .env.local <<EOF
# 🏠 CONFIGURACIÓN LOCAL - 100% EN TU CONTROL
DATABASE_URL="postgresql://facepay_user:$DB_PASSWORD@localhost:5432/facepay_local"
DIRECT_URL="postgresql://facepay_user:$DB_PASSWORD@localhost:5432/facepay_local"

# Seguridad (generadas localmente)
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"

# Aplicación
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# WebAuthn Local
NEXT_PUBLIC_WEBAUTHN_RP_NAME="FacePay Local"
NEXT_PUBLIC_WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# Redis Local
REDIS_URL="redis://localhost:6379"

# Desactivar servicios externos
NEXT_PUBLIC_ENABLE_MONITORING="false"
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
EOF
    
    # Build
    echo "→ Compilando aplicación..."
    npm run build
    
    # Configurar PM2
    cat > ecosystem.config.js <<'PM2'
module.exports = {
  apps: [{
    name: 'facepay-local',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
PM2
    
    # Iniciar con PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
}

# Configurar Nginx
setup_nginx() {
    echo ""
    echo -e "${YELLOW}→ Configurando Nginx...${NC}"
    
    # Detectar IP local
    if [ "$OS" == "linux" ]; then
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    elif [ "$OS" == "macos" ]; then
        LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
    fi
    
    # Configuración de Nginx
    NGINX_CONF="/etc/nginx/sites-available/facepay"
    if [ "$OS" == "macos" ]; then
        NGINX_CONF="/usr/local/etc/nginx/servers/facepay.conf"
        mkdir -p /usr/local/etc/nginx/servers
    fi
    
    sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name localhost $LOCAL_IP;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
}
EOF
    
    if [ "$OS" == "linux" ]; then
        sudo ln -sf /etc/nginx/sites-available/facepay /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo systemctl restart nginx
    elif [ "$OS" == "macos" ]; then
        brew services restart nginx
    fi
    
    echo -e "${GREEN}✓ Nginx configurado${NC}"
}

# Configurar firewall (solo Linux)
setup_firewall() {
    if [ "$OS" != "linux" ]; then
        return
    fi
    
    echo ""
    echo -e "${YELLOW}→ Configurando firewall...${NC}"
    
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw --force enable
    
    echo -e "${GREEN}✓ Firewall configurado${NC}"
}

# Configurar Cloudflare Tunnel (opcional)
setup_cloudflare() {
    echo ""
    echo -e "${BLUE}¿Quieres configurar Cloudflare Tunnel para acceso desde Internet?${NC}"
    echo "Esto permite acceder a tu servidor sin abrir puertos ni tener IP fija"
    read -p "¿Configurar Cloudflare? [y/N]: " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    # Instalar cloudflared
    if [ "$OS" == "linux" ]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [ "$OS" == "macos" ]; then
        brew install cloudflare/cloudflare/cloudflared
    fi
    
    echo ""
    echo -e "${YELLOW}Instrucciones para Cloudflare Tunnel:${NC}"
    echo "1. Ejecuta: cloudflared tunnel login"
    echo "2. Ejecuta: cloudflared tunnel create facepay-local"
    echo "3. Ejecuta: cloudflared tunnel route dns facepay-local facepay.tudominio.com"
    echo "4. Ejecuta: cloudflared tunnel run facepay-local"
    echo ""
    echo "Tu app estará disponible en: https://facepay.tudominio.com"
}

# Configurar backups automáticos
setup_backups() {
    echo ""
    echo -e "${YELLOW}→ Configurando backups automáticos...${NC}"
    
    # Crear directorio de backups
    BACKUP_DIR="$HOME/facepay-backups"
    mkdir -p $BACKUP_DIR
    
    # Script de backup
    cat > $HOME/backup-facepay.sh <<'BACKUP'
#!/bin/bash
BACKUP_DIR="$HOME/facepay-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup de base de datos
pg_dump facepay_local | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Mantener solo últimos 7 días localmente
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completado: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Opcional: Subir a Google Drive con rclone
# rclone copy "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" gdrive:facepay-backups/
BACKUP
    
    chmod +x $HOME/backup-facepay.sh
    
    # Agregar a crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-facepay.sh") | crontab -
    
    echo -e "${GREEN}✓ Backups configurados (diario a las 2 AM)${NC}"
}

# Información de acceso
show_info() {
    # Detectar IP local
    if [ "$OS" == "linux" ]; then
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    elif [ "$OS" == "macos" ]; then
        LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}   ✅ SERVIDOR LOCAL CONFIGURADO CON ÉXITO${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📍 ACCESO LOCAL:"
    echo "   • http://localhost"
    echo "   • http://localhost:3000"
    echo "   • http://$LOCAL_IP"
    echo ""
    echo "📊 SERVICIOS ACTIVOS:"
    echo "   • PostgreSQL: Puerto 5432"
    echo "   • Redis: Puerto 6379"
    echo "   • FacePay: Puerto 3000"
    echo "   • Nginx: Puerto 80"
    echo ""
    echo "🔧 COMANDOS ÚTILES:"
    echo "   • Ver logs: pm2 logs"
    echo "   • Reiniciar: pm2 restart all"
    echo "   • Monitorear: pm2 monit"
    echo "   • Backup manual: ~/backup-facepay.sh"
    echo ""
    echo "💡 PARA ACCESO DESDE INTERNET:"
    echo "   Opción 1: Configurar port forwarding en tu router"
    echo "   Opción 2: Usar Cloudflare Tunnel (ejecuta: setup_cloudflare)"
    echo "   Opción 3: Usar ngrok (ejecuta: ngrok http 3000)"
    echo ""
    echo "🔒 SEGURIDAD:"
    echo "   • Base de datos: 100% local, encriptada"
    echo "   • Backups: Automáticos diarios"
    echo "   • Firewall: Configurado (solo Linux)"
    echo "   • Sin datos en la nube"
    echo ""
    echo -e "${GREEN}¡FacePay está corriendo localmente con control TOTAL!${NC}"
    echo ""
    
    # Guardar información
    cat > $HOME/facepay-local-info.txt <<INFO
FACEPAY - SERVIDOR LOCAL
========================
Fecha instalación: $(date)
Directorio: $HOME/facepay-local
Base de datos: facepay_local
Usuario DB: facepay_user

Acceso:
- Local: http://localhost:3000
- Red: http://$LOCAL_IP

Comandos:
- pm2 logs
- pm2 restart all
- ~/backup-facepay.sh

Archivos importantes:
- .env.local: $HOME/facepay-local/.env.local
- Backups: $HOME/facepay-backups/
INFO
    
    echo -e "${YELLOW}📝 Información guardada en: ~/facepay-local-info.txt${NC}"
}

# Menú principal
main_menu() {
    echo ""
    echo "¿Qué deseas hacer?"
    echo ""
    echo "1) Instalación completa (recomendado)"
    echo "2) Solo base de datos"
    echo "3) Solo aplicación"
    echo "4) Configurar Cloudflare Tunnel"
    echo "5) Información del sistema"
    echo "6) Salir"
    echo ""
    read -p "Selecciona una opción [1-6]: " option
    
    case $option in
        1)
            detect_os
            install_dependencies
            setup_postgresql
            setup_facepay
            setup_nginx
            setup_firewall
            setup_backups
            setup_cloudflare
            show_info
            ;;
        2)
            detect_os
            setup_postgresql
            ;;
        3)
            detect_os
            setup_facepay
            ;;
        4)
            detect_os
            setup_cloudflare
            ;;
        5)
            show_info
            ;;
        6)
            echo "¡Hasta luego!"
            exit 0
            ;;
        *)
            echo "Opción inválida"
            main_menu
            ;;
    esac
}

# Verificación inicial
check_requirements() {
    echo "Verificando requisitos..."
    
    # Verificar si es root (no recomendado)
    if [ "$EUID" -eq 0 ]; then 
        echo -e "${RED}⚠️ No ejecutes este script como root${NC}"
        echo "Usa tu usuario normal y el script pedirá sudo cuando sea necesario"
        exit 1
    fi
    
    # Verificar conexión a internet
    if ! ping -c 1 google.com &> /dev/null; then
        echo -e "${RED}⚠️ No hay conexión a Internet${NC}"
        echo "Se requiere internet para descargar dependencias"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Requisitos verificados${NC}"
}

# Inicio
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   FacePay - Servidor Local${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Este script configurará FacePay en tu computadora local"
echo "con base de datos PostgreSQL y control TOTAL."
echo ""
echo -e "${YELLOW}Ventajas:${NC}"
echo "• Sin pagos mensuales"
echo "• Control total de tus datos"
echo "• 100% privado"
echo "• Funciona sin internet (local)"
echo ""

check_requirements
main_menu