import * as Astronomy from 'astronomy-engine';
import { fromZonedTime } from 'date-fns-tz';
import type { BirthData, AstrocartographyData, AstrocartographyPlanetLines, AstroLinePoint } from '@/types';

type MajorPlanet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

const PLANETS: Array<{ name: MajorPlanet; symbol: string; color: string }> = [
  { name: 'Sun', symbol: '☉', color: '#facc15' },
  { name: 'Moon', symbol: '☽', color: '#e5e7eb' },
  { name: 'Mercury', symbol: '☿', color: '#7dd3fc' },
  { name: 'Venus', symbol: '♀', color: '#34d399' },
  { name: 'Mars', symbol: '♂', color: '#ef4444' },
  { name: 'Jupiter', symbol: '♃', color: '#a78bfa' },
  { name: 'Saturn', symbol: '♄', color: '#f59e0b' },
  { name: 'Uranus', symbol: '♅', color: '#22d3ee' },
  { name: 'Neptune', symbol: '♆', color: '#2563eb' },
  { name: 'Pluto', symbol: '♇', color: '#7f1d1d' },
];

const LAT_MIN = -70;
const LAT_MAX = 70;
const LON_MIN = -180;
const LON_MAX = 180;
const LON_STEP = 2;

function normalizeLongitude(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

function buildBirthDateUTC(birthData: BirthData): Date {
  const localDateString = `${birthData.year}-${String(birthData.month + 1).padStart(2, '0')}-${String(birthData.day).padStart(2, '0')} ${String(birthData.hour).padStart(2, '0')}:${String(birthData.minute).padStart(2, '0')}:00`;
  return fromZonedTime(localDateString, birthData.timezone);
}

function getPlanetEquatorial(time: Astronomy.AstroTime, planet: MajorPlanet): { raHours: number } {
  // Include EclipticLongitude in the workflow (except for Sun/Moon, which astronomy-engine does not support here)
  if (planet !== 'Sun' && planet !== 'Moon') {
    Astronomy.EclipticLongitude(planet as Astronomy.Body, time);
  }

  const observer = new Astronomy.Observer(0, 0, 0);
  const eq = Astronomy.Equator(planet as Astronomy.Body, time, observer, true, true);
  return { raHours: eq.ra };
}

function buildVerticalLine(longitude: number): AstroLinePoint[] {
  const points: AstroLinePoint[] = [];
  for (let lat = LAT_MIN; lat <= LAT_MAX; lat += 2) {
    points.push({ lat, lon: longitude });
  }
  return points;
}

function altitudeAtLatitude(
  time: Astronomy.AstroTime,
  planet: MajorPlanet,
  longitude: number,
  latitude: number,
): { altitude: number; azimuth: number } {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const eq = Astronomy.Equator(planet as Astronomy.Body, time, observer, true, true);
  const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
  return { altitude: hor.altitude, azimuth: hor.azimuth };
}

function solveLatitudeForHorizon(
  time: Astronomy.AstroTime,
  planet: MajorPlanet,
  longitude: number,
  isAsc: boolean,
): number | null {
  const scanStep = 4;
  const tolerance = 0.01;

  for (let lat = LAT_MIN; lat < LAT_MAX; lat += scanStep) {
    const a = altitudeAtLatitude(time, planet, longitude, lat);
    const b = altitudeAtLatitude(time, planet, longitude, lat + scanStep);

    if ((a.altitude > 0 && b.altitude < 0) || (a.altitude < 0 && b.altitude > 0)) {
      let lo = lat;
      let hi = lat + scanStep;
      let mid = (lo + hi) / 2;

      for (let i = 0; i < 18; i++) {
        mid = (lo + hi) / 2;
        const m = altitudeAtLatitude(time, planet, longitude, mid);

        if (Math.abs(m.altitude) < tolerance) {
          break;
        }

        const loVal = altitudeAtLatitude(time, planet, longitude, lo).altitude;
        if ((loVal > 0 && m.altitude < 0) || (loVal < 0 && m.altitude > 0)) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      const root = altitudeAtLatitude(time, planet, longitude, mid);
      const isRising = root.azimuth >= 0 && root.azimuth <= 180;
      if ((isAsc && isRising) || (!isAsc && !isRising)) {
        return mid;
      }
    }
  }

  return null;
}

function calculatePlanetLines(time: Astronomy.AstroTime, gstHours: number, planet: (typeof PLANETS)[number]): AstrocartographyPlanetLines {
  const { raHours } = getPlanetEquatorial(time, planet.name);

  const mcLongitude = normalizeLongitude((raHours - gstHours) * 15);
  const icLongitude = normalizeLongitude(mcLongitude + 180);

  const mc = buildVerticalLine(mcLongitude);
  const ic = buildVerticalLine(icLongitude);

  const asc: AstroLinePoint[] = [];
  const desc: AstroLinePoint[] = [];

  for (let lon = LON_MIN; lon <= LON_MAX; lon += LON_STEP) {
    const ascLat = solveLatitudeForHorizon(time, planet.name, lon, true);
    if (ascLat !== null) asc.push({ lat: ascLat, lon });

    const descLat = solveLatitudeForHorizon(time, planet.name, lon, false);
    if (descLat !== null) desc.push({ lat: descLat, lon });
  }

  return {
    planet: planet.name,
    symbol: planet.symbol,
    color: planet.color,
    mc,
    ic,
    asc,
    desc,
  };
}

export function calculateAstrocartography(birthData: BirthData): AstrocartographyData {
  const birthDateUTC = buildBirthDateUTC(birthData);
  const time = Astronomy.MakeTime(birthDateUTC);
  const gstHours = Astronomy.SiderealTime(time);

  const planets = PLANETS.map((planet) => calculatePlanetLines(time, gstHours, planet));

  return {
    birthMomentUtc: birthDateUTC.toISOString(),
    planets,
  };
}
