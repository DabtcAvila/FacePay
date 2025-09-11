# 🏠 SERVIDOR LOCAL EN TU CASA/OFICINA - GUÍA COMPLETA

## 🎯 OPCIÓN LOCAL: TÚ ERES EL DATACENTER

### VENTAJAS ✅
- **$0/mes** - Solo pagas electricidad (~$50 MXN/mes)
- **Control TOTAL** - La máquina está en TU casa/oficina
- **Máxima privacidad** - NADIE más tiene acceso
- **Sin límites** - Todo el storage que quieras
- **Aprendizaje** - Entiendes todo el stack

### DESVENTAJAS ⚠️
- **Tu internet** - Necesitas IP fija o DDNS
- **Electricidad 24/7** - No puede apagarse
- **Sin redundancia** - Si falla, estás solo
- **Seguridad física** - TÚ proteges el servidor
- **Ancho de banda** - Limitado por tu ISP

---

## 💻 OPCIÓN 1: COMPUTADORA VIEJA/MINI PC

### Hardware Necesario (Mínimo):
```yaml
CPU: Intel i3/AMD Ryzen 3 o superior
RAM: 8GB mínimo (16GB ideal)
Storage: 256GB SSD
Red: Ethernet (no WiFi para servidor)
Costo: $0 si tienes una vieja, o ~$3,000-5,000 MXN mini PC nueva
```

### Mini PCs Recomendadas (Amazon México):
```
1. Beelink Mini S12 Pro - $4,999 MXN
   - Intel N100, 16GB RAM, 500GB SSD
   - Consumo: 15W (como un foco LED)

2. ACEPC AK1 Pro - $3,299 MXN
   - Intel Celeron, 8GB RAM, 256GB SSD
   - Consumo: 10W

3. Intel NUC (Usado) - $2,500-4,000 MXN
   - i5, 8-16GB RAM, 256GB SSD
   - Mercado Libre tiene buenos precios
```

---

## 🔧 CONFIGURACIÓN PASO A PASO

### PASO 1: INSTALAR UBUNTU SERVER
```bash
# Descargar Ubuntu Server 22.04 LTS
https://ubuntu.com/download/server

# Crear USB booteable con Rufus/Balena Etcher
# Instalar seleccionando:
- Minimal installation
- OpenSSH server
- No snaps
```

### PASO 2: IP FIJA EN TU ROUTER
```yaml
Router Admin (192.168.1.1 típicamente):
  1. DHCP Settings → Reserve IP
  2. Asignar IP fija a tu servidor (ej: 192.168.1.100)
  3. Port Forwarding:
     - Puerto 80 → 192.168.1.100:80 (HTTP)
     - Puerto 443 → 192.168.1.100:443 (HTTPS)
     - Puerto 22 → 192.168.1.100:2222 (SSH seguro)
```

### PASO 3: DDNS GRATIS (Si no tienes IP fija)
```bash
# Opción A: DuckDNS (Gratis)
https://www.duckdns.org
Tu dominio: facepay.duckdns.org

# Opción B: No-IP (Gratis)
https://www.noip.com
Tu dominio: facepay.ddns.net

# Opción C: Cloudflare Tunnel (MEJOR - Gratis)
# No necesitas abrir puertos!
```

---

## 🚀 INSTALACIÓN AUTOMÁTICA

### Script Completo para Servidor Local:
```bash
#!/bin/bash
# FACEPAY - Setup Servidor Local Casa/Oficina

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar todo lo necesario
sudo apt install -y \
    postgresql postgresql-contrib \
    nginx \
    certbot python3-certbot-nginx \
    git nodejs npm \
    ufw fail2ban \
    redis-server \
    htop netdata \
    ddclient  # Para DDNS

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# PostgreSQL
sudo -u postgres psql <<EOF
CREATE DATABASE facepay_local;
CREATE USER facepay WITH ENCRYPTED PASSWORD 'ChangeThis123!';
GRANT ALL PRIVILEGES ON DATABASE facepay_local TO facepay;
EOF

# Clonar FacePay
cd /opt
sudo git clone https://github.com/dabtcavila/facepay.git
cd facepay
sudo npm install
sudo npm run build

# Configurar PM2
pm2 start npm --name facepay -- start
pm2 startup
pm2 save

# Nginx
sudo cat > /etc/nginx/sites-available/facepay <<'NGINX'
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
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/facepay /etc/nginx/sites-enabled/
sudo systemctl restart nginx

echo "✅ Servidor local configurado!"
echo "Accede en: http://192.168.1.100"
```

---

## 🌐 ACCESO DESDE INTERNET

### OPCIÓN A: Cloudflare Tunnel (RECOMENDADO - Gratis)
```bash
# No necesitas IP fija ni abrir puertos!

# 1. Instalar cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 2. Autenticar
cloudflared tunnel login

# 3. Crear túnel
cloudflared tunnel create facepay

# 4. Configurar
cat > ~/.cloudflared/config.yml <<EOF
tunnel: facepay
credentials-file: /home/user/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: facepay.tudominio.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# 5. Iniciar
cloudflared tunnel run facepay

# Tu app está en: https://facepay.tudominio.com
# Sin exponer tu IP real!
```

### OPCIÓN B: DDNS + Let's Encrypt
```bash
# Configurar DuckDNS
echo "url=\"https://www.duckdns.org/update?domains=facepay&token=TU_TOKEN&ip=\"" | sudo tee /usr/local/bin/duck.sh
chmod +x /usr/local/bin/duck.sh
(crontab -l; echo "*/5 * * * * /usr/local/bin/duck.sh") | crontab -

# SSL con Let's Encrypt
sudo certbot --nginx -d facepay.duckdns.org
```

---

## ⚡ OPTIMIZACIÓN PARA CASA

### 1. CONSUMO ELÉCTRICO
```yaml
Mini PC (15W) × 24h × 30 días = 10.8 kWh/mes
Costo México (~$3/kWh): $32 MXN/mes

Comparación:
- Foco LED: 10W
- Laptop: 45W
- PC Gaming: 300W+
```

### 2. INTERNET REQUERIDO
```yaml
Mínimo: 10 Mbps subida (típico en fibra óptica)
Ideal: 50+ Mbps subida
Latencia: <50ms

ISPs en México con IP fija:
- Totalplay Empresarial: ~$800/mes
- Telmex Negocio: ~$600/mes
- Izzi Negocio: ~$700/mes
```

### 3. RESPALDO DE ENERGÍA (UPS)
```yaml
Recomendado: UPS 600VA
Costo: ~$1,500 MXN
Duración: 30-60 min para mini PC
Protege contra: Cortes y picos de luz
```

---

## 📊 COMPARACIÓN: LOCAL vs NUBE

| Aspecto | Servidor Local | VPS (Vultr) | Vercel |
|---------|---------------|-------------|---------|
| **Costo Mensual** | $32 MXN (luz) | $960 MXN | $0-500 MXN |
| **Costo Inicial** | $3,000-5,000 | $0 | $0 |
| **Control** | 100% TOTAL | 95% | 50% |
| **Privacidad** | 100% TOTAL | 90% | 70% |
| **Uptime** | 95%* | 99.9% | 99.99% |
| **Velocidad** | Variable | Rápido | Muy rápido |
| **Escalabilidad** | Limitada | Buena | Excelente |
| **Mantenimiento** | Tú | Ellos | Ellos |

*Depende de tu internet y electricidad

---

## 🚨 SEGURIDAD PARA SERVIDOR LOCAL

### CRÍTICO - DEBES HACER:
```bash
# 1. Firewall estricto
sudo ufw default deny incoming
sudo ufw allow from 192.168.1.0/24 to any port 22  # SSH solo red local
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. Fail2ban contra ataques
sudo apt install fail2ban
sudo systemctl enable fail2ban

# 3. Actualizaciones automáticas
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 4. Monitoreo
# Instalar Netdata para monitoreo visual
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# 5. Backup a nube
# Configurar rclone para backup a Google Drive
sudo apt install rclone
rclone config  # Configurar Google Drive
# Cron para backup diario a la nube
```

---

## 🎯 ¿ES PARA TI EL SERVIDOR LOCAL?

### ✅ SÍ, si:
- Quieres control TOTAL
- Tienes internet fibra óptica
- Te gusta aprender/experimentar
- Privacidad es CRÍTICA
- Tienes presupuesto limitado

### ❌ NO, si:
- Necesitas 99.99% uptime
- No tienes conocimientos técnicos
- Tu internet es inestable
- Necesitas escalar rápido
- Es para producción crítica

---

## 💡 MI RECOMENDACIÓN HÍBRIDA

### MEJOR DE AMBOS MUNDOS:
```yaml
Desarrollo y datos sensibles: Servidor Local
Frontend público: Vercel/Cloudflare Pages (gratis)
Backup: Google Drive/Backblaze ($5/mes)

Arquitectura:
[Usuarios] → [Cloudflare] → [Tu Casa/Oficina]
           ↓
    [CDN Global Gratis]
           ↓
    [Túnel Seguro]
           ↓
    [Tu Servidor Local]
```

### Costo Total:
- Hardware: $3,000 (una vez)
- Mensual: $32 MXN (luz) + $0 (Cloudflare gratis)
- **Total: ~$32 MXN/mes con control TOTAL**

---

## 🚀 COMANDO RÁPIDO PARA EMPEZAR

```bash
# Si ya tienes Ubuntu instalado:
curl -sSL https://raw.githubusercontent.com/tu-repo/facepay/main/scripts/setup-local.sh | bash
```