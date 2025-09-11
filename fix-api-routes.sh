#!/bin/bash

# Fix all API routes to prevent static generation
find src/app/api -name "route.ts" -type f | while read -r file; do
  if ! grep -q "export const dynamic" "$file"; then
    echo "Fixing: $file"
    echo "" >> "$file"
    echo "// Prevent static generation" >> "$file"
    echo "export const dynamic = 'force-dynamic'" >> "$file"
  fi
done

echo "All API routes fixed!"