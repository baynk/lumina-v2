import { calculateNatalChart } from '@/services/astronomyCalculator';
import type {
  BirthData,
  CompositeChartData,
  SynastryAspect,
  SynastryCategoryScores,
  SynastryData,
  SynastryKeyFactors,
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

const ELEMENTS: Record<string, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
};

const PLANETS_FOR_COMPOSITE = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const ASPECTS = [
  { name: 'conjunction' as const, angle: 0, orb: 10 },
  { name: 'sextile' as const, angle: 60, orb: 6 },
  { name: 'square' as const, angle: 90, orb: 8 },
  { name: 'trine' as const, angle: 120, orb: 8 },
  { name: 'opposition' as const, angle: 180, orb: 10 },
];

const MEANINGS: Record<SynastryAspect['type'], string> = {
  conjunction: 'Strong pull and focus here; this area feels immediate and hard to ignore.',
  sextile: 'Easy cooperation and support when you both make a little effort.',
  square: 'Friction that can trigger growth if you face differences directly.',
  trine: 'Natural flow and mutual understanding that feels emotionally smooth.',
  opposition: 'A mirror dynamic: strong attraction plus clear polarity to balance.',
};

function toLongitude(sign: string, degrees: string): number {
  const index = SIGNS.indexOf(sign as (typeof SIGNS)[number]);
  return index * 30 + Number.parseFloat(degrees);
}

function fromLongitude(longitude: number): { sign: string; degrees: string } {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degrees = normalized % 30;
  return {
    sign: SIGNS[signIndex],
    degrees: degrees.toFixed(2),
  };
}

function shortestSeparation(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function midpoint(a: number, b: number): number {
  const normalizedA = ((a % 360) + 360) % 360;
  const normalizedB = ((b % 360) + 360) % 360;
  let diff = normalizedB - normalizedA;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (normalizedA + diff / 2 + 360) % 360;
}

function findAspect(lonA: number, lonB: number): { type: SynastryAspect['type']; orb: number } | null {
  const separation = shortestSeparation(lonA, lonB);
  for (const aspect of ASPECTS) {
    const orb = Math.abs(separation - aspect.angle);
    if (orb <= aspect.orb) {
      return { type: aspect.name, orb: Number(orb.toFixed(2)) };
    }
  }
  return null;
}

function buildCrossAspects(personAPlanets: { planet: string; sign: string; degrees: string }[], personBPlanets: { planet: string; sign: string; degrees: string }[]): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  for (const planetA of personAPlanets) {
    for (const planetB of personBPlanets) {
      const aspectMatch = findAspect(toLongitude(planetA.sign, planetA.degrees), toLongitude(planetB.sign, planetB.degrees));
      if (!aspectMatch) continue;
      aspects.push({
        planetA: planetA.planet,
        planetB: planetB.planet,
        signA: planetA.sign,
        signB: planetB.sign,
        type: aspectMatch.type,
        orb: aspectMatch.orb,
        meaning: MEANINGS[aspectMatch.type],
      });
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

function countElements(planets: { sign: string }[]): Record<string, number> {
  const tally: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const planet of planets) {
    tally[ELEMENTS[planet.sign]] += 1;
  }
  return tally;
}

function elementCompatibilityNote(a: Record<string, number>, b: Record<string, number>): string {
  const supportive = a.Fire + b.Fire + a.Air + b.Air;
  const grounding = a.Earth + b.Earth + a.Water + b.Water;
  if (Math.abs(supportive - grounding) <= 2) {
    return 'You blend action and emotional steadiness well, which helps balance momentum and security.';
  }
  if (supportive > grounding) {
    return 'This pairing has a lively, idea-driven spark; grounding routines will help with consistency.';
  }
  return 'This pairing has depth and loyalty; adding novelty keeps the relationship from feeling too heavy.';
}

function scoreSynastry(aspects: SynastryAspect[]): SynastryCategoryScores {
  const base = {
    overallConnection: 58,
    communicationStyle: 56,
    emotionalCompatibility: 56,
    attractionChemistry: 56,
    growthChallenges: 52,
    longTermPotential: 55,
  };

  for (const aspect of aspects) {
    const harmony = aspect.type === 'trine' || aspect.type === 'sextile';
    const tension = aspect.type === 'square' || aspect.type === 'opposition';

    if (aspect.planetA === 'Mercury' || aspect.planetB === 'Mercury') {
      base.communicationStyle += harmony ? 6 : tension ? -6 : 2;
    }
    if (aspect.planetA === 'Moon' || aspect.planetB === 'Moon') {
      base.emotionalCompatibility += harmony ? 6 : tension ? -7 : 2;
    }
    if ((aspect.planetA === 'Venus' && aspect.planetB === 'Mars') || (aspect.planetA === 'Mars' && aspect.planetB === 'Venus')) {
      base.attractionChemistry += harmony ? 8 : tension ? 3 : 6;
    }
    if (aspect.planetA === 'Saturn' || aspect.planetB === 'Saturn') {
      base.growthChallenges += tension ? 7 : 3;
      base.longTermPotential += harmony ? 6 : 2;
    }
    if (harmony) {
      base.overallConnection += 3;
      base.longTermPotential += 2;
    } else if (tension) {
      base.overallConnection -= 2;
      base.growthChallenges += 4;
    }
  }

  return {
    overallConnection: Math.max(30, Math.min(95, Math.round(base.overallConnection))),
    communicationStyle: Math.max(25, Math.min(95, Math.round(base.communicationStyle))),
    emotionalCompatibility: Math.max(25, Math.min(95, Math.round(base.emotionalCompatibility))),
    attractionChemistry: Math.max(30, Math.min(98, Math.round(base.attractionChemistry))),
    growthChallenges: Math.max(35, Math.min(96, Math.round(base.growthChallenges))),
    longTermPotential: Math.max(30, Math.min(95, Math.round(base.longTermPotential))),
  };
}

export function calculateSynastry(birthDataA: BirthData, birthDataB: BirthData): SynastryData {
  const personAChart = calculateNatalChart(birthDataA);
  const personBChart = calculateNatalChart(birthDataB);

  const crossAspects = buildCrossAspects(personAChart.planets, personBChart.planets);

  const venusMarsConnections = crossAspects.filter(
    (item) =>
      (item.planetA === 'Venus' && item.planetB === 'Mars') ||
      (item.planetA === 'Mars' && item.planetB === 'Venus'),
  );

  const sunMoonInteraspects = crossAspects.filter(
    (item) =>
      (item.planetA === 'Sun' && item.planetB === 'Moon') ||
      (item.planetA === 'Moon' && item.planetB === 'Sun'),
  );

  const moonAspect = crossAspects.find((item) => item.planetA === 'Moon' && item.planetB === 'Moon');
  const moonA = personAChart.planets.find((planet) => planet.planet === 'Moon');
  const moonB = personBChart.planets.find((planet) => planet.planet === 'Moon');
  const moonElementHarmony = !!moonA && !!moonB && ELEMENTS[moonA.sign] === ELEMENTS[moonB.sign];

  const elementBalanceA = countElements(personAChart.planets);
  const elementBalanceB = countElements(personBChart.planets);

  const keyFactors: SynastryKeyFactors = {
    elementBalance: {
      personA: elementBalanceA,
      personB: elementBalanceB,
      compatibilityNote: elementCompatibilityNote(elementBalanceA, elementBalanceB),
    },
    venusMarsConnections,
    moonCompatibility: {
      moonAspect,
      moonElementHarmony,
      note: moonElementHarmony
        ? 'Your emotional instincts feel familiar, which helps you recover after conflict.'
        : 'You process emotions differently, so clear emotional check-ins are essential.',
    },
    sunMoonInteraspects,
  };

  const compositePlanets = PLANETS_FOR_COMPOSITE.map((planetName) => {
    const a = personAChart.planets.find((planet) => planet.planet === planetName);
    const b = personBChart.planets.find((planet) => planet.planet === planetName);
    if (!a || !b) {
      return { planet: planetName, sign: 'Aries', degrees: '0.00' };
    }

    const midLon = midpoint(toLongitude(a.sign, a.degrees), toLongitude(b.sign, b.degrees));
    const position = fromLongitude(midLon);
    return {
      planet: planetName,
      sign: position.sign,
      degrees: position.degrees,
    };
  });

  const compositeChart: CompositeChartData = {
    planets: compositePlanets,
  };

  return {
    personAChart,
    personBChart,
    crossAspects,
    keyFactors,
    compositeChart,
    categoryScores: scoreSynastry(crossAspects),
  };
}
