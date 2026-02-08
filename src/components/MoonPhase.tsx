'use client';

interface MoonPhaseProps {
  phase: string;
  illumination: number;
}

export default function MoonPhase({ phase, illumination }: MoonPhaseProps) {
  const isWaxing = phase.toLowerCase().includes('waxing') || 
                   phase.toLowerCase().includes('first') ||
                   phase.toLowerCase().includes('new');
  
  const illFraction = illumination / 100;
  
  let shadowStyle: React.CSSProperties = {};
  
  if (phase === 'New Moon') {
    shadowStyle = {
      left: '0%',
      width: '100%',
      borderRadius: '50%',
    };
  } else if (phase === 'Full Moon') {
    shadowStyle = {
      display: 'none',
    };
  } else if (isWaxing) {
    const coverPercent = (1 - illFraction) * 100;
    shadowStyle = {
      left: '0%',
      width: `${coverPercent}%`,
      borderRadius: coverPercent < 50 ? '0' : '50% 0 0 50%',
    };
  } else {
    const coverPercent = (1 - illFraction) * 100;
    shadowStyle = {
      right: '0%',
      left: 'auto',
      width: `${coverPercent}%`,
      borderRadius: coverPercent < 50 ? '0' : '0 50% 50% 0',
    };
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="moon-container">
        <div className="moon-shadow" style={shadowStyle} />
      </div>
      <div className="text-center">
        <p className="font-heading text-xl text-cream/90">{phase}</p>
        <p className="text-cream/40 text-sm font-body">{illumination}% illuminated</p>
      </div>
    </div>
  );
}
