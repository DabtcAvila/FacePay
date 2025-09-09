#!/usr/bin/env node

/**
 * Redis Setup Script for FacePay
 * 
 * This script initializes all Redis services and performs health checks.
 * Run with: node scripts/setup-redis.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setupRedis() {
  console.log('🚀 Setting up Redis infrastructure for FacePay...\n');

  try {
    // 1. Check if Docker is running
    console.log('1️⃣ Checking Docker...');
    try {
      execSync('docker --version', { stdio: 'pipe' });
      console.log('   ✅ Docker is available');
    } catch (error) {
      console.error('   ❌ Docker is not available. Please install Docker first.');
      process.exit(1);
    }

    // 2. Check if docker-compose.yml exists
    console.log('\n2️⃣ Checking configuration files...');
    const composeFile = path.join(process.cwd(), 'docker-compose.yml');
    if (!fs.existsSync(composeFile)) {
      console.error('   ❌ docker-compose.yml not found');
      process.exit(1);
    }
    console.log('   ✅ docker-compose.yml found');

    // 3. Check if .env file exists, create from example if not
    const envFile = path.join(process.cwd(), '.env');
    const envExampleFile = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExampleFile)) {
      console.log('   📝 Creating .env file from .env.example...');
      fs.copyFileSync(envExampleFile, envFile);
      console.log('   ✅ .env file created. Please review and update Redis credentials.');
    }

    // 4. Start Redis services
    console.log('\n3️⃣ Starting Redis services...');
    console.log('   🔄 Starting Redis main instance...');
    
    try {
      // Start basic Redis service
      execSync('docker-compose up -d redis', { stdio: 'inherit' });
      console.log('   ✅ Redis main instance started');

      // Wait for Redis to be ready
      console.log('   ⏳ Waiting for Redis to be ready...');
      await waitForService('redis', 6379, 30);
      console.log('   ✅ Redis is ready');

    } catch (error) {
      console.error('   ❌ Failed to start Redis:', error.message);
      process.exit(1);
    }

    // 5. Start optional services based on profiles
    console.log('\n4️⃣ Starting optional services...');
    
    // Start Redis tools (Commander, Insight)
    try {
      console.log('   🔄 Starting Redis management tools...');
      execSync('docker-compose --profile tools up -d', { stdio: 'inherit' });
      console.log('   ✅ Redis tools started');
      console.log('   📊 Redis Commander available at: http://localhost:8081');
      console.log('   📈 RedisInsight available at: http://localhost:8001');
    } catch (error) {
      console.log('   ⚠️ Optional Redis tools failed to start (non-critical)');
    }

    // 6. Test Redis connection
    console.log('\n5️⃣ Testing Redis connection...');
    try {
      execSync('docker exec facepay-redis redis-cli ping', { stdio: 'pipe' });
      console.log('   ✅ Redis connection test passed');
    } catch (error) {
      console.error('   ❌ Redis connection test failed');
      process.exit(1);
    }

    // 7. Initialize Redis with test data
    console.log('\n6️⃣ Initializing Redis with test data...');
    try {
      // Set some test keys
      const testCommands = [
        'SET facepay:setup:timestamp ' + Date.now(),
        'SET facepay:setup:version "1.0.0"',
        'EXPIRE facepay:setup:timestamp 3600',
        'EXPIRE facepay:setup:version 3600'
      ];

      for (const cmd of testCommands) {
        execSync(`docker exec facepay-redis redis-cli ${cmd}`, { stdio: 'pipe' });
      }
      
      console.log('   ✅ Test data initialized');
    } catch (error) {
      console.log('   ⚠️ Failed to initialize test data (non-critical)');
    }

    // 8. Show Redis info
    console.log('\n7️⃣ Redis Information:');
    try {
      const info = execSync('docker exec facepay-redis redis-cli INFO server', { encoding: 'utf8' });
      const lines = info.split('\r\n');
      const version = lines.find(line => line.startsWith('redis_version:'))?.split(':')[1];
      const mode = lines.find(line => line.startsWith('redis_mode:'))?.split(':')[1];
      
      console.log(`   📋 Redis Version: ${version}`);
      console.log(`   📋 Redis Mode: ${mode}`);
      console.log(`   📋 Container: facepay-redis`);
      console.log(`   📋 Port: 6379`);
      console.log(`   📋 Password: Check .env file`);
    } catch (error) {
      console.log('   ⚠️ Could not retrieve Redis info');
    }

    // 9. Display next steps
    console.log('\n✅ Redis setup completed successfully!\n');
    console.log('🔗 Next Steps:');
    console.log('   1. Update your .env file with the correct Redis credentials');
    console.log('   2. Start your Next.js application: npm run dev');
    console.log('   3. Test the Redis health endpoint: http://localhost:3000/api/health/redis');
    console.log('   4. Monitor Redis with Redis Commander: http://localhost:8081');
    console.log('   5. Use RedisInsight for advanced monitoring: http://localhost:8001\n');

    console.log('🔧 Management Commands:');
    console.log('   • Stop Redis: docker-compose down');
    console.log('   • View logs: docker-compose logs redis');
    console.log('   • Redis CLI: docker exec -it facepay-redis redis-cli');
    console.log('   • Start monitoring: docker-compose --profile monitoring up -d\n');

    console.log('🚨 High Availability Options:');
    console.log('   • Redis Sentinel: docker-compose --profile ha up -d');
    console.log('   • Redis Cluster: docker-compose --profile cluster up -d');
    console.log('   • Monitoring Stack: docker-compose --profile monitoring up -d\n');

  } catch (error) {
    console.error('\n❌ Redis setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check if Docker is running: docker ps');
    console.error('   • Check Docker Compose version: docker-compose --version');
    console.error('   • Check logs: docker-compose logs redis');
    console.error('   • Clean up and retry: docker-compose down && docker system prune -f\n');
    process.exit(1);
  }
}

// Helper function to wait for a service to be ready
function waitForService(serviceName, port, timeoutSeconds) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;

    const check = () => {
      try {
        execSync(`docker exec facepay-${serviceName} sh -c "redis-cli ping"`, { stdio: 'pipe' });
        resolve();
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Service ${serviceName} did not start within ${timeoutSeconds} seconds`));
        } else {
          setTimeout(check, 1000);
        }
      }
    };

    check();
  });
}

// Helper function to check if port is available
function isPortAvailable(port) {
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti:${port}`, { stdio: 'pipe' });
    return false; // Port is in use
  } catch {
    return true; // Port is available
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupRedis().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupRedis };