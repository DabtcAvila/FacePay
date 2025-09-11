#!/bin/bash

# FacePay - Vercel Environment Variables Setup Script
# This script configures Vercel environment variables without interactive login

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERCEL_ENV_FILE="/Users/davicho/MASTER proyectos/FacePay/VERCEL_ENV_EXACT.txt"
PROJECT_NAME="facepay-mx"  # Change this to your Vercel project name
TEAM_ID=""  # Optional: Add your team ID if using team account

echo -e "${BLUE}🚀 FacePay Vercel Environment Variables Setup${NC}"
echo "================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if environment file exists
if [[ ! -f "$VERCEL_ENV_FILE" ]]; then
    print_error "Environment file not found: $VERCEL_ENV_FILE"
    exit 1
fi

print_status "Environment file found: $VERCEL_ENV_FILE"

# Function to check if vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        echo ""
        echo "Install Vercel CLI with:"
        echo "npm i -g vercel"
        echo "# or"
        echo "yarn global add vercel"
        echo "# or"
        echo "pnpm add -g vercel"
        exit 1
    fi
    print_status "Vercel CLI is installed"
}

# Function to check authentication
check_vercel_auth() {
    print_info "Checking Vercel authentication..."
    
    if vercel whoami &> /dev/null; then
        local user=$(vercel whoami)
        print_status "Already authenticated as: $user"
        return 0
    else
        print_warning "Not authenticated with Vercel"
        return 1
    fi
}

# Function to authenticate with token
auth_with_token() {
    print_info "Setting up authentication with Vercel token..."
    
    if [[ -n "$VERCEL_TOKEN" ]]; then
        export VERCEL_TOKEN="$VERCEL_TOKEN"
        print_status "Using VERCEL_TOKEN from environment"
    else
        echo ""
        print_warning "VERCEL_TOKEN not found in environment variables"
        echo ""
        echo "To use this script without interactive login, you need a Vercel token:"
        echo "1. Go to https://vercel.com/account/tokens"
        echo "2. Create a new token"
        echo "3. Set it as environment variable:"
        echo "   export VERCEL_TOKEN='your_token_here'"
        echo ""
        echo "Alternative: Run this script with token:"
        echo "   VERCEL_TOKEN='your_token' $0"
        echo ""
        read -p "Do you want to enter the token now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -s -p "Enter your Vercel token: " token
            echo
            export VERCEL_TOKEN="$token"
            print_status "Token set successfully"
        else
            print_error "Cannot proceed without authentication"
            exit 1
        fi
    fi
}

# Function to set environment variables using Vercel CLI
set_env_vars_cli() {
    print_info "Setting environment variables using Vercel CLI..."
    
    local env_scope="production,preview,development"
    local count=0
    
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        
        # Remove quotes from value
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        print_info "Setting $key..."
        
        # Construct vercel env add command
        local cmd="vercel env add \"$key\" \"$value\" $env_scope"
        
        if [[ -n "$TEAM_ID" ]]; then
            cmd="$cmd --scope $TEAM_ID"
        fi
        
        # Execute the command
        if echo "$value" | $cmd > /dev/null 2>&1; then
            print_status "✓ $key set successfully"
            ((count++))
        else
            print_warning "Failed to set $key (may already exist)"
        fi
        
    done < "$VERCEL_ENV_FILE"
    
    print_status "Processed $count environment variables"
}

# Function to generate curl commands for API approach
generate_api_commands() {
    print_info "Generating Vercel API commands..."
    
    local api_file="/Users/davicho/MASTER proyectos/FacePay/vercel-api-commands.sh"
    
    cat > "$api_file" << 'EOF'
#!/bin/bash

# Vercel API Environment Variables Setup
# Alternative method using Vercel API directly

# Set your token here
VERCEL_TOKEN="${VERCEL_TOKEN:-your_token_here}"
PROJECT_ID="${PROJECT_ID:-your_project_id}"  # Get this from Vercel dashboard

if [[ "$VERCEL_TOKEN" == "your_token_here" ]]; then
    echo "❌ Please set VERCEL_TOKEN environment variable"
    echo "Get your token from: https://vercel.com/account/tokens"
    exit 1
fi

if [[ "$PROJECT_ID" == "your_project_id" ]]; then
    echo "❌ Please set PROJECT_ID environment variable"
    echo "Get your project ID from Vercel dashboard or API"
    exit 1
fi

# Function to set environment variable via API
set_env_var() {
    local key="$1"
    local value="$2"
    local target="${3:-production,preview,development}"
    
    curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"key\": \"$key\",
            \"value\": \"$value\",
            \"target\": [\"production\", \"preview\", \"development\"]
        }"
}

# Environment variables to set:
EOF

    # Add each environment variable as a function call
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        echo "set_env_var \"$key\" \"$value\"" >> "$api_file"
    done < "$VERCEL_ENV_FILE"
    
    chmod +x "$api_file"
    print_status "API commands generated: $api_file"
}

# Function to create manual instructions
create_manual_instructions() {
    local instructions_file="/Users/davicho/MASTER proyectos/FacePay/vercel-env-instructions.md"
    
    cat > "$instructions_file" << EOF
# Vercel Environment Variables Setup Instructions

## Method 1: Using Vercel CLI (Recommended)

### Prerequisites
1. Install Vercel CLI: \`npm i -g vercel\`
2. Get your Vercel token from: https://vercel.com/account/tokens

### Setup Steps
\`\`\`bash
# Set your token
export VERCEL_TOKEN='your_token_here'

# Run the setup script
./setup-env-vercel.sh
\`\`\`

## Method 2: Using Vercel API Directly

### Prerequisites
1. Get your Vercel token from: https://vercel.com/account/tokens
2. Get your Project ID from Vercel dashboard

### Setup Steps
\`\`\`bash
# Set required variables
export VERCEL_TOKEN='your_token_here'
export PROJECT_ID='your_project_id'

# Run the API commands
./vercel-api-commands.sh
\`\`\`

## Method 3: Manual Setup via Vercel Dashboard

Go to your project settings and add these environment variables:

EOF

    # Add each environment variable to the instructions
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        echo "- **$key**: \`$value\`" >> "$instructions_file"
    done < "$VERCEL_ENV_FILE"
    
    cat >> "$instructions_file" << EOF

## Verification

After setting up environment variables, verify they are set correctly:

\`\`\`bash
vercel env ls
\`\`\`

## Troubleshooting

### Authentication Issues
- Ensure VERCEL_TOKEN is set correctly
- Token should have appropriate permissions
- Check token is not expired

### Project Issues
- Verify PROJECT_ID is correct
- Ensure you have access to the project
- Check project exists in your account/team

### Environment Variable Issues
- Some variables may already exist (will show warnings)
- Check for special characters in values
- Verify all required variables are set

## Support
- Vercel CLI documentation: https://vercel.com/docs/cli
- Vercel API documentation: https://vercel.com/docs/rest-api
EOF

    print_status "Manual instructions created: $instructions_file"
}

# Main execution
main() {
    print_info "Starting Vercel environment setup..."
    
    # Check prerequisites
    check_vercel_cli
    
    # Check authentication
    if ! check_vercel_auth; then
        auth_with_token
    fi
    
    # Set environment variables
    print_info "Setting up environment variables..."
    set_env_vars_cli
    
    # Generate additional resources
    generate_api_commands
    create_manual_instructions
    
    echo ""
    print_status "Setup completed successfully!"
    echo ""
    print_info "Generated files:"
    echo "  - vercel-api-commands.sh (API method)"
    echo "  - vercel-env-instructions.md (manual instructions)"
    echo ""
    print_info "Verify your environment variables with:"
    echo "  vercel env ls"
    echo ""
    print_info "Deploy your project:"
    echo "  vercel --prod"
}

# Run main function
main "$@"