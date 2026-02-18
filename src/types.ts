export interface PlanetInfo {
  planet: string;
  sign: string;
  degrees: string;
  house?: number;
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
  planet1?: string;
  planet2?: string;
  sign1?: string;
  sign2?: string;
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
  timezone: string;
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

export interface SavedChart {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SynastryAspect {
  planetA: string;
  planetB: string;
  signA: string;
  signB: string;
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
  meaning: string;
}

export interface SynastryKeyFactors {
  elementBalance: {
    personA: Record<string, number>;
    personB: Record<string, number>;
    compatibilityNote: string;
  };
  venusMarsConnections: SynastryAspect[];
  moonCompatibility: {
    moonAspect?: SynastryAspect;
    moonElementHarmony: boolean;
    note: string;
  };
  sunMoonInteraspects: SynastryAspect[];
}

export interface CompositePlanet {
  planet: string;
  sign: string;
  degrees: string;
}

export interface CompositeChartData {
  planets: CompositePlanet[];
}

export interface SynastryCategoryScores {
  overallConnection: number;
  communicationStyle: number;
  emotionalCompatibility: number;
  attractionChemistry: number;
  growthChallenges: number;
  longTermPotential: number;
}

export interface SynastryData {
  personAChart: NatalChartData;
  personBChart: NatalChartData;
  crossAspects: SynastryAspect[];
  keyFactors: SynastryKeyFactors;
  compositeChart: CompositeChartData;
  categoryScores: SynastryCategoryScores;
}

export interface SynastryNarrative {
  overallConnection: string;
  communicationStyle: string;
  emotionalCompatibility: string;
  attractionChemistry: string;
  growthChallenges: string;
  longTermPotential: string;
}

export type TransitPriority = 'major' | 'moderate' | 'minor';
export type TransitStatus = 'exact' | 'applying' | 'separating';
export type TransitTone = 'opportunity' | 'awareness' | 'challenge';

export interface TransitAlert {
  id: string;
  transitPlanet: string;
  transitSign: string;
  natalPlanet: string;
  natalSign: string;
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
  date: string;
  priority: TransitPriority;
  status: TransitStatus;
  tone: TransitTone;
  description: string;
  aiInterpretation?: string;
}

export interface TransitReport {
  generatedAt: string;
  natalChart: NatalChartData;
  activeTransits: TransitAlert[];
  upcomingTransits: TransitAlert[];
}

export interface MoonRitualResponse {
  title: string;
  summary: string;
  prompts: string[];
}

export interface OnboardingStoryResponse {
  title: string;
  paragraphs: string[];
}

export type ShareCardType = 'big-three' | 'daily-reading' | 'synastry-summary';
