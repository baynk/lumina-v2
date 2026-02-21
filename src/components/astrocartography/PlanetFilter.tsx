'use client';

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

const ANGLES: Array<{ value: AngleType; label: string }> = [
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
};

export default function PlanetFilter({
  activePlanets,
  activeAngles,
  onTogglePlanet,
  onToggleAngle,
  onSelectAllPlanets,
  onClearAllPlanets,
}: PlanetFilterProps) {
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

      <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Angles</p>
      <div className="flex flex-wrap gap-2">
        {ANGLES.map((angle) => {
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
