-- Create storage bucket for page images
-- Note: This requires the storage extension to be enabled
-- The bucket will be created via Supabase Dashboard or API, but we document it here

-- Create bucket policy function if it doesn't exist
CREATE OR REPLACE FUNCTION storage.bucket_exists(bucket_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = bucket_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Buckets are typically created via Supabase Dashboard or Storage API
-- This migration documents the bucket structure and policies

-- Storage policies for page-images bucket
-- These policies assume the bucket 'page-images' exists and is public

-- Policy: Allow authenticated users to upload images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'page-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access to images
CREATE POLICY IF NOT EXISTS "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'page-images');

-- Policy: Allow users to delete their own images
CREATE POLICY IF NOT EXISTS "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'page-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to update their own images
CREATE POLICY IF NOT EXISTS "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'page-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

