import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getDriver } from '@/lib/neo4j';

export const runtime = 'nodejs';

export async function GET() {
  const results: Record<string, string> = {};

  // PostgreSQL check
  try {
    const pool = getPool();
    const res = await pool.query('SELECT NOW() AS now');
    results.postgres = `ok — server time ${res.rows[0].now}`;
  } catch (err: unknown) {
    results.postgres = `error — ${err instanceof Error ? err.message : String(err)}`;
  }

  // Neo4j check
  try {
    const driver = getDriver();
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    results.neo4j = 'ok';
  } catch (err: unknown) {
    results.neo4j = `error — ${err instanceof Error ? err.message : String(err)}`;
  }

  const allOk = Object.values(results).every((v) => v.startsWith('ok'));
  return NextResponse.json(results, { status: allOk ? 200 : 503 });
}

