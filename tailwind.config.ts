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
        'bg-void': '#050408',
        'bg-base': '#0B0814',
        'bg-frame': '#14111D',
        'bg-primary': '#0B0814',
        'bg-secondary': '#14111D',
        'bg-tertiary': '#1C182B',
        'surface-elevated': '#14111D',
        midnight: '#0B0814',
        indigoNight: '#14111D',
        purpleBlack: '#1C182B',
        'accent-gold': '#C8A4A4',
        'accent-gold-light': '#FDFBF7',
        'accent-purple': '#5A438A',
        'accent-amber': '#2E1B54',
        'accent-rose': '#C8A4A4',
        'accent-teal': '#18244D',
        lumina: {
          accent: '#C8A4A4',
          'accent-bright': '#FDFBF7',
          'accent-muted': '#C0BDD6',
          soft: '#FDFBF7',
        },
        'text-primary': '#FDFBF7',
        'text-secondary': '#8D8B9F',
        'text-tertiary': '#8D8B9F',
        'text-muted': '#5C5970',
        warmWhite: '#FDFBF7',
        cream: '#8D8B9F',
        mauve: '#C8A4A4',
        badge: '#C0BDD6',
        aura: {
          violet: '#5A438A',
          indigo: '#2E1B54',
          blue: '#18244D',
        },
      },
      fontFamily: {
        heading: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px rgba(90, 67, 138, 0.15)',
      },
      animation: {
        fadeInUp: 'fadeInUp 0.7s ease-out both',
        shimmer: 'shimmer 2.2s linear infinite',
        pulseGentle: 'pulseGentle 4s ease-in-out infinite',
        breathe: 'breathe 10s infinite alternate ease-in-out',
        moonFloat: 'float 6s infinite ease-in-out',
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
        breathe: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.15) translate(15px, 15px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
