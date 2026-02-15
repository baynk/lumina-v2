import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { initDB, saveSynastryResult, getSynastryResult } from '@/lib/db';

export async function POST(req: NextRequest) {
  await initDB();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const body = await req.json();
  const { personAName, personBName, personASun, personBSun, overallScore, result } = body;

  if (!personAName || !personBName || !result) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = await saveSynastryResult(
    userId,
    personAName,
    personBName,
    personASun || '',
    personBSun || '',
    overallScore || 0,
    result,
  );

  return NextResponse.json({ id, url: `/compatibility/${id}` });
}

export async function GET(req: NextRequest) {
  await initDB();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const row = await getSynastryResult(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    personAName: row.person_a_name,
    personBName: row.person_b_name,
    personASun: row.person_a_sun,
    personBSun: row.person_b_sun,
    overallScore: row.overall_score,
    result: row.result_json,
    createdAt: row.created_at,
  });
}
