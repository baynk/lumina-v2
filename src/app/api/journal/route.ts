import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateUser, initDB } from '@/lib/db';

type JournalPayload = {
  date?: string;
  moon_phase?: string;
  entries?: {
    intention?: string;
    reflection?: string;
    gratitude?: string;
    release?: string;
  };
};

let dbInitialized = false;

async function ensureDB() {
  if (dbInitialized) return;

  await initDB();
  await sql`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      moon_phase TEXT,
      intention TEXT,
      reflection TEXT,
      gratitude TEXT,
      release_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, entry_date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, entry_date DESC)`;
  dbInitialized = true;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  await getOrCreateUser(userId, session.user.email, session.user.name || null, session.user.image || null);
  return { userId };
}

export async function POST(req: Request) {
  try {
    await ensureDB();
    const auth = await getAuthedUser();
    if ('error' in auth) return auth.error;

    const body = (await req.json()) as JournalPayload;
    const date = normalizeDate(body.date || null);
    if (!date || !body.entries) {
      return NextResponse.json({ error: 'date and entries are required' }, { status: 400 });
    }

    const intention = (body.entries.intention || '').trim();
    const reflection = (body.entries.reflection || '').trim();
    const gratitude = (body.entries.gratitude || '').trim();
    const releaseText = (body.entries.release || '').trim();

    await sql`
      INSERT INTO journal_entries (user_id, entry_date, moon_phase, intention, reflection, gratitude, release_text)
      VALUES (${auth.userId}, ${date}, ${body.moon_phase || null}, ${intention}, ${reflection}, ${gratitude}, ${releaseText || null})
      ON CONFLICT (user_id, entry_date)
      DO UPDATE SET
        moon_phase = EXCLUDED.moon_phase,
        intention = EXCLUDED.intention,
        reflection = EXCLUDED.reflection,
        gratitude = EXCLUDED.gratitude,
        release_text = EXCLUDED.release_text
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/journal error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureDB();
    const auth = await getAuthedUser();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const date = normalizeDate(searchParams.get('date'));

    const result = date
      ? await sql<{
          entry_date: string;
          moon_phase: string | null;
          intention: string | null;
          reflection: string | null;
          gratitude: string | null;
          release_text: string | null;
        }>`
          SELECT entry_date, moon_phase, intention, reflection, gratitude, release_text
          FROM journal_entries
          WHERE user_id = ${auth.userId} AND entry_date = ${date}
          ORDER BY entry_date DESC
        `
      : await sql<{
          entry_date: string;
          moon_phase: string | null;
          intention: string | null;
          reflection: string | null;
          gratitude: string | null;
          release_text: string | null;
        }>`
          SELECT entry_date, moon_phase, intention, reflection, gratitude, release_text
          FROM journal_entries
          WHERE user_id = ${auth.userId}
          ORDER BY entry_date DESC
        `;

    const entries = result.rows.map((row) => ({
      date: row.entry_date,
      moon_phase: row.moon_phase || '',
      entries: {
        intention: row.intention || '',
        reflection: row.reflection || '',
        gratitude: row.gratitude || '',
        release: row.release_text || '',
      },
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/journal error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
