import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const resources = [
  'profile',
  'scenarios',
  'monitoring_areas',
  'status_history',
  'forecast_history',
  'notifications',
] as const;

type Resource = (typeof resources)[number];

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Exports only the authenticated caller's IMORA operational data.
 * A Supabase access token is intentionally required: never expose the
 * service-role key or an unrestricted all-user export from this endpoint.
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return responseError('Authorization Bearer token is required.', 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return responseError('Database connection is not configured.', 503);

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return responseError('Invalid or expired access token.', 401);

  const requested = request.nextUrl.searchParams.get('resource');
  if (requested && !resources.includes(requested as Resource)) {
    return responseError(`Unknown resource. Use one of: ${resources.join(', ')}.`, 400);
  }

  const ownerId = userData.user.id;
  const fetchers: Record<Resource, () => PromiseLike<{ data: unknown; error: { message: string } | null }>> = {
    profile: () => supabase.from('imora_profiles').select('*').eq('id', ownerId).maybeSingle(),
    scenarios: () => supabase.from('imora_scenarios').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true }),
    monitoring_areas: () => supabase.from('imora_monitoring_areas').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true }),
    status_history: () => supabase.from('imora_status_history').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1000),
    forecast_history: () => supabase.from('imora_forecast_history').select('*').eq('owner_id', ownerId).order('captured_at', { ascending: false }).limit(5000),
    notifications: () => supabase.from('imora_notifications').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1000),
  };

  const selected = requested ? [requested as Resource] : resources;
  const fetched = await Promise.all(selected.map(async (resource) => [resource, await fetchers[resource]()] as const));
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const [resource, result] of fetched) {
    if (result.error) errors[resource] = result.error.message;
    else data[resource] = result.data;
  }

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    owner_id: ownerId,
    data,
    ...(Object.keys(errors).length ? { errors } : {}),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
