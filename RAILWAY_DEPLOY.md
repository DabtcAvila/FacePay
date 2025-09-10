# 🚂 Deploy con Railway (Alternativa a Vercel)

## ¿Por qué Railway?
- **TODO INCLUIDO**: Hosting + Database en un solo lugar
- **$5 gratis** para empezar
- **Deploy en 1 click** desde GitHub
- **PostgreSQL incluido** (no necesitas Supabase separado)

## Pasos (3 minutos):

### 1. Crear cuenta
Ve a: https://railway.app
Click: "Start a New Project"
Login con GitHub

### 2. Deploy desde GitHub
- Click: "Deploy from GitHub repo"
- Busca: "FacePay"
- Selecciona branch: `agent/backend_api`

### 3. Agregar PostgreSQL
- Click: "+ New"
- Selecciona: "PostgreSQL"
- Railway lo conecta automáticamente

### 4. Variables de Entorno
Click en tu servicio → Variables → Add:

```env
# Auth
NEXTAUTH_URL=${{RAILWAY_STATIC_URL}}
NEXTAUTH_SECRET=genera-32-caracteres-random
JWT_SECRET=otros-32-caracteres-random
JWT_REFRESH_SECRET=mas-32-caracteres-random

# WebAuthn
WEBAUTHN_RP_NAME=FacePay
WEBAUTHN_RP_ID=${{RAILWAY_STATIC_URL}}
WEBAUTHN_ORIGIN=https://${{RAILWAY_STATIC_URL}}

# Credits
INITIAL_CREDIT_BONUS=100
REFERRAL_BONUS=50
CETES_ANNUAL_RATE=0.105
```

### 5. Deploy
- Railway hace build automático
- URL lista en ~3 minutos
- Formato: `facepay-production.up.railway.app`

## Ventajas sobre Vercel:
✅ Database incluida (no necesitas Supabase)
✅ Un solo lugar para todo
✅ Logs en tiempo real
✅ Rollback con 1 click
✅ Métricas incluidas

## Costo después del trial:
- Hosting: ~$5/mes
- Database: ~$5/mes
- Total: ~$10/mes para 10,000 usuarios

## URL Final:
Tu app estará en: `https://facepay-production.up.railway.app`

---

# 🎯 ¿Railway o Vercel?

| Aspecto | Vercel | Railway |
|---------|--------|---------|
| Setup | 5 min | 3 min |
| Database | Separada (Supabase) | Incluida |
| Costo inicial | $0 | $0 (trial $5) |
| Costo mensual | $0-20 | $10 |
| Complejidad | Media | Baja |
| Performance | Excelente | Muy buena |

**Mi recomendación: Si el login de Vercel no funciona, usa Railway. Es más simple y todo está en un lugar.**