#!/bin/bash

# FacePay Quick Start Script
# This script checks dependencies, sets up environment, runs migrations, and starts the dev server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
print_header() {
    echo -e "\n${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Start script
print_header "🚀 FacePay Quick Start"

# Step 1: Check dependencies
print_header "📋 Checking Dependencies"

DEPS_OK=true

# Check Node.js
if check_command "node"; then
    NODE_VERSION=$(node --version)
    print_info "Node.js version: $NODE_VERSION"
    
    # Check if Node.js version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_warning "Node.js version 18+ is recommended. Current: $NODE_VERSION"
    fi
else
    DEPS_OK=false
    echo -e "${RED}Please install Node.js 18+ from https://nodejs.org${NC}"
fi

# Check npm
if check_command "npm"; then
    NPM_VERSION=$(npm --version)
    print_info "npm version: $NPM_VERSION"
else
    DEPS_OK=false
fi

# Check git
if check_command "git"; then
    GIT_VERSION=$(git --version)
    print_info "$GIT_VERSION"
else
    print_warning "Git not found. Version control features will be limited."
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the FacePay root directory."
    exit 1
fi

if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Prisma schema not found. Please ensure you're in the correct directory."
    exit 1
fi

if [ "$DEPS_OK" = false ]; then
    print_error "Missing required dependencies. Please install them first."
    exit 1
fi

print_success "All dependencies are available!"

# Step 2: Install packages
print_header "📦 Installing Dependencies"

if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    print_info "node_modules exists. Checking for updates..."
    npm ci
else
    print_info "Fresh installation..."
    npm install
fi

print_success "Dependencies installed!"

# Step 3: Environment setup
print_header "🔧 Environment Setup"

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from template..."
    
    # Create basic .env.local template
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/facepay"
DIRECT_URL="postgresql://username:password@localhost:5432/facepay"

# JWT & Auth
JWT_SECRET="your-super-secure-jwt-secret-64-characters-minimum-here-please"
NEXTAUTH_SECRET="your-nextauth-secret-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# WebAuthn
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# Payment Providers (Optional)
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_PUBLISHABLE_KEY="pk_test_..."
# MERCADOPAGO_ACCESS_TOKEN="your-mp-token"

# Monitoring (Optional)
# NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
# NEXT_PUBLIC_MIXPANEL_TOKEN="your-mixpanel-token"
EOF

    print_warning "Created .env.local template. Please update with your actual values!"
    print_info "Key variables to update:"
    echo "  - DATABASE_URL: Your PostgreSQL connection string"
    echo "  - JWT_SECRET: Generate a secure random string"
    echo "  - NEXTAUTH_SECRET: Generate with: openssl rand -base64 32"
    echo ""
    print_info "For production deployment, check DEPLOYMENT_GUIDE.md"
else
    print_success ".env.local already exists"
fi

# Step 4: Check database connection
print_header "🗄️ Database Setup"

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=" .env.local; then
    DATABASE_URL=$(grep "DATABASE_URL=" .env.local | cut -d'=' -f2- | tr -d '"')
    
    if [[ $DATABASE_URL == *"localhost"* ]] || [[ $DATABASE_URL == *"username:password"* ]]; then
        print_warning "DATABASE_URL appears to be a template. Please update with your actual database URL."
        print_info "Options:"
        echo "  1. Use Supabase (free): https://supabase.com"
        echo "  2. Use local PostgreSQL: Install PostgreSQL locally"
        echo "  3. Use Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres"
        echo ""
        print_info "After setting up your database, update DATABASE_URL in .env.local"
    else
        print_info "Attempting to connect to database..."
        
        # Try to generate Prisma client and run migrations
        if npm run db:generate > /dev/null 2>&1; then
            print_success "Prisma client generated"
            
            # Try to run migrations
            print_info "Running database migrations..."
            if npm run db:push > /dev/null 2>&1; then
                print_success "Database schema updated"
                
                # Initialize database with sample data
                print_info "Initializing database with sample data..."
                if node scripts/init-db.js; then
                    print_success "Database initialized with demo data"
                else
                    print_warning "Failed to initialize sample data. You can run 'npm run db:init' later."
                fi
            else
                print_warning "Database migration failed. Please check your DATABASE_URL."
            fi
        else
            print_warning "Could not connect to database. Please check your DATABASE_URL."
        fi
    fi
else
    print_error "DATABASE_URL not found in .env.local"
fi

# Step 5: Run type checking and linting
print_header "🔍 Code Quality Checks"

print_info "Running TypeScript type checking..."
if npm run type-check; then
    print_success "TypeScript compilation successful"
else
    print_warning "TypeScript errors found. Fix them for better development experience."
fi

print_info "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    print_success "Linting passed"
else
    print_warning "Linting issues found. Run 'npm run lint:fix' to auto-fix."
fi

# Step 6: Build check
print_header "🏗️ Build Verification"

print_info "Testing production build..."
if npm run build > /dev/null 2>&1; then
    print_success "Production build successful"
else
    print_error "Build failed. Check the errors above."
    print_info "You can still run the development server, but fix build issues before deploying."
fi

# Step 7: Start development server
print_header "🎉 Starting Development Server"

print_success "Setup complete! Starting the development server..."
print_info "Your FacePay app will be available at: http://localhost:3000"
print_info "API documentation will be available at: http://localhost:3000/api-docs"

echo ""
print_info "Demo users available:"
echo "  - demo@facepay.com (Demo User) - $500.00 credits"
echo "  - john.doe@example.com (John Doe) - $250.00 credits"
echo "  - jane.smith@example.com (Jane Smith) - $750.00 credits"
echo "  - merchant@facepay.com (Merchant Demo) - $1000.00 credits"

echo ""
print_info "Quick links:"
echo "  - Demo Page: http://localhost:3000/demo"
echo "  - Dashboard: http://localhost:3000/dashboard"
echo "  - Biometric Test: http://localhost:3000/test-biometric"
echo "  - WebAuthn Test: http://localhost:3000/webauthn-test"
echo "  - Payment Test: http://localhost:3000/payments"

echo ""
print_info "Useful commands:"
echo "  - npm run dev         : Start development server"
echo "  - npm run build       : Build for production"
echo "  - npm run test        : Run tests"
echo "  - npm run db:studio   : Open Prisma Studio (database GUI)"
echo "  - npm run db:init     : Re-initialize database with demo data"

echo ""
print_warning "Before deploying to production:"
echo "  1. Update all environment variables in .env.local"
echo "  2. Set up your database (Supabase recommended for free hosting)"
echo "  3. Configure payment providers (Stripe, MercadoPago)"
echo "  4. Review DEPLOYMENT_GUIDE.md for detailed instructions"

echo ""
print_header "🚀 Ready to go!"
print_success "Run 'npm run dev' to start the development server"

# Optional: Start dev server automatically
read -p "Would you like to start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting development server..."
    npm run dev
else
    print_info "You can start the development server later with: npm run dev"
fi