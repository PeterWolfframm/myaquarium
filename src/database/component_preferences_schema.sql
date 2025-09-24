-- Component preferences table schema
-- Stores user preferences for component view modes (sticky vs fullscreen)

CREATE TABLE IF NOT EXISTS component_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    view_mode TEXT NOT NULL CHECK (view_mode IN ('sticky', 'fullscreen')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure one preference per user per component
    UNIQUE(user_id, component_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_component_preferences_updated_at
    BEFORE UPDATE ON component_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE component_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view own component preferences" ON component_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own component preferences" ON component_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own component preferences" ON component_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own component preferences" ON component_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_component_preferences_user_component 
    ON component_preferences(user_id, component_id);

-- Comments for documentation
COMMENT ON TABLE component_preferences IS 'Stores user preferences for UI component view modes';
COMMENT ON COLUMN component_preferences.component_id IS 'Unique identifier for the component (e.g., timer, stats, settings, fish-editor, objects)';
COMMENT ON COLUMN component_preferences.view_mode IS 'View mode preference: sticky (small draggable panel) or fullscreen (modal overlay)';
