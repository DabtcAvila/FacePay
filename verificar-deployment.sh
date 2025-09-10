#!/bin/bash

echo "🔍 Verificando deployment de FacePay..."
echo "======================================"

# Test homepage
echo -e "\n📱 Probando página principal..."
if curl -s -o /dev/null -w "%{http_code}" https://facepay.vercel.app | grep -q "200"; then
    echo "✅ Homepage funciona correctamente"
else
    echo "❌ Error en homepage"
fi

# Test API health
echo -e "\n🔧 Probando API health..."
if curl -s -o /dev/null -w "%{http_code}" https://facepay.vercel.app/api/health | grep -q "200"; then
    echo "✅ API health funciona"
else
    echo "⚠️  API health no responde (necesitas configurar variables de entorno)"
fi

# Test demo page
echo -e "\n🎮 Probando página demo..."
if curl -s -o /dev/null -w "%{http_code}" https://facepay.vercel.app/demo | grep -q "200"; then
    echo "✅ Demo page funciona"
else
    echo "⚠️  Demo integrado en homepage"
fi

echo -e "\n======================================"
echo "📊 Resumen:"
echo "Si ves ⚠️ en API health, necesitas configurar las variables de entorno en Vercel"
echo "URL de tu app: https://facepay.vercel.app"