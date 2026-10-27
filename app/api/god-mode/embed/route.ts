import { NextRequest, NextResponse } from 'next/server';
import { isGodModeSession } from '../session';

export function GET(request: NextRequest) {
  if (!isGodModeSession(request)) return NextResponse.json({ error: 'Akses tidak diizinkan.' }, { status: 401 });
  // This remains server-only so the URL is not embedded into the public bundle.
  return NextResponse.json({ embedUrl: process.env.GOD_MODE_3D_URL ?? null });
}
