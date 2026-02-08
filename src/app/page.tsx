'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveBirthData, loadBirthData, StoredBirthData } from '@/lib/localStorage';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function HomePage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState('12');
  const [birthMinute, setBirthMinute] = useState('00');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [timezone, setTimezone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedStored, setHasLoadedStored] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadBirthData();
    if (stored) {
      const dateStr = `${stored.year}-${String(stored.month + 1).padStart(2, '0')}-${String(stored.day).padStart(2, '0')}`;
      setBirthDate(dateStr);
      setBirthHour(String(stored.hour).padStart(2, '0'));
      setBirthMinute(String(stored.minute).padStart(2, '0'));
      setLocationQuery(stored.locationName);
      setSelectedLocation({
        name: stored.locationName,
        lat: stored.latitude,
        lon: stored.longitude,
      });
      setTimezone(stored.timezone);
    }
    setHasLoadedStored(true);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'Lumina-Astrology-App/2.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setLocationResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      setLocationResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setSelectedLocation(null);
    setTimezone('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchLocation(value), 400);
  };

  const selectLocation = async (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setSelectedLocation({ name: result.display_name, lat, lon });
    setLocationQuery(result.display_name);
    setShowDropdown(false);
    setLocationResults([]);
    try {
      const tzRes = await fetch(
        `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`
      );
      const tzData = await tzRes.json();
      if (tzData.timeZone) {
        setTimezone(tzData.timeZone);
      }
    } catch {
      const offsetHours = Math.round(lon / 15);
      const fallbackTz = `Etc/GMT${offsetHours <= 0 ? '+' : ''}${-offsetHours}`;
      setTimezone(fallbackTz);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate || !selectedLocation || !timezone) return;
    setIsLoading(true);
    const [year, month, day] = birthDate.split('-').map(Number);
    const hour = parseInt(birthHour);
    const minute = parseInt(birthMinute);
    const data: StoredBirthData = {
      year,
      month: month - 1,
      day,
      hour,
      minute,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lon,
      timezone,
      locationName: selectedLocation.name,
    };
    saveBirthData(data);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month - 1),
      day: String(day),
      hour: String(hour),
      minute: String(minute),
      lat: String(selectedLocation.lat),
      lon: String(selectedLocation.lon),
      tz: timezone,
    });
    router.push(`/chart?${params.toString()}`);
  };

  const isFormValid = birthDate && selectedLocation && timezone;

  if (!hasLoadedStored) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold/50 loading-pulse text-lg">✦</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-12">
        <div className="text-gold/60 text-sm tracking-[0.3em] uppercase font-body mb-4">
          ✦ Celestial Insights ✦
        </div>
        <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-light gold-text mb-4">
          Lumina
        </h1>
        <p className="font-body text-cream/50 text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Unveil the cosmic blueprint written in the stars at the moment of your birth
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-card p-8 md:p-10 w-full max-w-lg space-y-6"
      >
        <div className="text-center mb-2">
          <h2 className="font-heading text-2xl text-cream/90">Birth Details</h2>
          <div className="gold-divider mt-3 mb-1" />
        </div>

        <div>
          <label className="lumina-label font-body">Date of Birth</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="lumina-input font-body"
            required
          />
        </div>

        <div>
          <label className="lumina-label font-body">Time of Birth</label>
          <div className="flex gap-3 items-center">
            <select
              value={birthHour}
              onChange={(e) => setBirthHour(e.target.value)}
              className="lumina-input font-body flex-1"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i).padStart(2, '0')}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="text-gold/50 text-xl font-light">:</span>
            <select
              value={birthMinute}
              onChange={(e) => setBirthMinute(e.target.value)}
              className="lumina-input font-body flex-1"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={String(i).padStart(2, '0')}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <p className="text-cream/30 text-xs mt-1.5 font-body">24-hour format · Check your birth certificate</p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <label className="lumina-label font-body">Place of Birth</label>
          <div className="relative">
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Search city or town..."
              className="lumina-input font-body"
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/40 text-sm">
                ✦
              </div>
            )}
          </div>
          {showDropdown && locationResults.length > 0 && (
            <div className="location-dropdown">
              {locationResults.map((result, idx) => (
                <div
                  key={idx}
                  className="location-dropdown-item text-cream/80"
                  onClick={() => selectLocation(result)}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
          {selectedLocation && (
            <p className="text-cream/30 text-xs mt-1.5 font-body">
              {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lon.toFixed(4)}°E
              {timezone && ` · ${timezone}`}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`gold-button w-full text-base font-body tracking-wider uppercase ${
            !isFormValid || isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {isLoading ? (
            <span className="loading-pulse">Reading the stars...</span>
          ) : (
            'Reveal My Chart ✦'
          )}
        </button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-cream/20 text-xs font-body tracking-wider">
          Powered by astronomical precision · Not fortune telling
        </p>
      </div>
    </div>
  );
}
