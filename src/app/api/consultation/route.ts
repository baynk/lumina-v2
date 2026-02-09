import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join('/tmp', 'lumina-consultations.json');

interface ConsultationRequest {
  name: string;
  contact: string;
  topics: string[];
  question: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  unsureBirthTime?: boolean;
  preferredFormat?: string;
  submittedAt?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConsultationRequest;

    // Basic validation
    if (!body.name?.trim() || !body.contact?.trim() || !body.question?.trim()) {
      return NextResponse.json(
        { error: 'Name, contact, and question are required.' },
        { status: 400 }
      );
    }

    const entry = {
      ...body,
      submittedAt: new Date().toISOString(),
    };

    // Read existing data or start fresh
    let existing: ConsultationRequest[] = [];
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      existing = JSON.parse(raw) as ConsultationRequest[];
    } catch {
      // File doesn't exist yet — that's fine
    }

    existing.push(entry);
    await fs.writeFile(DATA_FILE, JSON.stringify(existing, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process consultation request.' },
      { status: 500 }
    );
  }
}
