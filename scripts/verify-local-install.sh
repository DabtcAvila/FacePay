#!/bin/bash

# Script de verificación post-instalación

echo "🔍 VERIFICANDO INSTALACIÓN LOCAL DE FACEPAY..."
echo "============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar PostgreSQL
echo -n "PostgreSQL: "
if pgrep -x "postgres" > /dev/null; then
    echo -e "${GREEN}✓ Corriendo${NC}"
    psql -U postgres -c "SELECT version();" 2>/dev/null | head -1
else
    echo -e "${RED}✗ No está corriendo${NC}"
fi

# Verificar base de datos
echo -n "Base de datos facepay_local: "
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw facepay_local; then
    echo -e "${GREEN}✓ Existe${NC}"
else
    echo -e "${RED}✗ No existe${NC}"
fi

# Verificar Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ $(node --version)${NC}"
else
    echo -e "${RED}✗ No instalado${NC}"
fi

# Verificar PM2
echo -n "PM2: "
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ Instalado${NC}"
    pm2 status
else
    echo -e "${RED}✗ No instalado${NC}"
fi

# Verificar Nginx
echo -n "Nginx: "
if pgrep -x "nginx" > /dev/null; then
    echo -e "${GREEN}✓ Corriendo${NC}"
else
    echo -e "${YELLOW}⚠ No está corriendo (opcional)${NC}"
fi

# Verificar FacePay
echo -n "FacePay en puerto 3000: "
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Respondiendo${NC}"
else
    echo -e "${RED}✗ No responde${NC}"
fi

echo ""
echo "============================================="
echo ""

# Resumen
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}🎉 ¡FACEPAY ESTÁ FUNCIONANDO LOCALMENTE!${NC}"
    echo ""
    echo "Accede en:"
    echo "  • http://localhost:3000"
    echo "  • http://127.0.0.1:3000"
    
    # Detectar IP local
    if [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
    else
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    fi
    echo "  • http://$LOCAL_IP:3000 (desde otros dispositivos en tu red)"
else
    echo -e "${YELLOW}⚠ FacePay no está respondiendo aún${NC}"
    echo ""
    echo "Intenta:"
    echo "  1. pm2 start all"
    echo "  2. pm2 logs (para ver errores)"
    echo "  3. cd ~/facepay-local && npm run dev"
fi