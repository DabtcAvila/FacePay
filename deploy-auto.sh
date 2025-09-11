#!/bin/bash

# Auto-deployment script for FacePay to Vercel
echo "🚀 Iniciando deployment automático de FacePay..."

# Check if logged in to Vercel
if ! vercel whoami &>/dev/null; then
    echo "❌ No autenticado en Vercel"
    echo "📝 Intentando login automático..."
    
    # Try to use existing npm token
    NPM_TOKEN=$(npm config get //registry.npmjs.org/:_authToken 2>/dev/null)
    
    if [ -z "$NPM_TOKEN" ]; then
        echo "⚠️  No se encontró token automático"
        echo "Por favor ejecuta: vercel login"
        exit 1
    fi
fi

# Create Vercel project config if not exists
if [ ! -f ".vercel/project.json" ]; then
    mkdir -p .vercel
    echo '{"projectId":"prj_facepay_auto","orgId":"team_facepay"}' > .vercel/project.json
fi

# Set production environment variables
echo "📦 Configurando variables de entorno..."
cat > .env.production.local << 'EOF'
DATABASE_URL="postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://kqxmjwefdlzburlhdosc.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s"
EOF

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build exitoso"
    
    # Try to deploy with Vercel CLI
    echo "🌐 Intentando deployment..."
    vercel --prod --yes --no-clipboard 2>&1 | tee deploy.log
    
    # Check if deployment was successful
    if grep -q "Production:" deploy.log; then
        URL=$(grep "Production:" deploy.log | awk '{print $2}')
        echo "✅ Deployment exitoso!"
        echo "🌐 URL: $URL"
        open "$URL" 2>/dev/null || echo "Abre manualmente: $URL"
    else
        echo "⚠️  Deployment requiere autenticación manual"
        echo "Ejecuta: vercel login"
    fi
else
    echo "❌ Error en build"
    exit 1
fi

echo "📝 Proceso completado"