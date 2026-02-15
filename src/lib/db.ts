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
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS connection_code TEXT UNIQUE`;

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

  await sql`
    CREATE TABLE IF NOT EXISTS partner_connections (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      partner_user_id TEXT REFERENCES users(id),
      partner_name TEXT NOT NULL,
      partner_birth_date TEXT,
      partner_birth_time TEXT,
      partner_birth_place TEXT,
      partner_birth_latitude DOUBLE PRECISION,
      partner_birth_longitude DOUBLE PRECISION,
      partner_birth_timezone TEXT,
      relationship_type TEXT DEFAULT 'partner',
      is_linked BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_connections_pair
    ON partner_connections(user_id, COALESCE(partner_user_id, partner_name))
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS synastry_results (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      person_a_name TEXT NOT NULL,
      person_b_name TEXT NOT NULL,
      person_a_sun TEXT,
      person_b_sun TEXT,
      overall_score INTEGER,
      result_json JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
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

export async function generateConnectionCode(userId: string): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const createCode = () =>
    `LUNA-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;

  // First return existing code if already present.
  const existing = await sql<{ connection_code: string | null }>`
    SELECT connection_code FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (existing.rows[0]?.connection_code) return existing.rows[0].connection_code;

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const candidate = createCode();
    const collision = await sql`SELECT 1 FROM users WHERE connection_code = ${candidate} LIMIT 1`;
    if (collision.rows.length > 0) continue;

    const updated = await sql<{ connection_code: string | null }>`
      UPDATE users
      SET connection_code = ${candidate}, updated_at = now()
      WHERE id = ${userId}
      RETURNING connection_code
    `;
    if (updated.rows[0]?.connection_code) return updated.rows[0].connection_code;
  }

  throw new Error('Unable to generate a unique connection code');
}

export async function getConnectionCode(userId: string): Promise<string> {
  const result = await sql<{ connection_code: string | null }>`
    SELECT connection_code FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (result.rows[0]?.connection_code) return result.rows[0].connection_code;
  return generateConnectionCode(userId);
}

type ConnectionCodeUser = {
  id: string;
  name: string | null;
  email: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone: string | null;
};

export async function getUserByConnectionCode(code: string): Promise<ConnectionCodeUser | null> {
  const normalizedCode = code.trim().toUpperCase();
  const result = await sql<ConnectionCodeUser>`
    SELECT id, name, email, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone
    FROM users
    WHERE connection_code = ${normalizedCode}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

type SavePartnerData = {
  partner_user_id?: string;
  partner_name: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  birth_latitude?: number;
  birth_longitude?: number;
  birth_timezone?: string;
  relationship_type?: string;
};

export async function savePartnerConnection(userId: string, partnerData: SavePartnerData) {
  const isLinked = Boolean(partnerData.partner_user_id);
  const relationshipType = partnerData.relationship_type || 'partner';
  const partnerName = partnerData.partner_name.trim();

  if (!partnerName) {
    throw new Error('partner_name is required');
  }

  if (partnerData.partner_user_id) {
    const existingLinked = await sql<{ id: number }>`
      SELECT id
      FROM partner_connections
      WHERE user_id = ${userId} AND partner_user_id = ${partnerData.partner_user_id}
      LIMIT 1
    `;

    if (existingLinked.rows.length > 0) {
      const updated = await sql`
        UPDATE partner_connections
        SET
          partner_name = ${partnerName},
          partner_birth_date = COALESCE(${partnerData.birth_date ?? null}, partner_birth_date),
          partner_birth_time = COALESCE(${partnerData.birth_time ?? null}, partner_birth_time),
          partner_birth_place = COALESCE(${partnerData.birth_place ?? null}, partner_birth_place),
          partner_birth_latitude = COALESCE(${partnerData.birth_latitude ?? null}, partner_birth_latitude),
          partner_birth_longitude = COALESCE(${partnerData.birth_longitude ?? null}, partner_birth_longitude),
          partner_birth_timezone = COALESCE(${partnerData.birth_timezone ?? null}, partner_birth_timezone),
          relationship_type = ${relationshipType},
          is_linked = true
        WHERE id = ${existingLinked.rows[0].id}
        RETURNING *
      `;
      return updated.rows[0];
    }
  } else {
    const existingManual = await sql<{ id: number }>`
      SELECT id
      FROM partner_connections
      WHERE user_id = ${userId}
        AND partner_user_id IS NULL
        AND partner_name = ${partnerName}
      LIMIT 1
    `;

    if (existingManual.rows.length > 0) {
      const updated = await sql`
        UPDATE partner_connections
        SET
          partner_birth_date = ${partnerData.birth_date ?? null},
          partner_birth_time = ${partnerData.birth_time ?? null},
          partner_birth_place = ${partnerData.birth_place ?? null},
          partner_birth_latitude = ${partnerData.birth_latitude ?? null},
          partner_birth_longitude = ${partnerData.birth_longitude ?? null},
          partner_birth_timezone = ${partnerData.birth_timezone ?? null},
          relationship_type = ${relationshipType},
          is_linked = false
        WHERE id = ${existingManual.rows[0].id}
        RETURNING *
      `;
      return updated.rows[0];
    }
  }

  const inserted = await sql`
    INSERT INTO partner_connections (
      user_id,
      partner_user_id,
      partner_name,
      partner_birth_date,
      partner_birth_time,
      partner_birth_place,
      partner_birth_latitude,
      partner_birth_longitude,
      partner_birth_timezone,
      relationship_type,
      is_linked
    )
    VALUES (
      ${userId},
      ${partnerData.partner_user_id ?? null},
      ${partnerName},
      ${partnerData.birth_date ?? null},
      ${partnerData.birth_time ?? null},
      ${partnerData.birth_place ?? null},
      ${partnerData.birth_latitude ?? null},
      ${partnerData.birth_longitude ?? null},
      ${partnerData.birth_timezone ?? null},
      ${relationshipType},
      ${isLinked}
    )
    RETURNING *
  `;
  return inserted.rows[0];
}

export async function getPartnerConnections(userId: string) {
  const result = await sql`
    SELECT
      pc.*,
      u.id AS linked_user_id,
      u.name AS linked_user_name,
      u.email AS linked_user_email,
      u.birth_date AS linked_birth_date,
      u.birth_time AS linked_birth_time,
      u.birth_place AS linked_birth_place,
      u.birth_latitude AS linked_birth_latitude,
      u.birth_longitude AS linked_birth_longitude,
      u.birth_timezone AS linked_birth_timezone
    FROM partner_connections pc
    LEFT JOIN users u ON pc.partner_user_id = u.id AND pc.is_linked = true
    WHERE pc.user_id = ${userId}
    ORDER BY pc.created_at DESC
  `;
  return result.rows;
}

export async function deletePartnerConnection(userId: string, connectionId: number) {
  const result = await sql`
    DELETE FROM partner_connections
    WHERE id = ${connectionId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.rows.length > 0;
}

// ─── Synastry Results ───

function generateShortId(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // no ambiguous chars
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function saveSynastryResult(
  userId: string | null,
  personAName: string,
  personBName: string,
  personASun: string,
  personBSun: string,
  overallScore: number,
  resultJson: unknown,
) {
  const id = generateShortId();
  await sql`
    INSERT INTO synastry_results (id, user_id, person_a_name, person_b_name, person_a_sun, person_b_sun, overall_score, result_json)
    VALUES (${id}, ${userId}, ${personAName}, ${personBName}, ${personASun}, ${personBSun}, ${overallScore}, ${JSON.stringify(resultJson)})
  `;
  return id;
}

export async function getSynastryResult(id: string) {
  const result = await sql`
    SELECT * FROM synastry_results WHERE id = ${id}
  `;
  return result.rows[0] || null;
}
