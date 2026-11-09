import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/audit — Admin only; Audit_Logs joined to System_Users, newest first, paginated
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  const pool = getPool();

  const [rows, countResult] = await Promise.all([
    pool.query(
      `SELECT
         al.log_id,
         al.action_type,
         al.target_table,
         al.action_timestamp,
         al.change_details,
         u.username AS acting_username
       FROM Audit_Logs al
       LEFT JOIN System_Users u ON al.user_id = u.user_id
       ORDER BY al.action_timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM Audit_Logs`),
  ]);

  const total = parseInt(countResult.rows[0].total, 10);

  return NextResponse.json({
    logs: rows.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

