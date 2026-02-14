import * as Astronomy from 'astronomy-engine';
import type {
  NatalChartData,
  TransitAlert,
  TransitPriority,
  TransitReport,
  TransitStatus,
  TransitTone,
} from '@/types';

const SIGNS = [
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
] as const;

const ASPECTS = [
  { type: 'conjunction' as const, angle: 0, orb: 5 },
  { type: 'sextile' as const, angle: 60, orb: 4 },
  { type: 'square' as const, angle: 90, orb: 5 },
  { type: 'trine' as const, angle: 120, orb: 5 },
  { type: 'opposition' as const, angle: 180, orb: 5 },
];

const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const PERSONAL_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);
const MAJOR_TRANSITERS = new Set(['Jupiter', 'Saturn', 'Pluto']);
const OUTER_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

function normalize360(value: number): number {
  return ((value % 360) + 360) % 360;
}

function separation(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function longitudeToSign(longitude: number): { sign: string; degrees: string } {
  const normalized = normalize360(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: SIGNS[signIndex],
    degrees: (normalized % 30).toFixed(2),
  };
}

function natalLongitude(sign: string, degrees: string): number {
  return SIGNS.indexOf(sign as (typeof SIGNS)[number]) * 30 + Number.parseFloat(degrees);
}

function planetLongitude(planet: string, date: Date): number {
  const time = Astronomy.MakeTime(date);
  switch (planet) {
    case 'Sun':
      return Astronomy.SunPosition(time).elon;
    case 'Moon':
      return Astronomy.EclipticGeoMoon(time).lon;
    default: {
      const vector = Astronomy.GeoVector(planet as Astronomy.Body, time, false);
      return Astronomy.Ecliptic(vector).elon;
    }
  }
}

function priorityFor(transitPlanet: string, natalPlanet: string): TransitPriority {
  if (MAJOR_TRANSITERS.has(transitPlanet) && PERSONAL_PLANETS.has(natalPlanet)) return 'major';
  if (OUTER_PLANETS.has(transitPlanet) && OUTER_PLANETS.has(natalPlanet)) return 'moderate';
  return 'minor';
}

function toneFor(transitPlanet: string, aspect: TransitAlert['aspect']): TransitTone {
  if (aspect === 'square' || aspect === 'opposition') return 'challenge';
  if ((transitPlanet === 'Jupiter' || transitPlanet === 'Venus') && (aspect === 'trine' || aspect === 'sextile' || aspect === 'conjunction')) {
    return 'opportunity';
  }
  if (transitPlanet === 'Saturn' || transitPlanet === 'Pluto') {
    return aspect === 'conjunction' ? 'awareness' : 'challenge';
  }
  return 'awareness';
}

function makeDescription(transitPlanet: string, transitSign: string, aspect: TransitAlert['aspect'], natalPlanet: string, natalSign: string): string {
  return `${transitPlanet} in ${transitSign} ${aspect} your natal ${natalPlanet} in ${natalSign}.`;
}

function statusFromMotion(
  transitPlanet: string,
  natalLongitudeValue: number,
  aspectAngle: number,
  date: Date,
  currentOrb: number,
): TransitStatus {
  if (currentOrb <= 0.2) return 'exact';

  const tomorrow = new Date(date);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const transitTomorrow = planetLongitude(transitPlanet, tomorrow);
  const tomorrowSep = separation(transitTomorrow, natalLongitudeValue);
  const tomorrowOrb = Math.abs(tomorrowSep - aspectAngle);
  return tomorrowOrb < currentOrb ? 'applying' : 'separating';
}

function alertsForDate(natalChart: NatalChartData, date: Date): TransitAlert[] {
  const alerts: TransitAlert[] = [];

  for (const transitPlanet of TRANSIT_PLANETS) {
    const transitLongitude = planetLongitude(transitPlanet, date);
    const transitSignInfo = longitudeToSign(transitLongitude);

    for (const natalPlanet of natalChart.planets) {
      const natalLon = natalLongitude(natalPlanet.sign, natalPlanet.degrees);
      const currentSep = separation(transitLongitude, natalLon);

      for (const aspect of ASPECTS) {
        const orb = Math.abs(currentSep - aspect.angle);
        if (orb > aspect.orb) continue;

        const status = statusFromMotion(transitPlanet, natalLon, aspect.angle, date, orb);
        alerts.push({
          id: `${date.toISOString().slice(0, 10)}-${transitPlanet}-${natalPlanet.planet}-${aspect.type}`,
          transitPlanet,
          transitSign: transitSignInfo.sign,
          natalPlanet: natalPlanet.planet,
          natalSign: natalPlanet.sign,
          aspect: aspect.type,
          orb: Number(orb.toFixed(2)),
          date: date.toISOString(),
          priority: priorityFor(transitPlanet, natalPlanet.planet),
          status,
          tone: toneFor(transitPlanet, aspect.type),
          description: makeDescription(transitPlanet, transitSignInfo.sign, aspect.type, natalPlanet.planet, natalPlanet.sign),
        });
      }
    }
  }

  return alerts;
}

function dedupeByClosestOrb(alerts: TransitAlert[]): TransitAlert[] {
  const map = new Map<string, TransitAlert>();
  for (const alert of alerts) {
    const key = `${alert.transitPlanet}-${alert.natalPlanet}-${alert.aspect}`;
    const existing = map.get(key);
    if (!existing || alert.orb < existing.orb) {
      map.set(key, alert);
    }
  }
  return Array.from(map.values());
}

function sortByPriorityThenOrb(alerts: TransitAlert[]): TransitAlert[] {
  const weight: Record<TransitPriority, number> = { major: 0, moderate: 1, minor: 2 };
  return alerts.sort((a, b) => {
    if (weight[a.priority] !== weight[b.priority]) return weight[a.priority] - weight[b.priority];
    return a.orb - b.orb;
  });
}

export function calculateTransitReport(natalChart: NatalChartData, now: Date = new Date()): TransitReport {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const activeTransits = sortByPriorityThenOrb(dedupeByClosestOrb(alertsForDate(natalChart, today))).slice(0, 16);

  const upcomingRaw: TransitAlert[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + day);
    upcomingRaw.push(...alertsForDate(natalChart, date));
  }

  const upcomingTransits = sortByPriorityThenOrb(dedupeByClosestOrb(upcomingRaw))
    .filter(
      (upcoming) =>
        !activeTransits.some(
          (active) =>
            active.transitPlanet === upcoming.transitPlanet &&
            active.natalPlanet === upcoming.natalPlanet &&
            active.aspect === upcoming.aspect,
        ),
    )
    .slice(0, 18);

  return {
    generatedAt: now.toISOString(),
    natalChart,
    activeTransits,
    upcomingTransits,
  };
}
