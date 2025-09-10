#!/bin/bash

# ============================================================================
# FacePay Supabase Setup Script
# ============================================================================
# This script helps set up the FacePay project with Supabase
# Run this after creating your Supabase project
# ============================================================================

set -e  # Exit on any error

echo "🚀 FacePay Supabase Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install npx first."
        exit 1
    fi
    
    print_status "All dependencies are installed"
}

# Install Supabase CLI if not installed
install_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_info "Installing Supabase CLI..."
        npm install -g supabase
        print_status "Supabase CLI installed"
    else
        print_status "Supabase CLI already installed"
    fi
}

# Generate Prisma client
generate_prisma() {
    print_info "Generating Prisma client..."
    if [ -f "package.json" ]; then
        npm install
        npx prisma generate
        print_status "Prisma client generated"
    else
        print_warning "package.json not found. Skipping Prisma generation."
    fi
}

# Create backup of existing env file
backup_env() {
    if [ -f ".env.local" ]; then
        print_info "Backing up existing .env.local..."
        cp .env.local .env.local.backup
        print_status "Backup created: .env.local.backup"
    fi
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment variables..."
    
    if [ -f ".env.production.local" ]; then
        print_warning "You have a production environment file (.env.production.local)"
        echo ""
        echo "Please update the following variables with your actual Supabase project values:"
        echo ""
        echo "1. NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL"
        echo "2. NEXT_PUBLIC_SUPABASE_ANON_KEY - Your anon public key"
        echo "3. SUPABASE_SERVICE_ROLE_KEY - Your service role secret key"
        echo "4. DATABASE_URL - Your database connection string"
        echo ""
        print_info "Find these values in your Supabase Dashboard > Settings > API"
    else
        print_error ".env.production.local not found. Please run the credential generator first."
        exit 1
    fi
}

# Validate database connection
test_database() {
    print_info "Testing database connection..."
    
    if command -v npx &> /dev/null && [ -f "prisma/schema.prisma" ]; then
        if npx prisma db pull --preview-feature 2>/dev/null; then
            print_status "Database connection successful"
        else
            print_warning "Database connection failed. Please check your DATABASE_URL"
        fi
    else
        print_warning "Cannot test database connection. Prisma not available."
    fi
}

# Main setup process
main() {
    echo "Starting FacePay Supabase setup..."
    echo ""
    
    # Step 1: Check dependencies
    check_dependencies
    
    # Step 2: Install Supabase CLI
    install_supabase_cli
    
    # Step 3: Backup existing environment
    backup_env
    
    # Step 4: Setup environment
    setup_environment
    
    # Step 5: Generate Prisma client
    generate_prisma
    
    # Step 6: Test database (optional)
    # test_database
    
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    print_status "FacePay is now configured with Supabase"
    echo ""
    print_info "Next Steps:"
    echo "1. Update .env.production.local with your actual Supabase credentials"
    echo "2. Run the database schema: Copy supabase-complete-schema.sql to your Supabase SQL Editor"
    echo "3. Test the application: npm run dev"
    echo "4. Deploy to production: vercel --prod"
    echo ""
    print_info "Documentation:"
    echo "- Read SUPABASE_CREDENTIALS_GENERATED.md for detailed setup instructions"
    echo "- Check the Supabase dashboard for your project credentials"
    echo ""
    print_status "Happy coding! 🚀"
}

# Help function
show_help() {
    echo "FacePay Supabase Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-deps    Skip dependency checks"
    echo "  --skip-prisma  Skip Prisma client generation"
    echo ""
    echo "This script will:"
    echo "1. Check for required dependencies"
    echo "2. Install Supabase CLI if needed"
    echo "3. Setup environment variables"
    echo "4. Generate Prisma client"
    echo "5. Test database connection"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-prisma)
            SKIP_PRISMA=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main

# ============================================================================
# End of script
# ============================================================================