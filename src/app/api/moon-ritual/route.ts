import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MoonRitualResponse } from '@/types';

type RequestBody = {
  moonPhase: string;
  sunSign: string;
  language: 'en' | 'ru';
};

const defaults: Record<'en' | 'ru', MoonRitualResponse> = {
  en: {
    title: 'Moon Ritual',
    summary: 'A short ritual to align your intention with the current lunar energy.',
    prompts: [
      'What do I want to cultivate in the next two weeks?',
      'What action can I take within 24 hours?',
      'What support do I need to stay consistent?',
    ],
  },
  ru: {
    title: 'Лунный ритуал',
    summary: 'Короткая практика, чтобы синхронизировать намерение с текущей лунной энергией.',
    prompts: [
      'Что я хочу вырастить в ближайшие две недели?',
      'Какой шаг я могу сделать уже сегодня?',
      'Какая поддержка поможет мне быть стабильнее?',
    ],
  },
};

function cleanJson(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body?.moonPhase || !body?.sunSign || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json(defaults.en, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json(defaults[body.language]);
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const instruction =
      body.language === 'ru'
        ? 'IMPORTANT: Write ALL text in Russian (Cyrillic script). Every string value must be in Russian. Do not use English at all. Use natural conversational Russian. Avoid jargon unless you immediately explain it.'
        : 'Write in warm modern English.';

    const prompt = [
      'Create personalized moon ritual content for an astrology app user.',
      instruction,
      `Moon phase: ${body.moonPhase}. User Sun sign: ${body.sunSign}.`,
      'Return ONLY valid JSON: {"title":"...","summary":"...","prompts":["...","...","..."]}',
      'Keep summary to 2 concise sentences and prompts practical.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = cleanJson(result.response.text());

    try {
      const parsed = JSON.parse(text) as MoonRitualResponse;
      if (parsed.title && parsed.summary && Array.isArray(parsed.prompts) && parsed.prompts.length >= 3) {
        return NextResponse.json({ ...parsed, prompts: parsed.prompts.slice(0, 4) });
      }
    } catch {
      // fallback below
    }

    return NextResponse.json(defaults[body.language]);
  } catch {
    return NextResponse.json(defaults.en);
  }
}
