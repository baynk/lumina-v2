'use client';

import { getPersonalizedInterpretation, type NatalPlanet } from './interpretations';

type AngleType = 'mc' | 'ic' | 'asc' | 'desc';

type PlanetMeta = {
  planet: string;
  symbol: string;
  color: string;
};

const PLANETS: PlanetMeta[] = [
  { planet: 'Sun', symbol: '☉', color: '#facc15' },
  { planet: 'Moon', symbol: '☽', color: '#e5e7eb' },
  { planet: 'Mercury', symbol: '☿', color: '#7dd3fc' },
  { planet: 'Venus', symbol: '♀', color: '#34d399' },
  { planet: 'Mars', symbol: '♂', color: '#ef4444' },
  { planet: 'Jupiter', symbol: '♃', color: '#a78bfa' },
  { planet: 'Saturn', symbol: '♄', color: '#f59e0b' },
  { planet: 'Uranus', symbol: '♅', color: '#22d3ee' },
  { planet: 'Neptune', symbol: '♆', color: '#2563eb' },
  { planet: 'Pluto', symbol: '♇', color: '#7f1d1d' },
];

const ANGLE_LABELS: Record<string, string> = { mc: 'Midheaven', ic: 'Imum Coeli', asc: 'Ascendant', desc: 'Descendant' };
const ANGLE_ABBR: Array<{ value: AngleType; label: string }> = [
  { value: 'mc', label: 'MC' },
  { value: 'ic', label: 'IC' },
  { value: 'asc', label: 'ASC' },
  { value: 'desc', label: 'DESC' },
];

type PlanetFilterProps = {
  activePlanets: string[];
  activeAngles: AngleType[];
  onTogglePlanet: (planet: string) => void;
  onToggleAngle: (angleType: AngleType) => void;
  onSelectAllPlanets: () => void;
  onClearAllPlanets: () => void;
  natalPlanets?: NatalPlanet[] | null;
};

export default function PlanetFilter({
  activePlanets,
  activeAngles,
  onTogglePlanet,
  onToggleAngle,
  onSelectAllPlanets,
  onClearAllPlanets,
  natalPlanets,
}: PlanetFilterProps) {
  const activeMeta = PLANETS.filter((p) => activePlanets.includes(p.planet));

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Planets</p>
        <div className="flex gap-3">
          <button type="button" onClick={onSelectAllPlanets} className="text-[10px] text-cream/40 hover:text-cream/70 transition">Select all</button>
          <button type="button" onClick={onClearAllPlanets} className="text-[10px] text-cream/40 hover:text-cream/70 transition">Clear all</button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PLANETS.map((item) => {
          const active = activePlanets.includes(item.planet);
          return (
            <button
              key={item.planet}
              type="button"
              onClick={() => onTogglePlanet(item.planet)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? 'border-slate-500 bg-slate-800 text-slate-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500'
              }`}
              style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.symbol}</span>
              <span>{item.planet}</span>
            </button>
          );
        })}
      </div>

      {activePlanets.length === 0 && (
        <p className="mb-3 -mt-1 text-[11px] text-lumina-accent/60 italic">↑ Tap a planet to draw its lines on the map</p>
      )}

      {/* Interpretation cards for active planets */}
      {activeMeta.length > 0 && (
        <div className="mb-4 space-y-3">
          {activeMeta.map((pm) => {
            const interp = getPersonalizedInterpretation(pm.planet, natalPlanets || null);
            if (!interp) return null;
            return (
              <div
                key={pm.planet}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3"
                style={{ borderLeftWidth: 3, borderLeftColor: pm.color }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ color: pm.color }} className="text-base">{pm.symbol}</span>
                  <span className="text-sm font-medium text-warmWhite">{pm.planet}</span>
                  {interp.sign && (
                    <span className="text-[10px] text-cream/40 ml-1">in {interp.sign}</span>
                  )}
                </div>
                <p className="text-[11px] text-cream/50 italic mb-2">{interp.theme}</p>
                <div className="space-y-1.5">
                  {activeAngles.map((angle) => {
                    const desc = interp.lines[angle];
                    if (!desc) return null;
                    return (
                      <div key={angle} className="flex gap-2">
                        <span className="text-[10px] font-mono text-cyan-300/70 w-8 shrink-0 pt-0.5">
                          {angle.toUpperCase()}
                        </span>
                        <p className="text-[11px] text-cream/60 leading-relaxed">{desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Angles</p>
      <div className="flex flex-wrap gap-2">
        {ANGLE_ABBR.map((angle) => {
          const active = activeAngles.includes(angle.value);
          return (
            <button
              key={angle.value}
              type="button"
              onClick={() => onToggleAngle(angle.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500'
              }`}
            >
              {angle.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
