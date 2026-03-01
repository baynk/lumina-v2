export const planets = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const;

export const signs = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type Planet = (typeof planets)[number];
export type Sign = (typeof signs)[number];

export type PlacementData = {
  planet: Planet;
  sign: Sign;
  overview: { en: string; ru: string };
  traits: { en: string[]; ru: string[] };
  relationships: { en: string; ru: string };
  career: { en: string; ru: string };
  challenges: { en: string; ru: string };
};

const planetNamesRu: Record<Planet, string> = {
  Sun: 'Солнце',
  Moon: 'Луна',
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон',
};

const signNamesRu: Record<Sign, string> = {
  Aries: 'Овне',
  Taurus: 'Тельце',
  Gemini: 'Близнецах',
  Cancer: 'Раке',
  Leo: 'Льве',
  Virgo: 'Деве',
  Libra: 'Весах',
  Scorpio: 'Скорпионе',
  Sagittarius: 'Стрельце',
  Capricorn: 'Козероге',
  Aquarius: 'Водолее',
  Pisces: 'Рыбах',
};

type PlanetProfile = {
  symbol: string;
  focusEn: string;
  focusRu: string;
  verbEn: string;
  verbRu: string;
  giftEn: string;
  giftRu: string;
  shadowEn: string;
  shadowRu: string;
  relationshipEn: string;
  relationshipRu: string;
  careerEn: string;
  careerRu: string;
  challengeEn: string;
  challengeRu: string;
  keywordsEn: string[];
  keywordsRu: string[];
};

type SignProfile = {
  symbol: string;
  elementEn: string;
  elementRu: string;
  modeEn: string;
  modeRu: string;
  coreEn: string;
  coreRu: string;
  toneEn: string;
  toneRu: string;
  relationshipNeedEn: string;
  relationshipNeedRu: string;
  workStyleEn: string;
  workStyleRu: string;
  growthEdgeEn: string;
  growthEdgeRu: string;
  traitsEn: string[];
  traitsRu: string[];
};

export const planetSymbols: Record<Planet, string> = {
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

export const zodiacSymbols: Record<Sign, string> = {
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

const planetProfiles: Record<Planet, PlanetProfile> = {
  Sun: {
    symbol: '☉',
    focusEn: 'identity, vitality, and conscious purpose',
    focusRu: 'самоидентичность, жизненная сила и осознанная цель',
    verbEn: 'radiates',
    verbRu: 'излучает',
    giftEn: 'leadership through confidence and creative courage',
    giftRu: 'лидерство через уверенность и творческую смелость',
    shadowEn: 'ego reactivity when recognition feels uncertain',
    shadowRu: 'реакции эго, когда не хватает признания',
    relationshipEn: 'how a person expresses core selfhood and seeks appreciation',
    relationshipRu: 'как человек проявляет своё ядро и ищет признание',
    careerEn: 'where someone wants to shine, create impact, and be seen for mastery',
    careerRu: 'где человек хочет сиять, влиять и быть замеченным за мастерство',
    challengeEn: 'balancing pride with humility while staying true to personal values',
    challengeRu: 'балансировать гордость и смирение, оставаясь верным своим ценностям',
    keywordsEn: ['presence', 'willpower', 'authenticity', 'direction'],
    keywordsRu: ['присутствие', 'воля', 'аутентичность', 'направление'],
  },
  Moon: {
    symbol: '☽',
    focusEn: 'emotional needs, memory, and instinctive security',
    focusRu: 'эмоциональные потребности, память и инстинктивная безопасность',
    verbEn: 'responds',
    verbRu: 'реагирует',
    giftEn: 'deep sensitivity and intuitive emotional intelligence',
    giftRu: 'глубокая чувствительность и интуитивный эмоциональный интеллект',
    shadowEn: 'mood-driven reactions and protective withdrawal',
    shadowRu: 'реактивность настроения и защитное отстранение',
    relationshipEn: 'what helps a person feel safe, bonded, and emotionally understood',
    relationshipRu: 'что помогает человеку чувствовать безопасность и эмоциональную близость',
    careerEn: 'how emotional rhythms shape productivity, care, and sustainable pace',
    careerRu: 'как эмоциональные ритмы влияют на продуктивность, заботу и устойчивый темп',
    challengeEn: 'naming feelings directly instead of assuming others should sense them',
    challengeRu: 'прямо называть чувства вместо ожидания, что их угадают',
    keywordsEn: ['empathy', 'belonging', 'protection', 'inner world'],
    keywordsRu: ['эмпатия', 'принадлежность', 'защита', 'внутренний мир'],
  },
  Mercury: {
    symbol: '☿',
    focusEn: 'thinking style, language, and pattern recognition',
    focusRu: 'стиль мышления, язык и распознавание паттернов',
    verbEn: 'interprets',
    verbRu: 'интерпретирует',
    giftEn: 'mental agility and nuanced communication',
    giftRu: 'ментальная гибкость и точная коммуникация',
    shadowEn: 'overthinking, scattered attention, or defensive rhetoric',
    shadowRu: 'перемысливание, рассеянность или защитная риторика',
    relationshipEn: 'how a person talks through conflict, curiosity, and shared meaning',
    relationshipRu: 'как человек обсуждает конфликт, интерес и общие смыслы',
    careerEn: 'how ideas become systems, writing, teaching, sales, or strategy',
    careerRu: 'как идеи превращаются в системы, тексты, обучение, продажи или стратегию',
    challengeEn: 'slowing down enough to listen before proving a point',
    challengeRu: 'замедляться и слушать, прежде чем доказывать свою правоту',
    keywordsEn: ['logic', 'dialogue', 'analysis', 'curiosity'],
    keywordsRu: ['логика', 'диалог', 'анализ', 'любопытство'],
  },
  Venus: {
    symbol: '♀',
    focusEn: 'love style, aesthetics, and value alignment',
    focusRu: 'стиль любви, эстетика и ценностное согласие',
    verbEn: 'attracts',
    verbRu: 'притягивает',
    giftEn: 'magnetism through warmth, taste, and relational grace',
    giftRu: 'магнетизм через теплоту, вкус и гармоничность в отношениях',
    shadowEn: 'people-pleasing, possessiveness, or avoiding hard truths',
    shadowRu: 'угождение, собственничество или избегание сложной правды',
    relationshipEn: 'what a person needs to feel cherished, desired, and emotionally met',
    relationshipRu: 'что нужно человеку, чтобы чувствовать себя любимым и желанным',
    careerEn: 'how beauty, diplomacy, and values create money and influence',
    careerRu: 'как красота, дипломатия и ценности создают деньги и влияние',
    challengeEn: 'choosing standards that honor self-respect over short-term approval',
    challengeRu: 'выбирать стандарты, где самоуважение важнее мгновенного одобрения',
    keywordsEn: ['harmony', 'attraction', 'pleasure', 'values'],
    keywordsRu: ['гармония', 'притяжение', 'удовольствие', 'ценности'],
  },
  Mars: {
    symbol: '♂',
    focusEn: 'drive, desire, and assertive action',
    focusRu: 'драйв, желание и напористое действие',
    verbEn: 'initiates',
    verbRu: 'инициирует',
    giftEn: 'courage, momentum, and direct execution',
    giftRu: 'смелость, импульс и прямое исполнение',
    shadowEn: 'impatience, conflict escalation, or suppressed anger',
    shadowRu: 'нетерпение, эскалация конфликтов или подавленный гнев',
    relationshipEn: 'how passion, boundaries, and conflict style are expressed',
    relationshipRu: 'как проявляются страсть, границы и стиль конфликта',
    careerEn: 'where someone competes, takes risks, and pushes initiatives forward',
    careerRu: 'где человек соревнуется, рискует и двигает инициативы вперёд',
    challengeEn: 'turning raw force into focused strategy instead of reaction',
    challengeRu: 'переводить сырую силу в стратегию, а не в реакцию',
    keywordsEn: ['initiative', 'boldness', 'stamina', 'boundaries'],
    keywordsRu: ['инициатива', 'смелость', 'выносливость', 'границы'],
  },
  Jupiter: {
    symbol: '♃',
    focusEn: 'growth, belief systems, and opportunity',
    focusRu: 'рост, система убеждений и возможности',
    verbEn: 'expands',
    verbRu: 'расширяет',
    giftEn: 'optimism, perspective, and generous confidence',
    giftRu: 'оптимизм, масштаб мышления и щедрая уверенность',
    shadowEn: 'excess, overpromising, or moral certainty',
    shadowRu: 'избыточность, завышенные обещания или моральная категоричность',
    relationshipEn: 'how shared beliefs, adventure, and trust are cultivated',
    relationshipRu: 'как формируются общие убеждения, приключение и доверие',
    careerEn: 'where teaching, publishing, leadership, or expansion can thrive',
    careerRu: 'где могут процветать обучение, публикации, лидерство и масштабирование',
    challengeEn: 'matching big vision with disciplined follow-through',
    challengeRu: 'соединять большую идею с дисциплиной в реализации',
    keywordsEn: ['faith', 'abundance', 'wisdom', 'expansion'],
    keywordsRu: ['вера', 'изобилие', 'мудрость', 'расширение'],
  },
  Saturn: {
    symbol: '♄',
    focusEn: 'structure, responsibility, and mastery over time',
    focusRu: 'структура, ответственность и мастерство во времени',
    verbEn: 'stabilizes',
    verbRu: 'стабилизирует',
    giftEn: 'discipline, resilience, and long-term authority',
    giftRu: 'дисциплина, устойчивость и долгосрочный авторитет',
    shadowEn: 'fear of failure, rigidity, or self-criticism',
    shadowRu: 'страх ошибки, жёсткость или самокритика',
    relationshipEn: 'how commitment, loyalty, and mature boundaries are built',
    relationshipRu: 'как строятся обязательства, верность и зрелые границы',
    careerEn: 'where patience and craft produce durable achievement',
    careerRu: 'где терпение и ремесло приводят к устойчивым достижениям',
    challengeEn: 'releasing perfectionism while keeping standards high',
    challengeRu: 'ослаблять перфекционизм, сохраняя высокий стандарт',
    keywordsEn: ['discipline', 'integrity', 'endurance', 'legacy'],
    keywordsRu: ['дисциплина', 'целостность', 'выносливость', 'наследие'],
  },
  Uranus: {
    symbol: '♅',
    focusEn: 'innovation, freedom, and disruptive insight',
    focusRu: 'инновации, свобода и прорывные инсайты',
    verbEn: 'awakens',
    verbRu: 'пробуждает',
    giftEn: 'originality and courageous independence',
    giftRu: 'оригинальность и смелая независимость',
    shadowEn: 'restlessness, rebellion for its own sake, or instability',
    shadowRu: 'беспокойство, бунт ради бунта или нестабильность',
    relationshipEn: 'how autonomy and authenticity reshape partnership patterns',
    relationshipRu: 'как автономия и аутентичность меняют формат партнёрства',
    careerEn: 'where technology, invention, and future-facing ideas accelerate',
    careerRu: 'где технологии, изобретения и идеи будущего ускоряют рост',
    challengeEn: 'integrating change without burning reliable foundations',
    challengeRu: 'встраивать изменения, не разрушая надёжный фундамент',
    keywordsEn: ['innovation', 'liberation', 'experimentation', 'vision'],
    keywordsRu: ['инновации', 'освобождение', 'эксперимент', 'видение'],
  },
  Neptune: {
    symbol: '♆',
    focusEn: 'imagination, spirituality, and subtle perception',
    focusRu: 'воображение, духовность и тонкое восприятие',
    verbEn: 'dissolves',
    verbRu: 'растворяет',
    giftEn: 'compassion, artistic sensitivity, and symbolic intuition',
    giftRu: 'сострадание, художественная чувствительность и символическая интуиция',
    shadowEn: 'confusion, escapism, or blurred boundaries',
    shadowRu: 'путаница, эскапизм или размытые границы',
    relationshipEn: 'how romance, empathy, and fantasy color emotional bonding',
    relationshipRu: 'как романтика, эмпатия и фантазия окрашивают близость',
    careerEn: 'where healing, art, film, music, and spiritual service emerge',
    careerRu: 'где проявляются исцеление, искусство, кино, музыка и духовное служение',
    challengeEn: 'grounding dreams in practical routines and clear agreements',
    challengeRu: 'заземлять мечты в практику и ясные договорённости',
    keywordsEn: ['dreams', 'mysticism', 'empathy', 'inspiration'],
    keywordsRu: ['мечты', 'мистицизм', 'эмпатия', 'вдохновение'],
  },
  Pluto: {
    symbol: '♇',
    focusEn: 'transformation, power, and psychological depth',
    focusRu: 'трансформация, сила и психологическая глубина',
    verbEn: 'intensifies',
    verbRu: 'углубляет',
    giftEn: 'strategic depth, resilience, and regenerative force',
    giftRu: 'стратегическая глубина, устойчивость и регенеративная сила',
    shadowEn: 'control dynamics, obsession, or fear of vulnerability',
    shadowRu: 'динамика контроля, одержимость или страх уязвимости',
    relationshipEn: 'how trust, intimacy, and emotional truth are tested and rebuilt',
    relationshipRu: 'как проверяются и заново строятся доверие и эмоциональная правда',
    careerEn: 'where research, crisis leadership, strategy, and reform are powerful',
    careerRu: 'где сильны исследования, антикризисное лидерство, стратегия и реформы',
    challengeEn: 'sharing power transparently instead of gripping it defensively',
    challengeRu: 'делиться властью прозрачно, а не удерживать её из страха',
    keywordsEn: ['intensity', 'rebirth', 'depth', 'influence'],
    keywordsRu: ['интенсивность', 'перерождение', 'глубина', 'влияние'],
  },
};

const signProfiles: Record<Sign, SignProfile> = {
  Aries: {
    symbol: '♈',
    elementEn: 'fire',
    elementRu: 'огонь',
    modeEn: 'cardinal',
    modeRu: 'кардинальный',
    coreEn: 'pioneer energy, directness, and instinctive courage',
    coreRu: 'энергия первопроходца, прямота и инстинктивная смелость',
    toneEn: 'fast, decisive, and competitive',
    toneRu: 'быстрый, решительный и соревновательный',
    relationshipNeedEn: 'honesty, movement, and a partner who respects autonomy',
    relationshipNeedRu: 'честность, движение и партнёр, уважающий автономию',
    workStyleEn: 'initiates quickly and learns through action',
    workStyleRu: 'быстро начинает и учится в действии',
    growthEdgeEn: 'patience with timing and sensitivity to others\' pace',
    growthEdgeRu: 'терпение к таймингу и уважение к темпу других',
    traitsEn: ['bold', 'spontaneous', 'trailblazing', 'candid'],
    traitsRu: ['смелый', 'спонтанный', 'прорывной', 'прямой'],
  },
  Taurus: {
    symbol: '♉',
    elementEn: 'earth',
    elementRu: 'земля',
    modeEn: 'fixed',
    modeRu: 'фиксированный',
    coreEn: 'stability, sensuality, and grounded consistency',
    coreRu: 'стабильность, чувственность и заземлённая последовательность',
    toneEn: 'steady, patient, and value-driven',
    toneRu: 'устойчивый, терпеливый и ориентированный на ценности',
    relationshipNeedEn: 'loyalty, physical affection, and emotional reliability',
    relationshipNeedRu: 'верность, телесная близость и эмоциональная надёжность',
    workStyleEn: 'builds slowly but produces durable results',
    workStyleRu: 'строит медленно, но создаёт долговечный результат',
    growthEdgeEn: 'adapting faster when conditions change',
    growthEdgeRu: 'быстрее адаптироваться, когда условия меняются',
    traitsEn: ['calm', 'sensual', 'persistent', 'practical'],
    traitsRu: ['спокойный', 'чувственный', 'настойчивый', 'практичный'],
  },
  Gemini: {
    symbol: '♊',
    elementEn: 'air',
    elementRu: 'воздух',
    modeEn: 'mutable',
    modeRu: 'мутабельный',
    coreEn: 'curiosity, adaptability, and social intelligence',
    coreRu: 'любопытство, адаптивность и социальный интеллект',
    toneEn: 'quick, conversational, and mentally agile',
    toneRu: 'быстрый, разговорчивый и ментально гибкий',
    relationshipNeedEn: 'mental stimulation, variety, and play',
    relationshipNeedRu: 'интеллектуальная стимуляция, разнообразие и игра',
    workStyleEn: 'multitasks, connects dots, and shares information fast',
    workStyleRu: 'многозадачен, быстро связывает идеи и передаёт информацию',
    growthEdgeEn: 'depth, consistency, and finishing what was started',
    growthEdgeRu: 'глубина, постоянство и доведение начатого до конца',
    traitsEn: ['witty', 'versatile', 'observant', 'networked'],
    traitsRu: ['остроумный', 'разносторонний', 'наблюдательный', 'коммуникабельный'],
  },
  Cancer: {
    symbol: '♋',
    elementEn: 'water',
    elementRu: 'вода',
    modeEn: 'cardinal',
    modeRu: 'кардинальный',
    coreEn: 'care, emotional memory, and protective devotion',
    coreRu: 'забота, эмоциональная память и защитная преданность',
    toneEn: 'receptive, nurturing, and intuitive',
    toneRu: 'восприимчивый, заботливый и интуитивный',
    relationshipNeedEn: 'emotional safety, tenderness, and family-minded loyalty',
    relationshipNeedRu: 'эмоциональная безопасность, нежность и семейная верность',
    workStyleEn: 'leads through empathy and long-term care',
    workStyleRu: 'ведёт через эмпатию и долгосрочную заботу',
    growthEdgeEn: 'clear boundaries and direct communication of needs',
    growthEdgeRu: 'чёткие границы и прямое выражение потребностей',
    traitsEn: ['empathetic', 'protective', 'intuitive', 'devoted'],
    traitsRu: ['эмпатичный', 'защитный', 'интуитивный', 'преданный'],
  },
  Leo: {
    symbol: '♌',
    elementEn: 'fire',
    elementRu: 'огонь',
    modeEn: 'fixed',
    modeRu: 'фиксированный',
    coreEn: 'creative pride, generosity, and radiant expression',
    coreRu: 'творческая гордость, щедрость и яркое самовыражение',
    toneEn: 'warm, theatrical, and heart-centered',
    toneRu: 'тёплый, выразительный и сердечный',
    relationshipNeedEn: 'admiration, loyalty, and heartfelt romance',
    relationshipNeedRu: 'восхищение, верность и романтика от сердца',
    workStyleEn: 'inspires teams through confidence and visibility',
    workStyleRu: 'вдохновляет команды уверенностью и заметностью',
    growthEdgeEn: 'receiving feedback without taking it personally',
    growthEdgeRu: 'принимать обратную связь без личной драматизации',
    traitsEn: ['charismatic', 'loyal', 'expressive', 'bold-hearted'],
    traitsRu: ['харизматичный', 'верный', 'выразительный', 'смелый сердцем'],
  },
  Virgo: {
    symbol: '♍',
    elementEn: 'earth',
    elementRu: 'земля',
    modeEn: 'mutable',
    modeRu: 'мутабельный',
    coreEn: 'discernment, service, and practical refinement',
    coreRu: 'разборчивость, служение и практичное совершенствование',
    toneEn: 'precise, observant, and improvement-oriented',
    toneRu: 'точный, наблюдательный и ориентированный на улучшение',
    relationshipNeedEn: 'reliability, thoughtful effort, and mutual growth',
    relationshipNeedRu: 'надёжность, заботливые действия и взаимный рост',
    workStyleEn: 'optimizes systems and solves details others miss',
    workStyleRu: 'оптимизирует системы и решает детали, которые другие не видят',
    growthEdgeEn: 'self-compassion and tolerance for imperfect process',
    growthEdgeRu: 'самосострадание и терпимость к несовершенному процессу',
    traitsEn: ['analytical', 'helpful', 'organized', 'discerning'],
    traitsRu: ['аналитичный', 'полезный', 'организованный', 'разборчивый'],
  },
  Libra: {
    symbol: '♎',
    elementEn: 'air',
    elementRu: 'воздух',
    modeEn: 'cardinal',
    modeRu: 'кардинальный',
    coreEn: 'balance, diplomacy, and relational intelligence',
    coreRu: 'баланс, дипломатия и реляционный интеллект',
    toneEn: 'graceful, fair, and partnership-oriented',
    toneRu: 'грациозный, справедливый и партнёрский',
    relationshipNeedEn: 'mutual respect, harmony, and thoughtful reciprocity',
    relationshipNeedRu: 'взаимное уважение, гармония и продуманная взаимность',
    workStyleEn: 'mediates perspectives and creates elegant solutions',
    workStyleRu: 'сводит разные позиции и создаёт изящные решения',
    growthEdgeEn: 'decisiveness under pressure and honest conflict skills',
    growthEdgeRu: 'решительность под давлением и честные навыки конфликта',
    traitsEn: ['charming', 'cooperative', 'aesthetic', 'strategic'],
    traitsRu: ['обаятельный', 'кооперативный', 'эстетичный', 'стратегичный'],
  },
  Scorpio: {
    symbol: '♏',
    elementEn: 'water',
    elementRu: 'вода',
    modeEn: 'fixed',
    modeRu: 'фиксированный',
    coreEn: 'emotional intensity, loyalty, and transformative depth',
    coreRu: 'эмоциональная интенсивность, верность и трансформационная глубина',
    toneEn: 'private, magnetic, and psychologically sharp',
    toneRu: 'закрытый, магнитичный и психологически проницательный',
    relationshipNeedEn: 'trust, depth, and uncompromising honesty',
    relationshipNeedRu: 'доверие, глубина и бескомпромиссная честность',
    workStyleEn: 'focuses intensely and uncovers hidden leverage',
    workStyleRu: 'сильно фокусируется и находит скрытые рычаги',
    growthEdgeEn: 'releasing control and communicating vulnerability early',
    growthEdgeRu: 'ослаблять контроль и раньше говорить об уязвимости',
    traitsEn: ['intense', 'loyal', 'strategic', 'transformative'],
    traitsRu: ['интенсивный', 'верный', 'стратегичный', 'трансформационный'],
  },
  Sagittarius: {
    symbol: '♐',
    elementEn: 'fire',
    elementRu: 'огонь',
    modeEn: 'mutable',
    modeRu: 'мутабельный',
    coreEn: 'vision, freedom, and truth-seeking adventure',
    coreRu: 'видение, свобода и поиск истины через приключение',
    toneEn: 'optimistic, exploratory, and bluntly honest',
    toneRu: 'оптимистичный, исследовательский и прямолинейный',
    relationshipNeedEn: 'growth, adventure, and philosophical resonance',
    relationshipNeedRu: 'рост, приключение и мировоззренческий резонанс',
    workStyleEn: 'teaches, explores, and expands horizons',
    workStyleRu: 'учит, исследует и расширяет горизонты',
    growthEdgeEn: 'tact, emotional attunement, and practical follow-up',
    growthEdgeRu: 'такт, эмоциональная сонастройка и практичное доведение',
    traitsEn: ['adventurous', 'honest', 'visionary', 'enthusiastic'],
    traitsRu: ['авантюрный', 'честный', 'визионерский', 'энергичный'],
  },
  Capricorn: {
    symbol: '♑',
    elementEn: 'earth',
    elementRu: 'земля',
    modeEn: 'cardinal',
    modeRu: 'кардинальный',
    coreEn: 'ambition, discipline, and strategic stewardship',
    coreRu: 'амбиция, дисциплина и стратегическое управление',
    toneEn: 'composed, responsible, and goal-focused',
    toneRu: 'собранный, ответственный и ориентированный на цель',
    relationshipNeedEn: 'respect, reliability, and shared long-term plans',
    relationshipNeedRu: 'уважение, надёжность и общие долгосрочные планы',
    workStyleEn: 'builds authority through persistence and standards',
    workStyleRu: 'строит авторитет через настойчивость и стандарты',
    growthEdgeEn: 'softness, emotional openness, and rest without guilt',
    growthEdgeRu: 'мягкость, эмоциональная открытость и отдых без вины',
    traitsEn: ['disciplined', 'strategic', 'reliable', 'ambitious'],
    traitsRu: ['дисциплинированный', 'стратегичный', 'надёжный', 'амбициозный'],
  },
  Aquarius: {
    symbol: '♒',
    elementEn: 'air',
    elementRu: 'воздух',
    modeEn: 'fixed',
    modeRu: 'фиксированный',
    coreEn: 'independence, reform, and collective vision',
    coreRu: 'независимость, реформаторство и коллективное видение',
    toneEn: 'inventive, detached, and future-oriented',
    toneRu: 'изобретательный, отстранённый и ориентированный на будущее',
    relationshipNeedEn: 'friendship, freedom, and intellectual resonance',
    relationshipNeedRu: 'дружба, свобода и интеллектуальный резонанс',
    workStyleEn: 'creates systems that challenge outdated norms',
    workStyleRu: 'создаёт системы, которые ломают устаревшие нормы',
    growthEdgeEn: 'emotional intimacy and consistency in follow-through',
    growthEdgeRu: 'эмоциональная близость и последовательность в реализации',
    traitsEn: ['original', 'independent', 'visionary', 'humanitarian'],
    traitsRu: ['оригинальный', 'независимый', 'визионерский', 'гуманистичный'],
  },
  Pisces: {
    symbol: '♓',
    elementEn: 'water',
    elementRu: 'вода',
    modeEn: 'mutable',
    modeRu: 'мутабельный',
    coreEn: 'imagination, compassion, and spiritual permeability',
    coreRu: 'воображение, сострадание и духовная проницаемость',
    toneEn: 'dreamy, receptive, and emotionally porous',
    toneRu: 'мечтательный, восприимчивый и эмоционально проницаемый',
    relationshipNeedEn: 'gentleness, empathy, and soulful connection',
    relationshipNeedRu: 'нежность, эмпатия и душевная связь',
    workStyleEn: 'creates through intuition and symbolic sensitivity',
    workStyleRu: 'творит через интуицию и символическую чувствительность',
    growthEdgeEn: 'boundaries, realism, and practical prioritization',
    growthEdgeRu: 'границы, реализм и практичная приоритизация',
    traitsEn: ['compassionate', 'artistic', 'intuitive', 'fluid'],
    traitsRu: ['сострадательный', 'артистичный', 'интуитивный', 'гибкий'],
  },
};

export const slugify = (value: string) => value.toLowerCase();

export const placementSlug = (planet: Planet, sign: Sign) => `${slugify(planet)}-in-${slugify(sign)}`;

function buildPlacement(planet: Planet, sign: Sign): PlacementData {
  const p = planetProfiles[planet];
  const s = signProfiles[sign];
  const planetRu = planetNamesRu[planet];
  const signRu = signNamesRu[sign];

  const overviewEn = `${planet} in ${sign} blends ${p.focusEn} with ${s.coreEn}. This placement ${p.verbEn} through a ${s.toneEn} style, so people often notice it immediately in temperament and choices. The natural gift here is ${p.giftEn}, especially when life demands courage and alignment with core values.\n\nAt its best, ${planet} in ${sign} turns instinct into direction and talent into visible progress. This combination is especially strong when daily habits support the body and nervous system, because the ${s.elementEn} element can either fuel momentum or amplify stress. Over time, the path of mastery is learning to use power intentionally rather than reactively.`;

  const overviewRu = `${planetRu} в ${signRu} соединяет ${p.focusRu} с качествами ${s.coreRu}. Это положение ${p.verbRu} в ${s.toneRu} манере, поэтому его часто видно в характере и решениях с первого взгляда. Естественный дар здесь — ${p.giftRu}, особенно когда жизнь требует смелости и верности своим ценностям.\n\nВ лучшем проявлении ${planetRu} в ${signRu} превращает импульс в направление, а талант — в заметный результат. Эта комбинация особенно сильна, когда повседневные привычки поддерживают тело и нервную систему, потому что стихия ${s.elementRu} может либо подпитывать ресурс, либо усиливать стресс. Со временем ключ к мастерству — использовать силу осознанно, а не реактивно.`;

  const relationshipsEn = `In relationships, ${planet} in ${sign} shows ${p.relationshipEn}. The emotional tone tends to be ${s.toneEn}, and the heart asks for ${s.relationshipNeedEn}. Attraction grows quickly when communication feels honest and mutual respect is non-negotiable. This placement matures beautifully when partners name needs early, repair conflict quickly, and protect trust with consistent action.`;

  const relationshipsRu = `В отношениях ${planetRu} в ${signRu} показывает, ${p.relationshipRu}. Эмоциональный тон обычно ${s.toneRu}, а сердцу особенно нужны ${s.relationshipNeedRu}. Притяжение усиливается, когда общение честное, а взаимное уважение остаётся обязательным условием. Это положение раскрывается зрелее, когда партнёры рано проговаривают потребности, быстро восстанавливают контакт после конфликтов и защищают доверие последовательными действиями.`;

  const careerEn = `In career and purpose, this placement highlights ${p.careerEn}. ${sign} contributes a ${s.workStyleEn} approach, which can become a serious advantage in competitive environments. The strongest opportunities appear when goals are measurable and skills are upgraded on a fixed rhythm. Purpose deepens when success is linked to service, ethics, and a mission bigger than personal validation.`;

  const careerRu = `В карьере и предназначении это положение подчёркивает, ${p.careerRu}. ${planetRu} в ${signRu} добавляет стиль, который ${s.workStyleRu}, и это становится сильным преимуществом в конкурентной среде. Лучшие возможности открываются, когда цели измеримы, а навыки обновляются по понятному ритму. Чувство смысла усиливается, когда успех связан со служением, этикой и задачей больше, чем личное подтверждение значимости.`;

  const challengesEn = `The main challenge is ${p.challengeEn}. ${sign} also brings a growth edge around ${s.growthEdgeEn}, so pressure can trigger old patterns if rest and reflection are ignored. Watch for ${p.shadowEn}, especially during transitions, deadlines, or emotional uncertainty. Real growth comes from pausing before reacting, choosing clear boundaries, and turning intensity into deliberate leadership.`;

  const challengesRu = `Главный вызов этого положения — ${p.challengeRu}. Также ${planetRu} в ${signRu} добавляет зону роста вокруг темы ${s.growthEdgeRu}, поэтому в стрессе легко включаются старые сценарии, если игнорировать отдых и рефлексию. Важно отслеживать ${p.shadowRu}, особенно в переходные периоды, дедлайны и эмоциональную неопределённость. Реальный рост начинается там, где появляется пауза перед реакцией, ясные границы и перевод интенсивности в осознанное лидерство.`;

  return {
    planet,
    sign,
    overview: { en: overviewEn, ru: overviewRu },
    traits: {
      en: [
        `${p.symbol} ${planet} focus: ${p.keywordsEn[0]} and ${p.keywordsEn[1]}`,
        `${s.symbol} ${sign} signature: ${s.traitsEn[0]} and ${s.traitsEn[1]}`,
        `Element mode: ${s.modeEn} ${s.elementEn} expression`,
        `Natural strength: ${p.giftEn}`,
        `Relational need: ${s.relationshipNeedEn}`,
        `Growth edge: ${s.growthEdgeEn}`,
      ],
      ru: [
        `${p.symbol} Фокус ${planetRu}: ${p.keywordsRu[0]} и ${p.keywordsRu[1]}`,
        `${s.symbol} Подпись ${signRu}: ${s.traitsRu[0]} и ${s.traitsRu[1]}`,
        `Режим стихии: ${s.modeRu} ${s.elementRu}`,
        `Сильная сторона: ${p.giftRu}`,
        `Потребность в отношениях: ${s.relationshipNeedRu}`,
        `Зона роста: ${s.growthEdgeRu}`,
      ],
    },
    relationships: { en: relationshipsEn, ru: relationshipsRu },
    career: { en: careerEn, ru: careerRu },
    challenges: { en: challengesEn, ru: challengesRu },
  };
}

export const placementDataList: PlacementData[] = planets.flatMap((planet) =>
  signs.map((sign) => buildPlacement(planet, sign)),
);

export const placementDataBySlug: Record<string, PlacementData> = Object.fromEntries(
  placementDataList.map((entry) => [placementSlug(entry.planet, entry.sign), entry]),
);

export function getPlacementData(planet: string, sign: string): PlacementData | null {
  const planetKey = planets.find((value) => value.toLowerCase() === planet.toLowerCase());
  const signKey = signs.find((value) => value.toLowerCase() === sign.toLowerCase());

  if (!planetKey || !signKey) {
    return null;
  }

  return placementDataBySlug[placementSlug(planetKey, signKey)] ?? null;
}

export function getPlacementDataFromSlug(slug: string): PlacementData | null {
  return placementDataBySlug[slug.toLowerCase()] ?? null;
}
