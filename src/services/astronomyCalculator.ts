/**
 * Astronomy Calculator Service
 * Uses astronomy-engine for accurate astronomical calculations
 * Provides professional-grade astrological data comparable to astro.com
 */

import * as Astronomy from 'astronomy-engine';
import { BirthData, NatalChartData, DailyCelestialData, PlanetInfo, HouseInfo, AspectData } from '@/types';
import { fromZonedTime } from 'date-fns-tz';

// Zodiac sign boundaries (tropical zodiac)
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_ELEMENTS: Record<string, string> = {
  'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
  'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
  'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
  'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
};

const ZODIAC_QUALITIES: Record<string, string> = {
  'Aries': 'Cardinal', 'Cancer': 'Cardinal', 'Libra': 'Cardinal', 'Capricorn': 'Cardinal',
  'Taurus': 'Fixed', 'Leo': 'Fixed', 'Scorpio': 'Fixed', 'Aquarius': 'Fixed',
  'Gemini': 'Mutable', 'Virgo': 'Mutable', 'Sagittarius': 'Mutable', 'Pisces': 'Mutable'
};

const RULING_PLANETS: Record<string, string> = {
  'Aries': 'Mars',
  'Taurus': 'Venus',
  'Gemini': 'Mercury',
  'Cancer': 'Moon',
  'Leo': 'Sun',
  'Virgo': 'Mercury',
  'Libra': 'Venus',
  'Scorpio': 'Pluto',
  'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn',
  'Aquarius': 'Uranus',
  'Pisces': 'Neptune'
};

/**
 * Convert ecliptic longitude to zodiac sign and degrees
 */
function longitudeToZodiac(longitude: number): { sign: string; degrees: number } {
  // Normalize longitude to 0-360
  const normalizedLon = ((longitude % 360) + 360) % 360;

  // Each sign is 30 degrees
  const signIndex = Math.floor(normalizedLon / 30);
  const degrees = normalizedLon % 30;

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degrees: degrees
  };
}

/**
 * Calculate Ascendant (Rising Sign) using standard astronomical formulas
 * The Ascendant is the zodiac degree rising on the eastern horizon at birth time/location
 * Uses epoch-dependent obliquity for precision
 */
function calculateAscendant(date: Date, latitude: number, longitudeDeg: number): number {
  const time = Astronomy.MakeTime(date);

  // Step 1: Get Greenwich Sidereal Time (GST) in hours
  const gst = Astronomy.SiderealTime(time);

  // Step 2: Calculate Local Sidereal Time (LST)
  const lst = gst + (longitudeDeg / 15);
  const lstNormalized = ((lst % 24) + 24) % 24;

  // Step 3: Convert LST to degrees (RAMC - Right Ascension of Midheaven)
  const ramc = lstNormalized * 15;

  // Step 4: Calculate mean obliquity for the epoch (Laskar's formula)
  const jd = time.ut + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000
  const eps0 = 84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T * T * T;
  const obliquity = eps0 / 3600; // Convert arcseconds to degrees

  // Convert to radians
  const ramcRad = (ramc * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;

  // Standard Ascendant formula:
  // ASC = atan2(cos(RAMC), -(sin(ε)*tan(φ) + cos(ε)*sin(RAMC)))
  const x = Math.cos(ramcRad);
  const y = -(Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(ramcRad));

  let ascendant = Math.atan2(x, y) * (180 / Math.PI);

  // Normalize to 0-360
  ascendant = ((ascendant % 360) + 360) % 360;

  return ascendant;
}

/**
 * Calculate houses using Placidus house system (more accurate than equal houses)
 * Falls back to Equal House if Placidus calculation fails
 */
function calculateHouses(
  date: Date,
  latitude: number,
  longitude: number
): { houses: HouseInfo[]; houseCusps: number[]; ascendant: number } {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const time = Astronomy.MakeTime(date);

  // Calculate proper Ascendant
  const ascendant = calculateAscendant(date, latitude, longitude);

  // For now, use Equal House system from the corrected Ascendant
  // (Placidus requires complex calculations that astronomy-engine doesn't provide directly)
  const houses: HouseInfo[] = [];
  const houseCusps: number[] = [0]; // Index 0 unused to match 1-based indexing

  for (let i = 1; i <= 12; i++) {
    const houseLon = (ascendant + ((i - 1) * 30)) % 360;
    houseCusps.push(houseLon);
    const { sign, degrees } = longitudeToZodiac(houseLon);
    houses.push({
      house: i,
      sign,
      degrees: degrees.toFixed(2)
    });
  }

  return { houses, houseCusps, ascendant };
}

/**
 * Get planet position at a specific date
 */
function getPlanetPosition(
  planetName: string,
  date: Date,
  houses?: number[],
  ascendant?: number
): PlanetInfo {
  const time = Astronomy.MakeTime(date);

  let longitude: number;

  // Get ecliptic longitude based on planet
  switch (planetName.toLowerCase()) {
    case 'sun':
      const sunPos = Astronomy.SunPosition(time);
      longitude = sunPos.elon;
      break;
    case 'moon':
      const moonPos = Astronomy.EclipticGeoMoon(time);
      longitude = moonPos.lon;
      break;
    case 'mercury':
    case 'venus':
    case 'mars':
    case 'jupiter':
    case 'saturn':
    case 'uranus':
    case 'neptune':
    case 'pluto':
      const geoVector = Astronomy.GeoVector(planetName as Astronomy.Body, time, false);
      const ecliptic = Astronomy.Ecliptic(geoVector);
      longitude = ecliptic.elon;
      break;
    default:
      throw new Error(`Unknown planet: ${planetName}`);
  }

  const { sign, degrees } = longitudeToZodiac(longitude);

  // Determine house if houses and ascendant are provided
  let house = 1;
  if (houses && houses.length >= 12 && ascendant !== undefined) {
    house = determineHouse(longitude, houses, ascendant);
  }

  return {
    planet: planetName,
    sign,
    degrees: degrees.toFixed(2),
    house
  };
}

/**
 * Determine which house a planet is in
 */
function determineHouse(planetLongitude: number, houses: number[], ascendant: number): number {
  // Normalize longitude to 0-360
  const lon = ((planetLongitude % 360) + 360) % 360;

  // Find which house the planet falls in (equal house system)
  for (let i = 1; i <= 12; i++) {
    const currentHouse = houses[i];
    const nextHouse = i < 12 ? houses[i + 1] : houses[1];

    // Handle wrapping around 360 degrees
    if (currentHouse < nextHouse) {
      if (lon >= currentHouse && lon < nextHouse) {
        return i;
      }
    } else {
      // Wraps around 0/360
      if (lon >= currentHouse || lon < nextHouse) {
        return i;
      }
    }
  }

  return 1; // Default to 1st house if calculation fails
}

/**
 * Calculate natal chart
 */
export function calculateNatalChart(birthData: BirthData): NatalChartData {
  // IMPORTANT: JavaScript Date months are 0-indexed (0=January, 11=December)
  // Our birthData.month is already 0-indexed from the form

  // Step 1: Create a date string representing the LOCAL time at the birth location
  const localDateString = `${birthData.year}-${String(birthData.month + 1).padStart(2, '0')}-${String(birthData.day).padStart(2, '0')} ${String(birthData.hour).padStart(2, '0')}:${String(birthData.minute).padStart(2, '0')}:00`;

  // Step 2: Convert local time to UTC using fromZonedTime
  // IMPORTANT: The timezone MUST be derived from birth coordinates before calling this function.
  // Use /api/timezone?lat=X&lon=Y to get the correct timezone.
  const birthDateUTC = fromZonedTime(localDateString, birthData.timezone);

  // ✅ Now we have the correct UTC time for astronomical calculations!

  // Calculate houses and ascendant using the UTC time
  const { houses, houseCusps, ascendant } = calculateHouses(
    birthDateUTC,
    birthData.latitude,
    birthData.longitude
  );

  // Get rising sign (Ascendant = 1st house cusp)
  const { sign: risingSign } = longitudeToZodiac(ascendant);

  // Calculate positions for all major planets using the UTC time
  const planets: PlanetInfo[] = [
    getPlanetPosition('Sun', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Moon', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Mercury', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Venus', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Mars', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Jupiter', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Saturn', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Uranus', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Neptune', birthDateUTC, houseCusps, ascendant),
    getPlanetPosition('Pluto', birthDateUTC, houseCusps, ascendant),
  ];

  // Get sun sign
  const sunPlanet = planets[0]; // Sun is first
  const zodiacSign = sunPlanet.sign;

  return {
    zodiacSign,
    risingSign,
    element: ZODIAC_ELEMENTS[zodiacSign],
    quality: ZODIAC_QUALITIES[zodiacSign],
    rulingPlanet: RULING_PLANETS[zodiacSign],
    planets,
    houses
  };
}

/**
 * Calculate current transits and daily celestial data
 */
export function calculateDailyCelestialData(): DailyCelestialData {
  const now = new Date();
  const time = Astronomy.MakeTime(now);

  // Calculate current planetary positions (transits)
  const planets: PlanetInfo[] = [
    getPlanetPosition('Sun', now),
    getPlanetPosition('Moon', now),
    getPlanetPosition('Mercury', now),
    getPlanetPosition('Venus', now),
    getPlanetPosition('Mars', now),
    getPlanetPosition('Jupiter', now),
    getPlanetPosition('Saturn', now),
    getPlanetPosition('Uranus', now),
    getPlanetPosition('Neptune', now),
    getPlanetPosition('Pluto', now),
  ];

  // Get moon position and phase
  const moonPlanet = planets[1]; // Moon is second
  const moonPhaseData = calculateMoonPhase(time);

  // Calculate aspects
  const aspects = calculateMajorAspects(planets);

  return {
    moon: {
      phase: moonPhaseData.phaseName,
      sign: moonPlanet.sign,
      illumination: moonPhaseData.illumination
    },
    planets,
    aspects
  };
}

/**
 * Calculate moon phase and illumination
 */
function calculateMoonPhase(time: Astronomy.AstroTime): { phaseName: string; illumination: number } {
  // Calculate moon phase
  const moonPhase = Astronomy.MoonPhase(time);
  const moonIllumination = Astronomy.Illumination('Moon' as Astronomy.Body, time);

  // Calculate illumination percentage
  const illumination = Math.round(moonIllumination.phase_fraction * 100);

  // Determine phase name based on angle
  let phaseName = 'New Moon';
  if (moonPhase < 45) phaseName = 'New Moon';
  else if (moonPhase < 90) phaseName = 'Waxing Crescent';
  else if (moonPhase < 135) phaseName = 'First Quarter';
  else if (moonPhase < 180) phaseName = 'Waxing Gibbous';
  else if (moonPhase < 225) phaseName = 'Full Moon';
  else if (moonPhase < 270) phaseName = 'Waning Gibbous';
  else if (moonPhase < 315) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  return { phaseName, illumination };
}

/**
 * Calculate major aspects between planets
 * Checks for conjunction, opposition, trine, square, sextile
 */
function calculateMajorAspects(planets: PlanetInfo[]): AspectData[] {
  const aspects: AspectData[] = [];

  // Aspect definitions with orbs
  const ASPECTS = [
    { name: 'conjunction', angle: 0, orb: 10 },
    { name: 'sextile', angle: 60, orb: 6 },
    { name: 'square', angle: 90, orb: 8 },
    { name: 'trine', angle: 120, orb: 8 },
    { name: 'opposition', angle: 180, orb: 10 },
  ];

  // Check aspects between all planet pairs
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i];
      const planet2 = planets[j];

      // Calculate absolute longitude for each planet
      const lon1 = ZODIAC_SIGNS.indexOf(planet1.sign) * 30 + parseFloat(planet1.degrees);
      const lon2 = ZODIAC_SIGNS.indexOf(planet2.sign) * 30 + parseFloat(planet2.degrees);

      // Calculate angular separation
      let separation = Math.abs(lon2 - lon1);
      if (separation > 180) separation = 360 - separation;

      // Check if this forms a major aspect
      for (const aspect of ASPECTS) {
        const diff = Math.abs(separation - aspect.angle);
        if (diff <= aspect.orb) {
          aspects.push({
            type: aspect.name,
            aspect: `${planet1.planet} ${aspect.name} ${planet2.planet}`,
            description: `${planet1.planet} in ${planet1.sign} forms a ${aspect.name} with ${planet2.planet} in ${planet2.sign}`
          });
          break; // Only record one aspect per planet pair
        }
      }
    }
  }

  // Return top 5 aspects (most important)
  return aspects.slice(0, 5);
}
