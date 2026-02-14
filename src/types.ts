// FIX: Replaced placeholder content with type definitions for the application.
export interface PlanetInfo {
  planet: string;
  sign: string;
  degrees: string;
  house?: number; // Optional for daily transits
}

export interface HouseInfo {
  house: number;
  sign: string;
  degrees: string;
}

export interface NatalChartData {
  zodiacSign: string;
  risingSign: string;
  element: string;
  quality: string;
  rulingPlanet: string;
  planets: PlanetInfo[];
  houses: HouseInfo[];
}

export interface MoonData {
    phase: string;
    sign: string;
    illumination: number;
}

export interface AspectData {
    type: string;
    aspect: string;
    description: string;
}

export interface DailyCelestialData {
    moon: MoonData;
    planets: PlanetInfo[];
    aspects: AspectData[];
}

export interface BirthData {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    timezone: string; // IANA timezone identifier (e.g., "Europe/Kiev")
}

export interface AstroLinePoint {
    lat: number;
    lon: number;
}

export interface AstrocartographyPlanetLines {
    planet: string;
    symbol: string;
    color: string;
    mc: AstroLinePoint[];
    ic: AstroLinePoint[];
    asc: AstroLinePoint[];
    desc: AstroLinePoint[];
}

export interface AstrocartographyData {
    birthMomentUtc: string;
    planets: AstrocartographyPlanetLines[];
}

// Saved birth chart (from database)
export interface SavedChart {
    id: string;
    user_id: string;
    name: string;
    birth_date: string; // YYYY-MM-DD format
    birth_time: string; // HH:MM format
    birth_place: string;
    latitude: number;
    longitude: number;
    timezone: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

// User profile with birth details
export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    birth_date: string | null; // YYYY-MM-DD format
    birth_time: string | null; // HH:MM format
    birth_place: string | null;
    birth_latitude: number | null;
    birth_longitude: number | null;
    birth_timezone: string | null;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
}
