# Start Dafel Technologies Project

Quick startup command for the Dafel Technologies AI solutions website.

## Immediate Actions:

1. **Check Docker Status**
   - Verify Docker Desktop is running
   - If not running, alert: "Please start Docker Desktop first"

2. **Navigate to Project Root**
   - Find and cd into the Dafel Technologies project folder

3. **Start the Project**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```
   
   If container already exists from previous session:
   ```bash
   docker-compose -f docker-compose.dev.yml start
   ```
   
   If you need a fresh build:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Verify Success**
   - Confirm Next.js starts successfully
   - Report when available at http://localhost:3000
   - Show status: "✅ Dafel Technologies running at localhost:3000"

## Expected Output:
- Frontend container: dafel-frontend-dev
- Next.js 14.2.5 running
- Available at: http://localhost:3000

## Quick Troubleshooting:
- Port 3000 occupied: `docker-compose -f docker-compose.dev.yml down` then retry
- Container issues: `docker-compose -f docker-compose.dev.yml up --build --force-recreate`

Just run the startup sequence and confirm when ready.