-- Time tracking table for Fish Aquarium project
-- Run this SQL command in your Supabase SQL editor to add time tracking functionality

-- Table for storing time tracking sessions
CREATE TABLE IF NOT EXISTS time_tracking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('work', 'pause', 'lunch')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- Calculated duration in seconds
  is_active BOOLEAN NOT NULL DEFAULT false, -- Only one session can be active at a time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id ON time_tracking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_active ON time_tracking_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_time_tracking_start_time ON time_tracking_sessions(start_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE time_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time_tracking_sessions
CREATE POLICY "Users can view their own time tracking sessions" ON time_tracking_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time tracking sessions" ON time_tracking_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time tracking sessions" ON time_tracking_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time tracking sessions" ON time_tracking_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_time_tracking_sessions_updated_at 
  BEFORE UPDATE ON time_tracking_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate duration when ending a session
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate duration if end_time is being set and start_time exists
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_duration_trigger
  BEFORE UPDATE ON time_tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

-- Function to ensure only one session is active at a time per user
CREATE OR REPLACE FUNCTION ensure_single_active_session()
RETURNS TRIGGER AS $$
BEGIN
  -- If this session is being set to active, deactivate all other sessions for this user
  IF NEW.is_active = true THEN
    UPDATE time_tracking_sessions 
    SET is_active = false, 
        end_time = CASE 
          WHEN end_time IS NULL THEN NOW() 
          ELSE end_time 
        END
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_active_session_trigger
  BEFORE INSERT OR UPDATE ON time_tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION ensure_single_active_session();
