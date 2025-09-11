#!/bin/bash

# 🏠 CONFIGURACIÓN DE SERVIDOR EN CASA - CERO INTERMEDIARIOS
# FacePay corriendo 100% desde tu Mac/PC

echo "🏠 CONFIGURANDO FACEPAY COMO SERVIDOR EN CASA"
echo "=============================================="
echo ""

# 1. VERIFICAR IP ACTUAL
echo "📍 Tu IP pública actual es:"
curl -s ifconfig.me
echo ""
echo ""

# 2. CONFIGURAR FIREWALL DE macOS
echo "🔥 Configurando firewall..."
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# 3. CONFIGURAR NGINX PARA PUERTO 80
echo "🌐 Configurando Nginx para puerto 80..."
cat > /tmp/facepay-home.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo cp /tmp/facepay-home.conf /opt/homebrew/etc/nginx/servers/
sudo nginx -s reload

# 4. CONFIGURAR PM2 PARA INICIO AUTOMÁTICO
echo "🚀 Configurando inicio automático..."
pm2 startup
pm2 save

# 5. CONFIGURAR DDNS (DNS Dinámico)
echo "🌍 Configurando DNS dinámico..."
cat > ~/facepay-ddns-update.sh << 'EOF'
#!/bin/bash
# Actualiza tu IP en el DNS automáticamente

# Opción A: DuckDNS (GRATIS)
# Registra en https://www.duckdns.org
# DUCKDNS_TOKEN="tu-token-aqui"
# curl "https://www.duckdns.org/update?domains=facepay&token=$DUCKDNS_TOKEN&ip="

# Opción B: No-IP (GRATIS)
# Registra en https://www.noip.com
# noip2 -C

# Opción C: Cloudflare (si tienes dominio)
# Usa su API para actualizar

echo "IP actualizada: $(curl -s ifconfig.me)"
EOF

chmod +x ~/facepay-ddns-update.sh

# 6. AGREGAR A CRONTAB
echo "⏰ Programando actualización de IP cada 5 minutos..."
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/facepay-ddns-update.sh") | crontab -

# 7. OPTIMIZACIÓN DE RED
echo "⚡ Optimizando configuración de red..."
sudo sysctl -w net.inet.tcp.win_scale_factor=8
sudo sysctl -w net.inet.tcp.autorcvbufmax=33554432
sudo sysctl -w net.inet.tcp.autosndbufmax=33554432

# 8. SEGURIDAD BÁSICA
echo "🔒 Configurando seguridad..."
cat > ~/facepay-security.sh << 'EOF'
#!/bin/bash
# Bloquear IPs sospechosas automáticamente

# Revisar logs cada hora
tail -n 1000 /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | \
  while read count ip; do
    if [ "$count" -gt 100 ]; then
      echo "Bloqueando $ip por $count requests"
      sudo pfctl -t bruteforce -T add $ip
    fi
  done
EOF

chmod +x ~/facepay-security.sh

echo ""
echo "✅ CONFIGURACIÓN COMPLETADA!"
echo "=============================="
echo ""
echo "📋 SIGUIENTES PASOS MANUALES:"
echo ""
echo "1. CONFIGURAR TU ROUTER:"
echo "   - Entra a 192.168.1.1 (o la IP de tu router)"
echo "   - Busca: Port Forwarding / NAT / Virtual Server"
echo "   - Agrega:"
echo "     * Puerto externo: 80 → Puerto interno: 80 → IP: $(ipconfig getifaddr en0)"
echo "     * Puerto externo: 443 → Puerto interno: 443 → IP: $(ipconfig getifaddr en0)"
echo ""
echo "2. OBTENER DOMINIO GRATIS:"
echo "   - DuckDNS: https://www.duckdns.org (facepay.duckdns.org)"
echo "   - No-IP: https://www.noip.com (facepay.ddns.net)"
echo "   - FreeDNS: https://freedns.afraid.org"
echo ""
echo "3. OPCIONAL - IP FIJA:"
echo "   - Llama a tu ISP"
echo "   - Pide IP estática (≈$200-400 MXN/mes)"
echo ""
echo "🌐 TU SERVIDOR ESTARÁ EN:"
echo "   http://tu-dominio.duckdns.org"
echo "   o"
echo "   http://$(curl -s ifconfig.me) (mientras no cambie)"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Tu Mac debe estar siempre encendida"
echo "   - Configura Energy Saver para no dormir"
echo "   - Considera un UPS para cortes de luz"