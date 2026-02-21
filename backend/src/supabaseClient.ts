import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure env vars are loaded before reading them
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fccnhiqfakuekrmxrkkt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (SUPABASE_KEY && SUPABASE_KEY !== 'PASTE_YOUR_ANON_KEY_HERE') {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase connected to', SUPABASE_URL);
} else {
  console.warn('⚠️  SUPABASE_ANON_KEY not set — running in mock/fallback mode.');
  console.warn('   Get your key from: https://supabase.com/dashboard/project/fccnhiqfakuekrmxrkkt/settings/api');
}

export { supabase };
