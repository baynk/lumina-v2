import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DailyCelestialData, NatalChartData } from '@/lib/types';

// Force dynamic rendering — never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RequestBody = {
  natalChart: NatalChartData;
  dailyData: DailyCelestialData;
  language: 'en' | 'ru';
};

const fallbackText = {
  en: 'Today asks for softness and clarity. Trust your instincts, choose one priority, and let your emotional rhythm lead.',
  ru: 'Сегодня выбери мягкий темп и ясный фокус. Доверься интуиции, не распыляйся и делай шаг за шагом.',
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = (await request.json()) as RequestBody;

    if (!body?.natalChart || !body?.dailyData || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json({ horoscope: fallbackText.en }, { status: 400 });
    }

    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json({ horoscope: fallbackText[body.language] });
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Include today's date so the reading is unique each day
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const isRu = body.language === 'ru';
    const chartJson = JSON.stringify(body.natalChart);
    const dailyJson = JSON.stringify(body.dailyData);

    const prompt = isRu
      ? [
          'Ты — опытный астролог, пишущий персональный ежедневный гороскоп.',
          `Сегодня ${dateStr}. Этот прогноз — именно на сегодня, уникальный для сегодняшних транзитов.`,
          'ВАЖНО: Пиши ВСЁ на русском языке (кириллица). НИ ОДНОГО слова на английском. Используй "ты" (не "вы"). Названия планет и знаков — на русском.',
          'Тон: проницательный, элегантный, эмоционально умный, практичный.',
          'Длина: 120-180 слов, максимум 2 коротких абзаца.',
          'Включи: эмоциональный фон дня, подсказку для отношений и одно конкретное действие на сегодня.',
          'Ссылайся на конкретные позиции планет и аспекты из транзитных данных — НЕ давай общих советов.',
          `Данные натальной карты: ${chartJson}`,
          `Текущие транзиты и лунные данные: ${dailyJson}`,
          'Избегай общих фраз, дисклеймеров и повторений.',
        ].join('\n')
      : [
          'You are an expert astrologer writing a personalized daily horoscope.',
          `Today is ${dateStr}. This reading is specifically for today — make it unique and specific to today's transits.`,
          'Write in warm, premium English for a modern astrology app audience.',
          'Tone: insightful, elegant, emotionally intelligent, practical.',
          'Length: 120-180 words, 2 short paragraphs maximum.',
          'Include: emotional climate, relationship cue, and one concrete action for today.',
          'Reference specific planetary positions and aspects from the transit data — do NOT give generic advice.',
          `Natal chart data: ${chartJson}`,
          `Current daily transits and moon data: ${dailyJson}`,
          'Avoid generic filler, avoid disclaimers, and avoid repeating the same advice every day.',
        ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const response = NextResponse.json({
      horoscope: text || fallbackText[body.language],
    });
    // Prevent any caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch {
    return NextResponse.json({ horoscope: fallbackText.en });
  }
}
