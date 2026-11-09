import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/accounts/[id]/confirm-ring
// 1. Query Neo4j for all accounts in the same ring (shared IP or email domain)
// 2. Map neo4j_node_ref → Postgres account_id
// 3. CALL bulk_confirm_accounts(uuid[]) in a transaction with set_config
export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/accounts/[id]/confirm-ring'>
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Admin and Analyst allowed
  if (!['Admin', 'Analyst'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;

  // Resolve neo4j_node_ref for this account
  const pool = getPool();
  const pgResult = await pool.query(
    `SELECT neo4j_node_ref FROM Monitored_Accounts WHERE account_id = $1`,
    [id]
  );
  if (!pgResult.rows[0]) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const { neo4j_node_ref } = pgResult.rows[0];
  if (!neo4j_node_ref) {
    return NextResponse.json({ error: 'This account has no graph node — no ring to confirm' }, { status: 400 });
  }

  // Get all ring members from Neo4j (accounts sharing any IP or email domain)
  const driver = getDriver();
  const neo4jSession = driver.session();
  let ringNodeRefs: string[] = [];
  try {
    const result = await neo4jSession.run(
      `MATCH (a:Account {id: $nodeId})
       MATCH (ring:Account)
       WHERE (ring)-[:USED_IP]->(:IP)<-[:USED_IP]-(a)
          OR (ring)-[:REGISTERED_WITH]->(:EmailDomain)<-[:REGISTERED_WITH]-(a)
       RETURN COLLECT(DISTINCT ring.id) AS ringIds`,
      { nodeId: neo4j_node_ref }
    );
    if (result.records.length > 0) {
      ringNodeRefs = result.records[0].get('ringIds') as string[];
    }
  } finally {
    await neo4jSession.close();
  }

  // Always include the root account itself
  if (!ringNodeRefs.includes(neo4j_node_ref)) {
    ringNodeRefs.push(neo4j_node_ref);
  }

  if (ringNodeRefs.length === 0) {
    return NextResponse.json({ error: 'No ring members found in graph' }, { status: 404 });
  }

  // Map neo4j_node_refs → Postgres account_ids
  const mapResult = await pool.query(
    `SELECT account_id FROM Monitored_Accounts WHERE neo4j_node_ref = ANY($1::text[])`,
    [ringNodeRefs]
  );
  const accountIds: string[] = mapResult.rows.map((r) => r.account_id);

  if (accountIds.length === 0) {
    return NextResponse.json({ error: 'No matching Postgres accounts found for ring' }, { status: 404 });
  }

  // Run bulk_confirm_accounts in a transaction with the acting user set
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_user_id', $1, true)`,
      [session.user_id]
    );
    await client.query(
      `CALL bulk_confirm_accounts($1::uuid[])`,
      [accountIds]
    );
    await client.query('COMMIT');

    return NextResponse.json({ confirmed: accountIds.length, account_ids: accountIds });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

