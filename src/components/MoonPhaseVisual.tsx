'use client';

import type { CSSProperties } from 'react';

type MoonPhaseVisualProps = {
  illumination: number;
  phase: string;
};

function getShadowStyle(phase: string, illumination: number): CSSProperties {
  const normalized = phase.toLowerCase();
  const ratio = Math.max(0, Math.min(1, illumination / 100));
  const isWaxing = normalized.includes('waxing') || normalized.includes('first') || normalized.includes('new');

  if (normalized.includes('new')) {
    return {
      inset: 0,
      borderRadius: '9999px',
    };
  }

  if (normalized.includes('full')) {
    return {
      display: 'none',
    };
  }

  const coverPercent = `${Math.max(0, Math.min(100, (1 - ratio) * 100))}%`;

  if (isWaxing) {
    return {
      left: '0%',
      width: coverPercent,
      borderRadius: Number.parseFloat(coverPercent) < 50 ? '0' : '9999px 0 0 9999px',
    };
  }

  return {
    right: '0%',
    left: 'auto',
    width: coverPercent,
    borderRadius: Number.parseFloat(coverPercent) < 50 ? '0' : '0 9999px 9999px 0',
  };
}

export default function MoonPhaseVisual({ illumination, phase }: MoonPhaseVisualProps) {
  const shadowStyle = getShadowStyle(phase, illumination);

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div className="relative h-[110px] w-[110px] overflow-hidden rounded-full">
        <div className="lumina-moon pulse-moon" />
        <div
          className="absolute inset-y-0 bg-[linear-gradient(180deg,rgba(11,8,20,0.94),rgba(20,17,33,0.9))] transition-all duration-500"
          style={shadowStyle}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
