import { NextRequest, NextResponse } from 'next/server';
import { INDEXIM_SITE_ASSETS } from '@/data/indexim-assets';

export const dynamic = 'force-dynamic';

const HOURLY_FIELDS = 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m';

function numberList(value: string | null) {
  if (!value) return null;
  const values = value.split(',').map((item) => Number(item.trim()));
  return values.length && values.every((item) => Number.isFinite(item)) ? values : null;
}

/** Public, non-user-specific forecast feed for Indexim integrations. */
export async function GET(request: NextRequest) {
  const latitude = numberList(request.nextUrl.searchParams.get('latitude'));
  const longitude = numberList(request.nextUrl.searchParams.get('longitude'));
  let points: { name: string; latitude: number; longitude: number }[];

  if (!latitude && !longitude) {
    points = INDEXIM_SITE_ASSETS.map((asset) => ({ name: asset.name, latitude: asset.lat, longitude: asset.lon }));
  } else if (!latitude || !longitude || latitude.length !== longitude.length || latitude.length > 50) {
    return NextResponse.json({ error: 'Use matching comma-separated latitude and longitude values (maximum 50 points).' }, { status: 400 });
  } else if (latitude.some((value) => value < -90 || value > 90) || longitude.some((value) => value < -180 || value > 180)) {
    return NextResponse.json({ error: 'Latitude or longitude is outside its valid range.' }, { status: 400 });
  } else {
    points = latitude.map((value, index) => ({ name: `Point ${index + 1}`, latitude: value, longitude: longitude[index] }));
  }

  try {
    const params = new URLSearchParams({
      latitude: points.map((point) => point.latitude).join(','),
      longitude: points.map((point) => point.longitude).join(','),
      hourly: HOURLY_FIELDS,
      forecast_days: request.nextUrl.searchParams.get('forecast_days') === '7' ? '7' : '3',
      timezone: 'auto',
      wind_speed_unit: 'kmh',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error('Forecast provider unavailable');
    const forecast = await response.json();
    const results = (Array.isArray(forecast) ? forecast : [forecast]).map((item, index) => ({ point: points[index], forecast: item }));
    return NextResponse.json({ provider: 'Open-Meteo', generated_at: new Date().toISOString(), results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Forecast provider is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
