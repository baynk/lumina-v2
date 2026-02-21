/**
 * Astrocartography interpretations — personalized by planet sign placement.
 * Each planet has a general theme + what each angle line means for the person.
 */

type PlanetInterpretation = {
  theme: string;
  lines: {
    mc: string;
    ic: string;
    asc: string;
    desc: string;
  };
};

const INTERPRETATIONS: Record<string, PlanetInterpretation> = {
  Sun: {
    theme: 'Identity, vitality, and self-expression',
    lines: {
      asc: 'You feel most yourself here — confident, visible, and radiating authenticity. A place for personal reinvention.',
      desc: 'Powerful partnerships and significant relationships form here. Others mirror your core identity back to you.',
      mc: 'Career and public recognition peak here. You\'re seen as a leader and authority figure. Strong for professional ambition.',
      ic: 'Deep roots and belonging. This place connects you to ancestry, family, and your innermost sense of home.',
    },
  },
  Moon: {
    theme: 'Emotions, intuition, and inner life',
    lines: {
      asc: 'Emotional sensitivity is heightened. You feel deeply connected to the people and environment. Can feel vulnerable but deeply authentic.',
      desc: 'Emotional bonds and nurturing relationships. You attract partners who understand your inner world.',
      mc: 'Your emotional intelligence becomes your public strength. People see your empathy and care as leadership qualities.',
      ic: 'This place feels like an emotional home. Deep comfort, nostalgia, and a sense of being held. Ideal for putting down roots.',
    },
  },
  Mercury: {
    theme: 'Communication, intellect, and learning',
    lines: {
      asc: 'Your mind sharpens here. Communication flows easily and you\'re perceived as articulate and quick-witted.',
      desc: 'Stimulating intellectual partnerships. You attract collaborators who challenge your thinking.',
      mc: 'Your ideas get noticed. Strong for writing, teaching, media, and any career built on communication.',
      ic: 'A place for deep study and inner reflection. Your private intellectual life flourishes here.',
    },
  },
  Venus: {
    theme: 'Love, beauty, harmony, and pleasure',
    lines: {
      asc: 'You\'re perceived as attractive and charming here. Social life blooms. A place where love finds you.',
      desc: 'Romantic relationships and deep partnerships are favored. This is where you might meet a significant other.',
      mc: 'Your creative talents and aesthetic sensibility are recognized publicly. Strong for art, design, and diplomacy.',
      ic: 'A beautiful, harmonious home life. This place brings comfort, luxury, and domestic pleasure.',
    },
  },
  Mars: {
    theme: 'Drive, energy, courage, and conflict',
    lines: {
      asc: 'You feel energized and assertive here. Physical vitality peaks. Others see you as bold and decisive.',
      desc: 'Passionate but potentially contentious relationships. Attracts intense partnerships with strong dynamics.',
      mc: 'Your ambition and competitive drive are on full display. Strong for entrepreneurship, athletics, and leadership.',
      ic: 'Restless domestic energy. You may feel driven to constantly improve your home or struggle to find stillness.',
    },
  },
  Jupiter: {
    theme: 'Growth, abundance, opportunity, and wisdom',
    lines: {
      asc: 'Optimism and confidence radiate from you. Life feels expansive and full of possibility. Lucky breaks come naturally.',
      desc: 'Generous and beneficial partnerships. You attract mentors, benefactors, and people who expand your world.',
      mc: 'Professional success and recognition come with ease. Strong for education, publishing, law, and international ventures.',
      ic: 'A place of spiritual and philosophical grounding. Home life feels abundant. Good for raising a family.',
    },
  },
  Saturn: {
    theme: 'Structure, discipline, responsibility, and mastery',
    lines: {
      asc: 'You\'re taken seriously here. Others see you as mature and authoritative. May feel heavy but builds lasting respect.',
      desc: 'Relationships carry weight and responsibility. Partnerships are serious, committed, and sometimes challenging.',
      mc: 'Career demands discipline but rewards it. You build lasting professional structures. Slow but enduring success.',
      ic: 'Domestic life requires effort. This place teaches you about foundations, duty, and what truly matters.',
    },
  },
  Uranus: {
    theme: 'Innovation, freedom, sudden change, and individuality',
    lines: {
      asc: 'You feel liberated and unconventional here. Others see you as unique and ahead of your time.',
      desc: 'Unexpected and non-traditional relationships. Partnerships that challenge norms and keep you on your toes.',
      mc: 'Your originality disrupts your field. Strong for technology, innovation, and revolutionary ideas.',
      ic: 'Home life is unpredictable. Frequent moves or unconventional living arrangements. Freedom in private life.',
    },
  },
  Neptune: {
    theme: 'Imagination, spirituality, illusion, and compassion',
    lines: {
      asc: 'You appear mysterious and ethereal. Creativity and spiritual sensitivity heighten. Boundaries may blur.',
      desc: 'Deeply romantic but potentially confusing relationships. Idealization of partners. Spiritual connections.',
      mc: 'Your imagination and vision define your public life. Strong for art, music, film, healing, and spiritual work.',
      ic: 'A dreamy, otherworldly home environment. Deep spiritual connection to place. Watch for escapism.',
    },
  },
  Pluto: {
    theme: 'Transformation, power, intensity, and rebirth',
    lines: {
      asc: 'You feel a profound sense of personal transformation here. Others sense your intensity and depth.',
      desc: 'Deeply transformative relationships. Partnerships that fundamentally change who you are. Power dynamics surface.',
      mc: 'Your career involves transformation — of yourself and others. Strong for psychology, research, and influence.',
      ic: 'Profound inner transformation. This place strips away what\'s inessential and rebuilds you from the foundation.',
    },
  },
};

export type NatalPlanet = {
  planet: string;
  sign: string;
  degrees: string;
  house?: number;
};

export function getPersonalizedInterpretation(
  planet: string,
  natalPlanets: NatalPlanet[] | null,
): { theme: string; sign: string | null; lines: Record<string, string> } | null {
  const interp = INTERPRETATIONS[planet];
  if (!interp) return null;

  const natalPlacement = natalPlanets?.find((p) => p.planet === planet);
  const sign = natalPlacement?.sign || null;

  return {
    theme: interp.theme,
    sign,
    lines: interp.lines,
  };
}
