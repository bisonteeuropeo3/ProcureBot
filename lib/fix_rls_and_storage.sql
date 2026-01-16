
-- 1. Policies for Database Tables
-- Run these if you haven't already, or if you get RLS errors when saving data.

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Allow anon users (demo mode) to read/write receipts
CREATE POLICY "Enable all access for receipts" ON public.receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for receipt_items" ON public.receipt_items FOR ALL USING (true) WITH CHECK (true);

-- 2. Policies for Storage Bucket ("receipts")
-- Even if the bucket is "Public", you need a policy to allow Uploads (INSERT) and potentially Deletes.

-- Ensure the bucket exists (if you created it publicly in dashboard, this is fine)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to upload files to "receipts" bucket
CREATE POLICY "Allow Public Uploads to Receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');

-- Policy to allow anyone to view files in "receipts" bucket (Required even for public buckets sometimes if implicit select is blocked)
CREATE POLICY "Allow Public Read Receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Policy to allow updates (if we overwrite files)
CREATE POLICY "Allow Public Updates to Receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts');
