/*
 * Supabase Client — Lumina v2
 *
 * Run this in Supabase SQL Editor:
 *
 * CREATE TABLE consultations (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   contact TEXT NOT NULL,
 *   topics JSONB DEFAULT '[]',
 *   question TEXT NOT NULL,
 *   birth_date TEXT,
 *   birth_time TEXT,
 *   birth_place TEXT,
 *   unsure_birth_time BOOLEAN DEFAULT false,
 *   preferred_format TEXT,
 *   submitted_at TIMESTAMPTZ DEFAULT now()
 * );
 * CREATE INDEX idx_consultations_submitted ON consultations(submitted_at DESC);
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}
