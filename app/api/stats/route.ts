import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pool = getPool();

  // Run all stat queries concurrently
  const [statusCounts, execWithImpostors, companyThreats, aboveAvgRisk] = await Promise.all([
    // 1. Counts by status
    pool.query(`
      SELECT threat_status, COUNT(*) AS count
      FROM Monitored_Accounts
      GROUP BY threat_status
      ORDER BY count DESC
    `),

    // 2. Executives with 2+ impostors (GROUP BY + HAVING)
    pool.query(`
      SELECT e.first_name || ' ' || e.last_name AS executive,
             e.official_title,
             c.company_name,
             COUNT(m.account_id) AS impostor_count
      FROM Executives e
      JOIN Companies c ON e.company_id = c.company_id
      JOIN Monitored_Accounts m ON m.target_executive_id = e.executive_id
      WHERE m.threat_status IN ('Suspect', 'Confirmed_Phishing')
      GROUP BY e.executive_id, e.first_name, e.last_name, e.official_title, c.company_name
      HAVING COUNT(m.account_id) >= 2
      ORDER BY impostor_count DESC
      LIMIT 10
    `),

    // 3. Per-company threat counts including companies with zero (LEFT JOIN)
    pool.query(`
      SELECT c.company_name,
             COUNT(m.account_id) FILTER (WHERE m.threat_status IN ('Suspect','Confirmed_Phishing')) AS threat_count
      FROM Companies c
      LEFT JOIN Executives e ON e.company_id = c.company_id
      LEFT JOIN Monitored_Accounts m ON m.target_executive_id = e.executive_id
      GROUP BY c.company_id, c.company_name
      ORDER BY threat_count DESC
      LIMIT 15
    `),

    // 4. Accounts whose risk_score is above the average (subquery)
    pool.query(`
      SELECT m.account_id, m.platform_handle, m.threat_status, m.risk_score,
             e.first_name || ' ' || e.last_name AS targeted_executive,
             c.company_name
      FROM Monitored_Accounts m
      LEFT JOIN Executives e ON m.target_executive_id = e.executive_id
      LEFT JOIN Companies c ON e.company_id = c.company_id
      WHERE m.risk_score > (SELECT AVG(risk_score) FROM Monitored_Accounts)
      ORDER BY m.risk_score DESC
      LIMIT 10
    `),
  ]);

  // Shape status counts into a map
  const byStatus: Record<string, number> = {};
  for (const row of statusCounts.rows) {
    byStatus[row.threat_status] = parseInt(row.count, 10);
  }

  return NextResponse.json({
    byStatus,
    totalAccounts: statusCounts.rows.reduce((s, r) => s + parseInt(r.count, 10), 0),
    execWithImpostors: execWithImpostors.rows,
    companyThreats: companyThreats.rows,
    aboveAvgRisk: aboveAvgRisk.rows,
  });
}

