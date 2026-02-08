import Image from 'next/image';

type ZodiacIconProps = {
  size?: number;
  className?: string;
};

const signToFile: Record<string, string> = {
  Aries: '/zodiac/aries.png',
  Taurus: '/zodiac/taurus.png',
  Gemini: '/zodiac/gemini.png',
  Cancer: '/zodiac/cancer.png',
  Leo: '/zodiac/leo.png',
  Virgo: '/zodiac/virgo.png',
  Libra: '/zodiac/libra.png',
  Scorpio: '/zodiac/scorpio.png',
  Sagittarius: '/zodiac/sagittarius.png',
  Capricorn: '/zodiac/capricorn.png',
  Aquarius: '/zodiac/aquarius.png',
  Pisces: '/zodiac/pisces.png',
};

export function ZodiacImage({ sign, size = 48, className }: { sign: string; size?: number; className?: string }) {
  const src = signToFile[sign];
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={sign}
      width={size}
      height={size}
      className={`inline-block rounded-full ${className || ''}`}
      unoptimized
    />
  );
}

// Legacy exports for compatibility — maps to the image component
export function getZodiacIcon(sign: string) {
  return function ZodiacIcon({ size = 24, className }: ZodiacIconProps) {
    return <ZodiacImage sign={sign} size={size} className={className} />;
  };
}

// Simple inline component for use in JSX
export function ZodiacIcon({ sign, size = 24, className }: { sign: string } & ZodiacIconProps) {
  return <ZodiacImage sign={sign} size={size} className={className} />;
}
