-- Database schema for placed objects in the aquarium
-- Run these SQL commands in your Supabase SQL editor after the main schema

-- Table for storing placed objects in the aquarium
CREATE TABLE IF NOT EXISTS placed_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL, -- Unique identifier for the object instance
  sprite_url TEXT NOT NULL, -- URL of the sprite image
  grid_x INTEGER NOT NULL, -- Grid X position (in tiles)
  grid_y INTEGER NOT NULL, -- Grid Y position (in tiles) 
  size INTEGER NOT NULL DEFAULT 6, -- Size of object in tiles (6x6 default)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_placed_objects_user_id ON placed_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_placed_objects_object_id ON placed_objects(object_id);
CREATE INDEX IF NOT EXISTS idx_placed_objects_position ON placed_objects(grid_x, grid_y);

-- RLS (Row Level Security) policies
ALTER TABLE placed_objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own objects
CREATE POLICY "Users can view own placed objects" ON placed_objects
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own objects
CREATE POLICY "Users can insert own placed objects" ON placed_objects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own objects
CREATE POLICY "Users can update own placed objects" ON placed_objects
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own objects
CREATE POLICY "Users can delete own placed objects" ON placed_objects
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_placed_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_placed_objects_updated_at
  BEFORE UPDATE ON placed_objects
  FOR EACH ROW
  EXECUTE FUNCTION update_placed_objects_updated_at();
