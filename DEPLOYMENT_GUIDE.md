# 🚀 Guía Completa de Deployment - FacePay

## ✅ Checklist Pre-Deployment

### 1. Variables de Entorno Críticas
```env
# Database (OBLIGATORIO)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # Para Prisma migrations

# Authentication (OBLIGATORIO)
NEXTAUTH_URL="https://tu-dominio.vercel.app"
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
JWT_SECRET="genera-con: openssl rand -base64 32"

# Supabase (OBLIGATORIO si usas auth)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Payments (OPCIONAL - agregar cuando tengas las keys)
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=""
MERCADOPAGO_ACCESS_TOKEN=""
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=""

# WebAuthn (OBLIGATORIO para biométricos)
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="tu-dominio.vercel.app"
WEBAUTHN_ORIGIN="https://tu-dominio.vercel.app"
```

### 2. Configuración de Base de Datos
```bash
# Antes del primer deploy
npx prisma generate
npx prisma db push --accept-data-loss

# O si prefieres migrations
npx prisma migrate deploy
```

### 3. Verificación Local
```bash
# Test build
npm run build

# Test con variables de producción
NODE_ENV=production npm run build
npm run start

# Verificar en http://localhost:3000
```

## 🎯 Deployment con Vercel (RECOMENDADO)

### Opción 1: Via Web (Más Simple)
1. **Login en Vercel**
   ```
   https://vercel.com/login
   ```

2. **Importar Proyecto**
   - Add New Project → Import Git Repository
   - Selecciona tu repo de GitHub

3. **Configurar Variables**
   - Settings → Environment Variables
   - Pega todas las variables del `.env.example`
   - IMPORTANTE: Cambia NEXTAUTH_URL al dominio de Vercel

4. **Deploy**
   - Click Deploy
   - Espera 2-3 minutos

### Opción 2: Via CLI (Más Control)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# El CLI te preguntará:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? facepay
# - Directory? ./
# - Override settings? N
```

## 🚨 Problemas Comunes y Soluciones

### Error: "Module not found"
```bash
# Limpiar cache
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Error: "Prisma Client not generated"
```bash
# Agregar a package.json
"postinstall": "prisma generate"

# O en Vercel Build Command:
prisma generate && next build
```

### Error: "Database connection failed"
```bash
# Verificar formato de DATABASE_URL
# Debe ser: postgresql://user:pass@host:5432/dbname?schema=public

# Para Supabase, usar connection pooling:
# aws-0-us-west-1.pooler.supabase.com:5432
```

### Error: "WebAuthn not working"
```javascript
// Asegurarse que WEBAUTHN_RP_ID coincida con el dominio
// Sin https:// ni trailing slash
WEBAUTHN_RP_ID="facepay.vercel.app"
WEBAUTHN_ORIGIN="https://facepay.vercel.app"
```

## 🔄 Deployment con Railway

```bash
# Instalar CLI
npm i -g @railway/cli

# Login y setup
railway login
railway init

# Agregar PostgreSQL
railway add

# Deploy
railway up

# Variables se configuran automáticamente
# DATABASE_URL se genera sola
```

## 🌐 Deployment con Render

1. **Crear cuenta en render.com**

2. **Nuevo Web Service**
   - Connect GitHub
   - Select repo
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

3. **Agregar PostgreSQL**
   - New → PostgreSQL
   - Copy Internal Database URL

4. **Variables de Entorno**
   - Agregar todas del .env.example
   - DATABASE_URL usar la Internal URL de Render

## 📊 Monitoreo Post-Deployment

### Verificar Salud de la App
```bash
curl https://tu-app.vercel.app/api/health
```

### Logs en Vercel
```bash
vercel logs --follow
```

### Verificar Build
```bash
# En Vercel Dashboard
# View Function Logs
# Check Build Logs
```

## 🔐 Seguridad Post-Deployment

1. **Rotar Secrets**
```bash
# Generar nuevos secrets
openssl rand -base64 32

# Actualizar en Vercel Settings
```

2. **Configurar Dominios**
```bash
# En Vercel Settings → Domains
# Agregar dominio personalizado
# SSL automático
```

3. **Habilitar Protecciones**
```javascript
// Ya configurado en vercel.json
- DDoS Protection ✅
- Rate Limiting ✅  
- Security Headers ✅
```

## 🎉 Verificación Final

```bash
# 1. Test autenticación
curl -X POST https://tu-app.vercel.app/api/auth/register

# 2. Test health check
curl https://tu-app.vercel.app/api/health

# 3. Test WebAuthn
# Abrir en navegador y probar registro biométrico

# 4. Test base de datos
npx prisma studio
```

## 💡 Tips Pro

1. **Usar Preview Deployments**
   - Cada PR genera un preview
   - Test antes de merge a main

2. **Configurar CI/CD**
   ```yaml
   # .github/workflows/deploy.yml
   - Test automáticos
   - Build verification
   - Deploy on merge
   ```

3. **Monitoreo con Sentry**
   ```env
   NEXT_PUBLIC_SENTRY_DSN="tu-dsn"
   ```

4. **Analytics**
   ```env
   NEXT_PUBLIC_GA_ID="G-XXXXX"
   ```

## 📞 Soporte

- **Vercel Status**: https://vercel-status.com
- **Railway Status**: https://railway.app/status
- **Render Status**: https://render-status.onrender.com

---

**Estado Actual**: ✅ Build funcionando localmente
**Próximo Paso**: Deploy a Vercel con las variables de entorno correctas