import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'imora_god_mode';
const ACCESS_HASH = '5133e70c720516b78b8ce82cff7614e23d1beea170820836c4c399a5612896ba';

function signature() {
  // Short-lived session proof. The password itself never exists in source code
  // or in a browser storage value.
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', ACCESS_HASH).update(`imora-god-mode:${day}`).digest('hex');
}

export function isGodModeSession(request: NextRequest) {
  const received = request.cookies.get(COOKIE_NAME)?.value;
  const expected = signature();
  if (!received || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export const godModeCookie = {
  name: COOKIE_NAME,
  value: signature(),
  options: {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  },
};

export { ACCESS_HASH };
