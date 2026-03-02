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
  Aries: 'Овне', Taurus: 'Тельце', Gemini: 'Близнецах', Cancer: 'Раке',
  Leo: 'Льве', Virgo: 'Деве', Libra: 'Весах', Scorpio: 'Скорпионе',
  Sagittarius: 'Стрельце', Capricorn: 'Козероге', Aquarius: 'Водолее', Pisces: 'Рыбах',
};

const RU_SIGNS_NOM: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
  Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

// Preposition "в/во" — use "во" before Льве, Рыбах, and other consonant clusters
function moonPreposition(sign: string): string {
  const prep = ['Leo', 'Pisces'].includes(sign) ? 'во' : 'в';
  return prep;
}

const RU_PHASES: Record<string, string> = {
  'New Moon': 'новолуние', 'Waxing Crescent': 'растущая', 'First Quarter': 'первая четверть',
  'Waxing Gibbous': 'растущая', 'Full Moon': 'полнолуние', 'Waning Gibbous': 'убывающая',
  'Last Quarter': 'последняя четверть', 'Waning Crescent': 'убывающая',
};

const RU_PLANETS: Record<string, string> = {
  Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера', Mars: 'Марс',
  Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран', Neptune: 'Нептун', Pluto: 'Плутон',
};

const RU_ASPECT_TYPES: Record<string, string> = {
  conjunction: 'в соединении с', sextile: 'в секстиле к', square: 'в квадратуре к',
  trine: 'в трине к', opposition: 'в оппозиции к',
};

const RU_WEEKDAYS: Record<number, string> = {
  0: 'воскресенье', 1: 'понедельник', 2: 'вторник', 3: 'среда',
  4: 'четверг', 5: 'пятница', 6: 'суббота',
};

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function isAuthorized(request: Request) {
  const header = request.headers.get('authorization');
  const token = process.env.TELEGRAM_ADMIN_TOKEN;
  if (token && header) {
    const value = header.replace(/^Bearer\s+/i, '').trim();
    if (value === token) return true;
  }
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return false;
  const domain = email.split('@')[1] || '';
  return ADMIN_EMAILS.includes(email) || ADMIN_DOMAINS.includes(domain);
}

function formatAspectNatural(aspect: AspectData): string {
  const p1 = RU_PLANETS[aspect.planet1 || ''] || aspect.planet1 || '';
  const p2 = RU_PLANETS[aspect.planet2 || ''] || aspect.planet2 || '';
  const type = RU_ASPECT_TYPES[aspect.type] || aspect.type;
  return `${p1} ${type} ${p2}`;
}

async function generateGuidance(dailyData: ReturnType<typeof calculateDailyCelestialData>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return null;

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const now = new Date();
    const moscowDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', weekday: 'long', day: 'numeric', month: 'long',
    }).format(now);

    const moonSign = RU_SIGNS_NOM[dailyData.moon.sign] || dailyData.moon.sign;
    const moonPhase = RU_PHASES[dailyData.moon.phase] || dailyData.moon.phase;
    const prep = moonPreposition(dailyData.moon.sign);

    const aspectsList = dailyData.aspects.slice(0, 4).map(formatAspectNatural).join(', ');

    const prompt = `Ты пишешь ежедневный пост для Telegram-канала об астрологии. Канал ведёт профессиональный астролог Ирина.

СТИЛЬ: Как умная подруга, которая разбирается в астрологии и утром пишет тебе сообщение. Тёплый, живой, разговорный тон. Обращение на "вы" (но не формально, а уважительно-тепло). НЕ ПИШИ как бот или как учебник.

ФОРМАТ: 2-3 абзаца, 130-170 слов. Без заголовков, без списков, без эмодзи (кроме ✦ в конце). Без клише типа "вселенная посылает сигналы". Без дисклеймеров.

ОБЯЗАТЕЛЬНОЕ ПРАВИЛО — ЕСТЕСТВЕННЫЙ ЯЗЫК: Текст должен звучать как написанный живым человеком, а не сгенерированный ИИ. Конкретные запреты:
- НЕ используй тире (—) больше одного раза за весь текст. Вместо тире перестрой предложение, используй точку или запятую.
- НЕ начинай предложения со слов "Кстати", "Кроме того", "Более того", "Стоит отметить".
- НЕ используй конструкции "это значит, что", "проще говоря" больше одного раза. Варьируй: объясняй через примеры, через "то есть", через прямое описание ощущений.
- Избегай шаблонных переходов. Пиши так, будто печатаешь сообщение подруге в чат, а не составляешь статью.
- Предложения разной длины. Короткие и длинные вперемешку. Не выстраивай все в одну ритмическую структуру.

ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: Каждый астрологический термин поясняй простым языком. Термин, потом пояснение. Но используй разные способы: иногда в скобках, иногда через "то есть", иногда просто описывая, что человек почувствует.

ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ПО РУССКОМУ ЯЗЫКУ: Предлог перед "Льве" и "Рыбах" — "во", не "в". Пиши "во Льве", "во Рыбах". Перед остальными знаками — "в".

ДАННЫЕ НА СЕГОДНЯ (${moscowDate}):
- Луна: ${moonPhase} ${prep} ${moonSign} (${dailyData.moon.illumination}% освещённости)
- Основные аспекты: ${aspectsList || 'без ярких мажорных аспектов'}
- Транзитные данные: ${JSON.stringify(dailyData.planets?.slice(0, 5))}

Напиши пост. Начни сразу с содержания (дату и заголовок я добавлю сам). Заверши пожеланием на день и символом ✦`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || null;
  } catch {
    return null;
  }
}

const fallbackGuidance = 'Сегодня стоит сфокусироваться на главном и не разбрасываться. Энергия дня поддерживает тех, кто действует осознанно. Дайте себе время подумать, прежде чем принимать решения, особенно в общении. Вечер лучше провести спокойно, с теми, кто вас заряжает ✦';

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

    const now = new Date();
    const day = now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long' });
    const weekday = RU_WEEKDAYS[new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).getDay()] || '';

    const moonSign = dailyData.moon.sign;
    const prep = moonPreposition(moonSign);
    const signLocative = RU_SIGNS[moonSign] || moonSign;
    const signSymbol = ZODIAC_SYMBOLS[moonSign] || '';
    const moonPhase = RU_PHASES[dailyData.moon.phase] || dailyData.moon.phase;
    const illum = dailyData.moon.illumination;

    const moonLine = `Луна ${prep} ${signLocative} ${signSymbol} — ${moonPhase}, ${illum}%`;

    const guidance = await generateGuidance(dailyData) || fallbackGuidance;

    // Only add promo CTA on Sundays
    const isSunday = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).getDay() === 0;
    const cta = isSunday
      ? '\n\nКстати, если хотите получать персональный прогноз каждый день → luminastrology.com'
      : '';

    const text = [
      `✦ ${escapeHtml(day)}, ${escapeHtml(weekday)}`,
      '',
      escapeHtml(moonLine),
      '',
      escapeHtml(guidance),
      cta ? escapeHtml(cta) : '',
    ].filter(Boolean).join('\n');

    await sendMessage(channelId, text, { disable_web_page_preview: true });
    return NextResponse.json({ ok: true, channelId });
  } catch (error) {
    console.error('Telegram channel post error:', error);
    return NextResponse.json({ error: 'Failed to post daily channel forecast' }, { status: 500 });
  }
}
