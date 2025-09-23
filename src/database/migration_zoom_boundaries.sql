-- Migration to add zoom boundary fields to aquarium_settings table
-- Run this in your Supabase SQL editor

-- Add new columns for user-defined zoom boundaries
ALTER TABLE aquarium_settings 
ADD COLUMN IF NOT EXISTS min_zoom NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS max_zoom NUMERIC(4,2);

-- Add comments to document the new fields
COMMENT ON COLUMN aquarium_settings.min_zoom IS 'User-defined minimum zoom boundary. If null, use calculated minimum.';
COMMENT ON COLUMN aquarium_settings.max_zoom IS 'User-defined maximum zoom boundary. If null, use system maximum.';
