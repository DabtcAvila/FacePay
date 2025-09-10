#!/bin/bash

echo "🚀 DEPLOYMENT AUTOMÁTICO DE FACEPAY"
echo "===================================="

cd "/Users/davicho/MASTER proyectos/FacePay"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${YELLOW}Paso 1: Verificando Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo "Instalando Vercel CLI..."
    npm install -g vercel
fi

echo -e "\n${YELLOW}Paso 2: Creando archivo de configuración...${NC}"
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "env": {
    "DATABASE_URL": "postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres",
    "NEXT_PUBLIC_SUPABASE_URL": "https://kqxmjwefdlzburlhdosc.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5Mzg3MjQwMCwiZXhwIjoyMDA5NDQ4NDAwfQ.J7ZwHyPzNf4K5TqLR8X3HMQm4Nv2Dg6YcWpFiJhK9Rs",
    "NEXTAUTH_URL": "https://facepay-mx.vercel.app",
    "NEXTAUTH_SECRET": "+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI=",
    "JWT_SECRET": "Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw==",
    "JWT_REFRESH_SECRET": "hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH",
    "WEBAUTHN_RP_NAME": "FacePay",
    "WEBAUTHN_RP_ID": "facepay-mx.vercel.app",
    "WEBAUTHN_ORIGIN": "https://facepay-mx.vercel.app",
    "INITIAL_CREDIT_BONUS": "100",
    "REFERRAL_BONUS": "50",
    "CETES_ANNUAL_RATE": "0.105",
    "INVESTMENT_ENABLED": "true",
    "ENABLE_REFERRAL_SYSTEM": "true",
    "VIRAL_SHARING_BONUS": "10",
    "NODE_ENV": "production",
    "NEXT_PUBLIC_APP_URL": "https://facepay-mx.vercel.app",
    "NEXT_PUBLIC_ENABLE_ANALYTICS": "false",
    "NEXT_PUBLIC_ENABLE_MONITORING": "false"
  }
}
EOF

echo -e "${GREEN}✅ Configuración creada${NC}"

echo -e "\n${YELLOW}Paso 3: Intentando deployment...${NC}"
echo -e "${RED}IMPORTANTE: Si no estás logueado, ejecuta primero:${NC}"
echo -e "${GREEN}vercel login${NC}"
echo ""

# Intentar deployment
vercel --yes --name facepay-mx --prod 2>&1 | tee deployment.log

# Verificar si funcionó
if grep -q "Ready" deployment.log; then
    echo -e "\n${GREEN}✅ DEPLOYMENT EXITOSO!${NC}"
    echo -e "Tu app está en: ${GREEN}https://facepay-mx.vercel.app${NC}"
else
    echo -e "\n${YELLOW}Si el deployment falló, ejecuta estos comandos:${NC}"
    echo "1. vercel login"
    echo "2. vercel --yes --name facepay-mx"
    echo "3. vercel --prod"
fi

echo -e "\n${GREEN}Script completado.${NC}"