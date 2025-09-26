-- Card state table schema
-- Stores comprehensive state for UI cards including visibility, position, and display properties

CREATE TABLE IF NOT EXISTS card_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    
    -- Visibility state
    is_open BOOLEAN NOT NULL DEFAULT true,
    
    -- Position and layout
    position TEXT CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'static')) DEFAULT 'top-left',
    size TEXT CHECK (size IN ('small', 'medium', 'large')) DEFAULT 'medium',
    
    -- Draggable properties
    is_draggable BOOLEAN NOT NULL DEFAULT false,
    draggable_x REAL DEFAULT NULL, -- X coordinate for draggable cards
    draggable_y REAL DEFAULT NULL, -- Y coordinate for draggable cards
    
    -- Display behavior
    hide_when_closed BOOLEAN NOT NULL DEFAULT false,
    collapsible BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure one state record per user per component
    UNIQUE(user_id, component_id)
);

-- Create updated_at trigger
CREATE TRIGGER update_card_state_updated_at
    BEFORE UPDATE ON card_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE card_state ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view own card state" ON card_state
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card state" ON card_state
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card state" ON card_state
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card state" ON card_state
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_card_state_user_component 
    ON card_state(user_id, component_id);

-- Comments for documentation
COMMENT ON TABLE card_state IS 'Stores comprehensive state for UI cards including visibility, position, and display properties';
COMMENT ON COLUMN card_state.component_id IS 'Unique identifier for the component (e.g., stats, settings, fish-editor, objects, timer)';
COMMENT ON COLUMN card_state.is_open IS 'Whether the card is currently open/expanded';
COMMENT ON COLUMN card_state.position IS 'Position for non-draggable cards: top-left, top-right, bottom-left, bottom-right, center, static';
COMMENT ON COLUMN card_state.size IS 'Display size: small, medium, large';
COMMENT ON COLUMN card_state.is_draggable IS 'Whether the card can be dragged around';
COMMENT ON COLUMN card_state.draggable_x IS 'X coordinate for draggable cards (pixels from left edge)';
COMMENT ON COLUMN card_state.draggable_y IS 'Y coordinate for draggable cards (pixels from top edge)';
COMMENT ON COLUMN card_state.hide_when_closed IS 'Whether to hide the card completely when closed';
COMMENT ON COLUMN card_state.collapsible IS 'Whether the card can be collapsed';
