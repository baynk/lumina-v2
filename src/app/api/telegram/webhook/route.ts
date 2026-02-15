import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calculateDailyCelestialData, calculateNatalChart } from '@/services/astronomyCalculator';
import type { BirthData } from '@/types';
import { sendMessage } from '@/lib/telegram';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require('@photostructure/tz-lookup');

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
};

type TelegramUserRow = {
  telegram_id: string;
  chat_id: string;
  username: string | null;
  first_name: string | null;
  language: 'ru' | 'en';
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
};

type ParsedBirthData = {
  birthDate: string;
  birthTime: string;
  city: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  timezone: string;
};

const fallbackReading = {
  en: 'Today asks for softness and clarity. Trust your instincts, choose one intention, and let your inner compass lead.',
  ru: 'Сегодня особенно важны мягкость и ясность. Доверься интуиции, выбери одно намерение и двигайся с внутренним ритмом.',
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bilingual(language: 'ru' | 'en', ruText: string, enText: string) {
  if (language === 'ru') {
    return `🇷🇺 ${ruText}\n\n🇬🇧 ${enText}`;
  }
  return `🇬🇧 ${enText}\n\n🇷🇺 ${ruText}`;
}

async function ensureTelegramTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS telegram_users (
      telegram_id BIGINT PRIMARY KEY,
      chat_id BIGINT NOT NULL,
      username TEXT,
      first_name TEXT,
      language TEXT DEFAULT 'ru',
      birth_date TEXT,
      birth_time TEXT,
      birth_place TEXT,
      birth_latitude DOUBLE PRECISION,
      birth_longitude DOUBLE PRECISION,
      birth_timezone TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      daily_enabled BOOLEAN DEFAULT true
    )
  `;
}

async function upsertTelegramUser(params: {
  telegramId: number;
  chatId: number;
  username?: string;
  firstName?: string;
}) {
  await sql`
    INSERT INTO telegram_users (telegram_id, chat_id, username, first_name)
    VALUES (${params.telegramId}, ${params.chatId}, ${params.username || null}, ${params.firstName || null})
    ON CONFLICT (telegram_id)
    DO UPDATE SET
      chat_id = EXCLUDED.chat_id,
      username = COALESCE(EXCLUDED.username, telegram_users.username),
      first_name = COALESCE(EXCLUDED.first_name, telegram_users.first_name)
  `;
}

async function getTelegramUser(telegramId: number): Promise<TelegramUserRow | null> {
  const result = await sql<TelegramUserRow>`
    SELECT telegram_id, chat_id, username, first_name, language,
      birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone
    FROM telegram_users
    WHERE telegram_id = ${telegramId}
    LIMIT 1
  `;

  return result.rows[0] || null;
}

function parseBirthInput(text: string): ParsedBirthData | null {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})\s+(.+)$/);
  if (!match) return null;

  const day = Number(match[1]);
  const monthOneIndexed = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const city = match[6].trim();

  if (!city || day < 1 || day > 31 || monthOneIndexed < 1 || monthOneIndexed > 12) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const date = new Date(Date.UTC(year, monthOneIndexed - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthOneIndexed - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    birthDate: `${year}-${String(monthOneIndexed).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    city,
    year,
    month: monthOneIndexed - 1,
    day,
    hour,
    minute,
  };
}

async function geocodeCity(city: string, language: 'ru' | 'en'): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LuminaAstrologyBot/1.0',
      'Accept-Language': language === 'ru' ? 'ru,en;q=0.7' : 'en,ru;q=0.7',
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!payload[0]) return null;

  const latitude = Number(payload[0].lat);
  const longitude = Number(payload[0].lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  let timezone = 'UTC';
  try {
    timezone = tzlookup(latitude, longitude) || 'UTC';
  } catch {
    timezone = 'UTC';
  }

  return {
    latitude,
    longitude,
    displayName: payload[0].display_name || city,
    timezone,
  };
}

async function generateReading(language: 'ru' | 'en', birthData: BirthData, origin: string) {
  const natalChart = calculateNatalChart(birthData);
  const dailyData = calculateDailyCelestialData();

  try {
    const response = await fetch(`${origin}/api/horoscope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ natalChart, dailyData, language }),
      cache: 'no-store',
    });

    if (!response.ok) return fallbackReading[language];

    const payload = (await response.json()) as { horoscope?: string };
    return payload.horoscope?.trim() || fallbackReading[language];
  } catch {
    return fallbackReading[language];
  }
}

function parseStoredBirthData(user: TelegramUserRow): BirthData | null {
  if (!user.birth_date || !user.birth_time || user.birth_latitude == null || user.birth_longitude == null) {
    return null;
  }

  const dateMatch = user.birth_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = user.birth_time.match(/^(\d{2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return null;

  return {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]) - 1,
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    latitude: Number(user.birth_latitude),
    longitude: Number(user.birth_longitude),
    timezone: user.birth_timezone || 'UTC',
  };
}

function welcomeText(language: 'ru' | 'en') {
  return bilingual(
    language,
    '<b>Добро пожаловать в Lumina ✨</b>\nLumina — это астрология нового поколения: личная карта и ежедневные инсайты по твоим данным.\n\nОтправь данные в формате:\n<i>ДД.ММ.ГГГГ ЧЧ:ММ Город</i>\nПример: <i>24.09.1995 14:30 Moscow</i>',
    '<b>Welcome to Lumina ✨</b>\nLumina is modern astrology: your personal chart and daily insights based on your birth data.\n\nSend birth data in this format:\n<i>DD.MM.YYYY HH:MM City</i>\nExample: <i>24.09.1995 14:30 Moscow</i>'
  );
}

function helpText(language: 'ru' | 'en') {
  return bilingual(
    language,
    '<b>Команды</b>\n/start — начало\n/chart — открыть натальную карту\n/reading — прогноз на сегодня\n/language — EN/RU\n/help — помощь',
    '<b>Commands</b>\n/start — welcome\n/chart — open natal chart\n/reading — today\'s reading\n/language — EN/RU\n/help — help'
  );
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');

  if (!secret || incomingSecret !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    await ensureTelegramTable();

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    if (!message?.chat?.id || !message?.from?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const text = (message.text || '').trim();

    await upsertTelegramUser({ telegramId, chatId, username, firstName });

    let user = await getTelegramUser(telegramId);
    const language: 'ru' | 'en' = user?.language === 'en' ? 'en' : 'ru';

    if (!text) {
      await sendMessage(chatId, helpText(language));
      return NextResponse.json({ ok: true });
    }

    const commandToken = text.split(/\s+/)[0];
    const command = commandToken.startsWith('/') ? commandToken.split('@')[0].toLowerCase() : '';

    if (command === '/start') {
      await sendMessage(chatId, welcomeText(language));
      return NextResponse.json({ ok: true });
    }

    if (command === '/help') {
      await sendMessage(chatId, helpText(language));
      return NextResponse.json({ ok: true });
    }

    if (command === '/chart') {
      const msg = bilingual(
        language,
        '<b>Твоя карта</b>\nОткрой: <a href="https://luminastrology.com/chart">luminastrology.com/chart</a>',
        '<b>Your chart</b>\nOpen: <a href="https://luminastrology.com/chart">luminastrology.com/chart</a>'
      );
      await sendMessage(chatId, msg, { disable_web_page_preview: true });
      return NextResponse.json({ ok: true });
    }

    if (command === '/language') {
      const newLanguage: 'ru' | 'en' = language === 'ru' ? 'en' : 'ru';
      await sql`
        UPDATE telegram_users
        SET language = ${newLanguage}
        WHERE telegram_id = ${telegramId}
      `;

      const msg = bilingual(
        newLanguage,
        '<b>Язык переключен:</b> Русский',
        '<b>Language switched:</b> English'
      );
      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (command === '/reading') {
      user = await getTelegramUser(telegramId);
      const currentLanguage: 'ru' | 'en' = user?.language === 'en' ? 'en' : 'ru';
      const birthData = user ? parseStoredBirthData(user) : null;

      if (!birthData) {
        const msg = bilingual(
          currentLanguage,
          'Сначала пришли данные рождения:\n<i>ДД.ММ.ГГГГ ЧЧ:ММ Город</i>',
          'Please send your birth data first:\n<i>DD.MM.YYYY HH:MM City</i>'
        );
        await sendMessage(chatId, msg);
        return NextResponse.json({ ok: true });
      }

      const origin = new URL(request.url).origin;
      const [ruReading, enReading] = await Promise.all([
        generateReading('ru', birthData, origin),
        generateReading('en', birthData, origin),
      ]);
      const msg = bilingual(
        currentLanguage,
        `<b>Твое послание на сегодня ✨</b>\n${escapeHtml(ruReading)}`,
        `<b>Your reading for today ✨</b>\n${escapeHtml(enReading)}`
      );
      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    const parsed = parseBirthInput(text);
    if (!parsed) {
      const msg = bilingual(
        language,
        'Не удалось распознать формат.\nИспользуй: <i>ДД.ММ.ГГГГ ЧЧ:ММ Город</i>\nПример: <i>24.09.1995 14:30 Moscow</i>',
        'I could not parse that format.\nUse: <i>DD.MM.YYYY HH:MM City</i>\nExample: <i>24.09.1995 14:30 Moscow</i>'
      );
      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    const geo = await geocodeCity(parsed.city, language);
    if (!geo) {
      const msg = bilingual(
        language,
        'Я не смогла найти этот город. Попробуй другой вариант написания.',
        'I could not find that city. Please try another spelling.'
      );
      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    await sql`
      UPDATE telegram_users
      SET
        birth_date = ${parsed.birthDate},
        birth_time = ${parsed.birthTime},
        birth_place = ${geo.displayName},
        birth_latitude = ${geo.latitude},
        birth_longitude = ${geo.longitude},
        birth_timezone = ${geo.timezone}
      WHERE telegram_id = ${telegramId}
    `;

    const successMsg = bilingual(
      language,
      `<b>Данные сохранены ✨</b>\n${escapeHtml(geo.displayName)}\nТеперь отправь /reading, чтобы получить прогноз на сегодня.`,
      `<b>Birth data saved ✨</b>\n${escapeHtml(geo.displayName)}\nNow send /reading to receive your reading for today.`
    );
    await sendMessage(chatId, successMsg);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
