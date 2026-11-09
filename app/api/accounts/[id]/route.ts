import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/accounts/[id] — account + executive + company + 10 most recent posts
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/accounts/[id]'>
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const pool = getPool();

  const [accountResult, postsResult] = await Promise.all([
    pool.query(
      `SELECT
         m.account_id, m.platform_handle, m.display_name, m.threat_status,
         m.risk_score, m.neo4j_node_ref,
         e.executive_id, e.first_name, e.last_name, e.official_title, e.employment_status,
         c.company_id, c.company_name, c.primary_domain,
         p.platform_name
       FROM Monitored_Accounts m
       LEFT JOIN Executives e ON m.target_executive_id = e.executive_id
       LEFT JOIN Companies c ON e.company_id = c.company_id
       JOIN Social_Platforms p ON m.platform_id = p.platform_id
       WHERE m.account_id = $1`,
      [id]
    ),
    pool.query(
      `SELECT post_id, raw_content, posted_at
       FROM Social_Posts
       WHERE account_id = $1
       ORDER BY posted_at DESC
       LIMIT 10`,
      [id]
    ),
  ]);

  if (!accountResult.rows[0]) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({
    account: accountResult.rows[0],
    posts: postsResult.rows,
  });
}

// DELETE /api/accounts/[id] — Admin only; posts cascade via FK
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/accounts/[id]'>
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const pool = getPool();

  const result = await pool.query(
    `DELETE FROM Monitored_Accounts WHERE account_id = $1 RETURNING account_id`,
    [id]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: result.rows[0].account_id });
}
