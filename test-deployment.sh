#!/bin/bash

# FacePay Deployment URL Tester
# Tests multiple possible Vercel URLs and reports working ones

echo "🚀 FacePay Deployment URL Tester"
echo "================================="
echo ""

# Array of URLs to test
urls=(
    "https://facepay.vercel.app"
    "https://facepayai.vercel.app"
    "https://facepay-dabtcavila.vercel.app"
    "https://face-pay.vercel.app"
    "https://facepay-app.vercel.app"
    "https://facepay-ai.vercel.app"
    "https://facepay-main.vercel.app"
    "https://facepay-frontend.vercel.app"
    "https://facepay-web.vercel.app"
    "https://facepay-client.vercel.app"
)

working_urls=()
failed_urls=()

echo "Testing URLs..."
echo ""

# Function to test a single URL
test_url() {
    local url=$1
    local timeout=10
    
    # Use curl to test the URL
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $timeout --max-time $timeout "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "✅ WORKING: $url (Status: $response)"
        working_urls+=("$url")
        return 0
    elif [ "$response" = "000" ]; then
        echo "❌ FAILED: $url (Connection timeout/failed)"
        failed_urls+=("$url")
        return 1
    else
        echo "⚠️  ISSUE: $url (Status: $response)"
        failed_urls+=("$url")
        return 1
    fi
}

# Test each URL
for url in "${urls[@]}"; do
    test_url "$url"
done

echo ""
echo "================================="
echo "📊 RESULTS SUMMARY"
echo "================================="

if [ ${#working_urls[@]} -gt 0 ]; then
    echo ""
    echo "✅ WORKING URLS (${#working_urls[@]}):"
    for url in "${working_urls[@]}"; do
        echo "   • $url"
    done
    
    echo ""
    echo "🎯 RECOMMENDED URL: ${working_urls[0]}"
else
    echo ""
    echo "❌ No working URLs found!"
fi

if [ ${#failed_urls[@]} -gt 0 ]; then
    echo ""
    echo "❌ FAILED URLS (${#failed_urls[@]}):"
    for url in "${failed_urls[@]}"; do
        echo "   • $url"
    done
fi

echo ""
echo "================================="

# Additional checks
echo ""
echo "🔍 ADDITIONAL CHECKS"
echo "================================="

if [ ${#working_urls[@]} -gt 0 ]; then
    main_url=${working_urls[0]}
    echo "Testing main functionality on: $main_url"
    echo ""
    
    # Test if it's a React/Next.js app (look for common indicators)
    echo "📱 Checking if it's a web app..."
    content=$(curl -s --connect-timeout 10 --max-time 10 "$main_url" 2>/dev/null)
    
    if echo "$content" | grep -qi "react\|next\|javascript\|<div\|<script"; then
        echo "✅ Appears to be a web application"
    else
        echo "⚠️  May not be a standard web application"
    fi
    
    # Check for common FacePay-related content
    echo ""
    echo "🔎 Checking for FacePay content..."
    if echo "$content" | grep -qi "facepay\|face.*pay\|biometric\|authentication"; then
        echo "✅ Contains FacePay-related content"
    else
        echo "⚠️  No obvious FacePay content detected"
    fi
    
    echo ""
    echo "🌐 You can visit the working URL: $main_url"
else
    echo "❌ No working URLs to test further"
    echo ""
    echo "💡 Suggestions:"
    echo "   • Check if the deployment is in progress"
    echo "   • Verify the correct Vercel project name"
    echo "   • Check Vercel dashboard for actual deployment URL"
    echo "   • Ensure the project is deployed and not in draft mode"
fi

echo ""
echo "================================="
echo "✨ Test completed!"
echo "================================="

# Exit with appropriate code
if [ ${#working_urls[@]} -gt 0 ]; then
    exit 0
else
    exit 1
fi