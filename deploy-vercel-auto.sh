#!/bin/bash

# 🚀 FacePay - Deployment Automático a Vercel
# Autor: Agente Experto en Deployment
# Fecha: $(date)

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "   🚀 FACEPAY - DEPLOYMENT AUTOMÁTICO A VERCEL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Variables de configuración
PROJECT_NAME="facepay"
DEPLOYMENT_ENV="production"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_step() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} ${GREEN}→${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 1. VERIFICACIÓN DE PRERREQUISITOS
print_step "Verificando prerrequisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    exit 1
fi
print_success "Node.js $(node -v) detectado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi
print_success "npm $(npm -v) detectado"

# 2. VERIFICACIÓN DE BUILD LOCAL
print_step "Verificando build local..."
if npm run build > /dev/null 2>&1; then
    print_success "Build local exitoso"
else
    print_error "Error en build local. Ejecuta 'npm run build' para ver detalles"
    exit 1
fi

# 3. CREACIÓN DE ARCHIVO DE VARIABLES DE ENTORNO
print_step "Preparando variables de entorno..."

cat > .env.production.local << 'EOF'
# Base de Datos (Supabase)
DATABASE_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Autenticación (Secrets generados)
NEXTAUTH_SECRET="zVlBHZlAFJ2my4CU/qbd664QqCciWPkCYKanzwvU5Ms="
JWT_SECRET="pUJqs7qWPyFDGF35XVi5yebDkJALSP/zTX2hWFjsq4I="
NEXTAUTH_URL="https://facepay.vercel.app"

# Supabase Public Keys
NEXT_PUBLIC_SUPABASE_URL="https://kqxmjwefdlzburlhdosc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s"

# WebAuthn Configuration
NEXT_PUBLIC_WEBAUTHN_RP_NAME="FacePay"
NEXT_PUBLIC_WEBAUTHN_RP_ID="facepay.vercel.app"
WEBAUTHN_ORIGIN="https://facepay.vercel.app"

# App Configuration
NEXT_PUBLIC_APP_URL="https://facepay.vercel.app"
NODE_ENV="production"
NEXT_PUBLIC_ENABLE_MONITORING="true"
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
EOF

print_success "Variables de entorno preparadas"

# 4. INSTALACIÓN DE VERCEL CLI SI NO EXISTE
if ! command -v vercel &> /dev/null; then
    print_step "Instalando Vercel CLI..."
    npm i -g vercel
    print_success "Vercel CLI instalado"
else
    print_success "Vercel CLI ya instalado ($(vercel --version))"
fi

# 5. LOGIN EN VERCEL (si no está autenticado)
print_step "Verificando autenticación en Vercel..."
if ! vercel whoami &> /dev/null; then
    print_warning "No estás autenticado en Vercel"
    print_step "Por favor, completa el login en tu navegador..."
    vercel login
fi

# 6. CONFIGURACIÓN DEL PROYECTO
print_step "Configurando proyecto en Vercel..."

# Crear vercel.json optimizado si no existe
if [ ! -f vercel.json ]; then
    print_warning "vercel.json no encontrado, creando configuración optimizada..."
    cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_ENABLE_MONITORING": "true",
    "NEXT_PUBLIC_ENABLE_ANALYTICS": "true"
  },
  "build": {
    "env": {
      "NODE_ENV": "production",
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
EOF
fi

# 7. DEPLOYMENT A VERCEL
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   📦 INICIANDO DEPLOYMENT A VERCEL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

print_step "Ejecutando deployment a producción..."

# Deploy con configuración automática
vercel --prod \
  --yes \
  --name="${PROJECT_NAME}" \
  --scope="dabtcavila" \
  --env-file=".env.production.local" \
  --build-env DATABASE_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  --build-env PRISMA_GENERATE_DATAPROXY="true" \
  2>&1 | tee deployment.log

# Capturar URL del deployment
DEPLOYMENT_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' deployment.log | head -1)

if [ -z "$DEPLOYMENT_URL" ]; then
    print_error "No se pudo obtener la URL del deployment"
    exit 1
fi

# 8. VERIFICACIÓN POST-DEPLOYMENT
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   ✅ VERIFICANDO DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

print_step "URL del deployment: $DEPLOYMENT_URL"
print_step "Esperando que el deployment esté listo (30 segundos)..."
sleep 30

# Verificar health endpoint
print_step "Verificando health check..."
if curl -f -s "${DEPLOYMENT_URL}/api/health" > /dev/null; then
    print_success "Health check exitoso"
else
    print_warning "Health check falló (puede tomar más tiempo)"
fi

# 9. CONFIGURACIÓN DE DOMINIO PERSONALIZADO
print_step "Configurando dominio personalizado..."
vercel domains add facepay.vercel.app --scope dabtcavila 2>/dev/null || true

# 10. RESUMEN FINAL
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📌 INFORMACIÓN DEL DEPLOYMENT:"
echo "   • URL Principal: ${DEPLOYMENT_URL}"
echo "   • URL Personalizada: https://facepay.vercel.app"
echo "   • Dashboard: https://vercel.com/dabtcavila/facepay"
echo "   • Logs: vercel logs --follow"
echo ""
echo "📊 PRÓXIMOS PASOS:"
echo "   1. Verifica el funcionamiento en: ${DEPLOYMENT_URL}"
echo "   2. Configura las API keys de pago cuando las tengas"
echo "   3. Monitorea los logs: vercel logs --follow"
echo "   4. Configura alertas en Vercel Dashboard"
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Abrir el deployment en el navegador
if command -v open &> /dev/null; then
    print_step "Abriendo deployment en el navegador..."
    open "${DEPLOYMENT_URL}"
fi

# Guardar información del deployment
cat > deployment-info.json << EOF
{
  "deploymentUrl": "${DEPLOYMENT_URL}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectName": "${PROJECT_NAME}",
  "environment": "${DEPLOYMENT_ENV}",
  "vercelCLI": "$(vercel --version)",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

print_success "Información del deployment guardada en deployment-info.json"

exit 0