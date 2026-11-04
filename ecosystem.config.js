const fs = require('fs');
const path = require('path');

const envConfig = {};
try {
  const envPath = fs.existsSync('/etc/seedfund/seedfund.env')
    ? '/etc/seedfund/seedfund.env'
    : path.join(__dirname, '.env');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        envConfig[key] = val;
      }
    }
  }
} catch (e) {
  console.error('Could not load env file:', e);
}

module.exports = {
  apps: [
    {
      name: 'seedfund',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/home/ec2-user/SEED_FUND',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        ...envConfig,
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
