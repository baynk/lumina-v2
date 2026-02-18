import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type RequestBody = {
  planet: string;
  sign: string;
  house: number;
  language: 'en' | 'ru';
};

const fallbackText = {
  en: 'This placement shows a core strength in how you express yourself. Use it consciously and it becomes one of your most magnetic qualities.',
  ru: 'Это положение показывает твою сильную сторону в самовыражении. Если использовать её осознанно, она становится твоим мощным ресурсом.',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!body?.planet || !body?.sign || !Number.isFinite(body?.house) || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json({ explanation: fallbackText.en }, { status: 400 });
    }

    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json({ explanation: fallbackText[body.language] });
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const isRu = body.language === 'ru';

    const prompt = isRu
      ? [
          'Ты — тёплый, проницательный астролог, пишущий для современной аудитории.',
          'ВАЖНО: Пиши ВСЁ на русском языке (кириллица). НИ ОДНОГО слова на английском. Используй "ты".',
          `Расположение: ${body.planet} в ${body.sign}, Дом ${body.house}.`,
          'Напиши 120-180 слов в 2-3 коротких абзацах.',
          'Охвати: что значит это расположение для личности, одну сильную сторону, одну зону роста и практический совет.',
          'Будь конкретной, тёплой и образной. Без дисклеймеров.',
          'Названия планет и знаков — на русском (Солнце, Луна, Козерог, Овен и т.д.).',
        ].join('\n')
      : [
          'You are a warm, insightful astrologer writing for a modern audience.',
          'Write in natural modern English with a premium astrology tone.',
          `Placement: ${body.planet} in ${body.sign}, House ${body.house}.`,
          'Output 120-180 words in 2-3 short paragraphs.',
          'Cover: what this placement means for personality, one strength, one growth area, and a practical tip.',
          'Be specific, warm, and vivid. No disclaimers or hedging.',
        ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      clearTimeout(timeout);
      var text = result.response.text().trim();
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ explanation: fallbackText[body.language] });
    }

    return NextResponse.json({ explanation: text || fallbackText[body.language] });
  } catch {
    return NextResponse.json({ explanation: fallbackText.en });
  }
}
