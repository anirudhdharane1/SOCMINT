import { Pool } from 'pg';

// Singleton pg Pool — created once per Node.js process.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

