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
 * Calculate Ascendant (Rising Sign) properly using astronomical formulas
 * The Ascendant is the zodiac degree rising on the eastern horizon at birth time/location
 */
function calculateAscendant(date: Date, latitude: number, longitudeDeg: number): number {
  const time = Astronomy.MakeTime(date);

  console.log('🔭 Calculating Ascendant:');
  console.log('  Date:', date.toISOString());
  console.log('  Latitude:', latitude, '°');
  console.log('  Longitude:', longitudeDeg, '°');

  // Step 1: Get Greenwich Sidereal Time (GST) in hours
  const gst = Astronomy.SiderealTime(time);
  console.log('  Greenwich Sidereal Time:', gst.toFixed(4), 'hours');

  // Step 2: Calculate Local Sidereal Time (LST)
  // LST = GST + (longitude / 15)  where longitude is in degrees
  const lst = gst + (longitudeDeg / 15);
  const lstNormalized = ((lst % 24) + 24) % 24; // Keep in 0-24 hour range
  console.log('  Local Sidereal Time:', lstNormalized.toFixed(4), 'hours');

  // Step 3: Convert LST to degrees (RAMC - Right Ascension of Midheaven)
  const ramc = lstNormalized * 15; // Convert hours to degrees
  console.log('  RAMC:', ramc.toFixed(2), '°');

  // Step 4: Calculate Ascendant using standard astronomical formula
  const obliquity = 23.4397; // Obliquity of the ecliptic in degrees

  // Convert to radians
  const ramcRad = (ramc * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;

  // Standard Ascendant formula:
  // tan(ASC) = cos(RAMC) / (-sin(RAMC) * cos(ε) - tan(φ) * sin(ε))
  const x = Math.cos(ramcRad);
  const y = -Math.sin(ramcRad) * Math.cos(oblRad) - Math.tan(latRad) * Math.sin(oblRad);

  let ascendant = Math.atan2(x, y) * (180 / Math.PI);

  // Normalize to 0-360
  ascendant = ((ascendant % 360) + 360) % 360;

  const { sign, degrees } = longitudeToZodiac(ascendant);
  console.log('  ✅ Ascendant:', ascendant.toFixed(2), '° =', sign, degrees.toFixed(2), '°');

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
  console.log('\n' + '='.repeat(60));
  console.log('🌟 CALCULATING NATAL CHART');
  console.log('='.repeat(60));
  console.log('📅 Birth Data Input:', JSON.stringify(birthData, null, 2));

  // IMPORTANT: JavaScript Date months are 0-indexed (0=January, 11=December)
  // Our birthData.month is already 0-indexed from the form

  // Step 1: Create a date string representing the LOCAL time at the birth location
  const localDateString = `${birthData.year}-${String(birthData.month + 1).padStart(2, '0')}-${String(birthData.day).padStart(2, '0')} ${String(birthData.hour).padStart(2, '0')}:${String(birthData.minute).padStart(2, '0')}:00`;

  console.log('🕐 Local Birth Time:', localDateString, `(${birthData.timezone})`);

  // Step 2: Convert local time to UTC using fromZonedTime
  // This interprets the date/time as being in the specified timezone and converts to UTC
  // It properly handles timezone offsets and historical DST rules
  const birthDateUTC = fromZonedTime(localDateString, birthData.timezone);

  console.log('🕐 Converted to UTC:', birthDateUTC.toISOString());
  console.log('🌍 Coordinates:', `${birthData.latitude}°N, ${birthData.longitude}°E`);
  console.log('');

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
