# 🚀 Guía de Deployment Definitiva para FacePay

## Opción 1: Deployment Web (MÁS FÁCIL - 5 minutos)

### Paso 1: Importar desde GitHub
1. Ve a: **https://vercel.com/new**
2. Click en **"Import Git Repository"**
3. Conecta tu GitHub (Dabtcavila)
4. Busca y selecciona **"FacePay"**
5. Click en **"Import"**

### Paso 2: Configuración Automática
Vercel detectará automáticamente:
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

### Paso 3: Variables de Entorno (ANTES de deployar)
Click en "Environment Variables" y agrega:

```env
# SUPABASE (reemplaza con tus valores)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU-ANON-KEY]

# SEGURIDAD (copia tal cual)
NEXTAUTH_URL=https://[TU-PROYECTO].vercel.app
NEXTAUTH_SECRET=k9Xf3mNp7Qr2sVw5yBc8dGh1jLn4oTa6
JWT_SECRET=aZ3xC5vB7nM9qW2eR4tY6uI8oP1sD3fG
JWT_REFRESH_SECRET=hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH

# WEBAUTHN (ajusta el dominio)
WEBAUTHN_RP_NAME=FacePay
WEBAUTHN_RP_ID=[TU-PROYECTO].vercel.app
WEBAUTHN_ORIGIN=https://[TU-PROYECTO].vercel.app

# SISTEMA (copia tal cual)
INITIAL_CREDIT_BONUS=100
REFERRAL_BONUS=50
CETES_ANNUAL_RATE=0.105
INVESTMENT_ENABLED=true
ENABLE_REFERRAL_SYSTEM=true
VIRAL_SHARING_BONUS=10
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://[TU-PROYECTO].vercel.app
```

### Paso 4: Deploy
Click en **"Deploy"** y espera 2-3 minutos.

---

## Opción 2: GitHub Actions (Automático en cada push)

### Configurar Secrets en GitHub:
1. Ve a tu repo: https://github.com/DabtcAvila/FacePay
2. Settings → Secrets and variables → Actions
3. Agrega estos secrets:

#### Para obtener estos valores:
1. **VERCEL_TOKEN**: 
   - Ve a https://vercel.com/account/tokens
   - Create Token → Name: "FacePay Deploy"
   
2. **VERCEL_ORG_ID** y **VERCEL_PROJECT_ID**:
   - Después de crear el proyecto en Vercel
   - Ve a Project Settings → General
   - Copia los IDs

### Activar el workflow:
```bash
cd "/Users/davicho/MASTER proyectos/FacePay"
git add .github/workflows/deploy.yml
git commit -m "Add automatic deployment workflow"
git push origin agent/backend_api
```

---

## Opción 3: CLI Local (requiere login)

```bash
# 1. Login
vercel login

# 2. Link proyecto
cd "/Users/davicho/MASTER proyectos/FacePay"
vercel link

# 3. Deploy
vercel --prod
```

---

## 🎯 URLs Posibles para tu Proyecto:

Dependiendo del nombre que elijas:
- https://facepay-mx.vercel.app
- https://facepayai.vercel.app
- https://facepay-app.vercel.app
- https://facepay-dabtcavila.vercel.app

---

## ✅ Verificación Post-Deploy:

```bash
# Ejecuta este script para verificar
cd "/Users/davicho/MASTER proyectos/FacePay"
./verificar-deployment.sh
```

---

## 🆘 Troubleshooting:

### Si el build falla:
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs en Vercel Dashboard

### Si la página no carga:
- Verifica que DATABASE_URL sea accesible
- Confirma que las variables de Supabase sean correctas

### Si WebAuthn no funciona:
- Asegúrate que WEBAUTHN_RP_ID coincida con tu dominio
- Verifica HTTPS está activo (automático en Vercel)

---

## 📱 Test Final:

1. **Desktop**: Abre en Chrome/Safari/Firefox
2. **Mobile**: Prueba Face ID en iPhone / Fingerprint en Android
3. **Demo**: Click en "Probar Demo" en la homepage
4. **API**: Verifica https://[tu-dominio].vercel.app/api/health

---

## 🎉 ¡Listo!

Tu proyecto FacePay estará live y funcionando con:
- ✅ Autenticación biométrica (Face ID/Touch ID)
- ✅ Sistema de créditos 0% comisión
- ✅ WebAuthn seguro
- ✅ Base de datos Supabase
- ✅ Deploy automático en cada push