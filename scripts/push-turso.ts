import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

async function pushToTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
    console.error('Example: TURSO_DATABASE_URL="libsql://your-db-org.turso.io" TURSO_AUTH_TOKEN="your-token" npm run db:push:turso');
    process.exit(1);
  }

  console.log(`Connecting to Turso database: ${url}...`);
  const client = createClient({ url, authToken });

  const sqlPath = path.join(__dirname, '../prisma/sqlite_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing schema DDL on Turso...');
  await client.executeMultiple(sql);
  console.log('✅ Schema successfully pushed to Turso database!');
}

pushToTurso().catch((err) => {
  console.error('Failed to push schema to Turso:', err);
  process.exit(1);
});
