import type React from 'react';

type ZodiacIconProps = {
  size?: number;
  className?: string;
};

const BASE_STROKE = '#d4af37';

function IconFrame({ size = 24, className, children }: React.PropsWithChildren<ZodiacIconProps>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke={BASE_STROKE}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const AriesIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M24 35C23 24 18 16 12.5 13C9.2 11.2 6.8 12.8 7 16.4C7.2 20.1 10 22.5 13.4 23.3" />
    <path d="M24 35C25 24 30 16 35.5 13C38.8 11.2 41.2 12.8 41 16.4C40.8 20.1 38 22.5 34.6 23.3" />
  </IconFrame>
);

export const TaurusIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="24" cy="29" r="10" />
    <path d="M14 21C11.4 16.5 10.8 12.6 13 10C15.8 6.7 20.8 8 24 13" />
    <path d="M34 21C36.6 16.5 37.2 12.6 35 10C32.2 6.7 27.2 8 24 13" />
  </IconFrame>
);

export const GeminiIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M16 10V38" />
    <path d="M32 10V38" />
    <path d="M11.5 12.5C17.2 9.2 30.8 9.2 36.5 12.5" />
    <path d="M11.5 35.5C17.2 38.8 30.8 38.8 36.5 35.5" />
  </IconFrame>
);

export const CancerIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="16" cy="18" r="5" />
    <circle cx="32" cy="30" r="5" />
    <path d="M11 18C11 11.6 16 8.5 21.6 8.8C26.8 9.1 30.8 12.8 32 17" />
    <path d="M37 30C37 36.4 32 39.5 26.4 39.2C21.2 38.9 17.2 35.2 16 31" />
  </IconFrame>
);

export const LeoIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M14 29C14 20.2 20.3 13.2 28.5 13.2C34.7 13.2 39 17.5 39 22.9C39 29.1 34.2 33.8 28.1 33.8C22.6 33.8 18.6 30.1 18.6 25.3C18.6 21.5 21.5 18.4 25.3 18.4C28.5 18.4 31 20.8 31 24" />
    <path d="M10 33.4C14 37.6 19.7 40 26 40" />
  </IconFrame>
);

export const VirgoIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M10 12V34" />
    <path d="M10 18C11.7 13.6 15.7 13.6 17.4 18V34" />
    <path d="M17.4 18C19.1 13.6 23.1 13.6 24.8 18V31" />
    <path d="M24.8 23C28 19.6 33 19.7 35.8 22.4C38.9 25.4 38.5 30.2 35.2 32.9C32 35.4 27.6 35 24.8 32" />
    <path d="M24.8 32C24.8 36.1 28.3 39.4 33.4 39.4" />
  </IconFrame>
);

export const LibraIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M8 35H40" />
    <path d="M12 18H36" />
    <path d="M14 35C14 26.8 18.4 20.2 24 20.2C29.6 20.2 34 26.8 34 35" />
  </IconFrame>
);

export const ScorpioIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M10 12V34" />
    <path d="M10 18C11.7 13.5 15.6 13.5 17.3 18V34" />
    <path d="M17.3 18C19 13.5 22.9 13.5 24.6 18V34" />
    <path d="M24.6 25C27.2 22.1 31.8 22.1 34.3 24.8C36.3 27 36.6 30.1 35.3 33" />
    <path d="M30 34H40V24" />
    <path d="M40 24L34.2 29.8" />
  </IconFrame>
);

export const SagittariusIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M11 37L37 11" />
    <path d="M27 11H37V21" />
    <path d="M37 11L28.4 19.6" />
    <path d="M15.2 19.2L28.8 32.8" />
  </IconFrame>
);

export const CapricornIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M10 12V30" />
    <path d="M10 17.6C11.8 13.3 15.8 13.3 17.5 17.6V30" />
    <path d="M17.5 17.6C19.2 13.3 23.2 13.3 24.9 17.6V26" />
    <path d="M24.9 26C24.9 19.3 31.6 16.3 36.4 19.7C40.9 22.8 40.9 29.5 36.4 32.6C32 35.8 26.2 34.2 24.8 30" />
    <path d="M24.8 30C24.8 27.2 27.1 25 30 25C32.3 25 34.2 26.8 34.2 29" />
  </IconFrame>
);

export const AquariusIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M6 17.5C9.6 13.9 13.2 13.9 16.8 17.5C20.4 21.1 24 21.1 27.6 17.5C31.2 13.9 34.8 13.9 38.4 17.5C40.3 19.4 42.2 20.2 44 20" />
    <path d="M6 29.5C9.6 25.9 13.2 25.9 16.8 29.5C20.4 33.1 24 33.1 27.6 29.5C31.2 25.9 34.8 25.9 38.4 29.5C40.3 31.4 42.2 32.2 44 32" />
  </IconFrame>
);

export const PiscesIcon: React.FC<ZodiacIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M16 10C22 14.2 22 33.8 16 38" />
    <path d="M32 10C26 14.2 26 33.8 32 38" />
    <path d="M10 24H38" />
  </IconFrame>
);

export function getZodiacIcon(sign: string): React.FC<{ size?: number; className?: string }> | null {
  const normalized = sign.trim().toLowerCase();

  switch (normalized) {
    case 'aries':
      return AriesIcon;
    case 'taurus':
      return TaurusIcon;
    case 'gemini':
      return GeminiIcon;
    case 'cancer':
      return CancerIcon;
    case 'leo':
      return LeoIcon;
    case 'virgo':
      return VirgoIcon;
    case 'libra':
      return LibraIcon;
    case 'scorpio':
      return ScorpioIcon;
    case 'sagittarius':
      return SagittariusIcon;
    case 'capricorn':
      return CapricornIcon;
    case 'aquarius':
      return AquariusIcon;
    case 'pisces':
      return PiscesIcon;
    default:
      return null;
  }
}
