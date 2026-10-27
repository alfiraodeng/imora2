'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FiActivity, FiEye, FiGlobe, FiLock, FiMapPin, FiRefreshCw, FiShield } from 'react-icons/fi';

type EmbedResponse = { embedUrl?: string | null };

export default function GodMode() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const loadWorkspace = async () => {
    const response = await fetch('/api/god-mode/embed', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as EmbedResponse;
    setEmbedUrl(data.embedUrl ?? null);
    setUnlocked(true);
  };

  useEffect(() => { void loadWorkspace(); }, []);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/god-mode/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      if (!response.ok) { setMessage('Password belum sesuai.'); return; }
      setPassword('');
      await loadWorkspace();
    } catch { setMessage('Koneksi ke akses GOD MODE gagal. Coba lagi.'); }
    finally { setLoading(false); }
  };

  if (!unlocked) return <section className="relative isolate overflow-hidden rounded-3xl border border-cyan-200/20 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-8">
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_25%,rgba(34,211,238,.2),transparent_31%),radial-gradient(circle_at_22%_85%,rgba(79,70,229,.18),transparent_40%)]" />
    <div className="mx-auto max-w-xl text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-100/25 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-950/40"><FiEye size={30} /></div><p className="mt-6 text-[11px] font-black uppercase tracking-[.28em] text-cyan-200">Restricted workspace</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">GOD MODE</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">Spatial intelligence workspace untuk pengawasan konteks operasional Indexim. Masukkan akses untuk melanjutkan.</p>
      <form onSubmit={unlock} className="mx-auto mt-7 flex max-w-sm gap-2 rounded-2xl border border-white/15 bg-white/5 p-2"><label className="sr-only" htmlFor="god-mode-password">Password GOD MODE</label><input id="god-mode-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Masukkan password" className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/35" /><button disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"><FiLock />{loading ? 'Membuka…' : 'Buka'}</button></form>{message && <p className="mt-3 text-xs text-rose-200">{message}</p>}<p className="mt-5 text-[11px] text-white/35">Akses berlangsung hanya selama sesi aktif dan berakhir otomatis.</p></div>
  </section>;

  if (embedUrl) return <section className="overflow-hidden rounded-3xl border border-cyan-200/20 bg-slate-950/70 shadow-2xl shadow-slate-950/50"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/65 px-4 py-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">GOD MODE · 3D Spatial Intelligence</p><p className="mt-1 text-xs text-white/55">Indexim operational view</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> SECURE SESSION</span></div><iframe title="GOD MODE 3D spatial intelligence" src={embedUrl} className="h-[min(72vh,760px)] w-full bg-slate-950" allow="fullscreen; geolocation" /></section>;

  return <section className="relative isolate overflow-hidden rounded-3xl border border-cyan-200/20 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-7"><div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(6,182,212,.2),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(99,102,241,.18),transparent_45%)]" /><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-cyan-200"><FiEye /> GOD MODE</p><h2 className="mt-2 text-2xl font-black">Spatial intelligence ready</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Sesi aman aktif. Mesin 3D terisolasi sudah disiapkan untuk view operasional Indexim tanpa memasukkan sumber pelacakan publik ke dashboard.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> SESSION ACTIVE</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[FiGlobe, '3D Globe', 'Engine isolated'], [FiMapPin, 'Indexim AOI', 'Pit & disposal context'], [FiActivity, 'Live context', 'Weather & operations'], [FiShield, 'Restricted', 'Session protected']].map(([Icon, label, note]) => { const CardIcon = Icon as typeof FiGlobe; return <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><CardIcon className="text-cyan-200" size={19} /><p className="mt-5 text-sm font-bold">{label as string}</p><p className="mt-1 text-xs text-white/45">{note as string}</p></div>; })}</div><div className="mt-6 rounded-2xl border border-amber-200/15 bg-amber-100/[.06] p-4 text-sm text-white/70"><p className="font-bold text-amber-100">3D endpoint belum dikonfigurasi</p><p className="mt-1 text-xs leading-5 text-white/55">Hubungkan deployment GOD MODE terpisah melalui environment server <code className="rounded bg-black/20 px-1.5 py-0.5 text-cyan-100">GOD_MODE_3D_URL</code>. Setelah tersedia, globe akan muncul di area ini tanpa membuka link baru.</p></div><button type="button" onClick={() => void loadWorkspace()} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"><FiRefreshCw /> Periksa 3D workspace</button></section>;
}
