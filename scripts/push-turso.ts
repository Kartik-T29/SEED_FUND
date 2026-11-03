import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

function cleanToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const cleaned = token.replace(/[^A-Za-z0-9\-_.]/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let cleaned = url.replace(/[^A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=]/g, '').trim();
  if (cleaned.startsWith('turso://')) {
    cleaned = cleaned.replace(/^turso:\/\//, 'libsql://');
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

async function pushToTurso() {
  loadEnv();

  const url = cleanUrl(process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL);
  const authToken = cleanToken(process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN);

  if (!url || !authToken) {
    console.error('Error: Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env or environment.');
    process.exit(1);
  }

  console.log(`Connecting to Turso database: ${url}...`);
  const client = createClient({ url, authToken });

  // Apply updates from deploy directory in order
  const deployDir = path.join(__dirname, '../deploy');
  if (fs.existsSync(deployDir)) {
    const files = fs.readdirSync(deployDir).filter((f) => f.startsWith('update-') && f.endsWith('.sql')).sort();
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(deployDir, file), 'utf8');
      await client.executeMultiple(sql);
      console.log(`✅ Applied ${file}`);
    }
  }

  console.log('✅ Turso database updates complete!');
}

pushToTurso().catch((err) => {
  console.error('Failed to push updates to Turso:', err);
  process.exit(1);
});
