'use client';

import { useWeather } from '@/context/WeatherContext';

export default function TemperatureToggle() {
  const { unit, setUnit } = useWeather();

  return (
    // Toggle between Celsius and Fahrenheit
    <div className="flex shrink-0 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-md">
      <button
        onClick={() => setUnit('metric')}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
          unit === 'metric'
            ? 'bg-white text-blue-900 shadow-md' // Active state
            : 'text-white hover:bg-white/10'     // Inactive hover
        }`}
      >
        °C
      </button>
      <button
        onClick={() => setUnit('imperial')}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4 ${
          unit === 'imperial'
            ? 'bg-white text-blue-900 shadow-md'
            : 'text-white hover:bg-white/10'
        }`}
      >
        °F
      </button>
    </div>
  );
}
