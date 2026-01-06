import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite, with fallback to hardcoded values for the demo/MVP
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://psdszomuuztcdcdcsnpk.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_KEY || 'sb_publishable_vnJIq9TY9Fnk7YisH1eHOA_n-Y8czuk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const N8N_WEBHOOK_URL = 'https://bisonteeuropeo.app.n8n.cloud/webhook/new-request';