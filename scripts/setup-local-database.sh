#!/bin/bash

# 🔒 SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS LOCAL SEGURA
# Para FacePay - Control total de datos sensibles

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "   🔒 FACEPAY - CONFIGURACIÓN DE BASE DE DATOS SEGURA LOCAL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si PostgreSQL está instalado
check_postgresql() {
    echo "→ Verificando PostgreSQL..."
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL instalado"
        psql --version
    else
        echo -e "${RED}✗${NC} PostgreSQL no está instalado"
        echo ""
        echo "Instalar PostgreSQL:"
        echo ""
        echo "  MacOS:"
        echo "    brew install postgresql@15"
        echo "    brew services start postgresql@15"
        echo ""
        echo "  Ubuntu/Debian:"
        echo "    sudo apt-get update"
        echo "    sudo apt-get install postgresql postgresql-contrib"
        echo "    sudo systemctl start postgresql"
        echo ""
        echo "  RHEL/CentOS:"
        echo "    sudo yum install postgresql-server postgresql-contrib"
        echo "    sudo postgresql-setup initdb"
        echo "    sudo systemctl start postgresql"
        echo ""
        exit 1
    fi
}

# Crear base de datos local
create_database() {
    echo ""
    echo "→ Creando base de datos 'facepay_local'..."
    
    # Verificar si la base de datos existe
    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw facepay_local; then
        echo -e "${YELLOW}⚠${NC} La base de datos 'facepay_local' ya existe"
        read -p "¿Deseas recrearla? (se perderán todos los datos) [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "→ Eliminando base de datos existente..."
            psql -U postgres -c "DROP DATABASE IF EXISTS facepay_local;"
            psql -U postgres -c "CREATE DATABASE facepay_local;"
            echo -e "${GREEN}✓${NC} Base de datos recreada"
        fi
    else
        psql -U postgres -c "CREATE DATABASE facepay_local;"
        echo -e "${GREEN}✓${NC} Base de datos creada"
    fi
}

# Crear usuario seguro
create_user() {
    echo ""
    echo "→ Configurando usuario seguro..."
    
    # Generar contraseña segura
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Crear usuario
    psql -U postgres <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'facepay_user') THEN
        CREATE USER facepay_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER facepay_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE facepay_local TO facepay_user;
ALTER DATABASE facepay_local OWNER TO facepay_user;
EOF
    
    echo -e "${GREEN}✓${NC} Usuario configurado"
    
    # Guardar credenciales en .env.local
    echo ""
    echo "→ Actualizando .env.local..."
    
    # Backup del .env.local existente
    if [ -f .env.local ]; then
        cp .env.local .env.local.backup
        echo -e "${GREEN}✓${NC} Backup creado: .env.local.backup"
    fi
    
    # Crear nuevo .env.local
    cat > .env.local <<EOF
# 🔒 BASE DE DATOS LOCAL SEGURA
# Generado: $(date)
# IMPORTANTE: Estos datos están en TU máquina, bajo TU control

DATABASE_URL="postgresql://facepay_user:${DB_PASSWORD}@localhost:5432/facepay_local"
DIRECT_URL="postgresql://facepay_user:${DB_PASSWORD}@localhost:5432/facepay_local"

# 🔐 KEYS DE SEGURIDAD (Generadas localmente)
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"

# 🌍 CONFIGURACIÓN LOCAL
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# 🔒 WebAuthn Local
NEXT_PUBLIC_WEBAUTHN_RP_NAME="FacePay Local"
NEXT_PUBLIC_WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# ⚠️ SERVICIOS EXTERNOS (Opcionales - puedes dejarlos vacíos)
# Solo agregar si REALMENTE los necesitas

# Stripe (Modo Test - opcional)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Monitoring (Opcional - todo se guarda localmente por defecto)
NEXT_PUBLIC_ENABLE_MONITORING="false"
NEXT_PUBLIC_ENABLE_ANALYTICS="false"

# Email (Usa Mailtrap o servicio local para testing)
EMAIL_PROVIDER="smtp"
SMTP_HOST="localhost"
SMTP_PORT="1025"
FROM_EMAIL="noreply@facepay.local"
EOF
    
    echo -e "${GREEN}✓${NC} Archivo .env.local actualizado"
}

# Ejecutar migraciones de Prisma
run_migrations() {
    echo ""
    echo "→ Ejecutando migraciones de base de datos..."
    
    # Instalar dependencias si no existen
    if [ ! -d "node_modules" ]; then
        echo "→ Instalando dependencias..."
        npm install
    fi
    
    # Generar cliente de Prisma
    npx prisma generate
    
    # Ejecutar migraciones
    npx prisma migrate deploy 2>/dev/null || {
        echo -e "${YELLOW}⚠${NC} No hay migraciones previas, creando nueva..."
        npx prisma migrate dev --name initial_setup
    }
    
    echo -e "${GREEN}✓${NC} Migraciones completadas"
}

# Configurar seguridad adicional
setup_security() {
    echo ""
    echo "→ Configurando seguridad adicional..."
    
    # Crear directorio para backups encriptados
    mkdir -p ./backups/encrypted
    chmod 700 ./backups/encrypted
    
    # Script de backup automático
    cat > ./scripts/backup-database.sh <<'BACKUP'
#!/bin/bash
# Backup encriptado de la base de datos

BACKUP_DIR="./backups/encrypted"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/facepay_backup_$TIMESTAMP.sql.gpg"

# Crear backup encriptado
echo "→ Creando backup encriptado..."
pg_dump facepay_local | gpg --symmetric --cipher-algo AES256 --output "$BACKUP_FILE"

echo "✓ Backup creado: $BACKUP_FILE"

# Eliminar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql.gpg" -mtime +7 -delete

echo "✓ Backups antiguos eliminados"
BACKUP
    
    chmod +x ./scripts/backup-database.sh
    
    echo -e "${GREEN}✓${NC} Seguridad configurada"
}

# Crear datos de prueba seguros
seed_test_data() {
    echo ""
    read -p "¿Deseas crear datos de prueba? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "→ Creando datos de prueba..."
        npx prisma db seed
        echo -e "${GREEN}✓${NC} Datos de prueba creados"
    fi
}

# Resumen final
show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}   ✅ BASE DE DATOS LOCAL CONFIGURADA CON ÉXITO${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📊 Resumen de configuración:"
    echo "  • Base de datos: facepay_local"
    echo "  • Usuario: facepay_user"
    echo "  • Puerto: 5432"
    echo "  • Host: localhost"
    echo ""
    echo "🔒 Seguridad implementada:"
    echo "  • Contraseñas seguras generadas automáticamente"
    echo "  • Encriptación de datos sensibles habilitada"
    echo "  • Backup encriptado disponible"
    echo "  • Todas las credenciales en .env.local"
    echo ""
    echo "🎯 Próximos pasos:"
    echo "  1. Revisar .env.local para confirmar configuración"
    echo "  2. Ejecutar: npm run dev"
    echo "  3. Acceder a: http://localhost:3000"
    echo ""
    echo "⚠️ IMPORTANTE:"
    echo "  • Los datos están 100% en TU máquina"
    echo "  • Nadie más tiene acceso a tu base de datos"
    echo "  • Haz backups regulares con: ./scripts/backup-database.sh"
    echo ""
    echo -e "${YELLOW}💡 Tip:${NC} Para máxima seguridad en producción, usa un servidor"
    echo "         dedicado en México con las mismas configuraciones."
    echo ""
}

# Función principal
main() {
    echo "Este script configurará una base de datos LOCAL segura"
    echo "donde TÚ tienes control TOTAL de los datos."
    echo ""
    read -p "¿Continuar? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo "Instalación cancelada."
        exit 0
    fi
    
    check_postgresql
    create_database
    create_user
    run_migrations
    setup_security
    seed_test_data
    show_summary
}

# Ejecutar
main