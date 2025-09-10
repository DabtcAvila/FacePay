# 🚀 Setup Vercel para cuenta Dabtcavila

## Opción 1: Desde Terminal (Recomendado)

```bash
# 1. Login con GitHub
cd "/Users/davicho/MASTER proyectos/FacePay"
vercel login
# Selecciona: Continue with GitHub

# 2. Vincular proyecto
vercel link --yes

# 3. Deploy a producción
vercel --prod --yes
```

## Opción 2: Desde Web (Más fácil)

1. Ve a https://vercel.com/new
2. Click en **"Import Git Repository"**
3. Conecta tu GitHub (Dabtcavila)
4. Busca y selecciona **"FacePay"**
5. Click en **Import**
6. Configuración:
   - Framework: Next.js (auto-detectado)
   - Root Directory: ./
   - Build Command: npm run build
7. Click en **Deploy**

## Variables de Entorno (IMPORTANTE)

Después del deploy, ve a Settings → Environment Variables y agrega:

```env
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-ID].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[TU-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU-ANON-KEY]
NEXTAUTH_URL=https://[TU-DOMINIO].vercel.app
NEXTAUTH_SECRET=k9Xf3mNp7Qr2sVw5yBc8dGh1jLn4oTa6
JWT_SECRET=aZ3xC5vB7nM9qW2eR4tY6uI8oP1sD3fG
JWT_REFRESH_SECRET=hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH
WEBAUTHN_RP_NAME=FacePay
WEBAUTHN_RP_ID=[TU-DOMINIO].vercel.app
WEBAUTHN_ORIGIN=https://[TU-DOMINIO].vercel.app
INITIAL_CREDIT_BONUS=100
REFERRAL_BONUS=50
CETES_ANNUAL_RATE=0.105
INVESTMENT_ENABLED=true
ENABLE_REFERRAL_SYSTEM=true
VIRAL_SHARING_BONUS=10
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://[TU-DOMINIO].vercel.app
```

## URLs Posibles

Después del deploy, tu app estará en:
- https://facepay-dabtcavila.vercel.app
- https://facepay-git-main-dabtcavila.vercel.app
- O el dominio personalizado que elijas

## Verificación

```bash
# Ver tus proyectos
vercel ls

# Ver el status
vercel inspect [url]
```

## ¿Problemas?

Si el nombre "facepay" está tomado, usa:
- facepay-mx
- facepayai
- facepay-app
- facepay-dabtcavila