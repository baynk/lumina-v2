import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateNatalChart } from '@/services/astronomyCalculator';
import { calculateTransitReport } from '@/services/transitCalculator';
import type { BirthData, TransitAlert } from '@/types';

type RequestBody = {
  birthData: BirthData;
  language: 'en' | 'ru';
};

function cleanJson(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

async function generateAiDetails(alerts: TransitAlert[], language: 'en' | 'ru'): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return {};

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const selected = alerts.slice(0, 12).map((item) => ({
    id: item.id,
    transit: `${item.transitPlanet} ${item.aspect} natal ${item.natalPlanet}`,
    priority: item.priority,
    tone: item.tone,
    orb: item.orb,
    date: item.date,
  }));

  const languageInstruction =
    language === 'ru'
      ? 'Write in natural conversational Russian.'
      : 'Write in clear practical English.';

  const prompt = [
    'You are an astrologer explaining practical transit impact.',
    languageInstruction,
    'Explain what each transit means in daily life, what to pay attention to, and likely opportunity/challenge. Keep grounded and actionable.',
    'Return ONLY valid JSON object where keys are transit IDs and values are 2-3 sentence practical explanations.',
    `Transit list: ${JSON.stringify(selected)}`,
  ].join('\n');

  const result = await model.generateContent(prompt);
  const text = cleanJson(result.response.text());

  try {
    const parsed = JSON.parse(text) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body?.birthData || (body.language !== 'en' && body.language !== 'ru')) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const natalChart = calculateNatalChart(body.birthData);
    const report = calculateTransitReport(natalChart);
    const aiMap = await generateAiDetails([...report.activeTransits, ...report.upcomingTransits], body.language);

    const withAi = {
      ...report,
      activeTransits: report.activeTransits.map((item) => ({
        ...item,
        aiInterpretation: aiMap[item.id] || item.description,
      })),
      upcomingTransits: report.upcomingTransits.map((item) => ({
        ...item,
        aiInterpretation: aiMap[item.id] || item.description,
      })),
    };

    const response = NextResponse.json(withAi);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Transits API error:', error);
    return NextResponse.json({ error: 'Failed to generate transit report.' }, { status: 500 });
  }
}
