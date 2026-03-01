import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendMessage } from '@/lib/telegram';
import { calculateDailyCelestialData } from '@/services/astronomyCalculator';
import type { AspectData } from '@/types';

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

const RU_SIGNS: Record<string, string> = {
  Aries: 'Овен',
  Taurus: 'Телец',
  Gemini: 'Близнецы',
  Cancer: 'Рак',
  Leo: 'Лев',
  Virgo: 'Дева',
  Libra: 'Весы',
  Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец',
  Capricorn: 'Козерог',
  Aquarius: 'Водолей',
  Pisces: 'Рыбы',
};

const RU_PHASES: Record<string, string> = {
  'New Moon': 'Новолуние',
  'Waxing Crescent': 'Растущий серп',
  'First Quarter': 'Первая четверть',
  'Waxing Gibbous': 'Растущая луна',
  'Full Moon': 'Полнолуние',
  'Waning Gibbous': 'Убывающая луна',
  'Last Quarter': 'Последняя четверть',
  'Waning Crescent': 'Убывающий серп',
};

const RU_PLANETS: Record<string, string> = {
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

const RU_ASPECT_TYPES: Record<string, string> = {
  conjunction: 'соединение',
  sextile: 'секстиль',
  square: 'квадрат',
  trine: 'трин',
  opposition: 'оппозиция',
};

const fallbackGuidance = [
  'Энергия дня призывает держать внимание на главном и не спешить с выводами. Полезно сначала услышать свои чувства, а уже потом принимать решения.',
  'В отношениях лучше сработают честность и мягкий тон. Оставь в расписании немного пространства для отдыха: именно в паузе сегодня может прийти важная подсказка.',
  'Сфокусируйся на одном практичном шаге, который укрепит твое состояние и уверенность к вечеру.',
].join('\n\n');

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function isAuthorized(request: Request) {
  const header = request.headers.get('authorization');
  const token = process.env.TELEGRAM_ADMIN_TOKEN;

  if (token && header) {
    const value = header.replace(/^Bearer\s+/i, '').trim();
    if (value === token) {
      return true;
    }
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return false;

  const domain = email.split('@')[1] || '';
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

function formatAspect(aspect: AspectData) {
  const p1 = RU_PLANETS[aspect.planet1 || ''] || aspect.planet1 || 'Планета';
  const p2 = RU_PLANETS[aspect.planet2 || ''] || aspect.planet2 || 'Планета';
  const type = RU_ASPECT_TYPES[aspect.type] || aspect.type;
  return `• ${p1} ${type} ${p2}`;
}

async function generateGuidance(dailyData: ReturnType<typeof calculateDailyCelestialData>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return fallbackGuidance;

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const todayRu = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const prompt = [
      'Ты астролог-редактор премиум приложения Lumina.',
      `Напиши общий ежедневный прогноз для Telegram-канала на ${todayRu}.`,
      'Пиши строго на русском языке, обращение на "ты".',
      'Нужно 2-3 абзаца, 120-170 слов, без списков и эмодзи.',
      'Дай практичную поддержку: эмоциональный фон, отношения, работа/фокус дня.',
      'Избегай дисклеймеров, клише и общих фраз.',
      `Вот данные транзитов и Луны на сегодня: ${JSON.stringify(dailyData)}`,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || fallbackGuidance;
  } catch {
    return fallbackGuidance;
  }
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: 'Missing TELEGRAM_CHANNEL_ID' }, { status: 500 });
  }

  try {
    const dailyData = calculateDailyCelestialData();
    const dateLabel = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const moonPhase = RU_PHASES[dailyData.moon.phase] || dailyData.moon.phase;
    const moonSign = RU_SIGNS[dailyData.moon.sign] || dailyData.moon.sign;
    const moonLine = `Луна: ${moonPhase} в знаке ${moonSign} (${dailyData.moon.illumination}% освещенности)`;

    const aspects = dailyData.aspects.length > 0 ? dailyData.aspects.slice(0, 5).map(formatAspect).join('\n') : '• Сегодня без ярко выраженных мажорных аспектов.';
    const guidance = await generateGuidance(dailyData);

    const text = [
      `<b>✦ Ежедневный прогноз — ${escapeHtml(dateLabel)}</b>`,
      '',
      `<b>${escapeHtml(moonLine)}</b>`,
      '',
      '<b>Главные аспекты дня:</b>',
      escapeHtml(aspects),
      '',
      escapeHtml(guidance),
      '',
      'Хочешь персональный прогноз? → @lumina_astro_bot',
      'luminastrology.com',
    ].join('\n');

    await sendMessage(channelId, text, { disable_web_page_preview: true });
    return NextResponse.json({ ok: true, channelId });
  } catch (error) {
    console.error('Telegram channel post error:', error);
    return NextResponse.json({ error: 'Failed to post daily channel forecast' }, { status: 500 });
  }
}
