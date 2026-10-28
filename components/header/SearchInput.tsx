'use client';

import { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';
import Toast from '@/components/main/Toast';

type Coordinates = { latitude: number; longitude: number };

function parseCoordinates(value: string): Coordinates | null {
  // Allow the formats operators normally copy from GIS, Excel, Google Maps,
  // or a survey sheet: "lat, lon", "lon, lat", "lat: … lng: …", brackets,
  // spaces, and Indonesian decimal commas when values are separated by ; or |.
  const raw = value.trim();
  const normalized = (/[;|]/.test(raw)
    ? raw.replace(/([+-]?\d+),(\d+)/g, '$1.$2')
    : raw
  ).replace(/([+-]?\d+),(\d+)(?=\s+(?:lat(?:itude)?|lon(?:gitude)?|lng)\b)/gi, '$1.$2');
  const latFirst = normalized.match(/(?:lat(?:itude)?|y)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?).*?(?:lon(?:gitude)?|lng|x)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
  const lonFirst = normalized.match(/(?:lon(?:gitude)?|lng|x)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?).*?(?:lat(?:itude)?|y)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
  const numbers = latFirst ? [Number(latFirst[1]), Number(latFirst[2])]
    : lonFirst ? [Number(lonFirst[2]), Number(lonFirst[1])]
      : (normalized.match(/[+-]?\d+(?:\.\d+)?/g) || []).map(Number);
  if (numbers.length !== 2 || numbers.some((item) => !Number.isFinite(item))) return null;
  const [first, second] = numbers;
  // A value outside ±90 can only be longitude. When both can be latitude,
  // accept the widespread latitude, longitude copy-paste order by default.
  const latitude = Math.abs(first) > 90 ? second : first;
  const longitude = Math.abs(first) > 90 ? first : second;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export default function SearchInput() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const { setCoordinates } = useWeather();

  // Handles search form submission and fetches location coordinates
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    if (!query.trim()) return;
    setSearching(true);

    try {
      const coordinates = parseCoordinates(query);
      if (coordinates) {
        const { latitude, longitude } = coordinates;
        setCoordinates(latitude, longitude, `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setQuery('');
        return;
      }
      // Open-Meteo geocoding is public, so location search works even when a
      // user has not activated an OpenWeather key yet.
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      if (!data.results?.length) {
        setSearchError('Invalid location. Try a city or populated area.');
        return;
      }

      // Format display name (e.g., "Paris, Île-de-France, FR")
      const { latitude: lat, longitude: lon, name, admin1: state, country } = data.results[0];
      let displayName = name;
      if (state && state !== name) displayName += `, ${state}`;
      if (country) displayName += `, ${country}`;

      // Update global context with new coordinates and name
      setCoordinates(lat, lon, displayName);
      setQuery('');
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Error searching location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Automatically clear error message after 3 seconds
  useEffect(() => {
    if (!searchError) return;
    const timeout = setTimeout(() => setSearchError(''), 3000);
    return () => clearTimeout(timeout);
  }, [searchError]);

  return (
    <>
      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
        <input
          type="text"
          value={query}
          placeholder="Kota atau lat, lon"
          title="Contoh: -1.2700, 116.8300 · 116.8300, -1.2700 · Lat: -1.2700, Lon: 116.8300"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-white/20 bg-white/10 py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-white/45 outline-none backdrop-blur-md transition focus:border-cyan-200/70 focus:bg-white/15"
          disabled={searching}
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="absolute right-2 top-2.5 text-gray-400 hover:text-white transition cursor-pointer"
        >
          {searching ? '⏳' : <FiSearch />}
        </button>
      </form>

      {/* Show toast if an error occurred during search */}
      {searchError && <Toast message={searchError} />}
    </>
  );
}
