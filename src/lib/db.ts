import { sql } from '@vercel/postgres';
import { UserProfile } from '@/types';

// Initialize database tables
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      birth_date TEXT,
      birth_time TEXT,
      birth_place TEXT,
      birth_latitude DOUBLE PRECISION,
      birth_longitude DOUBLE PRECISION,
      birth_timezone TEXT,
      gender TEXT,
      relationship_status TEXT,
      interests TEXT[],
      onboarding_completed BOOLEAN DEFAULT false,
      last_active_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Add columns if they don't exist (safe migration for existing tables)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[]`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now()`;
  // Stripe-ready columns (for future payment integration)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS saved_charts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_time TEXT NOT NULL,
      birth_place TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      timezone TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_saved_charts_user ON saved_charts(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      contact_preference TEXT DEFAULT 'email',
      topics TEXT[],
      question TEXT NOT NULL,
      birth_date TEXT,
      birth_time TEXT,
      birth_place TEXT,
      preferred_format TEXT,
      unsure_birth_time BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'new',
      admin_notes TEXT,
      responded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS contact_preference TEXT DEFAULT 'email'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at DESC)`;
}

// Get or create user profile from NextAuth session
export async function getOrCreateUser(
  id: string,
  email: string,
  name: string | null,
  image: string | null
): Promise<UserProfile> {
  // Try to get existing user
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;

  if (existing.rows.length > 0) {
    // Update name/image if changed
    if (existing.rows[0].name !== name || existing.rows[0].image !== image) {
      await sql`UPDATE users SET name = ${name}, image = ${image}, updated_at = now() WHERE id = ${id}`;
    }
    return existing.rows[0] as unknown as UserProfile;
  }

  // Create new user
  const result = await sql`
    INSERT INTO users (id, email, name, image)
    VALUES (${id}, ${email}, ${name}, ${image})
    RETURNING *
  `;
  return result.rows[0] as unknown as UserProfile;
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return result.rows.length > 0 ? (result.rows[0] as unknown as UserProfile) : null;
}

// Save birth data (onboarding completion)
export async function saveBirthData(
  userId: string,
  data: {
    birth_date: string;
    birth_time: string;
    birth_place: string;
    birth_latitude: number;
    birth_longitude: number;
    birth_timezone: string;
    name?: string;
  }
): Promise<UserProfile> {
  const result = await sql`
    UPDATE users SET
      birth_date = ${data.birth_date},
      birth_time = ${data.birth_time},
      birth_place = ${data.birth_place},
      birth_latitude = ${data.birth_latitude},
      birth_longitude = ${data.birth_longitude},
      birth_timezone = ${data.birth_timezone},
      name = COALESCE(${data.name || null}, name),
      onboarding_completed = true,
      last_active_at = now(),
      updated_at = now()
    WHERE id = ${userId}
    RETURNING *
  `;
  return result.rows[0] as unknown as UserProfile;
}

// Update profile fields (gender, relationship, interests)
export async function updateProfile(
  userId: string,
  data: {
    gender?: string | null;
    relationship_status?: string | null;
    interests?: string[] | null;
    name?: string | null;
  }
): Promise<UserProfile> {
  const result = await sql`
    UPDATE users SET
      gender = COALESCE(${data.gender ?? null}, gender),
      relationship_status = COALESCE(${data.relationship_status ?? null}, relationship_status),
      interests = COALESCE(${data.interests ?? null}, interests),
      name = COALESCE(${data.name ?? null}, name),
      last_active_at = now(),
      updated_at = now()
    WHERE id = ${userId}
    RETURNING *
  `;
  return result.rows[0] as unknown as UserProfile;
}

// Save consultation request
export async function saveConsultation(data: {
  user_id?: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  topics?: string[];
  question: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  preferred_format?: string;
  unsure_birth_time?: boolean;
}) {
  const result = await sql`
    INSERT INTO consultations (user_id, name, contact_email, contact_phone, topics, question, birth_date, birth_time, birth_place, preferred_format, unsure_birth_time)
    VALUES (${data.user_id || null}, ${data.name}, ${data.contact_email || null}, ${data.contact_phone || null}, ${data.topics || null}, ${data.question}, ${data.birth_date || null}, ${data.birth_time || null}, ${data.birth_place || null}, ${data.preferred_format || null}, ${data.unsure_birth_time || false})
    RETURNING *
  `;
  return result.rows[0];
}

// Admin functions
export async function getAllUsers() {
  const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
  return result.rows;
}

export async function getAllConsultations() {
  const result = await sql`
    SELECT c.*, u.email as user_email, u.name as user_name
    FROM consultations c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
  `;
  return result.rows;
}

export async function updateConsultationStatus(id: string, status: string, admin_notes?: string) {
  const result = await sql`
    UPDATE consultations SET
      status = ${status},
      admin_notes = COALESCE(${admin_notes || null}, admin_notes),
      responded_at = CASE WHEN ${status} = 'responded' THEN now() ELSE responded_at END,
      created_at = created_at
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0];
}

export async function getStats() {
  const users = await sql`SELECT COUNT(*) as total, COUNT(CASE WHEN onboarding_completed THEN 1 END) as completed FROM users`;
  const consultations = await sql`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count FROM consultations`;
  const recent = await sql`SELECT COUNT(*) as count FROM users WHERE created_at > now() - interval '7 days'`;
  return {
    totalUsers: Number(users.rows[0].total),
    completedOnboarding: Number(users.rows[0].completed),
    totalConsultations: Number(consultations.rows[0].total),
    newConsultations: Number(consultations.rows[0].new_count),
    signupsLast7Days: Number(recent.rows[0].count),
  };
}
