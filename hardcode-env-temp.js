#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Hardcodeando variables de entorno temporalmente...');

const envVars = {
  DATABASE_URL: "postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://kqxmjwefdlzburlhdosc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5Mzg3MjQwMCwiZXhwIjoyMDA5NDQ4NDAwfQ.J7ZwHyPzNf4K5TqLR8X3HMQm4Nv2Dg6YcWpFiJhK9Rs",
  NEXTAUTH_URL: "https://facepay-mx.vercel.app",
  NEXTAUTH_SECRET: "+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI=",
  JWT_SECRET: "Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw==",
  JWT_REFRESH_SECRET: "hJ5kL7mN9pQ2rT4vW6xY8zB1cD3eF5gH",
  WEBAUTHN_RP_NAME: "FacePay",
  WEBAUTHN_RP_ID: "facepay-mx.vercel.app",
  WEBAUTHN_ORIGIN: "https://facepay-mx.vercel.app",
  INITIAL_CREDIT_BONUS: "100",
  REFERRAL_BONUS: "50",
  CETES_ANNUAL_RATE: "0.105",
  INVESTMENT_ENABLED: "true",
  ENABLE_REFERRAL_SYSTEM: "true",
  VIRAL_SHARING_BONUS: "10",
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://facepay-mx.vercel.app",
  NEXT_PUBLIC_ENABLE_ANALYTICS: "false",
  NEXT_PUBLIC_ENABLE_MONITORING: "false"
};

// Crear archivo de configuración temporal
const configContent = `// Configuración temporal de variables de entorno
// ESTE ARCHIVO ES TEMPORAL - NO COMMIT A PRODUCCIÓN

const ENV_CONFIG = ${JSON.stringify(envVars, null, 2)};

// Función para obtener variable de entorno con fallback
export function getEnvVar(key, fallback = '') {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return ENV_CONFIG[key] || fallback;
}

// Exportar todas las variables
export const ENV = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),
  NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  WEBAUTHN_RP_NAME: getEnvVar('WEBAUTHN_RP_NAME'),
  WEBAUTHN_RP_ID: getEnvVar('WEBAUTHN_RP_ID'),
  WEBAUTHN_ORIGIN: getEnvVar('WEBAUTHN_ORIGIN'),
  INITIAL_CREDIT_BONUS: getEnvVar('INITIAL_CREDIT_BONUS'),
  REFERRAL_BONUS: getEnvVar('REFERRAL_BONUS'),
  CETES_ANNUAL_RATE: getEnvVar('CETES_ANNUAL_RATE'),
  INVESTMENT_ENABLED: getEnvVar('INVESTMENT_ENABLED'),
  ENABLE_REFERRAL_SYSTEM: getEnvVar('ENABLE_REFERRAL_SYSTEM'),
  VIRAL_SHARING_BONUS: getEnvVar('VIRAL_SHARING_BONUS'),
  NODE_ENV: getEnvVar('NODE_ENV'),
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: getEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS'),
  NEXT_PUBLIC_ENABLE_MONITORING: getEnvVar('NEXT_PUBLIC_ENABLE_MONITORING')
};

export default ENV;
`;

// Escribir archivo de configuración temporal
fs.writeFileSync(path.join(__dirname, 'src/lib/env-config-temp.ts'), configContent);

console.log('✅ Archivo de configuración temporal creado: src/lib/env-config-temp.ts');
console.log('⚠️  IMPORTANTE: Este archivo contiene credenciales hardcodeadas');
console.log('⚠️  NO hacer commit de este archivo a producción');
console.log('⚠️  Usar solo para deployment temporal hasta configurar Vercel correctamente');

// Crear script de limpieza
const cleanupScript = `#!/bin/bash
echo "🧹 Limpiando archivos temporales..."
rm -f src/lib/env-config-temp.ts
rm -f hardcode-env-temp.js
rm -f cleanup-temp-env.sh
echo "✅ Archivos temporales eliminados"
`;

fs.writeFileSync(path.join(__dirname, 'cleanup-temp-env.sh'), cleanupScript);
fs.chmodSync(path.join(__dirname, 'cleanup-temp-env.sh'), '755');

console.log('✅ Script de limpieza creado: cleanup-temp-env.sh');
console.log('');
console.log('📋 Próximos pasos:');
console.log('1. Modificar imports en archivos que usen process.env');
console.log('2. Importar desde src/lib/env-config-temp.ts temporalmente');
console.log('3. Hacer build y deploy');
console.log('4. Una vez funcionando, configurar Vercel correctamente');
console.log('5. Ejecutar cleanup-temp-env.sh para limpiar');