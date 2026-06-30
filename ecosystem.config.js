module.exports = {
  apps: [
    {
      name: 'mocavis-be',
      cwd: '~/MOCA-Vision/web-backend',
      script: 'bun start:prod',
      interpreter: 'bun',
      max_memory_restart: '100M',
      cron_restart: '0 3 * * *', // Restart every 3 AM
      autorestart: true,
      watch: false,
      exp_backoff_restart_delay: 100,
      shutdown_with_message: true,
    },
    {
      name: 'mocavis-fe',
      cwd: '~/MOCA-Vision/web-frontend',
      script: 'bun preview:prod',
      interpreter: 'bun',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      exp_backoff_restart_delay: 100,
      shutdown_with_message: true,
    },
  ],
};