import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateNatalChart } from '@/services/astronomyCalculator';
import type { BirthData, OnboardingStoryResponse } from '@/types';

type RequestBody = {
  birthData: BirthData;
  language: 'en' | 'ru';
};

const fallback: Record<'en' | 'ru', OnboardingStoryResponse> = {
  en: {
    title: 'Story of You',
    paragraphs: [
      'Your Sun shows what lights you up, your Moon shows how you feel safe, and your Rising sign is the energy people notice first. Together they form your personal rhythm.',
      'At your best, you move between confidence and sensitivity with real depth. You are not meant to copy someone else’s timeline; your power comes from honoring your own pace.',
      'When life gets noisy, return to simple anchors: name your feeling, choose one concrete action, and protect your energy. That is how your chart turns into everyday strength.',
      'This is not a fixed identity. It is a living pattern you can work with consciously, and it grows stronger every time you choose alignment over pressure.',
    ],
  },
  ru: {
    title: 'Твоя история',
    paragraphs: [
      'Солнце показывает, что тебя зажигает, Луна - где ты чувствуешь безопасность, а Асцендент - какую энергию люди считывают первой. Вместе они создают твой личный ритм.',
      'В сильном состоянии ты соединяешь уверенность и чувствительность с глубиной. Тебе не нужно жить по чужому темпу; твоя сила раскрывается в собственном ритме.',
      'Когда вокруг слишком шумно, вернись к простым опорам: назови чувство, выбери один конкретный шаг и защити свою энергию. Так карта становится практической силой.',
      'Это не жёсткий ярлык, а живая система, с которой можно работать осознанно. Каждый выбор в пользу внутренней согласованности делает тебя устойчивее.',
    ],
  },
};

function cleanJson(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body?.birthData || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json(fallback.en, { status: 400 });
    }

    const natal = calculateNatalChart(body.birthData);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json(fallback[body.language]);
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const langInstruction =
      body.language === 'ru'
        ? 'Write in natural Russian with emotional warmth and clarity.'
        : 'Write in elegant, warm English.';

    const prompt = [
      'Write a 2-minute onboarding narrative called "Story of You".',
      langInstruction,
      'Focus on Sun-Moon-Rising synthesis in plain language, with practical reflection.',
      'Return ONLY valid JSON: {"title":"...","paragraphs":["...","...","...","..."]}',
      'Write 4-6 short paragraphs.',
      `Chart context: ${JSON.stringify({
        sun: natal.planets.find((planet) => planet.planet === 'Sun'),
        moon: natal.planets.find((planet) => planet.planet === 'Moon'),
        risingSign: natal.risingSign,
      })}`,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = cleanJson(result.response.text());

    try {
      const parsed = JSON.parse(text) as OnboardingStoryResponse;
      if (parsed.title && Array.isArray(parsed.paragraphs) && parsed.paragraphs.length >= 3) {
        return NextResponse.json({
          title: parsed.title,
          paragraphs: parsed.paragraphs.slice(0, 6),
        });
      }
    } catch {
      // fallback below
    }

    return NextResponse.json(fallback[body.language]);
  } catch {
    return NextResponse.json(fallback.en);
  }
}
