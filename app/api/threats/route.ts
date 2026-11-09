import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status   = searchParams.get('status');
  const platform = searchParams.get('platform');
  const company  = searchParams.get('company');
  const search   = searchParams.get('search');

  // Build a dynamic WHERE clause on top of the view
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status)   { conditions.push(`threat_status = $${idx++}`);   values.push(status); }
  if (platform) { conditions.push(`platform_name = $${idx++}`);   values.push(platform); }
  if (company)  { conditions.push(`company_name ILIKE $${idx++}`); values.push(`%${company}%`); }
  if (search)   {
    conditions.push(
      `(platform_handle ILIKE $${idx} OR display_name ILIKE $${idx} OR targeted_executive ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const pool = getPool();
  const result = await pool.query(
    `SELECT account_id, platform_handle, display_name, threat_status,
            risk_score, targeted_executive, company_name, platform_name
     FROM v_active_phishing_threats
     ${where}
     ORDER BY risk_score DESC`,
    values
  );

  return NextResponse.json({ threats: result.rows });
}

