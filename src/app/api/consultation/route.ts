import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { saveConsultation, initDB } from '@/lib/db';

let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

interface ConsultationRequest {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  contact_preference?: 'email' | 'phone' | 'either';
  topics: string[];
  question: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  unsureBirthTime?: boolean;
  preferredFormat?: string;
}

async function sendTelegramNotification(entry: ConsultationRequest & { submittedAt: string; userId?: string }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '8210649816';

  if (!botToken) {
    console.warn('[Lumina] TELEGRAM_BOT_TOKEN not set — skipping notification');
    return;
  }

  const topicsStr = entry.topics?.length ? entry.topics.join(', ') : '—';
  const contactStr = [
    entry.contact_email ? `📧 ${entry.contact_email}` : null,
    entry.contact_phone ? `📱 ${entry.contact_phone}` : null,
    entry.contact_preference ? `Prefers: ${entry.contact_preference}` : null,
  ].filter(Boolean).join('\n');

  const birthInfo = [
    entry.birthDate ? `📅 ${entry.birthDate}` : null,
    entry.birthTime ? `🕐 ${entry.birthTime}` : entry.unsureBirthTime ? '🕐 Unsure' : null,
    entry.birthPlace ? `📍 ${entry.birthPlace}` : null,
  ].filter(Boolean).join('\n');

  const formatStr = entry.preferredFormat || '—';

  const message = `✨ *New Lumina Consultation Request*

👤 *Name:* ${escapeMarkdown(entry.name)}
📬 *Contact:*
${escapeMarkdown(contactStr || '—')}
🏷️ *Topics:* ${escapeMarkdown(topicsStr)}
📝 *Format:* ${escapeMarkdown(formatStr)}

💬 *Question:*
${escapeMarkdown(entry.question)}

${birthInfo ? `🌟 *Birth Details:*\n${escapeMarkdown(birthInfo)}` : ''}

${entry.userId ? `🔗 Registered user` : `👻 Guest`}
🕰️ _${entry.submittedAt}_`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[Lumina] Telegram notification failed:', res.status, errBody);
    }
  } catch (err) {
    console.error('[Lumina] Telegram notification error:', err);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConsultationRequest;

    // Basic validation
    if (!body.name?.trim() || !body.question?.trim()) {
      return NextResponse.json(
        { error: 'Name and question are required.' },
        { status: 400 }
      );
    }

    if (!body.contact_email?.trim() && !body.contact_phone?.trim()) {
      return NextResponse.json(
        { error: 'Please provide at least an email or phone number.' },
        { status: 400 }
      );
    }

    await ensureDB();

    // Check if user is authenticated
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        userId = (session.user as Record<string, unknown>).id as string;
      }
    } catch {
      // Not authenticated — that's fine
    }

    const submittedAt = new Date().toISOString();

    // Save to Postgres
    await saveConsultation({
      user_id: userId,
      name: body.name.trim(),
      contact_email: body.contact_email?.trim() || undefined,
      contact_phone: body.contact_phone?.trim() || undefined,
      topics: body.topics || [],
      question: body.question.trim(),
      birth_date: body.birthDate?.trim() || undefined,
      birth_time: body.unsureBirthTime ? undefined : body.birthTime?.trim() || undefined,
      birth_place: body.birthPlace?.trim() || undefined,
      preferred_format: body.preferredFormat || undefined,
      unsure_birth_time: body.unsureBirthTime,
    });

    // Send Telegram notification
    await sendTelegramNotification({ ...body, submittedAt, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Lumina] Consultation error:', error);
    return NextResponse.json(
      { error: 'Failed to process consultation request.' },
      { status: 500 }
    );
  }
}
