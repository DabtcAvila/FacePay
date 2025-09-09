# Security Setup - Dafel Technologies

## Inicialización del Sistema de Autenticación Enterprise

### Paso 1: Verificar/Iniciar PostgreSQL

```bash
# Opción A: Si Docker está disponible
docker-compose -f docker-compose.dev.yml up -d postgres

# Opción B: Si no hay Docker, usar PostgreSQL local
# Verificar si PostgreSQL está instalado
psql --version

# Si está instalado, verificar que esté corriendo
brew services list | grep postgresql

# Si no está corriendo, iniciarlo
brew services start postgresql@16

# Crear usuario y base de datos
psql -U $USER -d postgres -c "CREATE USER dafel_user WITH PASSWORD 'DafelSecure2025!' CREATEDB;"
psql -U $USER -d postgres -c "CREATE DATABASE dafel_db WITH OWNER dafel_user;"
psql -U $USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE dafel_db TO dafel_user;"
```

### Paso 2: Instalar dependencias de seguridad

```bash
cd frontend

# Instalar todas las dependencias
npm install

# Verificar dependencias críticas
npm list next-auth prisma @prisma/client bcryptjs react-hot-toast
```

### Paso 3: Configurar base de datos con Prisma

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones (crear tablas)
DATABASE_URL="postgresql://dafel_user:DafelSecure2025!@localhost:5432/dafel_db" npm run prisma:migrate dev --name init

# Si hay problemas con las migraciones, reset completo
npm run prisma:migrate reset --skip-seed
```

### Paso 4: Crear usuarios iniciales

```bash
# Ejecutar seed con usuarios predefinidos
DATABASE_URL="postgresql://dafel_user:DafelSecure2025!@localhost:5432/dafel_db" npm run prisma:seed

# O directamente con tsx si hay problemas
DATABASE_URL="postgresql://dafel_user:DafelSecure2025!@localhost:5432/dafel_db" npx tsx prisma/seed.ts
```

### Paso 5: Verificar variables de entorno

Confirmar que `frontend/.env.local` contiene:

```env
# Database (PostgreSQL local)
DATABASE_URL="postgresql://dafel_user:DafelSecure2025!@localhost:5432/dafel_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="HwpTdV8MiQp1bkmPdCXqyuER3u42hUah+YZ+zK+n48E="

# Environment
NODE_ENV="development"
```

Si necesitas generar un nuevo NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Paso 6: Iniciar servidor de desarrollo

```bash
# Matar proceso anterior si existe
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null

# Iniciar servidor
npm run dev

# El servidor estará disponible en:
# http://localhost:3000
```

---

## Credenciales del Sistema

| Role   | Email                | Password         | Permisos                          |
|--------|---------------------|------------------|-----------------------------------|
| Admin  | admin@dafel.tech    | DafelSecure2025! | Acceso total, gestión de usuarios |
| Editor | editor@dafel.tech   | EditorPass2025!  | Crear y editar contenido          |
| Viewer | viewer@dafel.tech   | ViewerPass2025!  | Solo lectura                      |

---

## Comandos de Mantenimiento

### Reset completo de base de datos
```bash
cd frontend

# Reset y re-seed
npm run prisma:migrate reset
npm run prisma:seed
```

### Administración visual con Prisma Studio
```bash
# Abrir interfaz visual para ver/editar datos
npm run prisma:studio
```

### Limpiar sesiones expiradas
```bash
# Ejecutar SQL directamente
npx prisma db execute --sql "DELETE FROM \"Session\" WHERE expires < NOW()"
```

### Ver logs de auditoría
```bash
# Ver últimos 20 logs
npx prisma db execute --sql "SELECT * FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20"
```

### Desbloquear usuario bloqueado
```bash
# Desbloquear usuario específico
npx prisma db execute --sql "UPDATE \"User\" SET \"lockedUntil\" = NULL, \"loginAttempts\" = 0 WHERE email = 'usuario@email.com'"
```

---

## Troubleshooting

### Si PostgreSQL no conecta:

1. **Verificar que el servicio esté corriendo:**
   ```bash
   # Para Docker
   docker ps | grep postgres
   
   # Para PostgreSQL local
   pg_isready -h localhost -p 5432
   ```

2. **Verificar credenciales en DATABASE_URL:**
   ```bash
   # Probar conexión directamente
   PGPASSWORD='DafelSecure2025!' psql -h localhost -p 5432 -U dafel_user -d dafel_db -c "SELECT version();"
   ```

3. **Verificar puerto 5432 no esté ocupado:**
   ```bash
   lsof -i :5432
   ```

### Si NextAuth falla:

1. **Regenerar NEXTAUTH_SECRET:**
   ```bash
   # Generar nuevo secret
   openssl rand -base64 32
   # Actualizar en .env.local
   ```

2. **Verificar NEXTAUTH_URL:**
   ```bash
   # Debe ser exactamente
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Limpiar cookies del navegador:**
   - Abrir DevTools (F12)
   - Application → Storage → Clear site data

### Si el puerto 3000 está ocupado:

```bash
# Ver qué proceso lo usa
lsof -i :3000

# Matar el proceso
kill -9 [PID]

# O usar otro puerto
npm run dev -- -p 3001
```

### Si las migraciones fallan:

```bash
# Reset completo de la base de datos
cd frontend

# Borrar migraciones anteriores
rm -rf prisma/migrations

# Recrear desde cero
npm run prisma:migrate dev --name init --create-only
npm run prisma:migrate deploy
npm run prisma:seed
```

### Verificar configuración de next.config.js:

```bash
# Asegurarse que las rutas de NextAuth NO estén siendo redirigidas
grep -A 5 "rewrites" next.config.js

# Debe excluir: auth, users, audit-logs
# source: '/api/:path((?!auth|users|audit-logs).*)'
```

---

## Rutas del Sistema

### Públicas
- `/` - Landing page
- `/login` - Página de autenticación

### Protegidas (requieren autenticación)
- `/studio` - Panel principal de trabajo
- `/studio/admin/users` - Gestión de usuarios (solo ADMIN)

### API Endpoints
- `/api/auth/*` - Endpoints de NextAuth
- `/api/users` - CRUD de usuarios (solo ADMIN)
- `/api/audit-logs` - Logs de auditoría (solo ADMIN)

---

## Características de Seguridad Implementadas

✅ **Autenticación y Autorización**
- NextAuth.js con JWT strategy
- Sesiones de 7 días de duración
- Roles: ADMIN, EDITOR, VIEWER

✅ **Protección contra ataques**
- Rate limiting (5 intentos máx)
- Bloqueo de cuenta por 30 minutos
- Passwords hasheados con bcrypt (12 rounds)
- CSRF protection integrada en NextAuth

✅ **Auditoría y Compliance**
- Logging de todos los eventos de autenticación
- Tracking de IPs y user agents
- Historial de cambios de usuarios

✅ **Headers de Seguridad**
- CSP (Content Security Policy)
- X-Frame-Options: DENY
- X-XSS-Protection
- Strict-Transport-Security

✅ **Validación y UX**
- Validación en tiempo real con Zod
- Password strength indicator
- Toast notifications
- Loading states

---

## Scripts NPM Disponibles

```json
{
  "dev": "Iniciar servidor de desarrollo",
  "build": "Construir para producción",
  "prisma:generate": "Generar cliente Prisma",
  "prisma:migrate": "Ejecutar migraciones",
  "prisma:studio": "Abrir Prisma Studio",
  "prisma:seed": "Poblar base de datos",
  "db:setup": "Setup completo de DB (generate + migrate + seed)"
}
```

---

## Notas Importantes

1. **Nunca commitear .env.local** - Contiene secrets sensibles
2. **Cambiar passwords en producción** - Los passwords del seed son solo para desarrollo
3. **Generar nuevo NEXTAUTH_SECRET** para cada ambiente
4. **Configurar SSL/TLS** en producción
5. **Implementar 2FA** para usuarios admin en producción
6. **Regular backups** de la base de datos
7. **Monitorear audit logs** regularmente

---

**Última actualización:** 2 de Septiembre de 2025  
**Versión:** 1.0.0  
**Autor:** Dafel Technologies Development Team