'use client';

export default function RadarChart({ values }: { values: { label: string; value: number }[] }) {
  const center = 140;
  const radius = 105;
  const points = values
    .map((item, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius * (item.value / 100);
      const y = center + Math.sin(angle) * radius * (item.value / 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-[320px]">
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={values
            .map((_, index) => {
              const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
              const x = center + Math.cos(angle) * radius * (level / 100);
              const y = center + Math.sin(angle) * radius * (level / 100);
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}
      {values.map((item, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const lx = center + Math.cos(angle) * (radius + 22);
        const ly = center + Math.sin(angle) * (radius + 22);
        return (
          <g key={item.label}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x={lx} y={ly} fill="rgba(245,240,235,0.7)" fontSize="10" fontWeight="500" textAnchor="middle" dominantBaseline="middle">
              {item.label}
            </text>
          </g>
        );
      })}
      <polygon points={points} fill="url(#radarGradient)" stroke="rgba(196,181,253,0.8)" strokeWidth="2" />
      {values.map((item, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius * (item.value / 100);
        const y = center + Math.sin(angle) * radius * (item.value / 100);
        return <circle key={item.label} cx={x} cy={y} r="3.5" fill="#c4b5fd" stroke="#080c1f" strokeWidth="1.5" />;
      })}
      <defs>
        <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(167,139,250,0.3)" />
          <stop offset="100%" stopColor="rgba(196,181,253,0.15)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
