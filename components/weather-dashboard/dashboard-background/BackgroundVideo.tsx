'use client';

import { useWeather } from '@/context/WeatherContext';

export default function BackgroundVideo() {
  const { weatherData, unit } = useWeather();
  const condition = weatherData?.weather?.[0]?.main?.toLowerCase() || 'clear';
  const rainy = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunder');
  const cloudy = condition.includes('cloud') || condition.includes('mist') || condition.includes('fog');
  const snowy = condition.includes('snow');
  const temperatureC = unit === 'imperial' && weatherData ? (weatherData.main.temp - 32) * 5 / 9 : weatherData?.main?.temp;
  const cold = (temperatureC ?? Number.POSITIVE_INFINITY) <= 15;
  const hot = (temperatureC ?? Number.NEGATIVE_INFINITY) > 25;
  const video = cold
    ? '/weather-video/optimized/dingin.mp4?v=1'
    : hot
      ? '/weather-video/optimized/terik.mp4?v=1'
    : snowy
    ? '/weather-video/optimized/salju.mp4?v=1'
    : rainy
    ? '/weather-video/optimized/hujan.mp4?v=1'
    : cloudy
      ? '/weather-video/optimized/mendung-berawan.mp4?v=1'
      : '/weather-video/optimized/cerah.mp4?v=1';

  return <>
    <video key={video} className="absolute inset-0 z-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata"><source src={video} type="video/mp4" /></video>
    <div className="absolute inset-0 z-0 bg-slate-950/30" />
  </>;
}
