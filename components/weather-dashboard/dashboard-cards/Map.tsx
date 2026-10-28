'use client';

import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
  Marker,
  Circle,
  Polygon,
  Polyline,
  Tooltip,
  Popup,
} from 'react-leaflet';
import { useWeather } from '@/context/WeatherContext';
import { getSupabase } from '@/lib/supabase';
import { prepareIndeximPdf } from '@/lib/pdf-report-branding';
import { INDEXIM_SITE_ASSETS, INDEXIM_SITE_CENTER, type IndeximAsset } from '@/data/indexim-assets';
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import L from 'leaflet';
import Toast from '@/components/main/Toast';
import { FiAlertTriangle, FiBell, FiCheckCircle, FiDownload, FiLayers, FiLoader, FiMapPin, FiMaximize, FiMinimize, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';

type RiskLevel = 'Normal' | 'Waspada' | 'Siaga';
type RiskReport = { level: RiskLevel; summary: string; time: string; rain: number; snow: number; temperature: number; gust: number; flood: string; action: string; metrics: string };
type MonitoringPoint = { id: string; lat: number; lon: number; name?: string; report?: RiskReport };
type Scenario = { id: string; name: string; mode: 'single' | 'multi'; points: Array<{ lat: number; lon: number; name?: string }> };
type StatusHistory = Record<string, Array<{ at: number; level: RiskLevel }>>;
type MonitoringArea = { id: string; name: string; color?: string; vertices: Array<[number, number]> };
type DxfCoordinateSystem = 'utm50n' | 'wgs84';
type DxfFeature = { id: string; kind: 'line' | 'polygon'; positions: Array<[number, number]> };
type DxfLayer = { id: string; name: string; color: string; coordinateSystem: DxfCoordinateSystem; features: DxfFeature[] };

async function saveForecastHistory(scenarioName: string, points: MonitoringPoint[]) {
  const reports = points.filter((point): point is MonitoringPoint & { report: RiskReport } => Boolean(point.report));
  const client = getSupabase(); if (!client || !reports.length) return;
  const { data: userData } = await client.auth.getUser(); if (!userData.user) return;
  const capturedAt = new Date().toISOString();
  await client.from('imora_forecast_history').insert(reports.map((point) => ({
    owner_id: userData.user.id,
    scenario_name: scenarioName,
    point_name: point.name || 'Titik tanpa nama',
    latitude: point.lat,
    longitude: point.lon,
    captured_at: capturedAt,
    forecast_peak_at: point.report.time,
    risk_level: point.report.level,
    summary: point.report.summary,
    data: point.report,
  })));
}

// Custom pin icon
const pinIcon = new L.DivIcon({
  html: '<div style="font-size: 24px;">📍</div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const FORECAST_REFERENCE_RADIUS_METERS = 10_000;
const monitoringIcon = (number: number, level?: RiskLevel) => {
  const color = level === 'Siaga' ? '#e11d48' : level === 'Waspada' ? '#f59e0b' : level === 'Normal' ? '#059669' : '#0891b2';
  return new L.DivIcon({ html: `<div style="display:grid;place-items:center;width:28px;height:28px;border:2px solid white;border-radius:999px;background:${color};color:white;font:700 12px system-ui;box-shadow:0 3px 12px #08334499">${number}</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
};
const pencilIcon = (color: string) => new L.DivIcon({ html: `<div style="display:grid;place-items:center;width:28px;height:28px;border:2px solid white;border-radius:999px;background:${color};color:white;font:700 16px system-ui;box-shadow:0 3px 12px #08334499">✎</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
const indeximAssetIcon = (kind: IndeximAsset['kind']) => {
  const color = kind === 'Pit' ? '#38bdf8' : '#f59e0b';
  const symbol = kind === 'Pit' ? 'P' : 'D';
  return new L.DivIcon({ html: `<div style="display:grid;place-items:center;width:25px;height:25px;border:2px solid #fff;border-radius:7px;background:${color};color:#082f49;font:800 11px system-ui;box-shadow:0 3px 12px #0f172aaa">${symbol}</div>`, className: '', iconSize: [25, 25], iconAnchor: [12, 12] });
};

const dxfColors = ['#38bdf8', '#f59e0b', '#a78bfa', '#34d399', '#fb7185'];

function utm50NToWgs84(easting: number, northing: number): [number, number] {
  const a = 6378137; const eccentricity = 0.00669438; const scale = 0.9996;
  const ePrime = eccentricity / (1 - eccentricity);
  const e1 = (1 - Math.sqrt(1 - eccentricity)) / (1 + Math.sqrt(1 - eccentricity));
  const x = easting - 500000; const meridian = northing / scale;
  const mu = meridian / (a * (1 - eccentricity / 4 - 3 * eccentricity ** 2 / 64 - 5 * eccentricity ** 3 / 256));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  const n1 = a / Math.sqrt(1 - eccentricity * Math.sin(phi1) ** 2); const t1 = Math.tan(phi1) ** 2; const c1 = ePrime * Math.cos(phi1) ** 2;
  const r1 = a * (1 - eccentricity) / (1 - eccentricity * Math.sin(phi1) ** 2) ** 1.5; const d = x / (n1 * scale);
  const latitude = phi1 - (n1 * Math.tan(phi1) / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ePrime) * d ** 4 / 24 + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ePrime - 3 * c1 ** 2) * d ** 6 / 720);
  const longitude = (d - (1 + 2 * t1 + c1) * d ** 3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ePrime + 24 * t1 ** 2) * d ** 5 / 120) / Math.cos(phi1);
  return [latitude * 180 / Math.PI, 117 + longitude * 180 / Math.PI];
}

function dxfPairs(text: string) {
  const lines = text.replace(/\r/g, '').split('\n'); const pairs: Array<{ code: number; value: string }> = [];
  for (let index = 0; index + 1 < lines.length; index += 2) { const code = Number(lines[index].trim()); if (Number.isFinite(code)) pairs.push({ code, value: lines[index + 1].trim() }); }
  return pairs;
}

function parseDxf(text: string, coordinateSystem: DxfCoordinateSystem): DxfFeature[] {
  const pairs = dxfPairs(text); const features: DxfFeature[] = []; let inEntities = false; let featureIndex = 0;
  const project = (x: number, y: number): [number, number] => coordinateSystem === 'utm50n' ? utm50NToWgs84(x, y) : [y, x];
  const readEntity = (start: number) => { let end = start + 1; while (end < pairs.length && pairs[end].code !== 0) end += 1; return { values: pairs.slice(start + 1, end), end }; };
  const number = (values: Array<{ code: number; value: string }>, code: number) => Number(values.find((item) => item.code === code)?.value);
  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index];
    if (pair.code === 0 && pair.value === 'SECTION' && pairs[index + 1]?.value === 'ENTITIES') { inEntities = true; continue; }
    if (pair.code === 0 && pair.value === 'ENDSEC') { inEntities = false; continue; }
    if (!inEntities || pair.code !== 0) continue;
    const entity = pair.value.toUpperCase(); const { values, end } = readEntity(index);
    if (entity === 'LINE') {
      const coords = [number(values, 10), number(values, 20), number(values, 11), number(values, 21)];
      if (coords.every(Number.isFinite)) features.push({ id: `dxf-${featureIndex++}`, kind: 'line', positions: [project(coords[0], coords[1]), project(coords[2], coords[3])] });
    }
    if (entity === 'LWPOLYLINE') {
      const closed = (Math.round(number(values, 70) || 0) & 1) === 1; const positions: Array<[number, number]> = [];
      for (let cursor = 0; cursor < values.length; cursor += 1) if (values[cursor].code === 10) { const y = values.slice(cursor + 1).find((item) => item.code === 20)?.value; if (y !== undefined) positions.push(project(Number(values[cursor].value), Number(y))); }
      if (positions.length >= 2) features.push({ id: `dxf-${featureIndex++}`, kind: closed ? 'polygon' : 'line', positions });
    }
    if (entity === 'POLYLINE') {
      const closed = (Math.round(number(values, 70) || 0) & 1) === 1; const positions: Array<[number, number]> = []; let cursor = end;
      while (cursor < pairs.length && !(pairs[cursor].code === 0 && pairs[cursor].value === 'SEQEND')) {
        if (pairs[cursor].code === 0 && pairs[cursor].value === 'VERTEX') { const vertex = readEntity(cursor); const x = number(vertex.values, 10); const y = number(vertex.values, 20); if (Number.isFinite(x) && Number.isFinite(y)) positions.push(project(x, y)); cursor = vertex.end; continue; }
        cursor += 1;
      }
      if (positions.length >= 2) features.push({ id: `dxf-${featureIndex++}`, kind: closed ? 'polygon' : 'line', positions });
      index = cursor;
    }
    if (entity === 'CIRCLE') {
      const x = number(values, 10); const y = number(values, 20); const radius = number(values, 40);
      if ([x, y, radius].every(Number.isFinite)) { const positions = Array.from({ length: 32 }, (_, step) => { const angle = (step / 32) * Math.PI * 2; return project(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius); }); features.push({ id: `dxf-${featureIndex++}`, kind: 'polygon', positions }); }
    }
    index = end - 1;
  }
  return features;
}

// Updates weather context when user clicks on map
function LocationClickHandler({ setClickError, onPointAdded, drawingArea, enabled }: { setClickError: (msg: string) => void; onPointAdded: (lat: number, lon: number) => void; drawingArea: boolean; enabled: boolean }) {
  const { setCoordinates } = useWeather();

  useMapEvents({
    click: async (e) => {
      if (!enabled) return;
      setClickError('');

      const { lat, lng } = e.latlng;
      if (!drawingArea) setCoordinates(lat, lng, `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      onPointAdded(lat, lng);
    },
  });

  return null;
}

// Moves map view when a location is selected from search, a card, or the map.
function MapController() {
  const { lat, lon } = useWeather();
  const map = useMapEvents({});

  useEffect(() => {
    if (lat !== null && lon !== null) {
      map.flyTo([lat, lon], Math.max(map.getZoom(), 13), {
        animate: true,
        duration: 1.15,
      });
    }
  }, [lat, lon, map]);

  return null;
}

// Keep the tile-provider attribution required by its licence, but remove the
// framework prefix from the attribution bar.
function RemoveLeafletPrefix() {
  const map = useMap();
  useEffect(() => { map.attributionControl.setPrefix(false); }, [map]);
  return null;
}

function IndeximSiteController({ request }: { request: number }) {
  const map = useMap();
  useEffect(() => {
    if (!request) return;
    map.flyTo(INDEXIM_SITE_CENTER, 14, { animate: true, duration: 1.1 });
  }, [map, request]);
  return null;
}

function DxfLayerController({ request, positions }: { request: number; positions: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (!request || positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [32, 32], maxZoom: 15, animate: true });
  }, [map, positions, request]);
  return null;
}

function FullscreenMapController({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Leaflet measures its container before the browser finishes entering or
    // exiting fullscreen. Recalculate afterwards so tiles fill the viewport.
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [active, map]);
  return null;
}

const formatTime = (time: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(time));

function makeReport(data: any): RiskReport {
  const hourly = data.hourly;
  const rain = Math.max(...hourly.precipitation.map(Number));
  const snow = Math.max(...hourly.snowfall.map(Number));
  const temperature = Number(hourly.temperature_2m[0]);
  const gust = Math.max(...hourly.wind_gusts_10m.map(Number));
  const rainIndex = hourly.precipitation.findIndex((value: number) => value === rain);
  const snowIndex = hourly.snowfall.findIndex((value: number) => value === snow);
  const stormIndex = hourly.weather_code.findIndex((code: number) => code >= 95);
  const snowy = hourly.weather_code.some((code: number) => (code >= 71 && code <= 77) || (code >= 85 && code <= 86)) || snow > 0;
  const thunderstorm = stormIndex >= 0;
  const severe = thunderstorm || rain >= 10 || snow >= 1 || gust >= 60;
  const warning = rain >= 2.5 || snow >= 0.1 || gust >= 40;
  const signals = [thunderstorm && 'petir/badai', snowy ? snow >= 1 ? 'salju lebat' : 'salju' : rain >= 10 ? 'hujan lebat' : rain >= 2.5 ? 'hujan sedang' : '', gust >= 60 ? 'angin sangat kencang' : gust >= 40 ? 'angin kencang' : ''].filter(Boolean);
  const index = stormIndex >= 0 ? stormIndex : snowy ? snowIndex : rainIndex;
  return {
    level: severe ? 'Siaga' : warning ? 'Waspada' : 'Normal',
    summary: signals.length ? `Potensi ${signals.join(' dan ')}` : 'Tidak ada cuaca ekstrem terdeteksi',
    time: hourly.time[index], rain, snow, temperature, gust,
    flood: snowy ? 'Kondisi salju: pantau akumulasi es dan akses jalan, bukan risiko banjir hujan.' : rain >= 10 ? 'Potensi genangan/banjir lokal' : rain >= 2.5 ? 'Pantau drainase dan area rendah' : 'Tidak ada sinyal peningkatan risiko banjir',
    action: snowy ? (severe ? 'Hindari perjalanan tidak penting, siapkan perlengkapan musim dingin, dan cek akses jalan.' : 'Pantau akumulasi salju, siapkan perlengkapan musim dingin, dan cek permukaan licin.') : severe ? 'Tunda aktivitas luar ruang, amankan benda luar, dan periksa drainase.' : warning ? 'Pantau pembaruan cuaca, bersihkan drainase, dan amankan perlengkapan luar ruang.' : 'Tidak ada tindakan tambahan; tetap pantau forecast.',
    metrics: snowy ? `Salju ${snow} cm/jam · Suhu ${temperature}°C · Gust ${gust} km/jam` : `Hujan ${rain} mm/jam · Suhu ${temperature}°C · Gust ${gust} km/jam`,
  };
}

// Main interactive map
export default function Map() {
  const { lat, lon, setCoordinates } = useWeather();
  const [clickError, setClickError] = useState('');
  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('satellite');
  const [showIndeximAssets, setShowIndeximAssets] = useState(false);
  const [indeximFocusRequest, setIndeximFocusRequest] = useState(0);
  const [dxfLayers, setDxfLayers] = useState<DxfLayer[]>([]);
  const [dxfCoordinateSystem, setDxfCoordinateSystem] = useState<DxfCoordinateSystem>('utm50n');
  const [dxfFocusRequest, setDxfFocusRequest] = useState(0);
  const dxfInput = useRef<HTMLInputElement>(null);
  const [points, setPoints] = useState<MonitoringPoint[]>([{ id: 'indexim-site-default', lat: INDEXIM_SITE_CENTER[0], lon: INDEXIM_SITE_CENTER[1], name: 'Indexim Site' }]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'single' | 'multi'>('single');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [history, setHistory] = useState<StatusHistory>({});
  const [areas, setAreas] = useState<MonitoringArea[]>([]);
  const [areaVertices, setAreaVertices] = useState<Array<[number, number]>>([]);
  const [areaName, setAreaName] = useState('');
  const [drawingArea, setDrawingArea] = useState(false);
  const [areaColor, setAreaColor] = useState('#8b5cf6');
  const [toolPosition, setToolPosition] = useState({ x: 12, y: 66 });
  const [toolsOpen, setToolsOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'view' | 'pro'>('view');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapShell = useRef<HTMLDivElement>(null);
  const notifiedSiaga = useRef(new Set<string>());
  const pointsKey = points.map((point) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`).join('|');
  const latestPointsKey = useRef(pointsKey);
  latestPointsKey.current = pointsKey;

  const position = lat !== null && lon !== null ? ([lat, lon] as [number, number]) : null;

  useEffect(() => { window.dispatchEvent(new CustomEvent('imora:monitoring-points', { detail: points.map(({ id, lat: pointLat, lon: pointLon, name }) => ({ id, lat: pointLat, lon: pointLon, name })) })); }, [points]);

  useEffect(() => {
    if ('Notification' in window) setNotificationPermission(Notification.permission);
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id || null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setAuthUserId(nextSession?.user?.id || null));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(document.fullscreenElement === mapShell.current);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    const shell = mapShell.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      setClickError('Mode layar penuh tidak didukung oleh browser ini.');
    }
  };

  // The map component stays mounted when a user signs out and another user
  // signs in in the same browser. Reset first, then load only this user's rows.
  useEffect(() => {
    const supabase = getSupabase();
    setScenarios([]); setSelectedScenario(''); setAreas([]); setHistory({});
    setSelectionMode('single');
    setPoints([{ id: 'indexim-site-default', lat: INDEXIM_SITE_CENTER[0], lon: INDEXIM_SITE_CENTER[1], name: 'Indexim Site' }]);
    if (!supabase || !authUserId) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('imora_scenarios').select('id, name, data').eq('owner_id', authUserId).order('created_at', { ascending: true }),
      supabase.from('imora_monitoring_areas').select('id, name, data').eq('owner_id', authUserId).order('created_at', { ascending: true }),
    ]).then(async ([scenarioResult, areaResult]) => {
      if (cancelled) return;
      if (scenarioResult.data?.length) {
        const loadedScenarios = scenarioResult.data.map((row) => {
        const data = row.data as Pick<Scenario, 'mode' | 'points'>;
        return { id: String(row.id), name: row.name, mode: data.mode, points: data.points };
        });
        setScenarios(loadedScenarios);
        const lastScenario = loadedScenarios[loadedScenarios.length - 1];
        if (lastScenario?.points?.length) { setSelectedScenario(lastScenario.id); setSelectionMode(lastScenario.mode); setPoints(lastScenario.points.map((point) => ({ ...point, id: `${point.lat}-${point.lon}-${Date.now()}-${Math.random()}` }))); }
      }
      if (areaResult.data?.length) setAreas(areaResult.data.map((row) => {
        const data = row.data as Pick<MonitoringArea, 'color' | 'vertices'>;
        return { id: String(row.id), name: row.name, color: data.color, vertices: data.vertices };
      }));
      const historyResult = await supabase.from('imora_status_history').select('data').eq('owner_id', authUserId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      const savedHistory = historyResult.data?.data as { type?: string; values?: StatusHistory } | null;
      if (savedHistory?.type === 'monitoring-history' && savedHistory.values) setHistory(savedHistory.values);
    });
    return () => { cancelled = true; };
  }, [authUserId]);

  const persistScenarios = (next: Scenario[]) => {
    setScenarios(next);
  };

  const addPoint = (nextLat: number, nextLon: number) => {
    if (drawingArea) { setAreaVertices((current) => [...current, [nextLat, nextLon]]); return; }
    setPoints((current) => {
      if (selectionMode === 'single') return [{ id: `${nextLat}-${nextLon}-${Date.now()}`, lat: nextLat, lon: nextLon, name: 'Titik utama' }];
      if (current.some((point) => Math.abs(point.lat - nextLat) < 0.002 && Math.abs(point.lon - nextLon) < 0.002)) return current;
      return [...current, { id: `${nextLat}-${nextLon}-${Date.now()}`, lat: nextLat, lon: nextLon, name: `Titik ${current.length + 1}` }];
    });
  };

  const monitorIndeximAsset = (asset: IndeximAsset) => {
    setCoordinates(asset.lat, asset.lon, asset.name);
    setPoints((current) => {
      if (selectionMode === 'single') return [{ id: `indexim-${asset.name}-${Date.now()}`, lat: asset.lat, lon: asset.lon, name: asset.name }];
      if (current.some((point) => Math.abs(point.lat - asset.lat) < 0.0001 && Math.abs(point.lon - asset.lon) < 0.0001)) return current;
      return [...current, { id: `indexim-${asset.name}-${Date.now()}`, lat: asset.lat, lon: asset.lon, name: asset.name }];
    });
  };

  const saveArea = async () => {
    if (areaVertices.length < 3) { setClickError('Area polygon memerlukan minimal 3 titik sudut.'); return; }
    const pending = { id: `${Date.now()}`, name: areaName.trim() || `Area ${areas.length + 1}`, color: areaColor, vertices: areaVertices };
    const supabase = getSupabase();
    if (supabase) {
      if (!authUserId) { setClickError('Sesi login tidak ditemukan. Silakan login ulang.'); return; }
      const { data, error } = await supabase.from('imora_monitoring_areas').insert({ owner_id: authUserId, name: pending.name, latitude: pending.vertices[0][0], longitude: pending.vertices[0][1], data: { color: pending.color, vertices: pending.vertices } }).select('id').single();
      if (error) { setClickError(`Area belum tersimpan ke cloud: ${error.message}`); return; }
      pending.id = String(data.id);
    }
    const next = [...areas, pending];
    setAreas(next); setAreaVertices([]); setAreaName(''); setDrawingArea(false);
  };

  const moveToolDock = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mapShell.current) return;
    const bounds = mapShell.current.getBoundingClientRect();
    setToolPosition({ x: Math.max(8, Math.min(bounds.width - 216, event.clientX - bounds.left - 104)), y: Math.max(50, Math.min(bounds.height - 220, event.clientY - bounds.top - 14)) });
  };

  const addDxfLayer = (name: string, content: string, coordinateSystem = dxfCoordinateSystem) => {
    const features = parseDxf(content, coordinateSystem);
    if (!features.length) { setClickError('DXF tidak berisi LINE, LWPOLYLINE, POLYLINE, atau CIRCLE yang dapat dipetakan.'); return; }
    const layer = { id: `${Date.now()}-${name}`, name: name.replace(/\.dxf$/i, ''), color: dxfColors[dxfLayers.length % dxfColors.length], coordinateSystem, features } satisfies DxfLayer;
    setDxfLayers((current) => [...current, layer]);
    setDxfFocusRequest((current) => current + 1);
  };

  const importDxf = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!/\.dxf$/i.test(file.name)) { setClickError('Pilih file dengan format .dxf'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => addDxfLayer(file.name, String(reader.result || ''));
    reader.onerror = () => setClickError('File DXF tidak dapat dibaca.'); reader.readAsText(file); event.target.value = '';
  };

  const loadDxfDemo = async () => {
    try { const response = await fetch('/samples/indexim-site-layout-demo.dxf'); if (!response.ok) throw new Error('Demo unavailable'); addDxfLayer('Indexim South · Demo CAD', await response.text(), 'utm50n'); }
    catch (error) { console.error(error); setClickError('DXF demo belum dapat dimuat.'); }
  };

  const dxfPositions = dxfLayers.flatMap((layer) => layer.features.flatMap((feature) => feature.positions));



  const applyMonitoring = useCallback(async () => {
    if (!points.length) { setClickError('Klik peta untuk menambahkan titik pemantauan.'); return; }
    const requestPointsKey = points.map((point) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`).join('|');
    setLoadingReports(true); setClickError('');
    try {
      // Open-Meteo accepts coordinate lists, so multi-point monitoring has no
      // arbitrary UI cap and is fetched as one batched operational request.
      const params = new URLSearchParams({ latitude: points.map((point) => point.lat).join(','), longitude: points.map((point) => point.lon).join(','), hourly: 'temperature_2m,precipitation,snowfall,weather_code,wind_gusts_10m', forecast_hours: '6', timezone: 'auto', wind_speed_unit: 'kmh' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error('Forecast request failed');
      const result = await response.json(); const batches = Array.isArray(result) ? result : [result];
      const updated = points.map((point, index) => ({ ...point, report: batches[index] ? makeReport(batches[index]) : point.report }));
      // A saved scenario can load while an older default-point request is in
      // flight. Never let that old response replace the active scenario.
      if (latestPointsKey.current !== requestPointsKey) return;
      setPoints(updated);
      setHistory((current) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const next = { ...current };
        updated.forEach((point) => { if (point.report) { const key = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`; next[key] = [...(next[key] || []).filter((item) => item.at >= cutoff), { at: Date.now(), level: point.report.level }].slice(-24); } });
        const client = getSupabase(); if (client && authUserId) void client.from('imora_status_history').insert({ owner_id: authUserId, data: { type: 'monitoring-history', values: next } }); return next;
      });
      const scenarioLabel = scenarios.find((scenario) => scenario.id === selectedScenario)?.name || 'Titik operasional aktif';
      void saveForecastHistory(scenarioLabel, updated);
      window.dispatchEvent(new CustomEvent('imora:monitoring-alerts', { detail: {
        scenarioName: scenarioLabel,
        checkedAt: Date.now(),
        alerts: updated.map((point, index) => ({
          id: point.id,
          name: point.name || `Titik ${index + 1}`,
          lat: point.lat,
          lon: point.lon,
          report: point.report,
        })),
      } }));
      const siagaIds = new Set(updated.filter((point) => point.report?.level === 'Siaga').map((point) => point.id));
      for (const id of notifiedSiaga.current) if (!siagaIds.has(id)) notifiedSiaga.current.delete(id);
      if (notificationPermission === 'granted') {
        updated.forEach((point, index) => {
          if (point.report?.level === 'Siaga' && !notifiedSiaga.current.has(point.id)) {
            new Notification('IMORA · Status Siaga', { body: `Titik ${index + 1}: ${point.report.summary}. ${point.report.action}` });
            notifiedSiaga.current.add(point.id);
          }
        });
      }
    } catch (error) { console.error(error); setClickError('Forecast multi-titik belum dapat dimuat. Coba lagi.'); }
    finally { setLoadingReports(false); }
  }, [authUserId, notificationPermission, points, scenarios, selectedScenario]);

  // Overview is operational by default: whenever the active scenario's point
  // coordinates arrive from the database (or are changed), fetch its forecast
  // immediately. Users should never have to reopen Multi point or press Apply
  // just to see the saved scenario's status.
  useEffect(() => {
    if (pointsKey) void applyMonitoring();
  }, [pointsKey]); // geometry only; report updates must not trigger another request

  useEffect(() => {
    if (!points.length) return;
    const refresh = window.setInterval(() => { void applyMonitoring(); }, 10 * 60 * 1000);
    return () => window.clearInterval(refresh);
  }, [applyMonitoring, points.length]);

  const saveScenario = async () => {
    if (!points.length) { setClickError('Tambahkan minimal satu titik sebelum menyimpan scenario.'); return; }
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    const pending: Scenario = { id: `${Date.now()}`, name, mode: selectionMode, points: points.map(({ lat, lon, name: pointName }) => ({ lat, lon, name: pointName })) };
    const supabase = getSupabase();
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setClickError('Sesi login tidak ditemukan. Silakan login ulang.'); return; }
      const { data, error } = await supabase.from('imora_scenarios').insert({ owner_id: userData.user.id, name: pending.name, data: { mode: pending.mode, points: pending.points } }).select('id').single();
      if (error) { setClickError(`Scenario belum tersimpan ke cloud: ${error.message}`); return; }
      pending.id = String(data.id);
    }
    const next = [...scenarios, pending];
    persistScenarios(next); setScenarioName(''); setSelectedScenario(next[next.length - 1].id);
  };

  const loadScenario = () => {
    const scenario = scenarios.find((item) => item.id === selectedScenario);
    if (!scenario) return;
    setSelectionMode(scenario.mode);
    setPoints(scenario.points.map((point) => ({ ...point, id: `${point.lat}-${point.lon}-${Date.now()}-${Math.random()}` })));
  };

  const deleteScenario = async () => {
    const scenario = scenarios.find((item) => item.id === selectedScenario);
    if (!scenario || !window.confirm(`Hapus scenario "${scenario.name}"?`)) return;
    const supabase = getSupabase();
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setClickError('Sesi login tidak ditemukan. Silakan login ulang.'); return; }
      const { error } = await supabase.from('imora_scenarios').delete().eq('id', scenario.id).eq('owner_id', userData.user.id);
      if (error) { setClickError(`Scenario tidak dapat dihapus: ${error.message}`); return; }
    }
    const next = scenarios.filter((item) => item.id !== scenario.id);
    setScenarios(next); setScenarioName('');
    const nextActive = next[next.length - 1];
    if (nextActive) {
      setSelectedScenario(nextActive.id); setSelectionMode(nextActive.mode);
      setPoints(nextActive.points.map((point) => ({ ...point, id: `${point.lat}-${point.lon}-${Date.now()}-${Math.random()}` })));
    } else {
      setSelectedScenario(''); setSelectionMode('single');
      setPoints([{ id: 'indexim-site-default', lat: INDEXIM_SITE_CENTER[0], lon: INDEXIM_SITE_CENTER[1], name: 'Indexim Site' }]);
    }
  };

  const deleteArea = async (area: MonitoringArea) => {
    const supabase = getSupabase();
    if (!supabase || !authUserId) { setClickError('Sesi login tidak ditemukan. Silakan login ulang.'); return; }
    const { error } = await supabase.from('imora_monitoring_areas').delete().eq('id', area.id).eq('owner_id', authUserId);
    if (error) { setClickError(`Polygon tidak dapat dihapus dari database: ${error.message}`); return; }
    setAreas((current) => current.filter((item) => item.id !== area.id));
  };

  const clearAreas = async () => {
    if (!areas.length) return;
    const supabase = getSupabase();
    if (!supabase || !authUserId) { setClickError('Sesi login tidak ditemukan. Silakan login ulang.'); return; }
    const ids = areas.map((area) => area.id);
    const { error } = await supabase.from('imora_monitoring_areas').delete().eq('owner_id', authUserId).in('id', ids);
    if (error) { setClickError(`Polygon tidak dapat dihapus dari database: ${error.message}`); return; }
    setAreas([]);
  };

  const enableAlerts = async () => {
    if (!('Notification' in window)) { setClickError('Notifikasi browser tidak didukung di perangkat ini.'); return; }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== 'granted') setClickError('Izin notifikasi belum diberikan.');
  };

  const exportMonitoring = async () => {
    const reported = points.filter((point) => point.report);
    if (!reported.length) { setClickError('Terapkan monitoring terlebih dahulu sebelum ekspor.'); return; }
    const XLSX = await import('xlsx');
    const rows = reported.map((point, index) => ({ Point: point.name || `Titik ${index + 1}`, Latitude: point.lat, Longitude: point.lon, Status: point.report!.level, Forecast: point.report!.summary, 'Peak time': formatTime(point.report!.time), 'Temperature (°C)': point.report!.temperature, 'Rain (mm/h)': point.report!.rain, 'Snowfall (cm/h)': point.report!.snow, 'Wind gust (km/h)': point.report!.gust, 'Contextual screening': point.report!.flood, 'Preventive action': point.report!.action }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Monitoring report');
    XLSX.writeFile(workbook, `IMORA-monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportMonitoringPdf = async () => {
    const reported = points.filter((point) => point.report);
    if (!reported.length) { setClickError('Terapkan monitoring terlebih dahulu sebelum ekspor.'); return; }
    const { jsPDF } = await import('jspdf');
    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    const branding = await prepareIndeximPdf(document, 'Monitoring Risk Report', `Generated ${new Date().toLocaleString('id-ID')} · ${reported.length} active monitoring point(s)`, `MON-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`); branding.decorate(); let y = 61;
    reported.forEach((point, index) => {
      const report = point.report!;
      const lines = document.splitTextToSize(`${point.name || `Titik ${index + 1}`} (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})\nStatus: ${report.level} - ${report.summary}\nPeak: ${formatTime(report.time)} | ${report.metrics}\nContextual screening: ${report.flood}\nPreventive action: ${report.action}`, 180);
      if (y + lines.length * 5 + 8 > 280) { branding.nextPage(); y = 61; }
      document.setFillColor(report.level === 'Siaga' ? 255 : report.level === 'Waspada' ? 255 : 237, report.level === 'Siaga' ? 239 : report.level === 'Waspada' ? 248 : 252, report.level === 'Siaga' ? 239 : report.level === 'Waspada' ? 222 : 245); document.roundedRect(14, y - 5, 182, lines.length * 5 + 7, 3, 3, 'F'); document.setFont('helvetica', 'bold'); document.setFontSize(10); document.setTextColor(15, 44, 64); document.text(point.name || `Titik ${index + 1}`, 20, y); document.setFont('helvetica', 'normal'); document.setFontSize(8); document.setTextColor(51, 73, 88); document.text(lines.slice(1), 20, y + 5); y += lines.length * 5 + 10;
    });
    document.save(`IMORA-monitoring-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const riskCounts = points.reduce((counts, point) => { if (point.report) counts[point.report.level] += 1; return counts; }, { Normal: 0, Waspada: 0, Siaga: 0 });
  const mostRisky = points.find((point) => point.report?.level === 'Siaga') || points.find((point) => point.report?.level === 'Waspada');
  const changeWorkspaceMode = (mode: 'view' | 'pro') => {
    setWorkspaceMode(mode);
    setToolsOpen(mode === 'pro');
    if (mode === 'view') setDrawingArea(false);
  };

  return (
    <>
      <div ref={mapShell} className={`relative w-full overflow-hidden border border-white/20 bg-slate-950 shadow-lg ${isFullscreen ? 'h-dvh rounded-none border-0' : 'h-[280px] rounded-2xl sm:h-[340px] md:h-[400px]'}`}>
        <button type="button" onClick={() => void toggleFullscreen()} className="absolute right-3 top-3 z-[1002] inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-slate-950/85 px-2.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-slate-800" aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Tampilkan peta layar penuh'} title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
          {isFullscreen ? <FiMinimize size={15} /> : <FiMaximize size={15} />}<span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
        <div className="absolute right-3 top-14 z-[1002] flex overflow-hidden rounded-lg border border-white/30 bg-slate-950/85 text-xs text-white shadow-lg backdrop-blur">
          <button type="button" onClick={() => changeWorkspaceMode('view')} className={`px-3 py-2 font-semibold transition ${workspaceMode === 'view' ? 'bg-white text-slate-900' : 'hover:bg-white/15'}`}>View</button>
          <button type="button" onClick={() => changeWorkspaceMode('pro')} className={`px-3 py-2 font-semibold transition ${workspaceMode === 'pro' ? 'bg-cyan-300 text-slate-950' : 'hover:bg-white/15'}`}>Pro</button>
        </div>
        {workspaceMode === 'pro' && <div className="absolute right-3 top-25 z-[1000] flex overflow-hidden rounded-lg border border-white/30 bg-slate-950/80 text-xs text-white shadow-lg backdrop-blur">
          <button onClick={() => setMapMode('dark')} className={`px-3 py-2 transition ${mapMode === 'dark' ? 'bg-white text-slate-900' : 'hover:bg-white/15'}`}>Map</button>
          <button onClick={() => setMapMode('satellite')} className={`px-3 py-2 transition ${mapMode === 'satellite' ? 'bg-white text-slate-900' : 'hover:bg-white/15'}`}>Satellite</button>
        </div>}
        <div className="absolute left-14 top-3 z-[1000] flex overflow-hidden rounded-lg border border-cyan-100/30 bg-slate-950/85 text-xs text-white shadow-lg backdrop-blur">
          <button type="button" onClick={() => { setShowIndeximAssets(true); setIndeximFocusRequest((current) => current + 1); }} className="px-3 py-2 font-bold text-cyan-100 transition hover:bg-cyan-300/15">INDEXIM SITE</button>
          {showIndeximAssets && <button type="button" onClick={() => setShowIndeximAssets(false)} className="border-l border-white/15 px-2.5 py-2 text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Sembunyikan aset Indexim">×</button>}
        </div>
        {workspaceMode === 'pro' && <div className="absolute left-3 top-14 z-[1000] w-[216px] overflow-hidden rounded-xl border border-white/20 bg-slate-950/85 text-xs text-white shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="flex items-center gap-1.5 font-bold text-white"><FiLayers className="text-violet-200" /> CAD / DXF layers</span><span className="text-[10px] text-white/45">{dxfLayers.length}</span></div>
          <div className="p-2"><select value={dxfCoordinateSystem} onChange={(event) => setDxfCoordinateSystem(event.target.value as DxfCoordinateSystem)} className="h-8 w-full rounded-md border border-white/15 bg-slate-900 px-2 text-[10px] text-white outline-none"><option value="utm50n">UTM 50N · EPSG:32650</option><option value="wgs84">WGS84 longitude / latitude</option></select><div className="mt-2 grid grid-cols-2 gap-1.5"><button type="button" onClick={() => dxfInput.current?.click()} className="inline-flex items-center justify-center gap-1 rounded-lg bg-violet-300 px-2 py-2 text-[10px] font-bold text-slate-950 transition hover:bg-violet-200"><FiUpload size={12} /> Import DXF</button><button type="button" onClick={loadDxfDemo} className="rounded-lg border border-white/15 px-2 py-2 text-[10px] font-semibold text-white/85 transition hover:bg-white/10">Load demo</button></div><input ref={dxfInput} type="file" accept=".dxf,application/dxf" onChange={importDxf} className="hidden" /><p className="mt-2 text-[9px] leading-relaxed text-white/45">DXF diproses lokal di browser. Sistem koordinat harus sesuai file CAD.</p></div>
          {!!dxfLayers.length && <div className="max-h-20 space-y-1 overflow-y-auto border-t border-white/10 p-2">{dxfLayers.map((layer) => <div key={layer.id} className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px]"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} /><span className="min-w-0 flex-1 truncate">{layer.name}</span><span className="text-white/40">{layer.features.length}</span><button type="button" onClick={() => setDxfLayers((current) => current.filter((item) => item.id !== layer.id))} className="text-white/45 hover:text-rose-300" aria-label={`Hapus layer ${layer.name}`}>×</button></div>)}</div>}
        </div>}
        {workspaceMode === 'pro' && <button type="button" onClick={() => setToolsOpen((open) => !open)} className="absolute right-3 top-40 z-[1001] rounded-xl border border-white/25 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md sm:hidden">{toolsOpen ? 'Close tools' : '☰ Tools'}</button>}
        {workspaceMode === 'pro' && <div className="pointer-events-none absolute bottom-7 left-3 z-[1000] max-w-[240px] rounded-xl border border-white/20 bg-slate-950/80 px-3 py-2 text-[10px] leading-relaxed text-white/80 shadow-lg backdrop-blur-md sm:text-xs">
          <span className="font-semibold text-cyan-200">Area referensi forecast: ±10 km</span>
          <span className="block text-white/60">Estimasi grid model di titik pilihan; kondisi lokal dapat berbeda.</span>
        </div>}
        {workspaceMode === 'pro' && <div className={`absolute z-[1000] w-[208px] overflow-hidden rounded-xl border border-white/25 bg-slate-950/85 text-xs text-white shadow-xl backdrop-blur-md ${toolsOpen ? 'block' : 'hidden'} sm:block`} style={{ left: toolPosition.x, top: toolPosition.y }}>
          <div onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveToolDock(event); }} className="cursor-grab border-b border-white/10 px-3 py-2 text-[10px] font-bold tracking-[.14em] text-cyan-100 active:cursor-grabbing">⋮⋮ DRAG TOOLS</div>
          <div className="grid gap-1 p-1.5">
            <button type="button" onClick={() => { setSelectionMode('single'); setPoints([]); setToolsOpen(false); }} className={`rounded-lg px-2 py-2 text-left font-semibold transition ${selectionMode === 'single' && !drawingArea ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}>● Single point</button>
            <button type="button" onClick={() => { setSelectionMode('multi'); setPoints([]); setToolsOpen(false); }} className={`rounded-lg px-2 py-2 text-left font-semibold transition ${selectionMode === 'multi' && !drawingArea ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}>● Multi point · klik peta</button>
            <button type="button" onClick={() => { setDrawingArea((active) => !active); if (drawingArea) setAreaVertices([]); }} className={`rounded-lg px-2 py-2 text-left font-semibold transition ${drawingArea ? 'bg-violet-300 text-slate-950' : 'hover:bg-white/10'}`}>✎ {drawingArea ? 'Cancel drawing' : 'Draw polygon'}</button>
            {drawingArea && <div className="mt-1 border-t border-white/10 pt-2"><input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="Nama area polygon" className="h-8 w-full rounded-md border border-white/15 bg-slate-950/40 px-2 text-xs text-white outline-none placeholder:text-white/35" /><div className="mt-2 flex items-center justify-between gap-1"><div className="flex gap-1">{['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'].map((color) => <button key={color} type="button" onClick={() => setAreaColor(color)} className={`h-4 w-4 rounded-full ${areaColor === color ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: color }} />)}</div><button type="button" onClick={saveArea} className="rounded-md bg-violet-300 px-2 py-1 text-[10px] font-bold text-slate-950">Save ({areaVertices.length})</button></div><p className="mt-1 text-[10px] text-violet-100">Klik minimal 3 sudut peta.</p></div>}
            {!!areas.length && <button type="button" onClick={() => void clearAreas()} className="mt-1 rounded-lg border border-rose-300/30 bg-rose-400/10 px-2 py-2 text-left font-semibold text-rose-100 hover:bg-rose-400/20">Clear polygons</button>}
          </div>
        </div>}
        <MapContainer
          center={position || [20, 0]}
          zoom={position ? 6 : 2}
          minZoom={2}
          maxBounds={[
            [-85, -180],
            [85, 180],
          ]}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%', cursor: workspaceMode === 'pro' && drawingArea ? 'crosshair' : 'grab' }}
        >
          {mapMode === 'satellite' ? (
            <TileLayer attribution="Peta: Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          ) : (
            <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}

          <LocationClickHandler setClickError={setClickError} onPointAdded={addPoint} drawingArea={workspaceMode === 'pro' && drawingArea} enabled={workspaceMode === 'pro'} />
          <MapController /> {/* Update map view when lat/lon changes */}
          <IndeximSiteController request={indeximFocusRequest} />
          <DxfLayerController request={dxfFocusRequest} positions={dxfPositions} />
          <FullscreenMapController active={isFullscreen} />
          <RemoveLeafletPrefix />
          {position && !drawingArea && (
            <>
              <Circle
                center={position}
                radius={FORECAST_REFERENCE_RADIUS_METERS}
                pathOptions={{ color: '#67e8f9', fillColor: '#22d3ee', fillOpacity: 0.12, weight: 2, dashArray: '7 7' }}
              />
              <Marker position={position} icon={pinIcon} />
            </>
          )}
          {points.map((point, index) => (
            <Circle key={point.id} center={[point.lat, point.lon]} radius={FORECAST_REFERENCE_RADIUS_METERS} pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.06, weight: 1, dashArray: '5 6' }}>
              <Tooltip permanent direction="top" offset={[0, -10]}>{point.name || `Titik ${index + 1}`}</Tooltip>
              <Popup><div className="min-w-[180px] text-slate-800"><b>{point.name || `Titik ${index + 1}`}</b><br />{point.lat.toFixed(4)}, {point.lon.toFixed(4)}<hr className="my-2" />{point.report ? <><b>{point.report.level}: {point.report.summary}</b><br />{formatTime(point.report.time)} · {point.report.metrics}<br /><span>Aksi: {point.report.action}</span></> : 'Tekan Apply monitoring untuk analisis.'}</div></Popup>
            </Circle>
          ))}
          {points.map((point, index) => <Marker key={`${point.id}-marker`} position={[point.lat, point.lon]} icon={monitoringIcon(index + 1, point.report?.level)} />)}
          {showIndeximAssets && INDEXIM_SITE_ASSETS.map((asset) => <Marker key={`${asset.kind}-${asset.name}`} position={[asset.lat, asset.lon]} icon={indeximAssetIcon(asset.kind)} eventHandlers={{ click: () => { setCoordinates(asset.lat, asset.lon, asset.name); if (selectionMode === 'multi') monitorIndeximAsset(asset); } }}><Tooltip direction="top" offset={[0, -12]}>{asset.name}</Tooltip><Popup><div className="min-w-[180px] text-slate-800"><b>{asset.name}</b><br /><span>{asset.kind} · Indexim South</span><hr className="my-2" /><span>{asset.lat.toFixed(6)}, {asset.lon.toFixed(6)}</span><p className="mt-2 text-xs text-slate-500">{selectionMode === 'multi' ? 'Langsung ditambahkan ke multi point.' : 'Forecast utama sudah diarahkan ke titik ini.'}</p></div></Popup></Marker>)}
          {dxfLayers.flatMap((layer) => layer.features.map((feature) => feature.kind === 'polygon' ? <Polygon key={`${layer.id}-${feature.id}`} positions={feature.positions} pathOptions={{ color: layer.color, fillColor: layer.color, fillOpacity: 0.13, weight: 2 }}><Tooltip sticky>{layer.name}</Tooltip></Polygon> : <Polyline key={`${layer.id}-${feature.id}`} positions={feature.positions} pathOptions={{ color: layer.color, weight: 3, opacity: 0.92 }}><Tooltip sticky>{layer.name}</Tooltip></Polyline>))}
          {areas.map((area) => <Polygon key={area.id} positions={area.vertices} pathOptions={{ color: area.color || '#8b5cf6', fillColor: area.color || '#8b5cf6', fillOpacity: 0.12, weight: 2 }}><Tooltip permanent>{area.name}</Tooltip></Polygon>)}
          {areaVertices.length >= 2 && <Polygon positions={areaVertices} pathOptions={{ color: areaColor, fillColor: areaColor, fillOpacity: 0.08, dashArray: '6 6' }} />}
          {drawingArea && areaVertices.map((vertex, index) => <Marker key={`${vertex[0]}-${vertex[1]}`} position={vertex} icon={pencilIcon(areaColor)}><Tooltip direction="top">Sudut {index + 1}</Tooltip></Marker>)}
        </MapContainer>
      </div>

      {workspaceMode === 'pro' && <section className="mt-4 rounded-2xl border border-white/15 bg-slate-950/35 p-3 shadow-lg backdrop-blur-md sm:p-4">
        {!!points.some((point) => point.report) && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"><span className="font-semibold text-white">Ringkasan risiko: <span className="text-emerald-200">{riskCounts.Normal} Normal</span> · <span className="text-amber-200">{riskCounts.Waspada} Waspada</span> · <span className="text-rose-300">{riskCounts.Siaga} Siaga</span></span>{mostRisky && <span className="text-white/65">Prioritas: <b className="text-white">{mostRisky.name || 'Titik tanpa nama'}</b> — {mostRisky.report?.summary}</span>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-white"><FiMapPin className="text-cyan-200" /> Monitoring points <span className="text-white/50">({points.length}{selectionMode === 'multi' ? ' · tanpa batas' : '/1'})</span></p><p className="mt-1 text-xs text-white/55">{selectionMode === 'multi' ? 'Mode multi aktif: klik peta atau marker Indexim untuk menambahkan titik.' : 'Pilih mode, klik peta, lalu terapkan screening forecast 6 jam.'}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {selectionMode === 'single' && !!points.length && !points.some((point) => point.report) && <button type="button" onClick={() => setPoints([])} className="inline-flex items-center gap-1 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"><FiTrash2 size={14} />Cancel point</button>}
            {selectionMode === 'multi' && !!points.length && <button type="button" onClick={() => { setPoints([]); notifiedSiaga.current.clear(); }} className="inline-flex items-center gap-1 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"><FiTrash2 size={14} />Clear multi points</button>}
            <button type="button" onClick={applyMonitoring} disabled={loadingReports || !points.length} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">{loadingReports ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}{loadingReports ? 'Menganalisis…' : 'Apply monitoring'}</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder="Nama scenario, mis. Site Tambang A" className="h-9 min-w-[190px] flex-1 rounded-lg border border-white/15 bg-slate-950/30 px-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-cyan-200" />
          <button type="button" onClick={saveScenario} disabled={!points.length} className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"><FiSave size={14} />Save scenario</button>
          {!!scenarios.length && <><select value={selectedScenario} onChange={(event) => setSelectedScenario(event.target.value)} className="h-9 max-w-[180px] rounded-lg border border-white/15 bg-slate-900 px-2 text-xs text-white outline-none"><option value="">Saved scenarios</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select><button type="button" onClick={loadScenario} disabled={!selectedScenario} className="h-9 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40">Load</button><button type="button" onClick={() => void deleteScenario()} disabled={!selectedScenario} className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-40" aria-label="Hapus scenario terpilih"><FiTrash2 size={14} />Hapus</button></>}
          <button type="button" onClick={enableAlerts} className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition ${notificationPermission === 'granted' ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}><FiBell size={14} />{notificationPermission === 'granted' ? 'Alerts on' : 'Enable alerts'}</button>
          <button type="button" onClick={exportMonitoring} disabled={!points.some((point) => point.report)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"><FiDownload size={14} />Export Excel</button>
          <button type="button" onClick={exportMonitoringPdf} disabled={!points.some((point) => point.report)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"><FiDownload size={14} />Export PDF</button>
        </div>
        {!!areas.length && <div className="mt-2 flex flex-wrap gap-2">{areas.map((area) => <span key={area.id} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/75"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color || '#8b5cf6' }} />{area.name}<button type="button" onClick={() => void deleteArea(area)} className="text-white/50 hover:text-rose-300" aria-label={`Hapus area ${area.name}`}><FiTrash2 size={13} /></button></span>)}</div>}
        {!!points.length && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{points.map((point, index) => <article key={`${point.id}-card`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><input value={point.name || ''} onChange={(event) => setPoints((current) => current.map((item) => item.id === point.id ? { ...item, name: event.target.value } : item))} placeholder={`Titik ${index + 1}`} className="w-full border-b border-white/15 bg-transparent pb-1 font-semibold text-white outline-none placeholder:text-white/50 focus:border-cyan-200" /><p className="mt-1 text-white/50">{point.lat.toFixed(3)}, {point.lon.toFixed(3)}</p><button type="button" onClick={() => { setCoordinates(point.lat, point.lon, point.name || `Titik ${index + 1}`); window.dispatchEvent(new CustomEvent('imora:open-outlook')); window.setTimeout(() => globalThis.document.getElementById('imora-annual-outlook')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className="mt-2 rounded-md border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-300/20">Lihat Outlook 12 Bulan</button></div><button onClick={() => setPoints((current) => current.filter((item) => item.id !== point.id))} className="text-white/55 hover:text-rose-300" aria-label={`Hapus titik ${index + 1}`}><FiTrash2 size={15} /></button></div>{point.report ? <div className="mt-2"><p className={`flex items-center gap-1 font-bold ${point.report.level === 'Siaga' ? 'text-rose-300' : point.report.level === 'Waspada' ? 'text-amber-200' : 'text-emerald-200'}`}>{point.report.level === 'Normal' ? <FiCheckCircle /> : <FiAlertTriangle />}{point.report.level} · {point.report.summary}</p><p className="mt-1">Puncak: {formatTime(point.report.time)} · {point.report.metrics}</p><p className="mt-1 text-cyan-100">{point.report.flood}</p><p className="mt-1 text-white/55">Aksi: {point.report.action}</p></div> : <p className="mt-2 text-white/50">Belum diterapkan.</p>}</article>)}</div>}
        {!!points.some((point) => history[`${point.lat.toFixed(4)},${point.lon.toFixed(4)}`]?.length) && <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><p className="font-semibold text-white">Riwayat status (24 jam terakhir)</p><div className="mt-2 flex flex-wrap gap-2">{points.map((point, index) => { const entries = history[`${point.lat.toFixed(4)},${point.lon.toFixed(4)}`] || []; return entries.length ? <span key={point.id} className="rounded-lg bg-slate-950/30 px-2 py-1 text-white/70">{point.name || `Titik ${index + 1}`}: {entries.slice(-4).map((entry) => `${new Date(entry.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ${entry.level}`).join(' → ')}</span> : null; })}</div></div>}
        <p className="mt-3 text-[10px] leading-relaxed text-white/40">Screening preventif berbasis forecast model, bukan peringatan dini resmi. Ikuti peringatan BMKG dan otoritas setempat untuk keputusan keselamatan.</p>
      </section>}

      {workspaceMode === 'view' && !!points.length && <section className="mt-4 rounded-2xl border border-white/15 bg-slate-950/35 p-4 shadow-lg backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-white"><FiMapPin className="text-cyan-200" /> Forecast titik tersimpan</p><p className="mt-1 text-xs text-white/55">{selectedScenario ? `Scenario aktif: ${scenarios.find((scenario) => scenario.id === selectedScenario)?.name || 'Tersimpan'}` : 'Forecast titik operasional aktif'} · pembaruan otomatis setiap 10 menit.</p></div>
          {loadingReports && <span className="inline-flex items-center gap-1.5 text-xs text-cyan-100"><FiLoader className="animate-spin" /> Memuat forecast…</span>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((point, index) => <article key={`${point.id}-overview-card`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/75"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-white">{point.name || `Titik ${index + 1}`}</p><p className="mt-1 text-white/45">{point.lat.toFixed(3)}, {point.lon.toFixed(3)}</p></div>{point.report && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${point.report.level === 'Siaga' ? 'bg-rose-400/15 text-rose-200' : point.report.level === 'Waspada' ? 'bg-amber-400/15 text-amber-100' : 'bg-emerald-400/15 text-emerald-100'}`}>{point.report.level}</span>}</div>{point.report ? <div className="mt-3"><p className="font-semibold text-white">{point.report.summary}</p><p className="mt-1">Puncak: {formatTime(point.report.time)} · {point.report.metrics}</p><p className="mt-2 text-cyan-100">{point.report.action}</p></div> : <p className="mt-3 text-white/50">Forecast sedang disiapkan…</p>}</article>)}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-white/40">Screening preventif berbasis forecast model, bukan peringatan dini resmi.</p>
      </section>}

      {clickError && <Toast message={clickError} />}
    </>
  );
}
