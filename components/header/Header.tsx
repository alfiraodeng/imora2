'use client';

import { useEffect, useState } from 'react';
import { FiLogOut, FiMapPin } from 'react-icons/fi';
import SearchInput from './SearchInput';
import TemperatureToggle from './TemperatureToggle';
import HistoricalExportButton from './HistoricalExportButton';
import NotificationCenter from './NotificationCenter';
import { useWeather } from '@/context/WeatherContext';
import { getSupabase } from '@/lib/supabase';

export default function Header() {
    const { lat, lon, weatherData, searchedCity } = useWeather();
    const [userLabel, setUserLabel] = useState('');
    useEffect(() => { void getSupabase()?.auth.getUser().then(({ data }) => setUserLabel(data.user?.email || '')); }, []);

    const getDisplayLocation = () => {
        if (searchedCity) return searchedCity;
      
        if (weatherData?.name) {
          const { name } = weatherData;
          const country = weatherData.sys?.country;
          return country ? `${name}, ${country}` : name;
        }
      
        if (lat != null && lon != null) {
          return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        }
      
        return 'Unknown location';
      };
      

    const locationName = getDisplayLocation();
    const signOut = async () => { await getSupabase()?.auth.signOut(); };

    return (
        <header className="relative z-[2000] mx-auto mb-7 flex max-w-7xl flex-col gap-3 xl:grid xl:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)] xl:items-center xl:gap-5">
            {/* Left: Location + icon */}
            <div className="flex min-w-0 items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                    <FiMapPin size={18} className="text-gray-300" />
                </div>
                <h1 className="truncate text-base font-semibold sm:text-xl">{locationName}</h1>
            </div>

            {/* Center: Search + unit toggle */}
            <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3 xl:w-auto">
                <SearchInput />
                <TemperatureToggle />
                <HistoricalExportButton />
            </div>

            <div className="flex w-full items-center justify-between gap-3 xl:w-auto xl:justify-end">
                <NotificationCenter />
            {userLabel && <span className="hidden max-w-44 truncate rounded-xl border border-white/15 bg-slate-950/35 px-3 py-2 text-xs font-semibold text-cyan-100 lg:inline" title={userLabel}>{userLabel}</span>}
            <button type="button" onClick={() => void signOut()} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-slate-950/35 px-3 text-xs font-bold text-white/85 transition hover:bg-white/10"><FiLogOut size={15} /><span className="hidden sm:inline">Log out</span></button>
            <div className="hidden min-w-[150px] select-none text-right text-sm font-light text-white/70 lg:block">
                <span className="font-semibold tracking-[.16em] text-cyan-200">IMORA</span><br />
                Weather intelligence
            </div>
            </div>

        </header>
    );
}
