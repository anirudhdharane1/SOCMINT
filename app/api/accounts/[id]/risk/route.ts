import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// PATCH /api/accounts/[id]/risk — update risk score via stored procedure in a transaction
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/accounts/[id]/risk'>
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;

  const body = await request.json().catch(() => null);
  if (body?.score === undefined) {
    return NextResponse.json({ error: 'score is required' }, { status: 400 });
  }

  const score = Number(body.score);
  if (isNaN(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: 'score must be a number between 0 and 100' }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Set acting user for the audit trigger
    await client.query(
      `SELECT set_config('app.current_user_id', $1, true)`,
      [session.user_id]
    );
    // Call the stored procedure
    await client.query(
      `CALL update_account_risk($1::uuid, $2::decimal)`,
      [id, score]
    );
    await client.query('COMMIT');

    // Return the updated account
    const result = await pool.query(
      `SELECT account_id, platform_handle, threat_status, risk_score
       FROM Monitored_Accounts WHERE account_id = $1`,
      [id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ account: result.rows[0] });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

