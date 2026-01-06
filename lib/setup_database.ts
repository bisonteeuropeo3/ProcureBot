
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
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    target_price NUMERIC NOT NULL,
    found_price NUMERIC, 
    source TEXT CHECK (source IN ('email', 'dashboard')) DEFAULT 'dashboard',
    status TEXT CHECK (status IN ('pending', 'action_required', 'approved', 'rejected')) DEFAULT 'pending',
    link TEXT,
    category TEXT -- New column for AI categorization (IT, Stationery, etc.)
);

-- MIGRATION: If table exists, run this to add the column:
-- ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS category TEXT;

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
`;
