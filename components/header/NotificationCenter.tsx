'use client';

import { useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiBell, FiCheckCircle, FiCloudRain, FiLoader, FiNavigation, FiWind, FiX } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';
import { type IndeximAsset } from '@/data/indexim-assets';

type Severity = 'siaga' | 'waspada';
type Alert = { id: string; asset: IndeximAsset; severity: Severity; title: string; detail: string; action: string; due: string; rain: number; gust: number };

export default function NotificationCenter() {
  const { setCoordinates, updatedAt } = useWeather();
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [alerts, setAlerts] = useState<Alert[]>([]); const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const lastBrowserAlert = useRef('');
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/operations-nowcast', { cache: 'no-store' });
        if (!response.ok) throw new Error('Alert forecast unavailable');
        const data: { alerts?: Alert[]; checkedAt?: number } = await response.json(); const next = data.alerts || [];
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
  const enableBrowserAlerts = async () => { if (typeof Notification !== 'undefined') await Notification.requestPermission(); };
  const critical = alerts.filter((alert) => alert.severity === 'siaga').length;
  const badge = critical || alerts.length;
  return <div className="relative shrink-0">
    <button type="button" onClick={() => setOpen((value) => !value)} className={`relative grid h-10 w-10 place-items-center rounded-xl border transition ${open ? 'border-cyan-200/60 bg-cyan-300 text-slate-950' : 'border-white/15 bg-slate-950/35 text-white/85 hover:bg-white/10'}`} aria-label="Buka notifikasi forecast">
      <FiBell size={18} />{badge > 0 && <span className={`absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border border-slate-950 px-1 text-[9px] font-black text-white ${critical ? 'bg-rose-500' : 'bg-amber-500'}`}>{badge > 9 ? '9+' : badge}</span>}
    </button>
    {open && <><button onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" aria-label="Tutup notifikasi" /><section className="absolute right-0 top-12 z-50 w-[min(92vw,29rem)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl shadow-slate-950/60 backdrop-blur-2xl">
      <header className="flex items-start justify-between border-b border-white/10 px-4 py-3"><div><p className="flex items-center gap-2 text-sm font-bold"><FiBell className="text-cyan-200" /> Alert pusat operasi</p><p className="mt-1 text-[10px] text-white/50">17 koordinat Pit & Disposal Indexim · refresh 10 menit</p></div><button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/55 hover:bg-white/10"><FiX /></button></header>
      <div className="max-h-[min(65vh,33rem)] overflow-y-auto p-2">
        {loading && <div className="flex items-center gap-2 p-4 text-sm text-white/60"><FiLoader className="animate-spin" /> Memperbarui forecast titik tambang…</div>}
        {!loading && alerts.length === 0 && <div className="p-5 text-center"><FiCheckCircle className="mx-auto text-emerald-300" size={24} /><p className="mt-2 text-sm font-semibold">Tidak ada hujan lebat atau angin kencang dalam 6 jam</p><p className="mt-1 text-xs text-white/50">Semua titik Pit & Disposal telah discan.</p></div>}
        {!loading && alerts.map((alert) => <button key={alert.id} onClick={() => { setCoordinates(alert.asset.lat, alert.asset.lon, alert.asset.name); setOpen(false); }} className={`mb-1 w-full rounded-xl border p-3 text-left transition hover:bg-white/10 ${alert.severity === 'siaga' ? 'border-rose-400/30 bg-rose-500/10' : 'border-amber-300/25 bg-amber-400/10'}`}><div className="flex gap-2"><div className={`mt-0.5 ${alert.severity === 'siaga' ? 'text-rose-300' : 'text-amber-200'}`}>{alert.rain >= 4 ? <FiCloudRain size={17} /> : <FiWind size={17} />}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="text-xs">{alert.asset.name}</b><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${alert.severity === 'siaga' ? 'bg-rose-400 text-rose-950' : 'bg-amber-300 text-amber-950'}`}>{alert.severity.toUpperCase()}</span></div><p className="mt-1 text-xs font-semibold text-white/90">{alert.title}</p><p className="mt-1 text-[11px] text-white/65">{alert.detail}</p><p className="mt-1 text-[10px] text-white/45">Aksi: {alert.action}</p></div><FiNavigation className="mt-1 shrink-0 text-white/35" size={14} /></div></button>)}
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5"><p className="text-[9px] leading-relaxed text-white/45">Forecast model, bukan observasi lapangan atau peringatan resmi BMKG. Update {checkedAt ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(checkedAt) : '—'} WITA.</p><button onClick={enableBrowserAlerts} className="shrink-0 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-bold text-cyan-100 hover:bg-white/10">Aktifkan browser</button></footer>
    </section></>}
  </div>;
}
