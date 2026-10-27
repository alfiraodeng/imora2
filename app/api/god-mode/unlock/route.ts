import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_HASH, godModeCookie } from '../session';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const received = createHash('sha256').update(password).digest('hex');
  const allowed = received.length === ACCESS_HASH.length
    && timingSafeEqual(Buffer.from(received), Buffer.from(ACCESS_HASH));

  if (!allowed) return NextResponse.json({ error: 'Akses tidak diizinkan.' }, { status: 401 });
  const response = NextResponse.json({ unlocked: true });
  response.cookies.set(godModeCookie.name, godModeCookie.value, godModeCookie.options);
  return response;
}
