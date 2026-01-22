
/**
 * SUPABASE SETUP INSTRUCTIONS
 * 
 * Run the following SQL in your Supabase SQL Editor to setup the database.
 */

export const SETUP_SQL = `
-- 1. Create the requests table
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Linked to Supabase Auth User
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    target_price NUMERIC NOT NULL,
    found_price NUMERIC, 
    source TEXT CHECK (source IN ('email', 'dashboard')) DEFAULT 'dashboard',
    status TEXT CHECK (status IN ('pending', 'action_required', 'approved', 'rejected')) DEFAULT 'pending',
    link TEXT,
    category TEXT -- New column for AI categorization (IT, Stationery, etc.)
);

-- MIGRATION: If table exists, run these to add new columns:
-- ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS category TEXT;
-- ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create the sourcing_options table (One-to-Many)
CREATE TABLE IF NOT EXISTS public.sourcing_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    vendor TEXT NOT NULL,
    product_title TEXT,
    price NUMERIC NOT NULL,
    url TEXT,
    is_selected BOOLEAN DEFAULT FALSE,
    
    -- Google Shopping Data
    image_url TEXT,
    rating NUMERIC,
    rating_count INTEGER,
    product_id TEXT,
    position INTEGER
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_options ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy for Anonymous Access (For MVP Demo purposes)
CREATE POLICY "Enable all access for all users" ON public.requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for options" ON public.sourcing_options FOR ALL USING (true) WITH CHECK (true);

-- 5. Realtime
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.sourcing_options;

-- ==========================================
-- AUTOMATION TRIGGER (NEW)
-- Automatically update request status to 'action_required' when options are found
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_sourcing_option()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.requests
  SET status = 'action_required'
  WHERE id = NEW.request_id
  AND status = 'pending'; -- Only update if it was pending
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_option_created
AFTER INSERT ON public.sourcing_options
FOR EACH ROW EXECUTE FUNCTION public.handle_new_sourcing_option();

-- ==========================================
-- RECEIPT ANALYSIS TABLES (NEW)
-- ==========================================

-- 6. Create receipts table (Master record)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT, -- User note/memo
    merchant_name TEXT,
    total_amount NUMERIC,
    currency TEXT DEFAULT 'EUR',
    receipt_date DATE,
    status TEXT CHECK (status IN ('processing', 'analyzed', 'completed')) DEFAULT 'processing',
    image_url TEXT, -- Path to storage or base64 (if small enough/temp) or just reference
    raw_data JSONB -- Full AI JSON output for debug
);

-- 7. Create receipt_items table (Individual articles)
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price NUMERIC NOT NULL,
    category TEXT
);

-- 8. Add receipt_id to requests table for lineage
-- ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.receipts(id);

-- 9. Enable RLS for new tables
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for receipts" ON public.receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for receipt_items" ON public.receipt_items FOR ALL USING (true) WITH CHECK (true);

-- 10. Realtime for new tables
alter publication supabase_realtime add table public.receipts;
alter publication supabase_realtime add table public.receipt_items;
`;

/**
 * EMAIL INTEGRATION SETUP SQL
 * 
 * Run this in your Supabase SQL Editor to add the email integration features.
 */

export const EMAIL_INTEGRATION_SQL = `
-- 1. Create email_integrations table
CREATE TABLE IF NOT EXISTS public.email_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Linked to Supabase Auth User
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    provider TEXT CHECK (provider IN ('gmail', 'outlook', 'other')) DEFAULT 'other',
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL,
    imap_user TEXT NOT NULL,
    imap_pass_encrypted TEXT NOT NULL, -- Will store encrypted password
    status TEXT CHECK (status IN ('active', 'error', 'disconnected')) DEFAULT 'active',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT
);

-- 2. Enable RLS
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can only see/edit their own integrations
CREATE POLICY "Users can view own integrations" ON public.email_integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON public.email_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.email_integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON public.email_integrations
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Realtime
alter publication supabase_realtime add table public.email_integrations;
`;
