# Agregar Variables Una por Una en Vercel

Si "Add Multiple" no funciona, agrega cada una individualmente:

## En Vercel Dashboard → Settings → Environment Variables → Add New

### Variable 1:
**Key:** `DATABASE_URL`  
**Value:** `postgresql://postgres.kqxmjwefdlzburlhdosc:fP8#mK2@nRx4Q$w9*jE6cL!yU3tZ@aws-0-us-west-1.pooler.supabase.com:5432/postgres`

### Variable 2:
**Key:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** `https://kqxmjwefdlzburlhdosc.supabase.co`

### Variable 3:
**Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeG1qd2VmZGx6YnVybGhkb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM4NzI0MDAsImV4cCI6MjAwOTQ0ODQwMH0.C4zDLKuJx9JfGUL8z2QZK_M7DJdKGZ8Y4Rm3Yw9Uf2s`

### Variable 4:
**Key:** `NEXTAUTH_URL`  
**Value:** `https://facepay-mx.vercel.app`

### Variable 5:
**Key:** `NEXTAUTH_SECRET`  
**Value:** `+H6qshLxCQ5S7gyDnPAeHkfydhM+PVhSA1+/MJvOmbI=`

### Variable 6:
**Key:** `JWT_SECRET`  
**Value:** `Svs/T7Jmqu5a1xqQE9EZ1sVxBiBhIOnkFUkRhTQ/762DcIaltx9/azlG94wHMam/z79hhzyNd3uFzUIUY2nrxw==`

### Variable 7:
**Key:** `WEBAUTHN_RP_NAME`  
**Value:** `FacePay`

### Variable 8:
**Key:** `WEBAUTHN_RP_ID`  
**Value:** `facepay-mx.vercel.app`

### Variable 9:
**Key:** `WEBAUTHN_ORIGIN`  
**Value:** `https://facepay-mx.vercel.app`

### Variable 10:
**Key:** `NODE_ENV`  
**Value:** `production`

### Variable 11:
**Key:** `NEXT_PUBLIC_APP_URL`  
**Value:** `https://facepay-mx.vercel.app`

### Variables Opcionales (pero recomendadas):

**Key:** `INITIAL_CREDIT_BONUS`  
**Value:** `100`

**Key:** `REFERRAL_BONUS`  
**Value:** `50`

**Key:** `INVESTMENT_ENABLED`  
**Value:** `true`

**Key:** `ENABLE_REFERRAL_SYSTEM`  
**Value:** `true`

## Después de agregar todas:
1. Click "Save" en cada una
2. Ve a Deployments → Redeploy
3. Espera 2-3 minutos
4. Tu sitio estará en: https://facepay-mx.vercel.app