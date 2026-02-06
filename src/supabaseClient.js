import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Check if credentials are properly configured
const isConfigured = supabaseUrl && supabaseKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseKey !== 'your_supabase_anon_key';

if (!isConfigured) {
    console.warn('⚠️ Supabase is not configured. Please update your .env file with valid credentials.');
    console.warn('The app will work with limited functionality (no data persistence).');
}

// Create client with dummy values if not configured (prevents crashes)
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseKey)
    : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const isSupabaseConfigured = isConfigured;
