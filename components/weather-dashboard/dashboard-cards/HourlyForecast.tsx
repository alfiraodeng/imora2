'use client';

import { useWeather } from '@/context/WeatherContext';

const icon = (code: number) => code === 0 ? '☀️' : code <= 3 ? '☁️' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : code <= 82 ? '🌦️' : '⛈️';
const direction = (degrees: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];

export default function HourlyForecast() {
  const { hourlyForecast, unit } = useWeather();
  if (!hourlyForecast.length) return null;
  const unitSymbol = unit === 'metric' ? '°C' : '°F';
  const windUnit = unit === 'metric' ? 'm/s' : 'mph';
  const dateLabel = new Date(hourlyForecast[0].time).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

  return <section className="hourly-panel mb-5 rounded-3xl border border-white/15 bg-slate-950/35 p-4 shadow-2xl backdrop-blur-xl sm:mb-6 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-white sm:text-xl">Prakiraan per Jam</h2><p className="mt-1 text-xs text-white/55">{dateLabel} · geser untuk melihat jam berikutnya</p></div><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-cyan-100">18 JAM</span></div>
    <div className="hourly-scroll overflow-x-auto pb-2"><div className="min-w-max"><div className="grid grid-flow-col auto-cols-[84px] border-b border-white/12 pb-3 sm:auto-cols-[96px]">{hourlyForecast.map((hour, index) => <div key={hour.time} className="px-2 text-center text-xs text-white/65"><b className={index === 0 ? 'text-cyan-200' : 'text-white/80'}>{new Date(hour.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b></div>)}</div><div className="grid grid-flow-col auto-cols-[84px] pt-4 sm:auto-cols-[96px]">{hourlyForecast.map((hour, index) => <div key={hour.time} className="hourly-cell rounded-2xl px-2 py-2 text-center"><div className="text-3xl">{icon(hour.weatherCode)}</div><b className="mt-2 block text-base text-white">{Math.round(hour.temperature)}{unitSymbol}</b><span className="mt-1 block text-xs text-white/60">{Math.round(hour.humidity)}%</span><div className="mt-4 border-t border-white/10 pt-3"><b className="text-sm text-white/90">{Math.round(hour.windSpeed)}</b><span className="ml-1 text-[10px] text-white/55">{windUnit}</span><span className="mt-1 block text-[10px] text-white/55">{direction(hour.windDirection)} ↗</span></div>{index === 0 && <span className="mt-2 block text-[9px] font-bold tracking-wider text-cyan-200">NOW</span>}</div>)}</div></div></div>
  </section>;
}
