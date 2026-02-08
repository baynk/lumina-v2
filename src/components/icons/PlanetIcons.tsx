import type React from 'react';

type PlanetIconProps = {
  size?: number;
  className?: string;
};

const BASE_STROKE = '#d4af37';

function IconFrame({ size = 24, className, children }: React.PropsWithChildren<PlanetIconProps>) {
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

export const SunIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="24" cy="24" r="11" />
    <circle cx="24" cy="24" r="2.5" />
  </IconFrame>
);

export const MoonIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M31 10C24 11.6 19 17.3 19 24C19 30.7 24 36.4 31 38C26.6 34.8 24 29.8 24 24C24 18.2 26.6 13.2 31 10Z" />
  </IconFrame>
);

export const MercuryIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M17 13C18.8 9.6 21.1 8 24 8C26.9 8 29.2 9.6 31 13" />
    <circle cx="24" cy="22" r="8" />
    <path d="M24 30V40" />
    <path d="M19 35H29" />
  </IconFrame>
);

export const VenusIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="24" cy="20" r="9" />
    <path d="M24 29V40" />
    <path d="M18.5 34.5H29.5" />
  </IconFrame>
);

export const MarsIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="20" cy="28" r="8" />
    <path d="M26 22L36 12" />
    <path d="M30 12H36V18" />
  </IconFrame>
);

export const JupiterIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M28 10V38" />
    <path d="M16 16H34" />
    <path d="M28 20C24.2 20 21 23.1 21 27C21 30.9 24.2 34 28 34" />
  </IconFrame>
);

export const SaturnIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M24 10V38" />
    <path d="M16 18H32" />
    <path d="M24 14C30.2 14 34.5 18.3 34.5 24.5C34.5 30.6 30.2 34.8 24.2 34.8" />
  </IconFrame>
);

export const UranusIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="24" cy="27" r="6" />
    <path d="M24 21V8" />
    <path d="M17 14H31" />
    <path d="M14 14V30" />
    <path d="M34 14V30" />
    <path d="M14 22C10.8 22 8.8 20.2 8 17.2" />
    <path d="M34 22C37.2 22 39.2 20.2 40 17.2" />
  </IconFrame>
);

export const NeptuneIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M24 10V40" />
    <path d="M16 16C16 12.3 19.6 9.5 24 9.5C28.4 9.5 32 12.3 32 16" />
    <path d="M16 16V24" />
    <path d="M32 16V24" />
    <path d="M14 24H34" />
    <path d="M19 34H29" />
  </IconFrame>
);

export const PlutoIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M17 15C18.9 11.7 21.2 10 24 10C26.8 10 29.1 11.7 31 15" />
    <circle cx="24" cy="23" r="7.5" />
    <path d="M24 30.5V40" />
    <path d="M19 35.5H29" />
  </IconFrame>
);

export const ConjunctionIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="20" cy="24" r="6.5" />
    <circle cx="28" cy="24" r="6.5" />
  </IconFrame>
);

export const OppositionIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <circle cx="24" cy="24" r="9" />
    <path d="M15 24H33" />
  </IconFrame>
);

export const TrineIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M24 12L34.4 30H13.6Z" />
  </IconFrame>
);

export const SquareIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <rect x="15" y="15" width="18" height="18" />
  </IconFrame>
);

export const SextileIcon: React.FC<PlanetIconProps> = ({ size = 24, className }) => (
  <IconFrame size={size} className={className}>
    <path d="M24 12L27.2 18.5L34 18.8L29 24L34 29.2L27.2 29.5L24 36L20.8 29.5L14 29.2L19 24L14 18.8L20.8 18.5Z" />
  </IconFrame>
);

export function getPlanetIcon(planet: string): React.FC<{ size?: number; className?: string }> | null {
  const normalized = planet.trim().toLowerCase();

  switch (normalized) {
    case 'sun':
      return SunIcon;
    case 'moon':
      return MoonIcon;
    case 'mercury':
      return MercuryIcon;
    case 'venus':
      return VenusIcon;
    case 'mars':
      return MarsIcon;
    case 'jupiter':
      return JupiterIcon;
    case 'saturn':
      return SaturnIcon;
    case 'uranus':
      return UranusIcon;
    case 'neptune':
      return NeptuneIcon;
    case 'pluto':
      return PlutoIcon;
    default:
      return null;
  }
}

export function getAspectIcon(type: string): React.FC<{ size?: number; className?: string }> | null {
  const normalized = type.trim().toLowerCase();

  switch (normalized) {
    case 'conjunction':
      return ConjunctionIcon;
    case 'opposition':
      return OppositionIcon;
    case 'trine':
      return TrineIcon;
    case 'square':
      return SquareIcon;
    case 'sextile':
      return SextileIcon;
    default:
      return null;
  }
}
