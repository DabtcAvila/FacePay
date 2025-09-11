#!/bin/bash

echo "🚀 Deployment final de FacePay a Vercel"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}  FACEPAY - VERCEL DEPLOYMENT     ${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"

echo -e "${YELLOW}📋 Estado actual:${NC}"
echo -e "${GREEN}✅ Build local exitoso${NC}"
echo -e "${GREEN}✅ Variables de entorno configuradas (hardcodeadas temporalmente)${NC}"
echo -e "${GREEN}✅ Archivos .env.local y .env.production creados${NC}"
echo -e "${GREEN}✅ next.config.js con variables embebidas${NC}"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: CONFIGURACIÓN TEMPORAL${NC}"
echo -e "${RED}   Las variables están hardcodeadas en el código${NC}"
echo -e "${RED}   Solo para deployment temporal hasta configurar Vercel${NC}"

echo ""
echo -e "${YELLOW}📋 Opciones de deployment:${NC}"
echo ""
echo -e "${BLUE}1. Deployment directo (sin autenticación):${NC}"
echo "   Solo hacer push al repositorio"
echo "   Si está conectado a GitHub/GitLab, se desplegará automáticamente"
echo ""
echo -e "${BLUE}2. Con token de Vercel:${NC}"
echo "   ./vercel-deploy-final.sh TOKEN_AQUI"
echo ""
echo -e "${BLUE}3. Autenticación manual:${NC}"
echo "   vercel login"
echo "   vercel --prod"

# Si se proporciona token, intentar deployment
if [ ! -z "$1" ]; then
    VERCEL_TOKEN="$1"
    echo ""
    echo -e "${YELLOW}🔑 Usando token proporcionado...${NC}"
    
    # Intentar deployment con token
    echo -e "${YELLOW}📤 Iniciando deployment...${NC}"
    
    VERCEL_TOKEN="$VERCEL_TOKEN" vercel --prod --yes --force 2>&1 | tee deployment.log
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}🎉 ¡Deployment exitoso!${NC}"
    else
        echo -e "${RED}❌ Error en deployment${NC}"
        echo "Ver deployment.log para detalles"
    fi
else
    echo ""
    echo -e "${YELLOW}📋 Instrucciones manuales:${NC}"
    echo ""
    echo "1. Asegúrate de que tu repositorio esté en GitHub/GitLab"
    echo "2. Conecta el repositorio a Vercel:"
    echo "   - Ve a https://vercel.com/new"
    echo "   - Importa tu repositorio"
    echo "   - Las variables ya están configuradas en el código"
    echo ""
    echo "3. O usa la CLI:"
    echo "   vercel login"
    echo "   vercel --prod"
fi

echo ""
echo -e "${YELLOW}🔧 Archivos de configuración creados:${NC}"
echo -e "${GREEN}✅ .env.local - Variables para desarrollo${NC}"
echo -e "${GREEN}✅ .env.production - Variables para producción${NC}"
echo -e "${GREEN}✅ next.config.js - Con variables embebidas${NC}"
echo -e "${GREEN}✅ src/lib/env-config-temp.ts - Configuración temporal${NC}"

echo ""
echo -e "${YELLOW}🧹 Para limpiar archivos temporales después del deployment:${NC}"
echo "   ./cleanup-temp-env.sh"

echo ""
echo -e "${YELLOW}📊 URLs esperadas:${NC}"
echo "   https://facepay-mx.vercel.app"
echo "   https://facepay.vercel.app"

echo ""
echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${GREEN}  ¡LISTO PARA DEPLOYMENT!         ${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"