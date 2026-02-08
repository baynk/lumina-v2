'use client';

type MoonPhaseVisualProps = {
  illumination: number;
  phase: string;
};

function getMaskShift(phase: string, illumination: number): number {
  const ratio = Math.max(0, Math.min(1, illumination / 100));

  if (phase.includes('New')) return 48;
  if (phase.includes('Waxing Crescent')) return 45 - ratio * 28;
  if (phase.includes('First Quarter')) return 12;
  if (phase.includes('Waxing Gibbous')) return 10 - ratio * 14;
  if (phase.includes('Full')) return -48;
  if (phase.includes('Waning Gibbous')) return -8 + ratio * 14;
  if (phase.includes('Last Quarter')) return -12;
  return -45 + ratio * 28;
}

export default function MoonPhaseVisual({ illumination, phase }: MoonPhaseVisualProps) {
  const shift = getMaskShift(phase, illumination);

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div className="lumina-moon pulse-moon" />
      <div
        className="lumina-moon-shadow"
        style={{ transform: `translateX(${shift}px)` }}
        aria-hidden="true"
      />
    </div>
  );
}
