'use client';

import { useEffect, useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import SearchInput from './SearchInput';
import TemperatureToggle from './TemperatureToggle';
import HistoricalExportButton from './HistoricalExportButton';
import NotificationCenter from './NotificationCenter';
import { useWeather } from '@/context/WeatherContext';
import { getSupabase } from '@/lib/supabase';

export default function Header() {
    const { lat, lon, weatherData, searchedCity } = useWeather();
    const [userLabel, setUserLabel] = useState('');
    useEffect(() => {
        const client = getSupabase();
        if (!client) return;
        void client.auth.getUser().then(({ data }) => setUserLabel(String(data.user?.user_metadata?.nik || data.user?.email || '')));
        const { data: subscription } = client.auth.onAuthStateChange((_event, session) => setUserLabel(String(session?.user?.user_metadata?.nik || session?.user?.email || '')));
        return () => subscription.subscription.unsubscribe();
    }, []);

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

            <div className="flex w-full items-center justify-end gap-3 xl:w-auto">
            <div className="hidden min-w-[150px] select-none text-right text-sm font-light text-white/70 2xl:block">
                <span className="font-semibold tracking-[.16em] text-cyan-200">IMORA</span><br />
                Weather intelligence
            </div>
                <NotificationCenter />
            {userLabel && <div className="min-w-0 max-w-[11rem] rounded-xl border border-cyan-200/20 bg-slate-950/45 px-3 py-1.5 text-right shadow-lg backdrop-blur sm:max-w-[15rem]" title={userLabel}><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-white/40">Akun aktif</span><b className="block truncate text-xs text-cyan-100">{userLabel}</b></div>}
            </div>

        </header>
    );
}
