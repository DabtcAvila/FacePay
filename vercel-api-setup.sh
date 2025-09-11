#!/bin/bash

echo "🚀 Configurando Vercel usando API directa..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar si hay token de Vercel como argumento
VERCEL_TOKEN="$1"

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}ℹ️  Para usar este script, necesitas un token de Vercel:${NC}"
    echo -e "${YELLOW}   1. Ve a https://vercel.com/account/tokens${NC}"
    echo -e "${YELLOW}   2. Crea un nuevo token${NC}"
    echo -e "${YELLOW}   3. Ejecuta: $0 <tu-token>${NC}"
    echo ""
    echo -e "${YELLOW}🔄 Intentando métodos alternativos...${NC}"
    
    # Método 1: Verificar si existe un proyecto en Vercel con el nombre
    echo -e "${YELLOW}📋 Método 1: Verificando proyectos existentes...${NC}"
    
    # Buscar en archivos de configuración
    if [ -f ".vercel/project.json" ]; then
        echo -e "${GREEN}✅ Proyecto Vercel encontrado localmente${NC}"
        cat .vercel/project.json
    else
        echo -e "${YELLOW}⚠️  No hay configuración local de Vercel${NC}"
    fi
    
    # Método 2: Configurar desde archivo .env
    echo -e "${YELLOW}📋 Método 2: Creando archivos de configuración...${NC}"
    
    # Crear archivo .env.production para build
    cat > .env.production << 'EOF'
DATABASE_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://kqxmjwefdlzburlhdosc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5Mzg3MjQwMCwiZXhwIjoyMDA5NDQ4NDAwfQ.J7ZwHyPzNf4K5TqLR8X3HMQm4Nv2Dg6YcWpFiJhK9Rs"
NEXTAUTH_URL="https://facepay-mx.vercel.app"
NEXTAUTH_SECRET="+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI="
JWT_SECRET="Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw=="
JWT_REFRESH_SECRET="hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH"
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="facepay-mx.vercel.app"
WEBAUTHN_ORIGIN="https://facepay-mx.vercel.app"
INITIAL_CREDIT_BONUS="100"
REFERRAL_BONUS="50"
CETES_ANNUAL_RATE="0.105"
INVESTMENT_ENABLED="true"
ENABLE_REFERRAL_SYSTEM="true"
VIRAL_SHARING_BONUS="10"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://facepay-mx.vercel.app"
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
NEXT_PUBLIC_ENABLE_MONITORING="false"
EOF
    
    echo -e "${GREEN}✅ Archivo .env.production creado${NC}"
    
    # Método 3: Configurar next.config.js con variables
    echo -e "${YELLOW}📋 Método 3: Configurando next.config.js...${NC}"
    
    # Hacer backup del next.config.js actual
    if [ -f "next.config.js" ]; then
        cp next.config.js next.config.js.backup
    fi
    
    # Crear next.config.js con variables embebidas
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@simplewebauthn/server']
  },
  env: {
    DATABASE_URL: "postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres",
    NEXT_PUBLIC_SUPABASE_URL: "https://kqxmjwefdlzburlhdosc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s",
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5Mzg3MjQwMCwiZXhwIjoyMDA5NDQ4NDAwfQ.J7ZwHyPzNf4K5TqLR8X3HMQm4Nv2Dg6YcWpFiJhK9Rs",
    NEXTAUTH_URL: "https://facepay-mx.vercel.app",
    NEXTAUTH_SECRET: "+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI=",
    JWT_SECRET: "Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw==",
    JWT_REFRESH_SECRET: "hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH",
    WEBAUTHN_RP_NAME: "FacePay",
    WEBAUTHN_RP_ID: "facepay-mx.vercel.app",
    WEBAUTHN_ORIGIN: "https://facepay-mx.vercel.app",
    INITIAL_CREDIT_BONUS: "100",
    REFERRAL_BONUS: "50",
    CETES_ANNUAL_RATE: "0.105",
    INVESTMENT_ENABLED: "true",
    ENABLE_REFERRAL_SYSTEM: "true",
    VIRAL_SHARING_BONUS: "10",
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://facepay-mx.vercel.app",
    NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
    NEXT_PUBLIC_ENABLE_MONITORING: "false"
  }
}

module.exports = nextConfig
EOF
    
    echo -e "${GREEN}✅ next.config.js actualizado con variables embebidas${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: next.config.js contiene credenciales hardcodeadas${NC}"
    
    # Método 4: Test de build local
    echo -e "${YELLOW}📋 Método 4: Probando build local...${NC}"
    
    if npm run build; then
        echo -e "${GREEN}✅ Build local exitoso${NC}"
        echo -e "${GREEN}🚀 El proyecto está listo para deployment${NC}"
    else
        echo -e "${RED}❌ Error en build local${NC}"
    fi
    
    exit 0
fi

# Si se proporciona token, usar API de Vercel
echo -e "${YELLOW}🔑 Usando token de Vercel para configuración automática...${NC}"

# Variables a configurar
declare -A env_vars=(
    ["DATABASE_URL"]="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    ["NEXT_PUBLIC_SUPABASE_URL"]="https://kqxmjwefdlzburlhdosc.supabase.co"
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s"
    ["NEXTAUTH_SECRET"]="+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI="
    ["JWT_SECRET"]="Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw=="
)

PROJECT_ID="facepay-mx"  # Ajustar según el proyecto

echo -e "${YELLOW}📋 Configurando variables para proyecto: $PROJECT_ID${NC}"

for var_name in "${!env_vars[@]}"; do
    var_value="${env_vars[$var_name]}"
    
    echo -e "${YELLOW}⚙️  Configurando $var_name...${NC}"
    
    # Usar API de Vercel para configurar variable
    response=$(curl -X POST \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$var_name\",\"value\":\"$var_value\",\"type\":\"encrypted\",\"target\":[\"production\"]}" \
        "https://api.vercel.com/v8/projects/$PROJECT_ID/env" 2>/dev/null)
    
    if echo "$response" | grep -q "error"; then
        echo -e "${RED}❌ Error configurando $var_name${NC}"
    else
        echo -e "${GREEN}✅ $var_name configurada${NC}"
    fi
done

echo -e "${GREEN}🎉 Configuración completada!${NC}"