import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calculateDailyCelestialData, calculateNatalChart } from '@/services/astronomyCalculator';
import type { BirthData } from '@/types';
import { sendMessage } from '@/lib/telegram';

type TelegramDailyUser = {
  telegram_id: string;
  chat_id: string;
  language: 'ru' | 'en' | null;
  birth_date: string;
  birth_time: string;
  birth_latitude: number;
  birth_longitude: number;
  birth_timezone: string | null;
};

const ADMIN_EMAILS = ['ryan@ryanwright.io', 'luminastrology@gmail.com', 'rudasirina773@gmail.com'];
const ADMIN_DOMAINS = ['ryanwright.io'];

const fallbackText = {
  en: 'Today asks for softness and clarity. Trust your instincts, choose one intention, and move with grace.',
  ru: 'Сегодня важны мягкость и ясность. Доверься интуиции, выбери одно намерение и двигайся бережно.',
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

function parseUserBirthData(user: TelegramDailyUser): BirthData | null {
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

async function generateReading(origin: string, language: 'ru' | 'en', birthData: BirthData, dailyData: ReturnType<typeof calculateDailyCelestialData>) {
  const natalChart = calculateNatalChart(birthData);

  try {
    const response = await fetch(`${origin}/api/horoscope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ natalChart, dailyData, language }),
      cache: 'no-store',
    });

    if (!response.ok) return fallbackText[language];

    const data = (await response.json()) as { horoscope?: string };
    return data.horoscope?.trim() || fallbackText[language];
  } catch {
    return fallbackText[language];
  }
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await ensureTelegramTable();

    const usersResult = await sql<TelegramDailyUser>`
      SELECT telegram_id, chat_id, language, birth_date, birth_time, birth_latitude, birth_longitude, birth_timezone
      FROM telegram_users
      WHERE daily_enabled = true
        AND birth_date IS NOT NULL
        AND birth_time IS NOT NULL
        AND birth_latitude IS NOT NULL
        AND birth_longitude IS NOT NULL
    `;

    const users = usersResult.rows;
    if (users.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0 });
    }

    const dailyData = calculateDailyCelestialData();
    const origin = new URL(request.url).origin;

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const birthData = parseUserBirthData(user);
        if (!birthData) {
          failed += 1;
          continue;
        }

        const [ruReading, enReading] = await Promise.all([
          generateReading(origin, 'ru', birthData, dailyData),
          generateReading(origin, 'en', birthData, dailyData),
        ]);

        const preferredLanguage: 'ru' | 'en' = user.language === 'en' ? 'en' : 'ru';
        const text = bilingual(
          preferredLanguage,
          `<b>Твое ежедневное послание ✨</b>\n${escapeHtml(ruReading)}`,
          `<b>Your daily message ✨</b>\n${escapeHtml(enReading)}`
        );

        await sendMessage(Number(user.chat_id), text);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed to send daily reading to telegram user ${user.telegram_id}:`, error);
      }
    }

    return NextResponse.json({ ok: true, sent, failed });
  } catch (error) {
    console.error('Telegram daily sender error:', error);
    return NextResponse.json({ error: 'Failed to send daily readings' }, { status: 500 });
  }
}
