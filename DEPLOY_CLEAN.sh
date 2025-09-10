#!/bin/bash

echo "🧹 LIMPIEZA Y DEPLOYMENT CORRECTO DE FACEPAY"
echo "============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}PASO 1: Login a Vercel${NC}"
echo "Vamos a loguearte con tu cuenta GitHub Dabtcavila"
vercel login

echo -e "\n${YELLOW}PASO 2: Intentar eliminar proyecto existente${NC}"
echo "Intentando eliminar 'facepay' si existe..."
vercel remove facepay --yes 2>/dev/null || echo "No se pudo eliminar (tal vez no es tuyo)"

echo -e "\n${YELLOW}PASO 3: Limpiar configuración local${NC}"
rm -rf .vercel

echo -e "\n${YELLOW}PASO 4: Crear nuevo deployment limpio${NC}"
echo "Opciones de nombre para tu proyecto:"
echo "1) facepay-mx"
echo "2) facepayai"
echo "3) facepay-app"
echo "4) facepay-oficial"
read -p "Elige número (1-4) o escribe tu propio nombre: " choice

case $choice in
    1) PROJECT_NAME="facepay-mx";;
    2) PROJECT_NAME="facepayai";;
    3) PROJECT_NAME="facepay-app";;
    4) PROJECT_NAME="facepay-oficial";;
    *) PROJECT_NAME=$choice;;
esac

echo -e "\n${GREEN}Deployando como: $PROJECT_NAME${NC}"

echo -e "\n${YELLOW}PASO 5: Configurar proyecto${NC}"
vercel link --yes --project $PROJECT_NAME

echo -e "\n${YELLOW}PASO 6: Configurar variables de entorno${NC}"
echo "Necesitas tus credenciales de Supabase:"
read -p "¿Tienes tus credenciales de Supabase listas? (s/n): " has_creds

if [ "$has_creds" = "s" ]; then
    read -p "Ingresa tu Supabase Project ID: " SUPABASE_ID
    read -p "Ingresa tu Supabase Password: " SUPABASE_PASS
    read -p "Ingresa tu Supabase Anon Key: " SUPABASE_KEY
    
    # Crear archivo .env.production.local
    cat > .env.production.local << EOF
DATABASE_URL=postgresql://postgres:${SUPABASE_PASS}@db.${SUPABASE_ID}.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://${SUPABASE_ID}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
NEXTAUTH_URL=https://${PROJECT_NAME}.vercel.app
NEXTAUTH_SECRET=k9Xf3mNp7Qr2sVw5yBc8dGh1jLn4oTa6
JWT_SECRET=aZ3xC5vB7nM9qW2eR4tY6uI8oP1sD3fG
JWT_REFRESH_SECRET=hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH
WEBAUTHN_RP_NAME=FacePay
WEBAUTHN_RP_ID=${PROJECT_NAME}.vercel.app
WEBAUTHN_ORIGIN=https://${PROJECT_NAME}.vercel.app
INITIAL_CREDIT_BONUS=100
REFERRAL_BONUS=50
CETES_ANNUAL_RATE=0.105
INVESTMENT_ENABLED=true
ENABLE_REFERRAL_SYSTEM=true
VIRAL_SHARING_BONUS=10
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://${PROJECT_NAME}.vercel.app
EOF
    
    echo -e "${GREEN}Variables de entorno configuradas${NC}"
    
    # Subir variables a Vercel
    vercel env add DATABASE_URL production < <(echo "postgresql://postgres:${SUPABASE_PASS}@db.${SUPABASE_ID}.supabase.co:5432/postgres")
    vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(echo "https://${SUPABASE_ID}.supabase.co")
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(echo "${SUPABASE_KEY}")
    vercel env add NEXTAUTH_URL production < <(echo "https://${PROJECT_NAME}.vercel.app")
    vercel env add NEXTAUTH_SECRET production < <(echo "k9Xf3mNp7Qr2sVw5yBc8dGh1jLn4oTa6")
    vercel env add JWT_SECRET production < <(echo "aZ3xC5vB7nM9qW2eR4tY6uI8oP1sD3fG")
    vercel env add JWT_REFRESH_SECRET production < <(echo "hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH")
    vercel env add WEBAUTHN_RP_NAME production < <(echo "FacePay")
    vercel env add WEBAUTHN_RP_ID production < <(echo "${PROJECT_NAME}.vercel.app")
    vercel env add WEBAUTHN_ORIGIN production < <(echo "https://${PROJECT_NAME}.vercel.app")
    vercel env add INITIAL_CREDIT_BONUS production < <(echo "100")
    vercel env add REFERRAL_BONUS production < <(echo "50")
    vercel env add CETES_ANNUAL_RATE production < <(echo "0.105")
    vercel env add INVESTMENT_ENABLED production < <(echo "true")
    vercel env add ENABLE_REFERRAL_SYSTEM production < <(echo "true")
    vercel env add VIRAL_SHARING_BONUS production < <(echo "10")
    vercel env add NODE_ENV production < <(echo "production")
    vercel env add NEXT_PUBLIC_APP_URL production < <(echo "https://${PROJECT_NAME}.vercel.app")
fi

echo -e "\n${YELLOW}PASO 7: Deploy a producción${NC}"
vercel --prod

echo -e "\n${GREEN}✅ DEPLOYMENT COMPLETADO${NC}"
echo "Tu app estará disponible en: https://${PROJECT_NAME}.vercel.app"
echo ""
echo "Próximos pasos:"
echo "1. Verifica que funcione en el navegador"
echo "2. Prueba el demo de Face ID"
echo "3. Si no configuraste las variables, ve a:"
echo "   https://vercel.com/dabtcavila/${PROJECT_NAME}/settings/environment-variables"