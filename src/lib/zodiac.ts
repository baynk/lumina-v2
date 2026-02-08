export const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

export const PLANET_SYMBOLS: Record<string, string> = {
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

export const ZODIAC_DESCRIPTIONS: Record<string, string> = {
  Aries: 'The Ram — Bold, ambitious, driven',
  Taurus: 'The Bull — Grounded, sensual, steadfast',
  Gemini: 'The Twins — Curious, versatile, expressive',
  Cancer: 'The Crab — Nurturing, intuitive, protective',
  Leo: 'The Lion — Radiant, generous, magnetic',
  Virgo: 'The Maiden — Analytical, devoted, refined',
  Libra: 'The Scales — Harmonious, diplomatic, aesthetic',
  Scorpio: 'The Scorpion — Intense, transformative, deep',
  Sagittarius: 'The Archer — Adventurous, philosophical, free',
  Capricorn: 'The Sea-Goat — Disciplined, ambitious, wise',
  Aquarius: 'The Water Bearer — Innovative, humanitarian, visionary',
  Pisces: 'The Fish — Empathic, mystical, imaginative',
};

export function getZodiacGlyph(sign: string): string {
  return ZODIAC_GLYPHS[sign] || '✦';
}

export function getPlanetSymbol(planet: string): string {
  return PLANET_SYMBOLS[planet] || '•';
}
