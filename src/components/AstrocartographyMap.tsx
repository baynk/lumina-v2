'use client';

import { useMemo, useState } from 'react';
import type { BirthData, AstroLinePoint } from '@/types';
import { calculateAstrocartography } from '@/services/astrocartographyCalculator';

type TooltipState = {
  x: number;
  y: number;
  text: string;
} | null;

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 500;

const CONTINENTS: AstroLinePoint[][] = [
  [
    { lat: 71, lon: -168 }, { lat: 61, lon: -150 }, { lat: 55, lon: -130 }, { lat: 50, lon: -125 },
    { lat: 48, lon: -100 }, { lat: 52, lon: -85 }, { lat: 56, lon: -70 }, { lat: 62, lon: -60 },
    { lat: 70, lon: -85 }, { lat: 71, lon: -120 }, { lat: 71, lon: -168 },
  ],
  [
    { lat: 12, lon: -80 }, { lat: 25, lon: -100 }, { lat: 45, lon: -75 }, { lat: 40, lon: -65 },
    { lat: 25, lon: -80 }, { lat: 10, lon: -78 }, { lat: -10, lon: -72 }, { lat: -25, lon: -65 },
    { lat: -40, lon: -60 }, { lat: -55, lon: -67 }, { lat: -40, lon: -75 }, { lat: -20, lon: -74 },
    { lat: -5, lon: -78 }, { lat: 12, lon: -80 },
  ],
  [
    { lat: 35, lon: -10 }, { lat: 45, lon: 0 }, { lat: 55, lon: 10 }, { lat: 60, lon: 35 },
    { lat: 58, lon: 60 }, { lat: 52, lon: 90 }, { lat: 50, lon: 120 }, { lat: 55, lon: 145 },
    { lat: 60, lon: 160 }, { lat: 45, lon: 150 }, { lat: 35, lon: 120 }, { lat: 25, lon: 100 },
    { lat: 30, lon: 80 }, { lat: 20, lon: 60 }, { lat: 25, lon: 40 }, { lat: 35, lon: 30 },
    { lat: 35, lon: -10 },
  ],
  [
    { lat: 35, lon: -15 }, { lat: 30, lon: 5 }, { lat: 15, lon: 20 }, { lat: 10, lon: 30 },
    { lat: 0, lon: 35 }, { lat: -15, lon: 35 }, { lat: -30, lon: 25 }, { lat: -35, lon: 15 },
    { lat: -30, lon: 5 }, { lat: -20, lon: -5 }, { lat: -5, lon: -10 }, { lat: 10, lon: -10 },
    { lat: 20, lon: -15 }, { lat: 35, lon: -15 },
  ],
  [
    { lat: -10, lon: 112 }, { lat: -18, lon: 128 }, { lat: -28, lon: 140 }, { lat: -35, lon: 152 },
    { lat: -42, lon: 146 }, { lat: -38, lon: 126 }, { lat: -30, lon: 115 }, { lat: -10, lon: 112 },
  ],
  [
    { lat: 59, lon: -52 }, { lat: 72, lon: -45 }, { lat: 82, lon: -20 }, { lat: 76, lon: -55 },
    { lat: 59, lon: -52 },
  ],
];

const LINE_TYPES = [
  { key: 'mc', label: 'MC', dashed: false },
  { key: 'ic', label: 'IC', dashed: true },
  { key: 'asc', label: 'ASC', dashed: false },
  { key: 'desc', label: 'DESC', dashed: true },
] as const;

function project(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * VIEW_WIDTH;
  const y = ((90 - lat) / 180) * VIEW_HEIGHT;
  return { x, y };
}

function pointsToPath(points: AstroLinePoint[], close = false): string {
  if (!points.length) return '';
  let d = '';

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;
    const { x, y } = project(point.lon, point.lat);
    if (i === 0) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
      continue;
    }

    const prev = points[i - 1];
    if (!prev || Math.abs(point.lon - prev.lon) > 8) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
      continue;
    }

    d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
  }

  if (close) d += 'Z';
  return d.trim();
}

export default function AstrocartographyMap({ birthData }: { birthData: BirthData }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const data = useMemo(
    () => calculateAstrocartography(birthData),
    [birthData.year, birthData.month, birthData.day, birthData.hour, birthData.minute, birthData.latitude, birthData.longitude, birthData.timezone],
  );

  const gridLon = useMemo(() => {
    const lines: string[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const a = project(lon, -90);
      const b = project(lon, 90);
      lines.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
    }
    return lines;
  }, []);

  const gridLat = useMemo(() => {
    const lines: string[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const a = project(-180, lat);
      const b = project(180, lat);
      lines.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
    }
    return lines;
  }, []);

  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(56,189,248,0.08)]">
      <div className="mb-3 text-sm text-slate-300">
        Astrocartography Map
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-[500px] w-full">
          <defs>
            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#020617" />

          {gridLon.map((d, idx) => (
            <path key={`grid-lon-${idx}`} d={d} stroke="#1e293b" strokeWidth={1} fill="none" />
          ))}
          {gridLat.map((d, idx) => (
            <path key={`grid-lat-${idx}`} d={d} stroke="#1e293b" strokeWidth={1} fill="none" />
          ))}

          {CONTINENTS.map((continent, idx) => (
            <path
              key={`continent-${idx}`}
              d={pointsToPath(continent, true)}
              fill="#0f172a"
              stroke="#334155"
              strokeWidth={1.2}
            />
          ))}

          {data.planets.flatMap((planet) =>
            LINE_TYPES.map((lineType) => {
              const points = planet[lineType.key];
              const path = pointsToPath(points);
              if (!path) return null;

              return (
                <path
                  key={`${planet.planet}-${lineType.key}`}
                  d={path}
                  fill="none"
                  stroke={planet.color}
                  strokeWidth={2}
                  strokeDasharray={lineType.dashed ? '8 5' : undefined}
                  filter="url(#lineGlow)"
                  onMouseMove={(event) => {
                    const bounds = (event.currentTarget.ownerSVGElement?.getBoundingClientRect());
                    if (!bounds) return;
                    setTooltip({
                      x: event.clientX - bounds.left + 12,
                      y: event.clientY - bounds.top + 12,
                      text: `${planet.symbol} ${planet.planet} ${lineType.label} line`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            }),
          )}
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border border-slate-600 bg-slate-900/95 px-2 py-1 text-xs text-slate-100"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
        {data.planets.map((planet) => (
          <div key={planet.planet} className="flex items-center gap-1.5">
            <span style={{ color: planet.color }}>{planet.symbol}</span>
            <span>{planet.planet}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-6 bg-slate-200" /> ASC / MC
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-6 border-t border-dashed border-slate-200" /> DESC / IC
        </span>
      </div>
    </div>
  );
}
