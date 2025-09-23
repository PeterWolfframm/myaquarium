-- Add sprite URL column to fish table
ALTER TABLE fish ADD COLUMN IF NOT EXISTS sprite_url TEXT;

-- Create storage bucket policies for fish-sprites if not exists
-- Note: This needs to be run in Supabase SQL editor as it requires admin permissions

-- Allow authenticated users to read sprites
CREATE POLICY "Users can view fish sprites"
ON storage.objects FOR SELECT
USING (bucket_id = 'fish-sprites');

-- Allow authenticated users to upload sprites
CREATE POLICY "Users can upload fish sprites"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fish-sprites' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploaded sprites  
CREATE POLICY "Users can delete their own sprites"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fish-sprites' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
