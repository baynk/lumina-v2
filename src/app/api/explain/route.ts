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

    const languageInstruction =
      body.language === 'ru'
        ? 'Write in natural, conversational Russian as a native speaker. Use informal form and authentic astrological terms.'
        : 'Write in natural modern English with a premium astrology tone.';

    const prompt = [
      'You are an astrologer explaining one natal placement in depth.',
      languageInstruction,
      `Placement: ${body.planet} in ${body.sign}, House ${body.house}.`,
      'Output 180-260 words in 3 short paragraphs.',
      'Cover: strengths, growth edge, relationships/career expression, and one practical integration tip.',
      'Be specific and vivid. No disclaimers.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return NextResponse.json({ explanation: text || fallbackText[body.language] });
  } catch {
    return NextResponse.json({ explanation: fallbackText.en });
  }
}
