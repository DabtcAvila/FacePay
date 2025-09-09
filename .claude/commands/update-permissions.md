# Update Settings.local.json Permissions

## Quick Update Script

### Step 1: Backup Current Settings
```bash
# Create backup with timestamp
cp .claude/settings.local.json .claude/settings.local.json.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Extract Current Session Permissions

To identify all permissions used in current session:

```bash
# View recent commands (last 100 lines of history)
history | tail -100

# Or check Claude Code logs for permission requests
# Look for patterns like:
# - Bash commands executed
# - WebFetch domains accessed
# - File paths modified
```

### Step 3: Update JSON Structure

The settings.local.json must follow this exact structure:

```json
{
  "permissions": {
    "allow": [
      // Add each permission as a string
      "Bash(command:*)",
      "WebFetch(domain:example.com)",
      "mcp__ide__function"
    ],
    "deny": [],
    "additionalDirectories": [
      "/path/to/allowed/directory"
    ]
  }
}
```

### Step 4: Common Permission Patterns

#### File Operations
```json
"Bash(ls:*)",
"Bash(mkdir:*)",
"Bash(touch:*)",
"Bash(rm:*)",
"Bash(mv:*)",
"Bash(cat:*)"
```

#### Git Operations
```json
"Bash(git:*)",
"Bash(git status)",
"Bash(git diff)",
"Bash(git log)"
```

#### NPM/Node Operations
```json
"Bash(npm install)",
"Bash(npm install:*)",
"Bash(npm run dev)",
"Bash(npm run build:*)",
"Bash(npx:*)"
```

#### Database Operations
```json
"Bash(psql:*)",
"Bash(PGPASSWORD=*)",
"Bash(npx prisma:*)"
```

#### Docker Operations
```json
"Bash(docker:*)",
"Bash(docker-compose:*)",
"Bash(docker ps)",
"Bash(docker logs:*)"
```

#### Process Management
```json
"Bash(kill:*)",
"Bash(lsof:*)",
"Bash(ps:*)"
```

#### System Operations
```json
"Bash(open:*)",
"Bash(which:*)",
"Bash(sleep:*)",
"Bash(echo:*)"
```

### Step 5: Validate JSON

```bash
# Use jq to validate and format
cat .claude/settings.local.json | jq '.' > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Pretty print the JSON
cat .claude/settings.local.json | jq '.'
```

### Step 6: Test Permissions

After updating, test a few commands to ensure they work:

```bash
# Test file operations
ls -la

# Test npm operations
npm list

# Test git operations
git status
```

## Manual Update Process

1. **Open the file:**
   ```bash
   code .claude/settings.local.json
   # or
   nano .claude/settings.local.json
   ```

2. **Add new permissions to the "allow" array:**
   - Each permission must be a string
   - Use wildcards (*) for flexibility
   - Maintain alphabetical order for readability

3. **Save and validate:**
   - Ensure no trailing commas
   - Check bracket matching
   - Verify quotes are correct

## Common Issues and Fixes

### Issue: Permission Denied
**Fix:** Add the specific command pattern to allow list
```json
"Bash(specific-command:*)"
```

### Issue: Directory Access Denied
**Fix:** Add directory to additionalDirectories
```json
"additionalDirectories": [
  "/path/to/directory"
]
```

### Issue: Invalid JSON
**Fix:** Check for:
- Missing commas between array items
- Extra commas after last item
- Mismatched brackets or quotes
- Invalid escape sequences

## Automation Script

Create a helper script to add permissions:

```bash
#!/bin/bash
# add-permission.sh

SETTINGS_FILE=".claude/settings.local.json"
PERMISSION=$1

# Backup current file
cp $SETTINGS_FILE $SETTINGS_FILE.backup

# Add permission (requires jq)
jq ".permissions.allow += [\"$PERMISSION\"]" $SETTINGS_FILE > tmp.json && mv tmp.json $SETTINGS_FILE

echo "Added permission: $PERMISSION"
```

Usage:
```bash
./add-permission.sh "Bash(new-command:*)"
```

## Quick Permission Reference

### Essential Permissions for Web Development
```json
[
  "Bash(ls:*)",
  "Bash(cd:*)",
  "Bash(npm:*)",
  "Bash(npx:*)",
  "Bash(git:*)",
  "Bash(cat:*)",
  "Bash(echo:*)",
  "Bash(mkdir:*)",
  "Bash(rm:*)",
  "Bash(mv:*)",
  "WebFetch(domain:*)"
]
```

### Database Development
```json
[
  "Bash(psql:*)",
  "Bash(mysql:*)",
  "Bash(mongod:*)",
  "Bash(redis-cli:*)",
  "Bash(npx prisma:*)"
]
```

### DevOps and Deployment
```json
[
  "Bash(docker:*)",
  "Bash(docker-compose:*)",
  "Bash(kubectl:*)",
  "Bash(terraform:*)",
  "Bash(aws:*)"
]
```

## Notes

- **Security:** Only add permissions you actually need
- **Wildcards:** Use `*` carefully - be specific when possible
- **Testing:** Always test after updating permissions
- **Documentation:** Keep track of why each permission was added
- **Version Control:** Consider tracking settings.local.json in git (without sensitive data)

---

**Last Updated:** September 2, 2025  
**Version:** 1.0.0