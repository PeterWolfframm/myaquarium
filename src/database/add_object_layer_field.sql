-- Add layer support to placed objects
-- This migration adds a layer column to control object rendering order
-- Lower layer values render behind higher layer values

-- Add layer column with default value of 0
ALTER TABLE placed_objects 
ADD COLUMN IF NOT EXISTS layer INTEGER NOT NULL DEFAULT 0;

-- Create index for layer-based queries  
CREATE INDEX IF NOT EXISTS idx_placed_objects_layer ON placed_objects(layer);

-- Create index for position and layer combined queries
CREATE INDEX IF NOT EXISTS idx_placed_objects_position_layer ON placed_objects(grid_x, grid_y, layer);

-- Add comment to document the layer system
COMMENT ON COLUMN placed_objects.layer IS 'Rendering layer - lower values render behind higher values. Default: 0';
