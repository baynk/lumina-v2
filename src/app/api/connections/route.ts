import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  deletePartnerConnection,
  getConnectionCode,
  getOrCreateUser,
  getPartnerConnections,
  getUserByConnectionCode,
  initDB,
  savePartnerConnection,
} from '@/lib/db';

let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
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

export async function GET() {
  try {
    await ensureDB();
    const auth = await getAuthedUser();
    if ('error' in auth) return auth.error;

    const connections = await getPartnerConnections(auth.userId);
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('GET /api/connections error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDB();
    const auth = await getAuthedUser();
    if ('error' in auth) return auth.error;

    const body = (await req.json()) as {
      action?: string;
      code?: string;
      partnerData?: {
        partner_user_id?: string;
        partner_name?: string;
        birth_date?: string;
        birth_time?: string;
        birth_place?: string;
        birth_latitude?: number;
        birth_longitude?: number;
        birth_timezone?: string;
        relationship_type?: string;
      };
    };

    if (body.action === 'get-code') {
      const code = await getConnectionCode(auth.userId);
      return NextResponse.json({ code });
    }

    if (body.action === 'connect-code') {
      const rawCode = body.code?.trim();
      if (!rawCode) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 });
      }

      const partnerUser = await getUserByConnectionCode(rawCode);
      if (!partnerUser) {
        return NextResponse.json({ error: 'Connection code not found' }, { status: 404 });
      }

      if (partnerUser.id === auth.userId) {
        return NextResponse.json({ error: 'You cannot connect to yourself' }, { status: 400 });
      }

      const saved = await savePartnerConnection(auth.userId, {
        partner_user_id: partnerUser.id,
        partner_name: partnerUser.name || partnerUser.email,
        birth_date: partnerUser.birth_date || undefined,
        birth_time: partnerUser.birth_time || undefined,
        birth_place: partnerUser.birth_place || undefined,
        birth_latitude: partnerUser.birth_latitude ?? undefined,
        birth_longitude: partnerUser.birth_longitude ?? undefined,
        birth_timezone: partnerUser.birth_timezone || undefined,
        relationship_type: 'partner',
      });

      return NextResponse.json({ connection: saved, linkedUser: partnerUser });
    }

    if (body.action === 'save-partner') {
      if (!body.partnerData?.partner_name?.trim()) {
        return NextResponse.json({ error: 'partner_name is required' }, { status: 400 });
      }

      const saved = await savePartnerConnection(auth.userId, {
        partner_user_id: body.partnerData.partner_user_id,
        partner_name: body.partnerData.partner_name,
        birth_date: body.partnerData.birth_date,
        birth_time: body.partnerData.birth_time,
        birth_place: body.partnerData.birth_place,
        birth_latitude: body.partnerData.birth_latitude,
        birth_longitude: body.partnerData.birth_longitude,
        birth_timezone: body.partnerData.birth_timezone,
        relationship_type: body.partnerData.relationship_type,
      });

      return NextResponse.json({ connection: saved });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/connections error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureDB();
    const auth = await getAuthedUser();
    if ('error' in auth) return auth.error;

    const body = (await req.json()) as { connectionId?: number };
    if (!body.connectionId || Number.isNaN(Number(body.connectionId))) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    const deleted = await deletePartnerConnection(auth.userId, Number(body.connectionId));
    if (!deleted) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/connections error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
