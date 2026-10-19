'use client';

import { useWeather } from '@/context/WeatherContext';
import { FiSun } from 'react-icons/fi';

type DayForecast = {
  date: string;
  temp_min: number;
  temp_max: number;
  weather: string;
  icon: string;
};

type Props = {
  days: DayForecast[];
};

export default function NextFourDays({ days }: Props) {
  const { unit } = useWeather();
  const unitSymbol = unit === 'metric' ? '°C' : '°F';

  return (
    <div
      className="h-full overflow-x-auto pb-1 touch-pan-x [&::-webkit-scrollbar]:hidden md:overflow-visible md:pb-0"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex h-full snap-x snap-mandatory gap-4 md:grid md:grid-cols-4 md:snap-none">
        {days.slice(0, 4).map((day) => {
          // Calculate a rough average temp for display at the top
          const avgTemp = Math.round((day.temp_min + day.temp_max) / 2);

          return (
            <div
              key={day.date}
              className="forecast-card min-h-[218px] min-w-[76%] snap-start rounded-3xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur-xl md:min-h-[245px] md:min-w-0"
            >
              {/* Weekday name and average temp */}
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-semibold text-white/90">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short', // gives Mon, Tue, etc.
                  })}
                </span>
                <span className="text-white/60">
                  {avgTemp}{unitSymbol}
                </span>
              </div>

              {/* Weather icon */}
              <div className="flex h-24 items-center justify-center py-1">
                {day.weather.toLowerCase().includes('clear') ? (
                  <FiSun aria-label="Clear sky" size={64} className="text-amber-200 drop-shadow-[0_0_14px_rgba(250,204,21,.75)]" />
                ) : (
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                    alt={day.weather}
                    className={`h-24 w-24 scale-125 object-contain ${day.weather.toLowerCase().includes('snow') ? 'brightness-0 invert' : ''}`}
                  />
                )}
              </div>

              {/* Min and Max temps */}
              <div className="mt-5 space-y-1 border-t border-white/10 pt-3 text-xs text-white/60">
                <div>
                  Min: <span className="text-white/80">{Math.round(day.temp_min)}{unitSymbol}</span>
                </div>
                <div>
                  Max: <span className="text-white/80">{Math.round(day.temp_max)}{unitSymbol}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
