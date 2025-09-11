#!/bin/bash

echo "🔧 CONFIGURANDO DOMINIO CORRECTO EN VERCEL"
echo "=========================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}Tu deployment actual está en:${NC}"
echo "https://facepay-jxnnk3vhq-facepays-projects.vercel.app/"
echo ""
echo -e "${YELLOW}Opciones para arreglarlo:${NC}"
echo ""
echo "OPCIÓN 1: Promocionar a producción (CLI)"
echo "----------------------------------------"
echo "1. Ejecuta: vercel login"
echo "2. Ejecuta: vercel --prod"
echo ""
echo "OPCIÓN 2: Configurar dominio personalizado (Web)"
echo "-------------------------------------------------"
echo "1. Ve a: https://vercel.com/dashboard"
echo "2. Selecciona tu proyecto 'facepay'"
echo "3. Ve a Settings → Domains"
echo "4. Agrega uno de estos dominios:"
echo "   - facepay-mx.vercel.app"
echo "   - facepay-app.vercel.app"
echo "   - facepayai.vercel.app"
echo ""
echo "OPCIÓN 3: Usar el dominio actual"
echo "---------------------------------"
echo "Si quieres usar el dominio actual, actualiza estas variables en Vercel:"
echo ""
echo "NEXTAUTH_URL=https://facepay-jxnnk3vhq-facepays-projects.vercel.app"
echo "WEBAUTHN_RP_ID=facepay-jxnnk3vhq-facepays-projects.vercel.app"
echo "WEBAUTHN_ORIGIN=https://facepay-jxnnk3vhq-facepays-projects.vercel.app"
echo "NEXT_PUBLIC_APP_URL=https://facepay-jxnnk3vhq-facepays-projects.vercel.app"
echo ""
echo -e "${GREEN}Recomendación: Usa la OPCIÓN 2 para tener un dominio más limpio${NC}"