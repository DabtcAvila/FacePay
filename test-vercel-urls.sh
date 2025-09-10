#!/bin/bash
# FacePay Vercel URL Testing Script
# Based on GitHub: DabtcAvila/FacePay

echo "🔍 Testing FacePay Vercel Deployment URLs"
echo "========================================"
echo "GitHub: DabtcAvila/FacePay"
echo "Date: $(date)"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Primary URLs (most likely to work)
PRIMARY_URLS=(
    "https://facepayai.vercel.app"
    "https://facepay.vercel.app"
    "https://facepay-app.vercel.app"
    "https://facepay-dabtcavila.vercel.app"
    "https://dabtcavila-facepay.vercel.app"
)

# Secondary URLs
SECONDARY_URLS=(
    "https://face-pay.vercel.app"
    "https://facepay-platform.vercel.app"
    "https://facepay-bio.vercel.app"
    "https://facepay-auth.vercel.app"
    "https://facepay-biometric.vercel.app"
    "https://facepay-dabtc-avila.vercel.app"
    "https://dabtc-facepay.vercel.app"
)

# Branch-specific URLs
BRANCH_URLS=(
    "https://facepay-git-main-dabtcavila.vercel.app"
    "https://facepay-git-agent-backend-api-dabtcavila.vercel.app"
    "https://facepay-git-agent-frontend-web-dabtcavila.vercel.app"
    "https://facepayai-git-main.vercel.app"
    "https://facepayai-git-agent-backend-api.vercel.app"
)

working_urls=()
preview_urls=()
failed_urls=()

test_url() {
    local url=$1
    local category=$2
    
    echo -n "  Testing: $url ... "
    
    # Get HTTP status and headers
    response=$(curl -s -I --max-time 10 "$url" 2>/dev/null)
    status_code=$(echo "$response" | head -n 1 | grep -o -E 'HTTP/[0-9\.]+ [0-9]+' | grep -o -E '[0-9]+$')
    
    if [ -z "$status_code" ]; then
        echo -e "${RED}❌ TIMEOUT/ERROR${NC}"
        failed_urls+=("$url")
        return
    fi
    
    case $status_code in
        200)
            echo -e "${GREEN}✅ WORKING (200 OK)${NC}"
            working_urls+=("$url")
            
            # Check if it's a preview deployment
            if echo "$response" | grep -q -i "vercel-deployment-url\|x-vercel-id"; then
                preview_urls+=("$url")
                echo -e "    ${YELLOW}📋 Preview deployment detected${NC}"
            fi
            
            # Try to get title
            title=$(curl -s --max-time 5 "$url" 2>/dev/null | grep -o -i '<title[^>]*>[^<]*</title>' | sed 's/<[^>]*>//g' | head -1)
            if [ ! -z "$title" ]; then
                echo -e "    ${BLUE}📄 Title: $title${NC}"
            fi
            ;;
        301|302)
            echo -e "${YELLOW}🔄 REDIRECT ($status_code)${NC}"
            working_urls+=("$url")
            
            # Get redirect location
            location=$(echo "$response" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n')
            if [ ! -z "$location" ]; then
                echo -e "    ${BLUE}🔗 Redirects to: $location${NC}"
            fi
            ;;
        404)
            echo -e "${RED}❌ NOT FOUND (404)${NC}"
            failed_urls+=("$url")
            ;;
        500|502|503)
            echo -e "${RED}❌ SERVER ERROR ($status_code)${NC}"
            failed_urls+=("$url")
            echo -e "    ${YELLOW}⚠️  Deployment might have build issues${NC}"
            ;;
        *)
            echo -e "${RED}❌ HTTP $status_code${NC}"
            failed_urls+=("$url")
            ;;
    esac
}

# Test primary URLs
echo -e "${BLUE}🎯 Testing PRIMARY URLs (highest probability):${NC}"
for url in "${PRIMARY_URLS[@]}"; do
    test_url "$url" "primary"
done

echo ""
echo -e "${BLUE}🔍 Testing SECONDARY URLs:${NC}"
for url in "${SECONDARY_URLS[@]}"; do
    test_url "$url" "secondary"
done

echo ""
echo -e "${BLUE}🌿 Testing BRANCH-SPECIFIC URLs:${NC}"
for url in "${BRANCH_URLS[@]}"; do
    test_url "$url" "branch"
done

# Summary
echo ""
echo "📊 SUMMARY REPORT"
echo "=================="

if [ ${#working_urls[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ WORKING URLS (${#working_urls[@]}):${NC}"
    for url in "${working_urls[@]}"; do
        echo "   • $url"
    done
else
    echo -e "${RED}❌ No working URLs found${NC}"
fi

if [ ${#preview_urls[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}📋 PREVIEW/BRANCH DEPLOYMENTS (${#preview_urls[@]}):${NC}"
    for url in "${preview_urls[@]}"; do
        echo "   • $url"
    done
fi

echo ""
echo -e "${RED}❌ FAILED URLS (${#failed_urls[@]}):${NC}"
if [ ${#failed_urls[@]} -gt 0 ]; then
    for url in "${failed_urls[@]}"; do
        echo "   • $url"
    done
else
    echo "   (None - all URLs responded)"
fi

# Recommendations
echo ""
echo "💡 NEXT STEPS"
echo "============="

if [ ${#working_urls[@]} -gt 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS! Found working deployment(s).${NC}"
    echo "   → Use the first working URL for your live application"
    echo "   → Update bookmarks and documentation with correct URL"
    
    if [ ${#working_urls[@]} -gt 1 ]; then
        echo "   → Multiple URLs found - check which is your production deployment"
    fi
else
    echo -e "${RED}🚨 No working URLs found. Possible issues:${NC}"
    echo "   1. Project not deployed to Vercel yet"
    echo "   2. GitHub repository not connected to Vercel"
    echo "   3. Build/deployment failed"
    echo "   4. Different project name or username"
    echo ""
    echo -e "${BLUE}🔧 Troubleshooting steps:${NC}"
    echo "   → Run: vercel login && vercel list"
    echo "   → Check Vercel dashboard: https://vercel.com/dashboard"
    echo "   → Verify GitHub integration"
    echo "   → Check build logs for errors"
fi

echo ""
echo "Generated by FacePay URL Discovery Script"
echo "For support: Check PROBABLE_URLS.md for manual testing"