import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DailyCelestialData, NatalChartData } from '@/lib/types';

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

    const languageInstruction =
      body.language === 'ru'
        ? 'Write in natural, conversational Russian as a native speaker. Use informal form. Use authentic Russian astrological terminology.'
        : 'Write in warm, premium English for a modern astrology app audience.';

    const prompt = [
      'You are an expert astrologer writing a personalized daily horoscope.',
      languageInstruction,
      'Tone: insightful, elegant, emotionally intelligent, practical.',
      'Length: 120-180 words, 2 short paragraphs maximum.',
      'Include: emotional climate, relationship cue, and one concrete action for today.',
      `Natal chart data: ${JSON.stringify(body.natalChart)}`,
      `Current daily transits and moon data: ${JSON.stringify(body.dailyData)}`,
      'Avoid generic filler and avoid disclaimers.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return NextResponse.json({
      horoscope: text || fallbackText[body.language],
    });
  } catch {
    return NextResponse.json({ horoscope: fallbackText.en });
  }
}
