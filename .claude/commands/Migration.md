# 🚀 Dafel Technologies - Migration Commands

Execute these commands in Claude Code to backup, restore, or setup the project on any machine.

## 📦 BACKUP - Save current local files

### Mac/Linux
```bash
# Create backup structure
mkdir -p .local-files/env .local-files/claude/commands

# Backup environment files
[ -f frontend/.env.local ] && cp frontend/.env.local .local-files/env/ && echo "✅ Backed up .env.local"

# Backup Claude settings
[ -f .claude/settings.local.json ] && cp .claude/settings.local.json .local-files/claude/ && echo "✅ Backed up Claude settings"

# Backup Claude commands
cp .claude/commands/*.md .local-files/claude/commands/ 2>/dev/null && echo "✅ Backed up Claude commands"

# Create timestamp file
echo "Backup created on: $(date)" > .local-files/backup-timestamp.txt

echo "🎉 Backup completed! Check .local-files/ folder"
```

### Windows
```powershell
# Create backup structure
New-Item -ItemType Directory -Force -Path ".local-files\env", ".local-files\claude\commands"

# Backup environment files
if (Test-Path "frontend\.env.local") { 
    Copy-Item "frontend\.env.local" ".local-files\env\"
    Write-Host "✅ Backed up .env.local"
}

# Backup Claude settings
if (Test-Path ".claude\settings.local.json") {
    Copy-Item ".claude\settings.local.json" ".local-files\claude\"
    Write-Host "✅ Backed up Claude settings"
}

# Backup Claude commands
Copy-Item ".claude\commands\*.md" ".local-files\claude\commands\" -ErrorAction SilentlyContinue
Write-Host "✅ Backed up Claude commands"

# Create timestamp file
"Backup created on: $(Get-Date)" | Out-File ".local-files\backup-timestamp.txt"

Write-Host "🎉 Backup completed! Check .local-files\ folder"
```

---

## 🔄 RESTORE - Restore from backup

### Mac/Linux
```bash
# Check if backup exists
if [ ! -d ".local-files" ]; then
    echo "❌ No backup found! Transfer .local-files folder first."
    exit 1
fi

# Restore environment files
[ -f .local-files/env/.env.local ] && cp .local-files/env/.env.local frontend/ && echo "✅ Restored .env.local"

# Create Claude directory if needed
mkdir -p .claude/commands

# Restore Claude settings
[ -f .local-files/claude/settings.local.json ] && cp .local-files/claude/settings.local.json .claude/ && echo "✅ Restored Claude settings"

# Restore Claude commands
cp .local-files/claude/commands/*.md .claude/commands/ 2>/dev/null && echo "✅ Restored Claude commands"

echo "🎉 Restore completed!"
```

### Windows
```powershell
# Check if backup exists
if (!(Test-Path ".local-files")) {
    Write-Host "❌ No backup found! Transfer .local-files folder first." -ForegroundColor Red
    exit
}

# Restore environment files
if (Test-Path ".local-files\env\.env.local") {
    Copy-Item ".local-files\env\.env.local" "frontend\"
    Write-Host "✅ Restored .env.local"
}

# Create Claude directory if needed
New-Item -ItemType Directory -Force -Path ".claude\commands"

# Restore Claude settings
if (Test-Path ".local-files\claude\settings.local.json") {
    Copy-Item ".local-files\claude\settings.local.json" ".claude\"
    Write-Host "✅ Restored Claude settings"
}

# Restore Claude commands
Copy-Item ".local-files\claude\commands\*.md" ".claude\commands\" -ErrorAction SilentlyContinue
Write-Host "✅ Restored Claude commands"

Write-Host "🎉 Restore completed!"
```

---

## 🛠️ SETUP - Complete project setup after restore

### Mac/Linux
```bash
echo "🚀 Starting Dafel Technologies setup..."

# Navigate to frontend
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Setting up database..."
npm run prisma:generate

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL is running"
else
    echo "⚠️  Please ensure PostgreSQL is installed and running"
fi

# Run database migrations
echo "📊 Running migrations..."
npm run prisma:migrate

# Seed the database
echo "🌱 Seeding database..."
npm run prisma:seed

# Build the project
echo "🏗️ Building project..."
npm run build

echo "
✅ Setup complete!

📝 Next steps:
1. Verify PostgreSQL is running on port 5432
2. Check .env.local has correct DATABASE_URL
3. Run: npm run dev
4. Access: http://localhost:3000

🔐 Default credentials:
- admin@dafel.tech / DafelSecure2025!
- editor@dafel.tech / EditorPass2025!
- viewer@dafel.tech / ViewerPass2025!
"
```

### Windows
```powershell
Write-Host "🚀 Starting Dafel Technologies setup..." -ForegroundColor Cyan

# Navigate to frontend
Set-Location frontend

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma client
Write-Host "🔧 Setting up database..." -ForegroundColor Yellow
npm run prisma:generate

# Check if PostgreSQL is running
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Please ensure PostgreSQL is installed and running" -ForegroundColor Yellow
}

# Run database migrations
Write-Host "📊 Running migrations..." -ForegroundColor Yellow
npm run prisma:migrate

# Seed the database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npm run prisma:seed

# Build the project
Write-Host "🏗️ Building project..." -ForegroundColor Yellow
npm run build

Write-Host "
✅ Setup complete!

📝 Next steps:
1. Verify PostgreSQL is running on port 5432
2. Check .env.local has correct DATABASE_URL
3. Run: npm run dev
4. Access: http://localhost:3000

🔐 Default credentials:
- admin@dafel.tech / DafelSecure2025!
- editor@dafel.tech / EditorPass2025!
- viewer@dafel.tech / ViewerPass2025!
" -ForegroundColor Green
```

---

## 🐳 DOCKER SETUP (Alternative)

### Mac/Linux/Windows
```bash
# Start services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Run migrations in container
docker-compose -f docker-compose.dev.yml exec frontend npm run prisma:migrate

# Seed database
docker-compose -f docker-compose.dev.yml exec frontend npm run prisma:seed

echo "🐳 Docker setup complete! Access at http://localhost:3000"
```

---

## 🔍 VERIFY - Check installation

### All Platforms
```bash
# Check Node version
node --version

# Check npm version  
npm --version

# Check if frontend dependencies are installed
cd frontend && npm list --depth=0

# Test database connection
npm run prisma:studio

# Check if .env.local exists
[ -f .env.local ] && echo "✅ .env.local found" || echo "❌ .env.local missing"
```

---

## 🆘 TROUBLESHOOTING

### Database Connection Issues
```bash
# Mac/Linux: Start PostgreSQL
brew services start postgresql@16

# Windows: Start PostgreSQL service
net start postgresql-x64-16

# Verify connection string in .env.local
cat frontend/.env.local | grep DATABASE_URL
```

### Permission Issues
```bash
# Mac/Linux: Fix permissions
chmod -R 755 .claude/
chmod 600 frontend/.env.local

# Windows: Run as Administrator
# Right-click terminal and select "Run as Administrator"
```

### Port Conflicts
```bash
# Check if port 3000 is in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process using port (replace PID)
kill -9 [PID]  # Mac/Linux
taskkill /PID [PID] /F  # Windows
```

---

## 📋 QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run prisma:studio` | Open database GUI |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:seed` | Seed database |
| `npm run lint` | Check code quality |
| `npm run type-check` | Check TypeScript |

---

*Generated for Dafel Technologies Migration System*
*Supports: macOS, Linux, Windows*
*Last updated: January 2025*