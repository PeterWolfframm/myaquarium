# Time Tracking Setup Instructions

## Supabase SQL Commands

To add the time tracking functionality to your Supabase database, run the following SQL commands in your Supabase SQL editor:

```sql
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
```

## Features Implemented

### 1. Enhanced Time Tracking
- **Proper Session Management**: The timer now tracks actual elapsed time for each session
- **Automatic Session Saving**: When you switch tabs (moods), the current session is automatically saved to the database
- **Session Persistence**: If you reload the app, any active session continues from where it left off

### 2. Session History Display
- **Recent Sessions List**: Shows the last 5 completed time tracking sessions beneath the timer
- **Session Details**: Each entry displays:
  - Mood icon and name (💼 work, ⏸️ pause, 🍽️ lunch)
  - Start time (HH:MM format)
  - Total duration (e.g., "1h 25m" or "45m")

### 3. Database Features
- **Row Level Security**: Each user can only see their own sessions
- **Automatic Duration Calculation**: Duration is calculated automatically when sessions end
- **Single Active Session**: Only one session can be active at a time per user
- **Efficient Indexing**: Optimized for performance with proper database indexes

### 4. User Experience
- **Seamless Switching**: Click any mood tab to instantly save the current session and start a new one
- **Real-time Updates**: Timer shows live elapsed time for the current session
- **Visual Feedback**: Clean, modern UI that fits with the aquarium theme

## How to Use

1. **Run the SQL commands** in your Supabase SQL editor
2. **Start the app** - it will automatically begin a "work" session
3. **Switch moods** by clicking the Work/Pause/Lunch buttons
4. **View history** in the "Recent Sessions" section below the timer

The app now provides comprehensive time tracking that saves automatically and persists across browser sessions!
