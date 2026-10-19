'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FiArrowRight, FiCloudRain, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi';
import { getSupabase } from '@/lib/supabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSubmitting(true); setMessage('');
    const result = registering
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (registering && !result.data.session) setMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.');
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-sm text-white/70">Memuat IMORA…</main>;
  if (session?.user.email) return <>{children}</>;
  const configured = Boolean(getSupabase());
  return <main className="relative grid min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(6,182,212,.22),transparent_33%),radial-gradient(circle_at_88%_80%,rgba(59,130,246,.18),transparent_34%)]" />
    <section className="relative z-10 m-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950/75 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl lg:grid-cols-[1.1fr_.9fr]">
      <div className="hidden min-h-[580px] flex-col justify-between border-r border-white/10 bg-cyan-300/10 p-10 lg:flex"><div><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1.5 text-xs font-bold tracking-[.14em] text-cyan-100"><FiCloudRain /> IMORA 2.0</div><h1 className="max-w-md text-4xl font-black leading-tight">Mining rain intelligence, dalam satu ruang kerja.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Pantau forecast, kondisi hujan, peta operasional, dan scenario dengan akses yang terlindungi.</p></div><div className="space-y-3 text-sm text-white/75"><p className="flex items-center gap-3"><FiShield className="text-cyan-200" /> Akses khusus pengguna terdaftar</p><p className="flex items-center gap-3"><FiLock className="text-cyan-200" /> Data diamankan oleh Supabase</p></div></div>
      <div className="p-6 sm:p-10"><div className="mb-8"><div className="mb-5 flex items-center gap-2 text-cyan-100 lg:hidden"><FiCloudRain /><b className="tracking-[.15em]">IMORA</b></div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">INDEXIM OPERATIONS</p><h2 className="mt-2 text-2xl font-black">{registering ? 'Buat akun IMORA' : 'Masuk ke IMORA'}</h2><p className="mt-2 text-sm text-white/55">{registering ? 'Gunakan email kerja untuk membuat akses.' : 'Masukkan email dan password untuk membuka dashboard.'}</p></div>
        {!configured ? <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Koneksi database belum dikonfigurasi.</div> : <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium text-white/80">Email<div className="relative mt-2"><FiMail className="pointer-events-none absolute left-3 top-3.5 text-white/40" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.com" className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none transition placeholder:text-white/25 focus:border-cyan-200/70" /></div></label><label className="block text-sm font-medium text-white/80">Password<div className="relative mt-2"><FiLock className="pointer-events-none absolute left-3 top-3.5 text-white/40" /><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 6 karakter" className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none transition placeholder:text-white/25 focus:border-cyan-200/70" /></div></label>{message && <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">{message}</p>}<button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Memproses…' : registering ? 'Buat akun' : 'Masuk'} <FiArrowRight /></button></form>}
        <button type="button" onClick={() => { setRegistering((value) => !value); setMessage(''); }} className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100"><FiUser /> {registering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Buat akun'}</button>
      </div>
    </section>
  </main>;
}
