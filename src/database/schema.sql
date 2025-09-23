-- Database schema for Fish Aquarium project
-- Run these SQL commands in your Supabase SQL editor

-- Table for storing aquarium settings
CREATE TABLE IF NOT EXISTS aquarium_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tiles_horizontal INTEGER NOT NULL DEFAULT 300,
  tiles_vertical INTEGER NOT NULL DEFAULT 64,
  tile_size INTEGER NOT NULL DEFAULT 64,
  size_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (size_mode IN ('fixed', 'adaptive')),
  default_visible_vertical_tiles INTEGER NOT NULL DEFAULT 17,
  target_vertical_tiles INTEGER NOT NULL DEFAULT 20,
  show_grid BOOLEAN NOT NULL DEFAULT true,
  min_zoom NUMERIC(4,2), -- User-defined minimum zoom boundary
  max_zoom NUMERIC(4,2), -- User-defined maximum zoom boundary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing individual fish data
CREATE TABLE IF NOT EXISTS fish (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  color TEXT NOT NULL, -- Store as hex color string
  base_speed NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  current_speed NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  direction INTEGER NOT NULL DEFAULT 1 CHECK (direction IN (-1, 1)),
  position_x NUMERIC(10,2) NOT NULL DEFAULT 0,
  position_y NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_y NUMERIC(10,2) NOT NULL DEFAULT 0,
  vertical_speed NUMERIC(4,2) NOT NULL DEFAULT 0.2,
  drift_interval INTEGER NOT NULL DEFAULT 5000,
  animation_speed INTEGER NOT NULL DEFAULT 150,
  frame_count INTEGER NOT NULL DEFAULT 4,
  current_frame INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aquarium_settings_user_id ON aquarium_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_user_id ON fish(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_active ON fish(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE aquarium_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for aquarium_settings
CREATE POLICY "Users can view their own aquarium settings" ON aquarium_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own aquarium settings" ON aquarium_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aquarium settings" ON aquarium_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aquarium settings" ON aquarium_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for fish
CREATE POLICY "Users can view their own fish" ON fish
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fish" ON fish
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fish" ON fish
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fish" ON fish
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_aquarium_settings_updated_at 
  BEFORE UPDATE ON aquarium_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fish_updated_at 
  BEFORE UPDATE ON fish 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
