-- Component positions table schema
-- Stores user preferences for component positions (x, y coordinates)

CREATE TABLE IF NOT EXISTS component_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure one position per user per component
    UNIQUE(user_id, component_id)
);

-- Create updated_at trigger
CREATE TRIGGER update_component_positions_updated_at
    BEFORE UPDATE ON component_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE component_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view own component positions" ON component_positions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own component positions" ON component_positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own component positions" ON component_positions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own component positions" ON component_positions
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_component_positions_user_component 
    ON component_positions(user_id, component_id);

-- Comments for documentation
COMMENT ON TABLE component_positions IS 'Stores user preferences for UI component positions';
COMMENT ON COLUMN component_positions.component_id IS 'Unique identifier for the component (e.g., timer, stats, settings, fish-editor, objects, brutalist-panel)';
COMMENT ON COLUMN component_positions.x IS 'X coordinate position in pixels';
COMMENT ON COLUMN component_positions.y IS 'Y coordinate position in pixels';
