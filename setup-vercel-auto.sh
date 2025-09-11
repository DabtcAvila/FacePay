#!/bin/bash

echo "🚀 Configurando Vercel de forma automática..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Paso 1: Verificando instalación de Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI no encontrado. Instalando...${NC}"
    npm i -g vercel@latest
else
    echo -e "${GREEN}✅ Vercel CLI encontrado$(NC)"
fi

echo -e "${YELLOW}📋 Paso 2: Verificando autenticación...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No autenticado con Vercel${NC}"
    echo -e "${YELLOW}Por favor, ejecuta manualmente: vercel login${NC}"
    echo -e "${YELLOW}Luego ejecuta este script nuevamente${NC}"
    
    # Intentar autenticación automática con token si existe
    if [ -n "$VERCEL_TOKEN" ]; then
        echo -e "${YELLOW}🔑 Intentando usar token de entorno...${NC}"
        vercel whoami --token $VERCEL_TOKEN
    fi
else
    echo -e "${GREEN}✅ Autenticado como: $(vercel whoami)${NC}"
fi

echo -e "${YELLOW}📋 Paso 3: Configurando proyecto...${NC}"

# Crear configuración temporal para deployment no interactivo
cat > .vercelrc << EOF
{
  "projectSettings": {
    "framework": "nextjs"
  }
}
EOF

echo -e "${YELLOW}📋 Paso 4: Intentando deployment automático...${NC}"

# Intentar deployment con configuración automática
vercel --prod --yes --force 2>&1 | tee vercel_deploy.log

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment exitoso!${NC}"
else
    echo -e "${RED}❌ Error en deployment. Ver vercel_deploy.log para detalles${NC}"
    
    # Estrategia alternativa: usar vercel dev para testing local
    echo -e "${YELLOW}🔄 Intentando configuración local...${NC}"
    vercel dev --listen 3000 &
    DEV_PID=$!
    
    sleep 5
    
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Servidor local funcionando en http://localhost:3000${NC}"
        kill $DEV_PID
    else
        echo -e "${RED}❌ Error en servidor local${NC}"
        kill $DEV_PID 2> /dev/null
    fi
fi

echo -e "${YELLOW}📋 Paso 5: Configurando variables de entorno...${NC}"

# Leer variables desde archivo
if [ -f "VERCEL_ENV_EXACT.txt" ]; then
    echo -e "${YELLOW}📋 Configurando variables desde VERCEL_ENV_EXACT.txt...${NC}"
    
    # Convertir archivo a formato de variables de entorno
    while IFS= read -r line; do
        if [[ $line == *"="* ]] && [[ $line != "#"* ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            var_value=$(echo "$line" | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
            
            echo -e "${YELLOW}⚙️  Configurando $var_name...${NC}"
            
            # Intentar configurar variable
            echo "$var_value" | vercel env add "$var_name" production --force 2>/dev/null || {
                echo -e "${RED}❌ Error configurando $var_name${NC}"
            }
        fi
    done < "VERCEL_ENV_EXACT.txt"
    
    echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"
else
    echo -e "${RED}❌ Archivo VERCEL_ENV_EXACT.txt no encontrado${NC}"
fi

echo -e "${YELLOW}📋 Paso 6: Verificación final...${NC}"

# Verificar configuración
vercel ls 2>/dev/null && echo -e "${GREEN}✅ Proyectos listados correctamente${NC}"

echo -e "${GREEN}🎉 Configuración de Vercel completada!${NC}"
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "   1. Ejecutar: vercel --prod"
echo -e "   2. O hacer push al repositorio para auto-deploy"
echo -e "   3. Verificar variables en: https://vercel.com/dashboard"

# Limpiar archivos temporales
rm -f .vercelrc