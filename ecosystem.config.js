/**
 * PM2 Ecosystem Configuration for FacePay
 * Production-ready process management
 */

module.exports = {
  apps: [
    {
      name: 'facepay-server',
      script: 'src/server/index.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4000
      },
      
      // Logging
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      watch: false, // Disable in production
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '.next',
        'coverage'
      ],
      
      // Memory and CPU limits
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto-restart on file changes (development only)
      watch_delay: 1000,
      
      // Advanced configuration
      merge_logs: true,
      combine_logs: true,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Automation
      autorestart: true,
      
      // Health check
      health_check_grace_period: 3000
    },
    
    // Optional: Next.js frontend
    {
      name: 'facepay-frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Logging
      log_file: './logs/frontend-combined.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      
      // Only start if built
      watch: false,
      autorestart: true,
      max_memory_restart: '500M'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST,
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO,
      path: process.env.DEPLOY_PATH || '/var/www/facepay',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run prisma:generate && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: process.env.STAGING_USER || 'deploy',
      host: process.env.STAGING_HOST,
      ref: 'origin/develop',
      repo: process.env.DEPLOY_REPO,
      path: process.env.STAGING_PATH || '/var/www/facepay-staging',
      
      'post-deploy': 'npm install && npm run prisma:generate && npm run build && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};