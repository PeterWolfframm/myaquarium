-- SQL script to populate the fish table with 30 fish
-- Run this AFTER setting up the main schema and AFTER a user has been created/signed in
-- Note: Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users table

-- First, let's check what user IDs exist (for reference):
-- SELECT id, email, created_at FROM auth.users;

-- Insert 30 fish with different colors and properties
-- The colors are stored as hex strings (without the # prefix)
INSERT INTO fish (user_id, name, color, base_speed, current_speed, direction, position_x, position_y, target_y, vertical_speed, drift_interval, animation_speed, frame_count, current_frame, is_active) VALUES
  -- Replace this UUID with your actual user ID
  (auth.uid(), 'Nemo', '4CAF50', 1.2, 1.2, 1, 150.0, 200.0, 250.0, 0.25, 4500, 120, 4, 0, true),
  (auth.uid(), 'Dory', '2196F3', 0.8, 0.8, -1, 300.0, 150.0, 180.0, 0.15, 6000, 180, 4, 1, true),
  (auth.uid(), 'Marlin', 'FF9800', 1.5, 1.5, 1, 450.0, 300.0, 320.0, 0.3, 3500, 100, 4, 2, true),
  (auth.uid(), 'Bruce', 'E91E63', 0.6, 0.6, -1, 200.0, 400.0, 380.0, 0.2, 5500, 150, 4, 3, true),
  (auth.uid(), 'Gill', '9C27B0', 1.8, 1.8, 1, 500.0, 180.0, 220.0, 0.35, 2800, 90, 4, 0, true),
  
  (auth.uid(), 'Bubbles', '00BCD4', 1.0, 1.0, -1, 350.0, 250.0, 280.0, 0.18, 4200, 140, 4, 1, true),
  (auth.uid(), 'Peach', 'FFC107', 0.9, 0.9, 1, 180.0, 320.0, 300.0, 0.22, 3800, 160, 4, 2, true),
  (auth.uid(), 'Jacques', 'FF5722', 1.3, 1.3, -1, 420.0, 160.0, 200.0, 0.28, 4800, 110, 4, 3, true),
  (auth.uid(), 'Gurgle', '795548', 0.7, 0.7, 1, 280.0, 380.0, 350.0, 0.16, 5200, 170, 4, 0, true),
  (auth.uid(), 'Bloat', '607D8B', 1.1, 1.1, -1, 380.0, 220.0, 260.0, 0.24, 4100, 130, 4, 1, true),
  
  (auth.uid(), 'Anchor', '37474F', 1.4, 1.4, 1, 480.0, 340.0, 320.0, 0.32, 3200, 95, 4, 2, true),
  (auth.uid(), 'Chum', '8BC34A', 0.85, 0.85, -1, 220.0, 180.0, 210.0, 0.19, 4600, 155, 4, 3, true),
  (auth.uid(), 'Squirt', '4FC3F7', 1.6, 1.6, 1, 320.0, 290.0, 270.0, 0.29, 3600, 105, 4, 0, true),
  (auth.uid(), 'Crush', '81C784', 0.95, 0.95, -1, 460.0, 200.0, 240.0, 0.21, 4400, 145, 4, 1, true),
  (auth.uid(), 'Nigel', 'F06292', 1.25, 1.25, 1, 190.0, 360.0, 330.0, 0.26, 3900, 125, 4, 2, true),
  
  (auth.uid(), 'Mr. Ray', 'FFB74D', 0.75, 0.75, -1, 340.0, 170.0, 190.0, 0.17, 5000, 165, 4, 3, true),
  (auth.uid(), 'Sheldon', 'A5D6A7', 1.35, 1.35, 1, 250.0, 310.0, 290.0, 0.27, 3700, 115, 4, 0, true),
  (auth.uid(), 'Pearl', 'F8BBD9', 0.88, 0.88, -1, 410.0, 230.0, 250.0, 0.20, 4300, 135, 4, 1, true),
  (auth.uid(), 'Tad', '90CAF9', 1.7, 1.7, 1, 160.0, 270.0, 300.0, 0.31, 3300, 100, 4, 2, true),
  (auth.uid(), 'Bill', 'FFCC02', 0.92, 0.92, -1, 370.0, 350.0, 320.0, 0.23, 4700, 150, 4, 3, true),
  
  (auth.uid(), 'Ted', 'CE93D8', 1.15, 1.15, 1, 290.0, 190.0, 220.0, 0.25, 4000, 120, 4, 0, true),
  (auth.uid(), 'Bob', 'FFAB91', 0.82, 0.82, -1, 440.0, 280.0, 260.0, 0.18, 4900, 140, 4, 1, true),
  (auth.uid(), 'Coral', 'BCAAA4', 1.45, 1.45, 1, 210.0, 330.0, 310.0, 0.33, 3100, 110, 4, 2, true),
  (auth.uid(), 'Sandy', 'D7CCC8', 0.78, 0.78, -1, 390.0, 210.0, 240.0, 0.16, 5100, 160, 4, 3, true),
  (auth.uid(), 'Flo', '80CBC4', 1.22, 1.22, 1, 270.0, 370.0, 340.0, 0.28, 3800, 125, 4, 0, true),
  
  (auth.uid(), 'Shelly', 'C5E1A5', 0.95, 0.95, -1, 330.0, 160.0, 190.0, 0.22, 4500, 145, 4, 1, true),
  (auth.uid(), 'Finn', '81D4FA', 1.38, 1.38, 1, 180.0, 300.0, 280.0, 0.30, 3400, 105, 4, 2, true),
  (auth.uid(), 'Marina', 'F48FB1', 0.87, 0.87, -1, 420.0, 240.0, 270.0, 0.19, 4800, 155, 4, 3, true),
  (auth.uid(), 'Neptune', '5C6BC0', 1.52, 1.52, 1, 260.0, 320.0, 290.0, 0.34, 3000, 95, 4, 0, true),
  (auth.uid(), 'Aqua', '4DD0E1', 0.91, 0.91, -1, 400.0, 180.0, 210.0, 0.21, 4200, 135, 4, 1, true);

-- Verification query to check the inserted fish
-- SELECT name, color, base_speed, position_x, position_y FROM fish WHERE user_id = auth.uid() ORDER BY name;
