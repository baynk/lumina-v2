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
    // Primary: Gemini 3.1 Pro, fallback: Gemini 3 Pro
    const primaryModel = client.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
    const fallback1 = client.getGenerativeModel({ model: 'gemini-3-pro-preview' });
    const fallback2 = client.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const now = new Date();
    const moscowDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', weekday: 'long', day: 'numeric', month: 'long',
    }).format(now);

    const moonSign = RU_SIGNS_NOM[dailyData.moon.sign] || dailyData.moon.sign;
    const moonPhase = RU_PHASES[dailyData.moon.phase] || dailyData.moon.phase;
    const prep = moonPreposition(dailyData.moon.sign);

    const aspectsList = dailyData.aspects.slice(0, 4).map(formatAspectNatural).join(', ');

    const prompt = `Ты пишешь ежедневный пост для Telegram-канала об астрологии. Канал ведёт профессиональный астролог Ирина. Пост от лица Ирины для подписчиков.

СТИЛЬ: Тёплый, спокойный, уверенный. Как знающая подруга, которая утром объясняет, что сегодня происходит на небе и как это почувствовать. Обращение на "вы" (уважительно-тепло). Без театральности, без излишних метафор. Простой, понятный русский язык. Не пытайся быть смешной или креативной. Будь полезной.

Вот пример тона и стиля от другого астролога (НЕ копируй, просто почувствуй интонацию):
"День перед полнолунием и лунным затмением. Атмосфера уже накаляется. Помимо этого Луна сегодня в ссоре с Марсом, что делает эмоциональные реакции импульсивнее, а состояние более взвинченным. Так что стараемся провести понедельник спокойно, без эксцессов и кардинальных решений."
Обрати внимание: короткие предложения, практичность, прямота, без пафоса. Мы хотим похожую энергию, но свой голос.

ФОРМАТ: 2-3 абзаца, 130-170 слов. Без заголовков, без списков, без эмодзи (кроме ✦ в конце). Без клише типа "вселенная посылает сигналы". Без дисклеймеров.

КАК ОБЪЯСНЯТЬ: Простым языком. Короткие предложения. Практические советы: что делать, чего избегать. Без академических определений. Если упоминаешь аспект, сразу скажи, как он ощущается в жизни.

СИНТЕЗ: В конце сведи всё в ясную картину дня. 1-2 предложения: "Какой это день в целом?" Читатель должен понять общее настроение.

ЗАПРЕЩЕНО:
- Театральные метафоры
- Излишняя персонификация планет
- Фамильярный тон ("как спалось?")
- Пафос и "красивость" ради красивости
- Тире (—) не больше одного на весь текст

Русский язык: "во Льве" (но "в Рыбах", не "во Рыбах"). "Во" только перед "Льве". Перед остальными знаками "в".

ДАННЫЕ НА СЕГОДНЯ (${moscowDate}):
- Луна: ${moonPhase} ${prep} ${moonSign} (${dailyData.moon.illumination}% освещённости)
- Основные аспекты: ${aspectsList || 'без ярких мажорных аспектов'}
- Транзитные данные: ${JSON.stringify(dailyData.planets?.slice(0, 5))}

Напиши пост. Начни сразу с содержания (дату и заголовок я добавлю сам). Заверши символом ✦`;

    let text = '';
    try {
      const result = await primaryModel.generateContent(prompt);
      text = result.response.text().trim();
    } catch {
      try {
        const result = await fallback1.generateContent(prompt);
        text = result.response.text().trim();
      } catch {
        const result = await fallback2.generateContent(prompt);
        text = result.response.text().trim();
      }
    }

    // Programmatic cleanup: remove AI patterns the model keeps sneaking in
    const aiPatterns: [RegExp, string][] = [
      [/При этом /gi, ''],
      [/Однако /gi, ''],
      [/Кстати,? /gi, ''],
      [/Кроме того,? /gi, ''],
      [/Более того,? /gi, ''],
      [/Стоит отметить,? /gi, ''],
      [/В общем,? /gi, ''],
      [/—/g, ','],
      [/–/g, ','],
      [/\s{2,}/g, ' '],
    ];
    for (const [pattern, replacement] of aiPatterns) {
      text = text.replace(pattern, replacement);
    }
    // Clean up any sentences that now start with lowercase after removal
    text = text.replace(/\.\s+([а-яё])/g, (_, c) => `. ${c.toUpperCase()}`);
    // Remove double spaces and trim
    text = text.replace(/\s{2,}/g, ' ').trim();

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
