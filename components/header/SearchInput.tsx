'use client';

import { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useWeather } from '@/context/WeatherContext';
import Toast from '@/components/main/Toast';

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
      // Coordinates are accepted as longitude, latitude (e.g. 116.8300, -1.2700).
      const coordinates = query.trim().match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,2}(?:\.\d+)?)\s*$/);
      if (coordinates) {
        const longitude = Number(coordinates[1]);
        const latitude = Number(coordinates[2]);
        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
          setSearchError('Coordinates are outside the valid longitude/latitude range.');
          return;
        }
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
          placeholder="Search city or lon, lat"
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
