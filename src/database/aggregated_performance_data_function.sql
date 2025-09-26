-- Aggregated Performance Data Function for Chart Data
-- This function aggregates performance data into time buckets for efficient chart rendering

CREATE OR REPLACE FUNCTION get_aggregated_performance_data(
    user_uuid UUID,
    hours_back INTEGER DEFAULT 24,
    interval_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    avg_fps FLOAT,
    max_fps FLOAT,
    min_fps FLOAT,
    avg_fish_count FLOAT,
    max_fish_count INTEGER,
    data_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('hour', pl.logged_at) + 
        (EXTRACT(minute FROM pl.logged_at)::integer / interval_minutes) * 
        (interval_minutes || ' minutes')::interval AS time_bucket,
        
        ROUND(AVG(pl.framerate)::numeric, 1)::FLOAT as avg_fps,
        ROUND(MAX(pl.framerate)::numeric, 1)::FLOAT as max_fps,
        ROUND(MIN(pl.framerate)::numeric, 1)::FLOAT as min_fps,
        ROUND(AVG(pl.fish_count)::numeric, 1)::FLOAT as avg_fish_count,
        MAX(pl.fish_count)::INTEGER as max_fish_count,
        COUNT(*)::INTEGER as data_points
        
    FROM performance_logs pl
    WHERE pl.user_id = user_uuid 
      AND pl.logged_at > NOW() - (hours_back || ' hours')::INTERVAL
    GROUP BY time_bucket
    ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION get_aggregated_performance_data IS 'Aggregates performance logs into time buckets for efficient chart rendering. Groups data by specified minute intervals and returns averaged metrics for each bucket.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_aggregated_performance_data TO authenticated;
