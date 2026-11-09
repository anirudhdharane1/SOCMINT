import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT u.user_id, u.username, u.password_hash, r.role_name
     FROM System_Users u
     JOIN Roles r ON u.role_id = r.role_id
     WHERE u.username = $1`,
    [body.username]
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(body.password, user.password_hash);

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken({
    user_id: user.user_id,
    username: user.username,
    role: user.role_name,
  });

  const response = NextResponse.json({
    username: user.username,
    role: user.role_name,
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}

