-- Migration to add size field to fish table
-- Run this SQL command in your Supabase SQL editor

-- Add size field to the fish table
ALTER TABLE fish ADD COLUMN IF NOT EXISTS size NUMERIC(4,2) NOT NULL DEFAULT 1.0;

-- Update the comment for the size field
COMMENT ON COLUMN fish.size IS 'Scale factor for fish sprite rendering (0.1 to 3.0)';

-- Create check constraint to ensure size is within reasonable bounds
ALTER TABLE fish ADD CONSTRAINT fish_size_check 
  CHECK (size >= 0.1 AND size <= 3.0);
