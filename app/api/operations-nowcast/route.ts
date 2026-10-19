import { NextResponse } from 'next/server';
import { INDEXIM_SITE_ASSETS, type IndeximAsset } from '@/data/indexim-assets';

export const dynamic = 'force-dynamic';

type Severity = 'siaga' | 'waspada';
type Alert = { id: string; asset: IndeximAsset; severity: Severity; title: string; detail: string; action: string; due: string; rain: number; gust: number };
type ForecastResult = { hourly?: { time?: string[]; precipitation?: number[]; wind_gusts_10m?: number[]; weather_code?: number[] } };
// The optional connector is deliberately a server-only contract. A licensed
// radar/satellite service can post normalized point observations here without
// exposing its credentials or provider URL to the browser.
type Observation = { asset: string; observedAt: string; rainMmPerHour?: number; confidence?: number };

const minutesUntil = (value: string) => Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60_000));

function buildAlerts(result: ForecastResult, asset: IndeximAsset, observations: Observation[]): Alert[] {
  const hourly = result.hourly;
  if (!hourly?.time || !hourly.precipitation || !hourly.wind_gusts_10m || !hourly.weather_code) return [];
  const observation = observations.find((item) => item.asset === asset.name && Date.now() - new Date(item.observedAt).getTime() <= 30 * 60_000);
  const corroborated = Boolean(observation && Number(observation.rainMmPerHour) >= 0.5 && Number(observation.confidence ?? 0) >= 0.6);
  return hourly.time.flatMap<Alert>((time, index) => {
    const rain = Number(hourly.precipitation?.[index] || 0); const gust = Number(hourly.wind_gusts_10m?.[index] || 0); const code = Number(hourly.weather_code?.[index] || 0);
    const minutes = minutesUntil(time); const due = minutes <= 10 ? 'Jam ini' : minutes <= 75 ? '≤ 1 jam' : `${Math.ceil(minutes / 60)} jam lagi`;
    const observationNote = corroborated ? ' · confidence meningkat oleh observasi terbaru' : '';
    if (code >= 95 || rain >= 10) return [{ id: `${asset.name}-rain-${time}`, asset, severity: 'siaga' as const, title: code >= 95 ? 'Potensi badai petir' : 'Potensi hujan lebat', detail: `${due} · ${rain.toFixed(1)} mm/jam${gust >= 40 ? ` · gust ${Math.round(gust)} km/jam` : ''}${observationNote}`, action: 'Tunda pekerjaan terbuka, cek drainase dan komunikasi pengawas lapangan.', due, rain, gust }];
    if (rain >= 4 || gust >= 45) return [{ id: `${asset.name}-${rain >= 4 ? 'rain' : 'wind'}-${time}`, asset, severity: 'waspada' as const, title: rain >= 4 ? 'Hujan sedang–lebat terindikasi' : 'Angin kencang terindikasi', detail: `${due} · hujan ${rain.toFixed(1)} mm/jam · gust ${Math.round(gust)} km/jam${observationNote}`, action: 'Pantau kondisi jalan angkut, drainase, dan amankan material ringan.', due, rain, gust }];
    return [];
  });
}

async function recentObservations(): Promise<Observation[]> {
  const endpoint = process.env.IMORA_NOWCAST_OBSERVATION_URL;
  if (!endpoint) return [];
  try {
    const response = await fetch(endpoint, { cache: 'no-store', headers: process.env.IMORA_NOWCAST_OBSERVATION_TOKEN ? { Authorization: `Bearer ${process.env.IMORA_NOWCAST_OBSERVATION_TOKEN}` } : undefined });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.observations) ? data.observations : [];
  } catch { return []; }
}

export async function GET() {
  try {
    const params = new URLSearchParams({ latitude: INDEXIM_SITE_ASSETS.map((asset) => asset.lat).join(','), longitude: INDEXIM_SITE_ASSETS.map((asset) => asset.lon).join(','), hourly: 'precipitation,wind_gusts_10m,weather_code', forecast_hours: '6', timezone: 'auto', wind_speed_unit: 'kmh' });
    const [forecastResponse, observations] = await Promise.all([fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: 'no-store' }), recentObservations()]);
    if (!forecastResponse.ok) throw new Error('Forecast provider unavailable');
    const forecast: ForecastResult[] = await forecastResponse.json();
    const alerts = forecast.flatMap((item, index) => buildAlerts(item, INDEXIM_SITE_ASSETS[index], observations)).sort((a, b) => a.severity === b.severity ? Number(a.due !== '≤ 1 jam') - Number(b.due !== '≤ 1 jam') : a.severity === 'siaga' ? -1 : 1).slice(0, 12);
    return NextResponse.json({ alerts, checkedAt: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ alerts: [], checkedAt: Date.now(), error: 'Nowcast temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
