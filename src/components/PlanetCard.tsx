'use client';

import { getZodiacGlyph, getPlanetSymbol } from '@/lib/zodiac';

interface PlanetCardProps {
  planet: string;
  sign: string;
  degrees: string;
  house?: number;
}

export default function PlanetCard({ planet, sign, degrees, house }: PlanetCardProps) {
  return (
    <div className="glass-card glass-card-hover p-5 flex flex-col items-center text-center gap-2 group transition-all duration-300">
      <div className="text-gold/70 text-2xl group-hover:text-gold transition-colors">
        {getPlanetSymbol(planet)}
      </div>
      <h3 className="font-heading text-lg text-cream/90">{planet}</h3>
      <div className="flex items-center gap-2">
        <span className="zodiac-glyph text-gold/80 text-xl">{getZodiacGlyph(sign)}</span>
        <span className="font-body text-cream/70 text-sm">{sign}</span>
      </div>
      <p className="text-cream/40 text-xs font-body">
        {parseFloat(degrees).toFixed(1)}°
        {house !== undefined && ` · House ${house}`}
      </p>
    </div>
  );
}
