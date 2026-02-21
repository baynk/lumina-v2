'use client';

import { useState } from 'react';

type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

type Planet = {
  planet: string;
  sign: string;
  house?: number;
  degrees: string;
};

type House = {
  house: number;
  sign: string;
  degrees: string;
};

type Aspect = {
  type: AspectType;
  planet1: string;
  planet2: string;
};

type WheelChart = {
  zodiacSign?: string;
  planets: Planet[];
  houses: House[];
  ascendantDegrees?: number;
  midheavenDegrees?: number;
  aspects?: Aspect[];
};

const ZODIAC = [
  { name: 'Aries', symbol: '♈' },
  { name: 'Taurus', symbol: '♉' },
  { name: 'Gemini', symbol: '♊' },
  { name: 'Cancer', symbol: '♋' },
  { name: 'Leo', symbol: '♌' },
  { name: 'Virgo', symbol: '♍' },
  { name: 'Libra', symbol: '♎' },
  { name: 'Scorpio', symbol: '♏' },
  { name: 'Sagittarius', symbol: '♐' },
  { name: 'Capricorn', symbol: '♑' },
  { name: 'Aquarius', symbol: '♒' },
  { name: 'Pisces', symbol: '♓' },
] as const;

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};

const ASPECT_STYLES: Record<AspectType, { color: string }> = {
  conjunction: { color: '#4ade80' },
  sextile: { color: '#60a5fa' },
  square: { color: '#f87171' },
  trine: { color: '#60a5fa' },
  opposition: { color: '#f87171' },
};

function toLongitude(sign: string, degrees: string) {
  const signIndex = ZODIAC.findIndex((item) => item.name === sign);
  const deg = Number.parseFloat(degrees);
  if (signIndex < 0 || Number.isNaN(deg)) return 0;
  return signIndex * 30 + deg;
}

function toXY(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function longitudeToAngle(longitude: number) {
  return longitude - 90;
}

export default function NatalWheel({ chart, clientName: _clientName, birthInfo: _birthInfo }: { chart: WheelChart; clientName?: string; birthInfo?: string }) {
  const center = 250;
  const outerRadius = 230;
  const zodiacRadius = 210;
  const houseRadius = 180;
  const planetRadius = 154;
  const aspectRadius = 116;

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const planetsWithLon = chart.planets.map((planet) => ({
    ...planet,
    longitude: toLongitude(planet.sign, planet.degrees),
  }));

  const houseCusps = chart.houses.map((house) => ({
    ...house,
    longitude: toLongitude(house.sign, house.degrees),
  }));

  const ascLon = houseCusps.find((h) => h.house === 1)?.longitude
    ?? chart.ascendantDegrees
    ?? 0;
  const mcLon = houseCusps.find((h) => h.house === 10)?.longitude
    ?? chart.midheavenDegrees
    ?? 0;

  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-white/20 bg-[#0f1433]/95 backdrop-blur-md px-3 py-2 text-xs text-cream shadow-lg"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y - 50}px`, transform: 'translateX(-50%)' }}
        >
          {tooltip.text}
        </div>
      )}
      <svg
        viewBox="0 0 500 500"
        className="h-auto w-full print:bg-white"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(196,181,253,0.10)" />
            <stop offset="100%" stopColor="rgba(8,12,31,0.04)" />
          </radialGradient>
        </defs>

        <circle cx={center} cy={center} r={outerRadius} fill="url(#wheelGlow)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <circle cx={center} cy={center} r={zodiacRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx={center} cy={center} r={houseRadius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <circle cx={center} cy={center} r={aspectRadius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

        {ZODIAC.map((sign, i) => {
          const startAngle = longitudeToAngle(i * 30);
          const midAngle = longitudeToAngle(i * 30 + 15);
          const start = toXY(center, center, outerRadius, startAngle);
          const end = toXY(center, center, zodiacRadius, startAngle);
          const labelPos = toXY(center, center, 220, midAngle);

          return (
            <g key={sign.name}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(245,240,235,0.9)"
                fontSize="18"
              >
                {sign.symbol}
              </text>
            </g>
          );
        })}

        {Array.from({ length: 360 }, (_, i) => {
          if (i % 5 !== 0) return null;
          const angle = longitudeToAngle(i);
          const isMajor = i % 10 === 0;
          const outerP = toXY(center, center, outerRadius, angle);
          const innerP = toXY(center, center, isMajor ? outerRadius - 6 : outerRadius - 3, angle);
          return (
            <line
              key={`tick-${i}`}
              x1={outerP.x}
              y1={outerP.y}
              x2={innerP.x}
              y2={innerP.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={isMajor ? 0.8 : 0.4}
            />
          );
        })}

        {(() => {
          const ascAngle = longitudeToAngle(ascLon);
          const ascPos = toXY(center, center, houseRadius + 28, ascAngle);
          return (
            <text
              x={ascPos.x}
              y={ascPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(251,191,36,0.9)"
              fontSize="9"
              fontWeight="bold"
            >
              ASC
            </text>
          );
        })()}

        {(() => {
          const mcAngle = longitudeToAngle(mcLon);
          const mcPos = toXY(center, center, houseRadius + 28, mcAngle);
          return (
            <text
              x={mcPos.x}
              y={mcPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(251,191,36,0.9)"
              fontSize="9"
              fontWeight="bold"
            >
              MC
            </text>
          );
        })()}

        {houseCusps.map((house) => {
          const angle = longitudeToAngle(house.longitude);
          const from = toXY(center, center, houseRadius, angle);
          const to = toXY(center, center, 58, angle);
          const label = toXY(center, center, 74, angle + 15);

          return (
            <g key={house.house}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(196,181,253,0.35)" strokeWidth="1.2" />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(200,191,182,0.85)"
                fontSize="10"
              >
                {house.house}
              </text>
            </g>
          );
        })}

        {(chart.aspects || []).map((aspect) => {
          const p1 = planetsWithLon.find((planet) => planet.planet === aspect.planet1);
          const p2 = planetsWithLon.find((planet) => planet.planet === aspect.planet2);
          if (!p1 || !p2) return null;

          const start = toXY(center, center, aspectRadius, longitudeToAngle(p1.longitude));
          const end = toXY(center, center, aspectRadius, longitudeToAngle(p2.longitude));

          return (
            <line
              key={`${aspect.planet1}-${aspect.planet2}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={ASPECT_STYLES[aspect.type].color}
              strokeOpacity="0.55"
              strokeWidth="1.4"
            />
          );
        })}

        {planetsWithLon.map((planet) => {
          const angle = longitudeToAngle(planet.longitude);
          const dotPos = toXY(center, center, planetRadius, angle);
          const textPos = toXY(center, center, planetRadius + 16, angle);
          const tooltipText = `${planet.planet} in ${planet.sign} ${planet.degrees}${planet.house ? ` · House ${planet.house}` : ''}`;

          return (
            <g
              key={planet.planet}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const scaleX = rect.width / 500;
                setTooltip({ x: textPos.x * scaleX, y: textPos.y * scaleX, text: tooltipText });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={dotPos.x} cy={dotPos.y} r="4.2" fill="rgba(196,181,253,0.92)" />
              <circle cx={dotPos.x} cy={dotPos.y} r="14" fill="transparent" />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(245,240,235,0.95)"
                fontSize="18"
              >
                {PLANET_SYMBOLS[planet.planet] || planet.planet[0]}
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r="52" fill="rgba(8,12,31,0.8)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </svg>
    </div>
  );
}
