-- Performance Logging Schema for Fish Aquarium
-- Creates a table to track application performance metrics every 5 seconds

-- Create performance_logs table
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic performance metrics
    framerate FLOAT NOT NULL,
    objects_on_screen INTEGER NOT NULL DEFAULT 0,
    fish_count INTEGER NOT NULL DEFAULT 0,
    
    -- Detailed object information
    visible_objects INTEGER NOT NULL DEFAULT 0,
    total_placed_objects INTEGER NOT NULL DEFAULT 0,
    
    -- Viewport and zoom information
    current_zoom FLOAT NOT NULL DEFAULT 1.0,
    visible_tiles_horizontal INTEGER NOT NULL DEFAULT 0,
    visible_tiles_vertical INTEGER NOT NULL DEFAULT 0,
    visible_tiles_total INTEGER NOT NULL DEFAULT 0,
    
    -- Viewport position
    viewport_x FLOAT NOT NULL DEFAULT 0,
    viewport_y FLOAT NOT NULL DEFAULT 0,
    viewport_percentage_x FLOAT NOT NULL DEFAULT 0,
    viewport_percentage_y FLOAT NOT NULL DEFAULT 0,
    
    -- Performance context
    current_mood TEXT NOT NULL DEFAULT 'work',
    grid_visible BOOLEAN NOT NULL DEFAULT true,
    
    -- Browser and device information
    screen_width INTEGER NOT NULL DEFAULT 0,
    screen_height INTEGER NOT NULL DEFAULT 0,
    device_pixel_ratio FLOAT NOT NULL DEFAULT 1.0,
    
    -- Memory usage (if available)
    memory_used_mb FLOAT,
    memory_limit_mb FLOAT,
    
    -- Timing information
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    session_duration_ms BIGINT NOT NULL DEFAULT 0,
    
    -- Constraints
    CONSTRAINT framerate_valid CHECK (framerate >= 0 AND framerate <= 240),
    CONSTRAINT zoom_valid CHECK (current_zoom > 0),
    CONSTRAINT objects_valid CHECK (objects_on_screen >= 0 AND fish_count >= 0),
    CONSTRAINT viewport_percentage_valid CHECK (
        viewport_percentage_x >= 0 AND viewport_percentage_x <= 100 AND
        viewport_percentage_y >= 0 AND viewport_percentage_y <= 100
    )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_logged_at ON performance_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_time ON performance_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_performance_logs_framerate ON performance_logs(framerate);

-- Add RLS (Row Level Security) policy
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own performance logs
CREATE POLICY "Users can insert their own performance logs" ON performance_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to read their own performance logs
CREATE POLICY "Users can read their own performance logs" ON performance_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to delete their own old performance logs (for cleanup)
CREATE POLICY "Users can delete their own performance logs" ON performance_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically clean up old performance logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_logs 
    WHERE logged_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get performance stats for a user
CREATE OR REPLACE FUNCTION get_user_performance_stats(user_uuid UUID, hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    avg_framerate FLOAT,
    min_framerate FLOAT,
    max_framerate FLOAT,
    avg_objects INTEGER,
    avg_fish INTEGER,
    total_logs INTEGER,
    time_range INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(pl.framerate)::numeric, 2)::FLOAT as avg_framerate,
        ROUND(MIN(pl.framerate)::numeric, 2)::FLOAT as min_framerate,
        ROUND(MAX(pl.framerate)::numeric, 2)::FLOAT as max_framerate,
        ROUND(AVG(pl.objects_on_screen))::INTEGER as avg_objects,
        ROUND(AVG(pl.fish_count))::INTEGER as avg_fish,
        COUNT(*)::INTEGER as total_logs,
        (NOW() - MIN(pl.logged_at))::INTERVAL as time_range
    FROM performance_logs pl
    WHERE pl.user_id = user_uuid 
      AND pl.logged_at > NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the table
COMMENT ON TABLE performance_logs IS 'Stores performance metrics logged every 5 seconds during user sessions. Includes FPS, object counts, viewport info, and system metrics for performance monitoring and optimization.';
