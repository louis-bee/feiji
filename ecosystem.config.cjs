module.exports = {
  apps: [
    {
      name: 'feiji',
      cwd: '/var/www/feiji',
      script: 'server/index.ts',
      interpreter: 'node',
      node_args: ['--import', 'tsx'],
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
        DATA_DIR: '/var/www/feiji/var',
        // MAX_UPLOAD_BYTES: '104857600',
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
