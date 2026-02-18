import * as Astronomy from "astronomy-engine";
import { fromZonedTime } from 'date-fns-tz';
import type { AspectData, BirthData, HouseInfo, PlanetInfo } from '@/types';

export interface SolarReturnData {
  returnDate: string;
  returnTime: string;
  planets: PlanetInfo[];
  houses: HouseInfo[];
  aspects: AspectData[];
  natalSunLongitude: number;
}

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function longitudeToZodiac(longitude: number): { sign: string; degrees: number } {
  const normalizedLon = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalizedLon / 30);
  const degrees = normalizedLon % 30;

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degrees,
  };
}

function formatLocalDateTime(date: Date, timezone: string): { returnDate: string; returnTime: string } {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  return {
    returnDate: dateFormatter.format(date),
    returnTime: timeFormatter.format(date),
  };
}

function buildLocalDateString(
  year: number,
  monthZeroIndexed: number,
  day: number,
  hour: number,
  minute: number
): string {
  return `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function calculateAscendant(date: Date, latitude: number, longitudeDeg: number): number {
  const time = Astronomy.MakeTime(date);
  const gst = Astronomy.SiderealTime(time);
  const lst = gst + (longitudeDeg / 15);
  const lstNormalized = ((lst % 24) + 24) % 24;
  const ramc = lstNormalized * 15;

  const jd = time.ut + 2451545.0;
  const T = (jd - 2451545.0) / 36525.0;
  const eps0 = 84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.0020034 * T * T * T;
  const obliquity = eps0 / 3600;

  const ramcRad = (ramc * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;

  const x = Math.cos(ramcRad);
  const y = -(Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(ramcRad));

  let ascendant = Math.atan2(x, y) * (180 / Math.PI);
  ascendant = normalizeLongitude(ascendant);

  return ascendant;
}

function calculateHouses(
  date: Date,
  latitude: number,
  longitude: number
): { houses: HouseInfo[]; houseCusps: number[]; ascendant: number } {
  const ascendant = calculateAscendant(date, latitude, longitude);
  const houses: HouseInfo[] = [];
  const houseCusps: number[] = [0];

  for (let i = 1; i <= 12; i++) {
    const houseLon = normalizeLongitude(ascendant + ((i - 1) * 30));
    houseCusps.push(houseLon);
    const { sign, degrees } = longitudeToZodiac(houseLon);

    houses.push({
      house: i,
      sign,
      degrees: degrees.toFixed(2),
    });
  }

  return { houses, houseCusps, ascendant };
}

function determineHouse(planetLongitude: number, houses: number[]): number {
  const lon = normalizeLongitude(planetLongitude);

  for (let i = 1; i <= 12; i++) {
    const currentHouse = houses[i];
    const nextHouse = i < 12 ? houses[i + 1] : houses[1];

    if (currentHouse < nextHouse) {
      if (lon >= currentHouse && lon < nextHouse) {
        return i;
      }
    } else if (lon >= currentHouse || lon < nextHouse) {
      return i;
    }
  }

  return 1;
}

function getPlanetLongitude(planetName: string, time: Astronomy.AstroTime): number {
  switch (planetName.toLowerCase()) {
    case 'sun': {
      const sunPos = Astronomy.SunPosition(time);
      return normalizeLongitude(sunPos.elon);
    }
    case 'moon': {
      const moonPos = Astronomy.EclipticGeoMoon(time);
      return normalizeLongitude(moonPos.lon);
    }
    case 'mercury':
    case 'venus':
    case 'mars':
    case 'jupiter':
    case 'saturn':
    case 'uranus':
    case 'neptune':
    case 'pluto': {
      const geoVector = Astronomy.GeoVector(planetName as Astronomy.Body, time, false);
      const ecliptic = Astronomy.Ecliptic(geoVector);
      return normalizeLongitude(ecliptic.elon);
    }
    default:
      throw new Error(`Unknown planet: ${planetName}`);
  }
}

function getPlanetPosition(
  planetName: string,
  date: Date,
  houses?: number[]
): PlanetInfo {
  const time = Astronomy.MakeTime(date);
  const longitude = getPlanetLongitude(planetName, time);
  const { sign, degrees } = longitudeToZodiac(longitude);

  let house = 1;
  if (houses && houses.length >= 12) {
    house = determineHouse(longitude, houses);
  }

  return {
    planet: planetName,
    sign,
    degrees: degrees.toFixed(2),
    house,
  };
}

function calculateMajorAspects(planets: PlanetInfo[]): AspectData[] {
  const aspects: AspectData[] = [];

  const MAJOR_ASPECTS = [
    { name: 'conjunction', angle: 0, orb: 10 },
    { name: 'sextile', angle: 60, orb: 6 },
    { name: 'square', angle: 90, orb: 8 },
    { name: 'trine', angle: 120, orb: 8 },
    { name: 'opposition', angle: 180, orb: 10 },
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i];
      const planet2 = planets[j];

      const lon1 = ZODIAC_SIGNS.indexOf(planet1.sign) * 30 + parseFloat(planet1.degrees);
      const lon2 = ZODIAC_SIGNS.indexOf(planet2.sign) * 30 + parseFloat(planet2.degrees);

      let separation = Math.abs(lon2 - lon1);
      if (separation > 180) separation = 360 - separation;

      for (const aspect of MAJOR_ASPECTS) {
        if (Math.abs(separation - aspect.angle) <= aspect.orb) {
          aspects.push({
            type: aspect.name,
            aspect: `${planet1.planet} ${aspect.name} ${planet2.planet}`,
            description: `${planet1.planet} in ${planet1.sign} forms a ${aspect.name} with ${planet2.planet} in ${planet2.sign}`,
            planet1: planet1.planet,
            planet2: planet2.planet,
            sign1: planet1.sign,
            sign2: planet2.sign,
          });
          break;
        }
      }
    }
  }

  return aspects.slice(0, 5);
}

export function calculateSolarReturn(
  birthData: BirthData,
  year: number,
  currentLatitude: number,
  currentLongitude: number,
  currentTimezone: string
): SolarReturnData {
  const birthLocalDate = buildLocalDateString(
    birthData.year,
    birthData.month,
    birthData.day,
    birthData.hour,
    birthData.minute
  );
  const birthDateUTC = fromZonedTime(birthLocalDate, birthData.timezone);
  const birthTime = Astronomy.MakeTime(birthDateUTC);
  const natalSunLongitude = getPlanetLongitude('Sun', birthTime);

  const searchStartLocal = `${year}-01-01 00:00:00`;
  const searchStartUTC = fromZonedTime(searchStartLocal, currentTimezone);
  const searchStartTime = Astronomy.MakeTime(searchStartUTC);

  const solarReturn = Astronomy.SearchSunLongitude(natalSunLongitude, searchStartTime, 370);
  if (!solarReturn) {
    throw new Error(`Unable to find solar return in ${year}`);
  }

  const solarReturnDate = solarReturn.date;
  const { houses, houseCusps } = calculateHouses(solarReturnDate, currentLatitude, currentLongitude);

  const planets: PlanetInfo[] = [
    getPlanetPosition('Sun', solarReturnDate, houseCusps),
    getPlanetPosition('Moon', solarReturnDate, houseCusps),
    getPlanetPosition('Mercury', solarReturnDate, houseCusps),
    getPlanetPosition('Venus', solarReturnDate, houseCusps),
    getPlanetPosition('Mars', solarReturnDate, houseCusps),
    getPlanetPosition('Jupiter', solarReturnDate, houseCusps),
    getPlanetPosition('Saturn', solarReturnDate, houseCusps),
    getPlanetPosition('Uranus', solarReturnDate, houseCusps),
    getPlanetPosition('Neptune', solarReturnDate, houseCusps),
    getPlanetPosition('Pluto', solarReturnDate, houseCusps),
  ];

  const aspects = calculateMajorAspects(planets);
  const { returnDate, returnTime } = formatLocalDateTime(solarReturnDate, currentTimezone);

  return {
    returnDate,
    returnTime,
    planets,
    houses,
    aspects,
    natalSunLongitude: Number(natalSunLongitude.toFixed(6)),
  };
}
