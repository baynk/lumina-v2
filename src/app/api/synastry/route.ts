import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateSynastry } from '@/services/synastryCalculator';
import type { BirthData, SynastryNarrative } from '@/types';

type RequestBody = {
  birthDataA: BirthData;
  birthDataB: BirthData;
  nameA?: string;
  nameB?: string;
  language: 'en' | 'ru';
};

const fallbackNarrative: Record<'en' | 'ru', SynastryNarrative> = {
  en: {
    overallConnection:
      'You have a real pull toward each other, with both comfort and intensity in the mix. The relationship feels meaningful, not casual, and tends to speed up emotional growth for both of you.',
    communicationStyle:
      'When communication is calm, you can understand each other quickly. Tension shows up when one person wants immediate clarity while the other needs time to process first.',
    emotionalCompatibility:
      'Emotionally, this bond can feel safe at times and sensitive at others. Regular check-ins about needs and boundaries help keep trust strong.',
    attractionChemistry:
      'There is clear chemistry, especially through affectionate gestures and emotional responsiveness. Attraction stays strongest when romance is paired with honesty, not assumptions.',
    growthChallenges:
      'Saturn-style themes ask for maturity, consistency, and accountability. The relationship improves when both people own their patterns instead of blaming each other.',
    longTermPotential:
      'Long-term potential is solid if you build practical routines around communication and conflict repair. This connection can last when effort matches emotion.',
  },
  ru: {
    overallConnection:
      'Между вами есть сильное притяжение, где сочетаются близость и интенсивность. Эти отношения ощущаются значимыми и быстро запускают внутренний рост у вас обоих.',
    communicationStyle:
      'Когда разговор спокойный, вы хорошо понимаете друг друга. Напряжение возникает, когда одному нужна ясность сразу, а другому нужно время переварить эмоции.',
    emotionalCompatibility:
      'Эмоционально связь может быть то очень тёплой, то уязвимой. Регулярные честные разговоры о потребностях и границах укрепляют доверие.',
    attractionChemistry:
      'Химия между вами заметная, особенно через заботу и телесную близость. Притяжение остаётся сильным, когда романтика сочетается с откровенностью.',
    growthChallenges:
      'Сатурнианские темы требуют зрелости, стабильности и ответственности. Отношения становятся лучше, когда каждый берёт ответственность за свои реакции.',
    longTermPotential:
      'Потенциал на долгую дистанцию хороший, если вы выстраиваете устойчивые договорённости и умеете восстанавливаться после конфликтов. Эта связь может быть долговечной при взаимных усилиях.',
  },
};

function cleanJson(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

async function generateNarrative(body: RequestBody, synastryData: ReturnType<typeof calculateSynastry>): Promise<SynastryNarrative> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return fallbackNarrative[body.language];

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const isRu = body.language === 'ru';
  const nameA = body.nameA?.trim() || (isRu ? 'Партнёр A' : 'Person A');
  const nameB = body.nameB?.trim() || (isRu ? 'Партнёр B' : 'Person B');
  const synJson = JSON.stringify(synastryData);

  const prompt = isRu
    ? [
        'Ты — астролог отношений, пишущий для умной подруги, которая интересуется астрологией, но не эксперт.',
        'Будь честной. Упоминай трудности, не только позитив.',
        'ВАЖНО: ВСЕ текстовые значения ДОЛЖНЫ быть на русском (кириллица). НИ ОДНОГО слова на английском. Используй "ты". Названия знаков и планет — на русском.',
        `Партнёр A — ${nameA}. Партнёр B — ${nameB}. Используй их реальные имена в тексте.`,
        'Используй реальные расположения и аспекты из предоставленных данных синастрии.',
        'Верни ТОЛЬКО валидный JSON с ключами:',
        '{"overallConnection":"...","communicationStyle":"...","emotionalCompatibility":"...","attractionChemistry":"...","growthChallenges":"...","longTermPotential":"..."}',
        'Каждый раздел — 3-4 предложения простым языком.',
        'Требования к разделам:',
        '1. overallConnection: вайб этих отношений в 2-3 вступительных предложениях + одно заземляющее.',
        '2. communicationStyle: как они общаются, спорят и решают конфликты.',
        '3. emotionalCompatibility: как они создают эмоциональную безопасность или нестабильность.',
        '4. attractionChemistry: динамика Венеры/Марса и романтическое притяжение.',
        '5. growthChallenges: особенно аспекты Сатурна, квадраты, оппозиции.',
        '6. longTermPotential: сильные стороны композитной карты и практические советы.',
        'НАПОМИНАНИЕ: Весь текст — ТОЛЬКО на русском языке.',
        `Данные синастрии: ${synJson}`,
      ].join('\n')
    : [
        'You are a relationship astrologer writing for a smart friend who is curious about astrology but not an expert.',
        'Be honest. Mention challenges, not only positives.',
        'Write in modern premium English. Avoid jargon unless you immediately explain it.',
        `Person A is named ${nameA}. Person B is named ${nameB}. Use their actual names throughout the narrative.`,
        'Use their actual placements and aspects from the provided synastry data.',
        'Return ONLY valid JSON with keys:',
        '{"overallConnection":"...","communicationStyle":"...","emotionalCompatibility":"...","attractionChemistry":"...","growthChallenges":"...","longTermPotential":"..."}',
        'Each section must be 3-4 sentences in plain language.',
        'Section requirements:',
        '1. Overall Connection: the vibe of this relationship in 2-3 opening sentences plus one grounding sentence.',
        '2. Communication Style: how they talk, argue, and resolve conflict.',
        '3. Emotional Compatibility: how they create emotional safety or insecurity.',
        '4. Attraction & Chemistry: Venus/Mars dynamics and romantic pull.',
        '5. Growth & Challenges: especially Saturn aspects, squares, oppositions.',
        '6. Long-term Potential: composite chart strengths and practical guidance.',
        `Synastry data: ${synJson}`,
      ].join('\n');

  const result = await model.generateContent(prompt);
  const text = cleanJson(result.response.text());

  try {
    const parsed = JSON.parse(text) as Partial<SynastryNarrative>;
    if (
      parsed.overallConnection &&
      parsed.communicationStyle &&
      parsed.emotionalCompatibility &&
      parsed.attractionChemistry &&
      parsed.growthChallenges &&
      parsed.longTermPotential
    ) {
      return parsed as SynastryNarrative;
    }
  } catch {
    // fallback below
  }

  return fallbackNarrative[body.language];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body?.birthDataA || !body?.birthDataB || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const synastryData = calculateSynastry(body.birthDataA, body.birthDataB);
    const interpretation = await generateNarrative(body, synastryData);

    const response = NextResponse.json({
      synastry: synastryData,
      interpretation,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Synastry API error:', error);
    return NextResponse.json({ error: 'Failed to generate synastry report.' }, { status: 500 });
  }
}
