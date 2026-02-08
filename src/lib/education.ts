import type { Language } from './translations';

type LocalizedText = {
  en: string;
  ru: string;
};

const planetWhyItMatters: Record<string, LocalizedText> = {
  Sun: {
    en: 'Your core identity — who you are at your deepest',
    ru: 'Твоя суть — кто ты на самом деле',
  },
  Moon: {
    en: 'Your emotional world — how you feel and need to be loved',
    ru: 'Твой эмоциональный мир — как ты чувствуешь и как тебе нужна любовь',
  },
  Mercury: {
    en: 'How you think and communicate',
    ru: 'Как ты думаешь и общаешься',
  },
  Venus: {
    en: 'How you love and what you find beautiful',
    ru: 'Как ты любишь и что считаешь красивым',
  },
  Mars: {
    en: 'Your drive, ambition, and how you fight for what you want',
    ru: 'Твоя энергия и как ты добиваешься своего',
  },
  Jupiter: {
    en: 'Where luck and growth find you',
    ru: 'Где тебя находит удача',
  },
  Saturn: {
    en: 'Your biggest life lessons and where you\'ll grow strongest',
    ru: 'Твои главные жизненные уроки',
  },
  Uranus: {
    en: 'Where you break the rules and innovate',
    ru: 'Где ты ломаешь правила',
  },
  Neptune: {
    en: 'Your dreams, intuition, and spiritual gifts',
    ru: 'Твои мечты, интуиция и духовные дары',
  },
  Pluto: {
    en: 'Your deepest transformation and hidden power',
    ru: 'Твоя глубинная трансформация и скрытая сила',
  },
};

const houseThemes: Record<number, LocalizedText> = {
  1: { en: 'Self & First Impressions', ru: 'Личность и первое впечатление' },
  2: { en: 'Money, Values & Self-Worth', ru: 'Деньги, ценности и самооценка' },
  3: { en: 'Communication & Learning', ru: 'Общение и обучение' },
  4: { en: 'Home, Family & Roots', ru: 'Дом, семья и корни' },
  5: { en: 'Creativity, Romance & Joy', ru: 'Творчество, романтика и радость' },
  6: { en: 'Health, Routines & Daily Life', ru: 'Здоровье, рутина и повседневность' },
  7: { en: 'Partnerships & Relationships', ru: 'Партнёрство и отношения' },
  8: { en: 'Transformation & Intimacy', ru: 'Трансформация и близость' },
  9: { en: 'Travel, Philosophy & Higher Learning', ru: 'Путешествия, философия и высшее знание' },
  10: { en: 'Career, Reputation & Legacy', ru: 'Карьера, репутация и наследие' },
  11: { en: 'Community, Friends & Dreams', ru: 'Сообщество, друзья и мечты' },
  12: { en: 'Spirituality, Secrets & the Subconscious', ru: 'Духовность, тайны и подсознание' },
};

export function getPlanetWhyItMatters(planet: string, language: Language): string {
  return planetWhyItMatters[planet]?.[language] ?? '';
}

export function getHouseTheme(house: number, language: Language): string {
  return houseThemes[house]?.[language] ?? '';
}
