'use client';

import { useEffect, useState } from 'react';
import { FiCalendar, FiDownload, FiFileText, FiLoader } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';
import { indeximMonthlyStats } from '@/data/indexim-rain-history';
import { prepareIndeximPdf } from '@/lib/pdf-report-branding';

type OutlookMonth = { date: string; temperature: number | null; precipitation: number | null; snow: number | null; source: 'ECMWF corrected to local baseline' | 'Local historical baseline' };
const monthLabel = (date: string) => new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

export default function AnnualOutlook() {
  const { lat, lon, weatherData, searchedCity } = useWeather();
  const [months, setMonths] = useState<OutlookMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedLocation, setLoadedLocation] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [pointRequest, setPointRequest] = useState(0);

  const loadOutlook = async () => {
    setLoading(true); setError('');
    try {
      const seasonalUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&monthly=temperature_2m_mean,precipitation_mean,snowfall_mean&forecast_days=215&timezone=auto`;
      const archiveEnd = new Date(); archiveEnd.setDate(archiveEnd.getDate() - 1);
      const archiveStart = new Date(archiveEnd); archiveStart.setFullYear(archiveStart.getFullYear() - 15);
      const date = (value: Date) => value.toISOString().slice(0, 10);
      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date(archiveStart)}&end_date=${date(archiveEnd)}&daily=temperature_2m_mean,precipitation_sum,snowfall_sum&timezone=auto`;
      const [seasonalResponse, archiveResponse] = await Promise.all([fetch(seasonalUrl), fetch(archiveUrl)]);
      if (!seasonalResponse.ok || !archiveResponse.ok) throw new Error('Data outlook unavailable');
      const seasonal = await seasonalResponse.json(); const archive = await archiveResponse.json();
      const gridMonthlyMean = (month: number) => {
        const totals: Record<string, number> = {};
        archive.daily.time.forEach((time: string, index: number) => { const item = new Date(`${time}T00:00:00`); if (item.getMonth() === month) { const year = String(item.getFullYear()); totals[year] = (totals[year] || 0) + Number(archive.daily.precipitation_sum[index] || 0); } });
        const values = Object.values(totals); return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
      };
      const forecast: OutlookMonth[] = seasonal.monthly.time.map((time: string, index: number) => { const month = new Date(`${time}T00:00:00`).getMonth(); const baseline = gridMonthlyMean(month); const localBaseline = indeximMonthlyStats[month].mean; return { date: time, temperature: seasonal.monthly.temperature_2m_mean[index], precipitation: baseline > 0 ? localBaseline * (Number(seasonal.monthly.precipitation_mean[index] || 0) / baseline) : localBaseline, snow: seasonal.monthly.snowfall_mean[index], source: 'ECMWF corrected to local baseline' }; });
      const future = new Date(`${forecast[forecast.length - 1].date}T00:00:00`);
      const baseline: OutlookMonth[] = Array.from({ length: 5 }, (_, offset) => {
        future.setMonth(future.getMonth() + 1);
        const month = future.getMonth();
        const values = archive.daily.time.map((time: string, index: number) => ({ month: new Date(`${time}T00:00:00`).getMonth(), temperature: archive.daily.temperature_2m_mean[index], snow: archive.daily.snowfall_sum[index] })).filter((value: { month: number }) => value.month === month);
        const average = (key: 'temperature' | 'snow') => values.reduce((sum: number, value: any) => sum + Number(value[key] || 0), 0) / Math.max(values.length, 1);
        return { date: future.toISOString().slice(0, 7), temperature: average('temperature'), precipitation: indeximMonthlyStats[month].mean, snow: average('snow') * 30, source: 'Local historical baseline' };
      });
      setMonths([...forecast, ...baseline]);
      setLoadedLocation(`${lat.toFixed(4)},${lon.toFixed(4)}`);
    } catch (caught) { console.error(caught); setError('Outlook tahunan belum dapat dimuat. Coba lagi.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const location = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (months.length && loadedLocation !== location) void loadOutlook();
  // Reload only after the user has opened this panel once, when its active location changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  useEffect(() => { const onOpenOutlook = () => setPointRequest((value) => value + 1); window.addEventListener('imora:open-outlook', onOpenOutlook); return () => window.removeEventListener('imora:open-outlook', onOpenOutlook); }, []);
  useEffect(() => { if (pointRequest) void loadOutlook(); // Explicit map action: refresh outlook for its newly active coordinate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointRequest, lat, lon]);

  const reportTitle = `IMORA · Outlook 12 Bulan — ${weatherData?.name || searchedCity || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}`;
  const exportRows = months.map((month, index) => ({
    'Periode': monthLabel(month.date),
    'Horizon bulan': index + 1,
    'Metode data': month.source === 'ECMWF corrected to local baseline' ? 'Prediksi ECMWF dikoreksi baseline historis lokasi' : 'Rerata curah hujan historis lokasi',
    'Suhu rata-rata (°C)': month.temperature === null ? '' : Number(month.temperature.toFixed(1)),
    'Presipitasi (mm)': month.precipitation === null ? '' : Number(month.precipitation.toFixed(1)),
    'Salju (cm)': month.snow === null ? '' : Number(month.snow.toFixed(1)),
  }));
  const reportFilename = `IMORA-outlook-12-bulan-${new Date().toISOString().slice(0, 10)}`;

  const exportExcel = async () => {
    if (!months.length) return;
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      [reportTitle],
      [`Koordinat: ${lat.toFixed(4)}, ${lon.toFixed(4)}`],
      [`Dibuat: ${new Date().toLocaleString('id-ID')}`],
      [],
      Object.keys(exportRows[0]),
      ...exportRows.map((row) => Object.values(row)),
      [],
      ['Catatan', 'Bulan 1–7 merupakan prediksi musiman ECMWF yang dikoreksi memakai baseline historis lokasi. Bulan 8–12 memakai climatology lokasi; bukan prediksi cuaca harian.'],
    ]);
    sheet['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Outlook 12 Bulan');
    XLSX.writeFile(workbook, `${reportFilename}.xlsx`);
    setExportOpen(false);
  };

  const exportPdf = async () => {
    if (!months.length) return;
    const { jsPDF } = await import('jspdf');
    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    const branding = await prepareIndeximPdf(document, 'Outlook 12 Bulan', `${weatherData?.name || searchedCity || 'Lokasi dipilih'} · ${lat.toFixed(4)}, ${lon.toFixed(4)} · Dibuat ${new Date().toLocaleString('id-ID')}`, `OUT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`); branding.decorate(); let y = 61;
    document.setFillColor(239, 247, 250); document.roundedRect(14, 56, 182, 20, 3, 3, 'F'); document.setFont('helvetica', 'bold'); document.setFontSize(8); document.setTextColor(22, 67, 91); document.text('OUTLOOK BASIS', 20, 64); document.setFont('helvetica', 'normal'); document.setFontSize(7.4); document.setTextColor(69, 93, 110); document.text(document.splitTextToSize('Bulan 1–7 menggunakan prediksi musiman ECMWF yang dikoreksi baseline historis lokasi. Bulan 8–12 menggunakan climatology lokasi untuk perencanaan, bukan prediksi harian.', 168), 20, 70); y = 86;
    document.setFillColor(15, 56, 80); document.roundedRect(14, y - 5, 182, 7, 1.5, 1.5, 'F'); document.setFont('helvetica', 'bold'); document.setFontSize(7); document.setTextColor(255, 255, 255); document.text('PERIODE', 18, y); document.text('HORIZON', 58, y); document.text('SUHU', 83, y); document.text('HUJAN', 111, y); document.text('SALJU', 139, y); document.text('METODE', 160, y); y += 7;
    months.forEach((month, index) => {
      if (y > 274) { branding.nextPage(); y = 61; }
      if (index % 2 === 0) { document.setFillColor(247, 250, 252); document.rect(14, y - 5, 182, 6.8, 'F'); } document.setFont('helvetica', 'normal'); document.setFontSize(7); document.setTextColor(51, 73, 88); document.text(monthLabel(month.date), 18, y); document.text(`Bulan ${index + 1}`, 58, y); document.text(`${month.temperature?.toFixed(1) ?? '—'} °C`, 83, y); document.text(`${month.precipitation?.toFixed(1) ?? '—'} mm`, 111, y); document.text(`${month.snow?.toFixed(1) ?? '—'} cm`, 139, y); document.text(month.source === 'ECMWF corrected to local baseline' ? 'ECMWF + Lokal' : 'Baseline lokal', 160, y); y += 6.8;
    });
    document.save(`${reportFilename}.pdf`);
    setExportOpen(false);
  };

  return (
    <section id="imora-annual-outlook" className="mb-5 scroll-mt-5 rounded-2xl border border-white/15 bg-slate-950/35 p-3 shadow-lg backdrop-blur-md sm:mb-6 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold text-white"><FiCalendar className="text-cyan-200" /> Outlook 12 Bulan</p><p className="mt-1 text-xs text-white/55">Lokasi: <span className="font-semibold text-white/80">{weatherData?.name || searchedCity}</span></p></div><div className="flex items-center gap-2"><div className="relative">{months.length > 0 && <button type="button" onClick={() => setExportOpen((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200/30 bg-cyan-300/15 px-3 py-2 text-xs font-bold text-cyan-50 transition hover:bg-cyan-300/25"><FiDownload /> Download report</button>}{exportOpen && <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 p-1 shadow-2xl backdrop-blur"><button type="button" onClick={exportExcel} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/10"><FiDownload /> Excel (.xlsx)</button><button type="button" onClick={exportPdf} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/10"><FiFileText /> PDF report</button></div>}</div><button type="button" onClick={loadOutlook} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-60">{loading && <FiLoader className="animate-spin" />}{loading ? 'Memuat…' : months.length ? 'Perbarui outlook' : 'Lihat outlook'}</button></div></div>
      {!!months.length && <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs sm:grid-cols-2"><p className="text-cyan-100"><b>● Bulan 1–7:</b> prediksi ECMWF dikoreksi dengan baseline historis lokasi aktif.</p><p className="text-violet-100"><b>● Bulan 8–12:</b> climatology curah hujan lokasi aktif.</p></div>}
      {!!months.length && <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible">{months.map((month, index) => <article key={month.date} className="min-h-[150px] min-w-[76%] snap-start rounded-2xl border border-white/15 bg-white/10 p-4 text-xs shadow-lg backdrop-blur-sm md:min-w-0"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold tracking-[.12em] text-white/45">BULAN {index + 1}</p><p className="mt-1 text-base font-semibold text-white">{monthLabel(month.date)}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${month.source === 'ECMWF corrected to local baseline' ? 'bg-cyan-300/15 text-cyan-100' : 'bg-violet-300/15 text-violet-100'}`}>{month.source === 'ECMWF corrected to local baseline' ? 'ECMWF + Lokal' : 'Baseline lokal'}</span></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-3"><p className="text-white/55">Suhu<br /><b className="text-sm text-white">{month.temperature?.toFixed(1)}°C</b></p><p className="text-white/55">Hujan<br /><b className="text-sm text-white">{month.precipitation?.toFixed(1)} mm</b></p><p className="text-white/55">Salju<br /><b className="text-sm text-white">{month.snow?.toFixed(1)} cm</b></p></div></article>)}</div>}
      {!!months.length && <p className="mt-3 text-[10px] leading-relaxed text-white/40">Gunakan ini untuk perencanaan. Ini bukan prediksi “akan hujan pada tanggal tertentu”, karena cuaca harian tidak dapat dipastikan sampai satu tahun.</p>}
      {error && <p className="mt-3 text-xs text-rose-200">{error}</p>}
    </section>
  );
}
