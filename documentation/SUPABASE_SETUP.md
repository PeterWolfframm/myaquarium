# Supabase Setup Guide

## Step 1: Database Schema Setup

1. Go to your Supabase dashboard: https://ggbhxabbllbbamsirwzj.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `src/database/schema.sql` into the SQL editor
4. Run the SQL to create the tables and policies

## Step 2: Enable Authentication (Anonymous Users)

1. In your Supabase dashboard, go to Authentication > Settings
2. Scroll down to "User Management" section
3. **Enable** "Allow new users to sign up" 
4. **Enable** "Enable anonymous sign-ins"
5. Save the settings

## Step 3: Verify Tables Created

After running the SQL schema, you should see these tables in your Database section:
- `aquarium_settings` - Stores user's aquarium configuration
- `fish` - Stores individual fish data with their positions and properties

## Step 4: Test Connection

The application will automatically:
1. Sign in users anonymously on first visit
2. Save fish and settings data to Supabase
3. Load saved data when the user returns

## Tables Structure

### `aquarium_settings`
- Stores all the configuration from the settings panel
- Automatically tied to user via Row Level Security (RLS)
- Includes tiles configuration, size mode, and grid visibility

### `fish`
- Stores individual fish with their visual and behavioral properties
- Each fish has position, speed, color, and animation data
- Supports soft deletion (is_active flag)
- Real-time updates supported

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Anonymous users get a persistent session
- All data is automatically filtered by user_id

## Real-time Features

The database service includes real-time subscriptions for:
- Fish position updates
- Settings changes
- Multi-user aquarium viewing (future feature)

## Migration Notes

- Existing localStorage data will be automatically migrated to Supabase on first load
- Fish positions will be periodically saved to the database
- Settings are saved immediately when changed
