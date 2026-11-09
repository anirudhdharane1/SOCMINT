import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/accounts — create a new monitored account (all authenticated roles)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { platform_id, target_executive_id, platform_handle, display_name } = body;
  if (!platform_id || !platform_handle) {
    return NextResponse.json({ error: 'platform_id and platform_handle are required' }, { status: 400 });
  }

  const pool = getPool();
  try {
    const result = await pool.query(
      `INSERT INTO Monitored_Accounts (platform_id, target_executive_id, platform_handle, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING account_id, platform_handle, display_name, threat_status, risk_score`,
      [platform_id, target_executive_id ?? null, platform_handle, display_name ?? null]
    );
    return NextResponse.json({ account: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'An account with this handle already exists on this platform' },
        { status: 409 }
      );
    }
    if (msg.includes('violates foreign key') || msg.includes('not present in table')) {
      return NextResponse.json({ error: `Constraint violation: ${msg}` }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

