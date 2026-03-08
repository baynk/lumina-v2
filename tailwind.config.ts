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
        'bg-primary': '#0E0D14',
        'bg-secondary': '#1A1822',
        'bg-tertiary': '#23202E',
        'surface-elevated': '#2D2838',
        midnight: '#0E0D14',
        indigoNight: '#1A1822',
        purpleBlack: '#23202E',
        'accent-gold': '#C8A96E',
        'accent-gold-light': '#E8D5B5',
        'accent-purple': '#9B7EC8',
        'accent-amber': '#D4922A',
        'accent-rose': '#C87B8A',
        'accent-teal': '#5EBAA8',
        lumina: {
          accent: '#C8A96E',
          'accent-bright': '#E8D5B5',
          'accent-muted': '#9B7EC8',
          soft: '#F0EBE3',
        },
        'text-primary': '#F0EBE3',
        'text-secondary': '#9A9298',
        'text-tertiary': '#756D73',
        'text-muted': '#4A4260',
        warmWhite: '#F0EBE3',
        cream: '#9A9298',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 16px 50px rgba(200, 169, 110, 0.24)',
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
