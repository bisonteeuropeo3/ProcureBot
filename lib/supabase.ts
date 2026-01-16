import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite, with fallback to hardcoded values for the demo/MVP
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Key. Please check your .env.local file.");
    throw new Error("Missing Supabase configuration. Check console for details.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);