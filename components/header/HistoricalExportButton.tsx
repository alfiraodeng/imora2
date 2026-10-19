'use client';

import { useState } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export default function HistoricalExportButton() {
  const { lat, lon, searchedCity } = useWeather();
  const [exporting, setExporting] = useState(false);

  const downloadHistory = async () => {
    setExporting(true);

    try {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 15);

      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        start_date: isoDate(start),
        end_date: isoDate(end),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,rain_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max',
        timezone: 'auto',
      });
      const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
      if (!response.ok) throw new Error('Historical weather data is unavailable.');

      const data = await response.json();
      if (!data.daily?.time?.length) throw new Error('No historical weather data was returned.');

      const XLSX = await import('xlsx');
      const rows = data.daily.time.map((date: string, index: number) => ({
        Date: date,
        'Weather code (WMO)': data.daily.weather_code[index],
        'Temperature max (°C)': data.daily.temperature_2m_max[index],
        'Temperature min (°C)': data.daily.temperature_2m_min[index],
        'Feels-like max (°C)': data.daily.apparent_temperature_max[index],
        'Feels-like min (°C)': data.daily.apparent_temperature_min[index],
        'Precipitation (mm)': data.daily.precipitation_sum[index],
        'Rain (mm)': data.daily.rain_sum[index],
        'Snowfall (cm)': data.daily.snowfall_sum[index],
        'Wind max (km/h)': data.daily.wind_speed_10m_max[index],
        'Wind gust max (km/h)': data.daily.wind_gusts_10m_max[index],
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Daily history');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
        Location: searchedCity,
        Latitude: lat,
        Longitude: lon,
        Period: `${isoDate(start)} to ${isoDate(end)}`,
        Source: 'Open-Meteo Historical Weather API (ERA5 / ERA5-Land)',
        Exported: new Date().toLocaleString('id-ID'),
      }]), 'Read me');

      const location = searchedCity.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'location';
      XLSX.writeFile(workbook, `IMORA-history-${location}-${isoDate(start)}-to-${isoDate(end)}.xlsx`);
    } catch (error) {
      console.error(error);
      window.alert('Data historis belum dapat diunduh. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={downloadHistory}
      disabled={exporting}
      title="Download 15 years of daily data as Excel"
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-70"
    >
      {exporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
      <span className="hidden sm:inline">Excel 15Y</span>
    </button>
  );
}
