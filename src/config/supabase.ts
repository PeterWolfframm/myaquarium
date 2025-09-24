import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ggbhxabbllbbamsirwzj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnYmh4YWJibGxiYmFtc2lyd3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTU2NzksImV4cCI6MjA3Mzg3MTY3OX0.sUKjt3yZTU8p9EncC8k-Gfmts2PtnUkfo_ses5y6xaY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  AQUARIUM_SETTINGS: 'aquarium_settings',
  FISH: 'fish',
  TIME_TRACKING_SESSIONS: 'time_tracking_sessions',
  UI_SETTINGS: 'ui_settings',
  COMPONENT_PREFERENCES: 'component_preferences',
  COMPONENT_POSITIONS: 'component_positions'
};
