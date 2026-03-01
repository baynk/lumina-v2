import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/context/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#080c1f',
        indigoNight: '#0f1433',
        purpleBlack: '#1a1040',
        lumina: {
          accent: '#c4b5fd',
          'accent-bright': '#a78bfa',
          'accent-muted': '#8b7dcf',
          soft: '#e8e0f6',
        },
        warmWhite: '#f5f0eb',
        cream: '#c8bfb6',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'var(--font-heading-cyr)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 16px 50px rgba(167, 139, 250, 0.25)',
      },
      animation: {
        fadeInUp: 'fadeInUp 0.7s ease-out both',
        shimmer: 'shimmer 2.2s linear infinite',
        pulseGentle: 'pulseGentle 4s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        pulseGentle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
