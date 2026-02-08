'use client';

import { getZodiacGlyph, ZODIAC_DESCRIPTIONS } from '@/lib/zodiac';

interface BigThreeProps {
  sunSign: string;
  moonSign: string;
  risingSign: string;
}

export default function BigThree({ sunSign, moonSign, risingSign }: BigThreeProps) {
  const signs = [
    { label: 'Sun', sign: sunSign, description: 'Your core identity & ego', icon: '☉' },
    { label: 'Moon', sign: moonSign, description: 'Your emotions & inner world', icon: '☽' },
    { label: 'Rising', sign: risingSign, description: 'How the world perceives you', icon: '↑' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {signs.map((item) => (
        <div
          key={item.label}
          className="glass-card p-7 text-center group hover:border-gold/30 transition-all duration-300"
        >
          <div className="text-gold/50 text-sm uppercase tracking-[0.2em] font-body mb-3">
            {item.icon} {item.label}
          </div>
          <div className="zodiac-glyph text-5xl text-gold mb-2">
            {getZodiacGlyph(item.sign)}
          </div>
          <h3 className="font-heading text-3xl text-cream/95 mb-1">{item.sign}</h3>
          <p className="text-cream/40 text-xs font-body mb-2">{item.description}</p>
          <p className="text-cream/30 text-xs font-body italic">
            {ZODIAC_DESCRIPTIONS[item.sign]}
          </p>
        </div>
      ))}
    </div>
  );
}
