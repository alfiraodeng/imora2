'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FiArrowRight, FiBarChart2, FiCloudRain, FiEye, FiEyeOff, FiLock, FiMail, FiShield, FiWind } from 'react-icons/fi';
import { getSupabase } from '@/lib/supabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const client = getSupabase();
    if (!client) { setLoading(false); return; }
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabase();
    if (!client) return;
    setSubmitting(true); setMessage('');
    const result = registering
      ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
      : await client.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (registering && !result.data.session) setMessage('Akun dibuat. Buka email untuk mengonfirmasi, lalu masuk.');
  };

  const resetPassword = async () => {
    const client = getSupabase();
    if (!client || !email.trim()) { setMessage('Masukkan email terlebih dahulu.'); return; }
    setSubmitting(true); setMessage('');
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setSubmitting(false); setMessage(error ? error.message : 'Link penggantian password telah dikirim ke email.');
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-sm text-white/70">Memuat IMORA…</main>;
  if (session?.user.email) return <>{children}</>;
  const configured = Boolean(getSupabase());

  return <main className="relative min-h-screen overflow-hidden bg-[#06162b] text-slate-950">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/imora-login-weather-hero.png')" }} />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,11,28,.88)_0%,rgba(2,20,43,.59)_45%,rgba(241,248,255,.18)_100%)]" />
    <header className="relative z-10 flex items-center justify-between border-b border-white/20 bg-slate-950/45 px-5 py-4 text-white backdrop-blur-md sm:px-8"><div className="flex items-center gap-3"><span className="grid h-8 w-10 place-items-center rounded-xl bg-sky-400 text-lg text-slate-950"><FiCloudRain /></span><b className="text-xl tracking-tight sm:text-2xl">IMORA <span className="text-sky-300">2.0</span></b><span className="hidden border-l border-white/30 pl-4 text-[10px] font-bold tracking-[.2em] text-white/75 sm:inline">INDEXIM METEOROLOGICAL REPORTING &amp; ANALYTICS</span></div><span className="hidden text-xs font-medium text-white/75 md:inline">Operational weather intelligence</span></header>
    <div className="relative z-10 mx-auto grid min-h-[calc(100vh-65px)] max-w-[1800px] items-center gap-10 px-5 py-8 lg:grid-cols-[1.2fr_.8fr] lg:px-12 xl:px-16">
      <section className="hidden max-w-3xl text-white lg:block"><div className="mb-6 h-1 w-12 bg-sky-400" /><h1 className="text-6xl font-black tracking-tight xl:text-7xl">IMORA <span className="text-sky-300">2.0</span></h1><p className="mt-3 text-xl font-medium tracking-[.18em] text-sky-50/95">INDEXIM METEOROLOGICAL REPORTING &amp; ANALYTICS</p><div className="mt-10 grid grid-cols-2 gap-4 xl:grid-cols-4">{[[FiBarChart2, 'Real-time', 'Monitoring'], [FiCloudRain, 'Advanced', 'Forecasting'], [FiWind, 'Operational', 'Analytics'], [FiShield, 'Safer', 'Operations']].map(([Icon, line1, line2]) => { const FeatureIcon = Icon as typeof FiCloudRain; return <div key={String(line1)} className="flex items-center gap-3 text-sm text-white/90"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/50 bg-slate-950/30"><FeatureIcon size={21} /></span><span><b className="block">{String(line1)}</b>{String(line2)}</span></div>; })}</div><p className="mt-16 text-base text-sky-50/85">Real-time weather insights for safer operations.</p></section>
      <section className="w-full max-w-xl justify-self-center rounded-[2rem] bg-white/95 p-6 shadow-2xl shadow-slate-950/45 backdrop-blur sm:p-9 lg:justify-self-end"><p className="text-xs font-bold tracking-[.3em] text-sky-700">IMORA 2.0</p><h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{registering ? 'Create your access' : 'Welcome Back'}</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{registering ? 'Create an account to access weather intelligence and operational analytics.' : 'Sign in to access weather intelligence, forecasting, and operational analytics.'}</p>
        {!configured ? <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Konfigurasi akses belum lengkap.</p> : <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-bold text-slate-800">Email<div className="relative mt-2"><FiMail className="pointer-events-none absolute left-4 top-3.5 text-slate-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div></label><label className="block text-sm font-bold text-slate-800">Password<div className="relative mt-2"><FiLock className="pointer-events-none absolute left-4 top-3.5 text-slate-400" /><input required minLength={6} type={visiblePassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /><button type="button" onClick={() => setVisiblePassword((value) => !value)} className="absolute right-3 top-3 text-slate-500 hover:text-sky-700" aria-label="Tampilkan password">{visiblePassword ? <FiEyeOff size={19} /> : <FiEye size={19} />}</button></div></label><div className="flex items-center justify-end"><button type="button" onClick={() => void resetPassword()} className="text-sm font-semibold text-sky-700 hover:underline">Forgot password?</button></div>{message && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}<button disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3.5 text-base font-black text-white shadow-lg shadow-sky-700/25 transition hover:from-sky-600 hover:to-blue-800 disabled:opacity-60">{submitting ? 'Processing…' : registering ? 'Create account' : 'Sign In'} <FiArrowRight size={21} /></button></form>}
        <button type="button" onClick={() => { setRegistering((value) => !value); setMessage(''); }} className="mt-6 w-full text-center text-sm font-semibold text-slate-600 hover:text-sky-700">{registering ? 'Already have an account? Sign In' : 'New user? Create an account'}</button><p className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><FiShield className="text-sky-700" /> Secure access for authorized Indexim personnel only.</p>
      </section>
    </div>
  </main>;
}
