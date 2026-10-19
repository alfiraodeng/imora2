'use client';

import { useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiBell, FiCheckCircle, FiCloudRain, FiLoader, FiNavigation, FiWind, FiX } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';
import { type IndeximAsset } from '@/data/indexim-assets';

type Severity = 'siaga' | 'waspada';
type AssetAlert = { id: string; asset: IndeximAsset; severity: Severity; title: string; detail: string; action: string; due: string; rain: number; gust: number };
type MonitoringReport = { level: 'Normal' | 'Waspada' | 'Siaga'; summary: string; time: string; rain: number; gust: number; action: string; metrics: string };
type MonitoringAlert = { id: string; name: string; lat: number; lon: number; report?: MonitoringReport };
type MonitoringPayload = { scenarioName: string; checkedAt: number; alerts: MonitoringAlert[] };
type ScenarioLevel = 'aman' | 'pantau' | 'waspada' | 'siaga';

const levelFor = (alert: MonitoringAlert): ScenarioLevel => !alert.report ? 'aman' : alert.report.level === 'Siaga' ? 'siaga' : alert.report.level === 'Waspada' ? 'waspada' : alert.report.rain >= 0.2 ? 'pantau' : 'aman';
const rank: Record<ScenarioLevel, number> = { aman: 0, pantau: 1, waspada: 2, siaga: 3 };
const styleFor = (level: ScenarioLevel) => level === 'siaga' ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : level === 'waspada' ? 'border-amber-300/30 bg-amber-400/10 text-amber-100' : level === 'pantau' ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
const labelFor = (level: ScenarioLevel) => level === 'aman' ? 'AMAN' : level.toUpperCase();

export default function NotificationCenter() {
  const { setCoordinates, updatedAt } = useWeather();
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [alerts, setAlerts] = useState<AssetAlert[]>([]); const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [scenarioName, setScenarioName] = useState(''); const [scenarioAlerts, setScenarioAlerts] = useState<MonitoringAlert[]>([]); const [scenarioCheckedAt, setScenarioCheckedAt] = useState<number | null>(null); const [popup, setPopup] = useState<{ level: ScenarioLevel; title: string; detail: string } | null>(null);
  const lastBrowserAlert = useRef(''); const scenarioSignature = useRef('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/operations-nowcast', { cache: 'no-store' });
        if (!response.ok) throw new Error('Alert forecast unavailable');
        const data: { alerts?: AssetAlert[]; checkedAt?: number } = await response.json(); const next = data.alerts || [];
        if (!cancelled) { setAlerts(next); setCheckedAt(data.checkedAt || Date.now()); }
        const first = next[0];
        if (first && typeof Notification !== 'undefined' && Notification.permission === 'granted' && lastBrowserAlert.current !== first.id) {
          new Notification(`IMORA ${first.severity === 'siaga' ? 'SIAGA' : 'WASPADA'} · ${first.asset.name}`, { body: `${first.title}. ${first.detail}` }); lastBrowserAlert.current = first.id;
        }
      } catch { if (!cancelled) setAlerts([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load(); const timer = window.setInterval(load, 10 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [updatedAt]);

  useEffect(() => {
    const receive = (event: Event) => {
      const payload = (event as CustomEvent<MonitoringPayload>).detail;
      if (!payload?.alerts) return;
      const notifiable = payload.alerts.filter((alert) => levelFor(alert) !== 'aman');
      setScenarioName(payload.scenarioName); setScenarioAlerts(notifiable); setScenarioCheckedAt(payload.checkedAt);
      const ordered = [...notifiable].sort((a, b) => rank[levelFor(b)] - rank[levelFor(a)]);
      const lead = ordered[0]; const level = lead ? levelFor(lead) : 'aman';
      const signature = notifiable.map((alert) => `${alert.id}:${levelFor(alert)}:${alert.report?.summary || ''}`).join('|');
      if (signature === scenarioSignature.current) return;
      scenarioSignature.current = signature;
      if (!lead) return;
      const title = `${labelFor(level)} · ${lead.name}`;
      const detail = `${lead.report?.summary || 'Perubahan cuaca terdeteksi'} · ${lead.report?.metrics || ''}`;
      setPopup({ level, title, detail });
      if ((level === 'waspada' || level === 'siaga') && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(`IMORA ${labelFor(level)} · ${lead.name}`, { body: detail });
    };
    window.addEventListener('imora:monitoring-alerts', receive);
    return () => window.removeEventListener('imora:monitoring-alerts', receive);
  }, []);

  useEffect(() => { if (!popup) return; const timer = window.setTimeout(() => setPopup(null), 8_000); return () => window.clearTimeout(timer); }, [popup]);

  const enableBrowserAlerts = async () => { if (typeof Notification !== 'undefined') await Notification.requestPermission(); };
  const critical = alerts.filter((alert) => alert.severity === 'siaga').length + scenarioAlerts.filter((alert) => levelFor(alert) === 'siaga').length;
  const attention = alerts.length + scenarioAlerts.filter((alert) => levelFor(alert) !== 'aman').length;
  const badge = critical || attention;
  return <div className="relative shrink-0">
    <button type="button" onClick={() => setOpen((value) => !value)} className={`relative grid h-10 w-10 place-items-center rounded-xl border transition ${open ? 'border-cyan-200/60 bg-cyan-300 text-slate-950' : 'border-white/15 bg-slate-950/35 text-white/85 hover:bg-white/10'}`} aria-label="Buka notifikasi forecast">
      <FiBell size={18} />{badge > 0 && <span className={`absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border border-slate-950 px-1 text-[9px] font-black text-white ${critical ? 'bg-rose-500' : 'bg-amber-500'}`}>{badge > 9 ? '9+' : badge}</span>}
    </button>
    {popup && <aside className={`fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[3000] w-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:w-[min(92vw,25rem)] ${styleFor(popup.level)}`} role="status"><div className="flex items-start gap-3"><div className="mt-0.5">{popup.level === 'pantau' ? <FiCloudRain size={20} /> : <FiAlertTriangle size={20} />}</div><div className="min-w-0 flex-1"><p className="text-xs font-black tracking-wide">{popup.title}</p><p className="mt-1 text-xs leading-relaxed text-white/80">{popup.detail}</p><p className="mt-2 text-[10px] text-white/50">Forecast titik scenario aktif.</p></div><button onClick={() => setPopup(null)} className="rounded-lg p-1 text-white/70 hover:bg-white/10" aria-label="Tutup pop-up"><FiX /></button></div></aside>}
    {open && <><button onClick={() => setOpen(false)} className="fixed inset-0 z-[2400] cursor-default" aria-label="Tutup notifikasi" /><section className="fixed inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] z-[2500] max-h-[calc(100dvh-5.5rem)] w-auto overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[min(92vw,29rem)]">
      <header className="flex items-start justify-between border-b border-white/10 px-4 py-3"><div><p className="flex items-center gap-2 text-sm font-bold"><FiBell className="text-cyan-200" /> Alert pusat operasi</p><p className="mt-1 text-[10px] text-white/50">Status scenario aktif dan titik Pit & Disposal · refresh 10 menit</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/55 hover:bg-white/10"><FiX /></button></header>
      <div className="max-h-[min(65vh,33rem)] overflow-y-auto p-2">
        {!!scenarioAlerts.length && <><p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[.12em] text-cyan-100">Scenario aktif · {scenarioName}</p>{scenarioAlerts.map((alert) => { const level = levelFor(alert); return <button key={alert.id} onClick={() => { setCoordinates(alert.lat, alert.lon, alert.name); setOpen(false); }} className={`mb-1 w-full rounded-xl border p-3 text-left transition hover:bg-white/10 ${styleFor(level)}`}><div className="flex gap-2"><div className="mt-0.5">{level === 'aman' ? <FiCheckCircle size={17} /> : alert.report?.rain ? <FiCloudRain size={17} /> : <FiWind size={17} />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="text-xs text-white">{alert.name}</b><span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black text-white">{labelFor(level)}</span></div><p className="mt-1 text-xs font-semibold text-white/90">{alert.report?.summary || 'Forecast sedang disiapkan'}</p>{alert.report && <p className="mt-1 text-[11px] text-white/65">{alert.report.metrics}</p>}<p className="mt-1 text-[10px] text-white/50">{alert.report?.action || 'Memuat forecast titik.'}</p></div><FiNavigation className="mt-1 shrink-0 text-white/35" size={14} /></div></button>; })}</>}
        {loading && <div className="flex items-center gap-2 p-4 text-sm text-white/60"><FiLoader className="animate-spin" /> Memperbarui forecast titik tambang…</div>}
        {!loading && !alerts.length && !scenarioAlerts.length && <div className="p-5 text-center"><FiCheckCircle className="mx-auto text-emerald-300" size={24} /><p className="mt-2 text-sm font-semibold">Tidak ada alert aktif</p><p className="mt-1 text-xs text-white/50">Scenario akan muncul setelah forecast titik selesai dimuat.</p></div>}
        {!!alerts.length && <><p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Aset operasional</p>{alerts.map((alert) => <button key={alert.id} onClick={() => { setCoordinates(alert.asset.lat, alert.asset.lon, alert.asset.name); setOpen(false); }} className={`mb-1 w-full rounded-xl border p-3 text-left transition hover:bg-white/10 ${alert.severity === 'siaga' ? 'border-rose-400/30 bg-rose-500/10' : 'border-amber-300/25 bg-amber-400/10'}`}><div className="flex gap-2"><div className={`mt-0.5 ${alert.severity === 'siaga' ? 'text-rose-300' : 'text-amber-200'}`}>{alert.rain >= 4 ? <FiCloudRain size={17} /> : <FiWind size={17} />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="text-xs">{alert.asset.name}</b><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${alert.severity === 'siaga' ? 'bg-rose-400 text-rose-950' : 'bg-amber-300 text-amber-950'}`}>{alert.severity.toUpperCase()}</span></div><p className="mt-1 text-xs font-semibold text-white/90">{alert.title}</p><p className="mt-1 text-[11px] text-white/65">{alert.detail}</p><p className="mt-1 text-[10px] text-white/45">Aksi: {alert.action}</p></div><FiNavigation className="mt-1 shrink-0 text-white/35" size={14} /></div></button>)}</>}
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5"><p className="text-[9px] leading-relaxed text-white/45">Pembaruan forecast {scenarioCheckedAt || checkedAt ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(scenarioCheckedAt || checkedAt || Date.now()) : '—'} WITA.</p><button onClick={enableBrowserAlerts} className="shrink-0 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-bold text-cyan-100 hover:bg-white/10">Aktifkan browser</button></footer>
    </section></>}
  </div>;
}
