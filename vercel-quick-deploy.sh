#!/bin/bash

# 🚀 FACEPAY - QUICK DEPLOY (VERSION SIMPLIFICADA)
# Ejecuta esto: ./vercel-quick-deploy.sh

echo "🚀 FacePay - Deployment Rápido a Vercel"
echo "========================================"

# 1. Generar secrets seguros
echo "→ Generando secrets seguros..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# 2. Crear archivo de variables
cat > .env.vercel << EOF
DATABASE_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
JWT_SECRET="${JWT_SECRET}"
NEXTAUTH_URL="https://facepay.vercel.app"
NEXT_PUBLIC_SUPABASE_URL="https://kqxmjwefdlzburlhdosc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s"
NEXT_PUBLIC_APP_URL="https://facepay.vercel.app"
EOF

echo "✅ Secrets generados"

# 3. Instalar Vercel CLI si no existe
if ! command -v vercel &> /dev/null; then
    echo "→ Instalando Vercel CLI..."
    npm i -g vercel
fi

# 4. Deploy directo
echo ""
echo "📦 INICIANDO DEPLOYMENT..."
echo "=========================="
echo ""

vercel --prod --yes

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo ""
echo "📌 Próximos pasos:"
echo "   1. Ve a https://vercel.com/dashboard"
echo "   2. Busca el proyecto 'facepay'"
echo "   3. Ve a Settings → Environment Variables"
echo "   4. Importa las variables de .env.vercel"
echo ""
echo "🎉 Tu app estará lista en: https://facepay-[tu-usuario].vercel.app"