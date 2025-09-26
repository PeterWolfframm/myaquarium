import { supabase, TABLES } from '../config/supabase';
import type { 
  FishData, 
  AquariumObjectData, 
  AquariumSettings, 
  TimerSession, 
  SpriteData, 
  UISettingsData,
  MoodType,
  DatabaseError,
  ViewMode,
  ComponentPreference,
  ComponentPosition,
  CardState,
  Position,
  PerformanceLogData
} from '../types/global';

/**
 * Database service for handling all Supabase operations
 */
class DatabaseService {
  
  // ==================== AQUARIUM SETTINGS ====================
  
  /**
   * Get aquarium settings for the current user
   * @returns {Promise<Object|null>} Aquarium settings or null if not found
   */
  async getAquariumSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.AQUARIUM_SETTINGS)
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching aquarium settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getAquariumSettings:', error);
      return null;
    }
  }

  /**
   * Save aquarium settings for the current user
   * @param {Object} settings - Aquarium settings object
   * @returns {Promise<Object|null>} Saved settings or null if error
   */
  async saveAquariumSettings(settings) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // First try to update existing settings
      const existingSettings = await this.getAquariumSettings();
      
      const settingsData = {
        user_id: user.id,
        tiles_horizontal: settings.tilesHorizontal,
        tiles_vertical: settings.tilesVertical,
        tile_size: settings.tileSize, // Always 64 for fixed tile system
        default_visible_vertical_tiles: settings.defaultVisibleVerticalTiles,
        show_grid: settings.showGrid,
        min_zoom: settings.minZoom,
        max_zoom: settings.maxZoom
      };

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from(TABLES.AQUARIUM_SETTINGS)
          .update(settingsData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Insert new settings
        result = await supabase
          .from(TABLES.AQUARIUM_SETTINGS)
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving aquarium settings:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error in saveAquariumSettings:', error);
      return null;
    }
  }

  // ==================== FISH ====================

  /**
   * Get all fish for the current user
   * @returns {Promise<Array>} Array of fish objects
   */
  async getAllFish() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from(TABLES.FISH)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching fish:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllFish:', error);
      return [];
    }
  }

  /**
   * Save a single fish
   * @param {Object} fishData - Fish data object
   * @returns {Promise<Object|null>} Saved fish or null if error
   */
  async saveFish(fishData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fish = {
        user_id: user.id,
        name: fishData.name || null,
        color: fishData.color,
        sprite_url: fishData.spriteUrl || null,
        base_speed: fishData.baseSpeed,
        current_speed: fishData.currentSpeed,
        direction: fishData.direction,
        position_x: fishData.positionX,
        position_y: fishData.positionY,
        target_y: fishData.targetY,
        vertical_speed: fishData.verticalSpeed,
        drift_interval: fishData.driftInterval,
        animation_speed: fishData.animationSpeed,
        frame_count: fishData.frameCount,
        current_frame: fishData.currentFrame,
        size: fishData.size || 1.0,
        is_active: true
      };

      const { data, error } = await supabase
        .from(TABLES.FISH)
        .insert(fish)
        .select()
        .single();

      if (error) {
        console.error('Error saving fish:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in saveFish:', error);
      return null;
    }
  }

  /**
   * Update fish data
   * @param {string} fishId - Fish ID to update
   * @param {Object} updates - Fish updates object
   * @returns {Promise<Object|null>} Updated fish or null if error
   */
  async updateFish(fishId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.FISH)
        .update(updates)
        .eq('id', fishId)
        .select()
        .single();

      if (error) {
        console.error('Error updating fish:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateFish:', error);
      return null;
    }
  }

  /**
   * Update fish positions (bulk update for performance)
   * @param {Array} fishUpdates - Array of {id, position_x, position_y, target_y, current_frame}
   * @returns {Promise<boolean>} Success status
   */
  async updateFishPositions(fishUpdates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Batch update positions using a transaction-like approach
      const promises = fishUpdates.map(update => 
        supabase
          .from(TABLES.FISH)
          .update({
            position_x: update.position_x,
            position_y: update.position_y,
            target_y: update.target_y,
            current_frame: update.current_frame,
            direction: update.direction
          })
          .eq('id', update.id)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error in updateFishPositions:', error);
      return false;
    }
  }

  /**
   * Delete a fish
   * @param {string} fishId - Fish ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFish(fishId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.FISH)
        .update({ is_active: false })
        .eq('id', fishId);

      if (error) {
        console.error('Error deleting fish:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFish:', error);
      return false;
    }
  }

  /**
   * Clear all fish for the current user
   * @returns {Promise<boolean>} Success status
   */
  async clearAllFish() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.FISH)
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing fish:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearAllFish:', error);
      return false;
    }
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Sign in anonymously (for users who don't want to create accounts)
   * @returns {Promise<Object|null>} User object or null if error
   */
  async signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('Error signing in anonymously:', error);
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('Error in signInAnonymously:', error);
      return null;
    }
  }

  /**
   * Get current user
   * @returns {Promise<Object|null>} Current user or null
   */
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<boolean>} Success status
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in signOut:', error);
      return false;
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<{data: any, error: any}>} Auth response
   */
  async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error signing in with email:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign up with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} username - User's username (optional)
   * @returns {Promise<{data: any, error: any}>} Auth response
   */
  async signUpWithEmail(email: string, password: string, username?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: username ? { username } : undefined,
        },
      });

      if (error) {
        console.error('Error signing up with email:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in signUpWithEmail:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign in with Google OAuth
   * @returns {Promise<{data: any, error: any}>} Auth response
   */
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Error signing in with Google:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return { data: null, error };
    }
  }

  /**
   * Reset password for email
   * @param {string} email - User's email
   * @returns {Promise<{data: any, error: any}>} Reset response
   */
  async resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        console.error('Error resetting password:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { data: null, error };
    }
  }

  /**
   * Listen to authentication state changes
   * @param {Function} callback - Callback function for auth changes
   * @returns {Object} Auth subscription
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // ==================== TIME TRACKING ====================

  /**
   * Start a new time tracking session
   * @param {string} mood - The mood/activity type (work, pause, lunch)
   * @returns {Promise<Object|null>} Created session or null if error
   */
  async startTimeTrackingSession(mood) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const sessionData = {
        user_id: user.id,
        mood: mood,
        start_time: new Date().toISOString(),
        is_active: true
      };

      const { data, error } = await supabase
        .from(TABLES.TIME_TRACKING_SESSIONS)
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Error starting time tracking session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in startTimeTrackingSession:', error);
      return null;
    }
  }

  /**
   * End the current active time tracking session
   * @returns {Promise<Object|null>} Updated session or null if error
   */
  async endCurrentTimeTrackingSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Find the current active session
      const { data: activeSession } = await supabase
        .from(TABLES.TIME_TRACKING_SESSIONS)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!activeSession) return null;

      // End the session
      const { data, error } = await supabase
        .from(TABLES.TIME_TRACKING_SESSIONS)
        .update({
          end_time: new Date().toISOString(),
          is_active: false
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) {
        console.error('Error ending time tracking session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in endCurrentTimeTrackingSession:', error);
      return null;
    }
  }

  /**
   * Get the current active time tracking session
   * @returns {Promise<Object|null>} Active session or null if none
   */
  async getCurrentTimeTrackingSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.TIME_TRACKING_SESSIONS)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching current time tracking session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentTimeTrackingSession:', error);
      return null;
    }
  }

  /**
   * Get recent time tracking sessions (last 5)
   * @returns {Promise<Array>} Array of recent sessions
   */
  async getRecentTimeTrackingSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from(TABLES.TIME_TRACKING_SESSIONS)
        .select('*')
        .eq('user_id', user.id)
        .not('end_time', 'is', null) // Only completed sessions
        .order('start_time', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent time tracking sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentTimeTrackingSessions:', error);
      return [];
    }
  }

  /**
   * Switch to a new mood, ending current session and starting a new one
   * @param {string} newMood - The new mood to switch to
   * @returns {Promise<Object|null>} New session or null if error
   */
  async switchMoodAndSaveSession(newMood) {
    try {
      // End current session if exists
      await this.endCurrentTimeTrackingSession();
      
      // Start new session
      return await this.startTimeTrackingSession(newMood);
    } catch (error) {
      console.error('Error in switchMoodAndSaveSession:', error);
      return null;
    }
  }

  // ==================== SPRITE STORAGE ====================

  /**
   * Upload a sprite file to Supabase storage
   * @param {File} file - The sprite file to upload
   * @param {string} fileName - Custom filename (optional)
   * @returns {Promise<Object|null>} Upload result with URL or null if error
   */
  async uploadSprite(file, fileName = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `sprites/${finalFileName}`;

      const { data, error } = await supabase.storage
        .from('fish-sprites')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading sprite:', error);
        return null;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fish-sprites')
        .getPublicUrl(filePath);

      return {
        path: data.path,
        url: publicUrl,
        fileName: finalFileName
      };
    } catch (error) {
      console.error('Error in uploadSprite:', error);
      return null;
    }
  }

  /**
   * Get all available sprites from storage
   * @returns {Promise<Array>} Array of sprite objects with URLs
   */
  async getAvailableSprites() {
    try {
      const { data, error } = await supabase.storage
        .from('fish-sprites')
        .list('sprites', {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Error fetching sprites:', error);
        return [];
      }

      const sprites = data
        .filter(file => file.name && !file.name.includes('.emptyFolderPlaceholder'))
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('fish-sprites')
            .getPublicUrl(`sprites/${file.name}`);
          
          return {
            name: file.name,
            url: publicUrl,
            path: `sprites/${file.name}`,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at
          };
        });

      return sprites;
    } catch (error) {
      console.error('Error in getAvailableSprites:', error);
      return [];
    }
  }

  /**
   * Upload an object sprite file to Supabase storage
   * @param {File} file - The object sprite file to upload
   * @param {string} fileName - Custom filename (optional)
   * @returns {Promise<Object|null>} Upload result with URL or null if error
   */
  async uploadObjectSprite(file, fileName = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `objects/${finalFileName}`;

      const { data, error } = await supabase.storage
        .from('fish-sprites')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading object sprite:', error);
        return null;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fish-sprites')
        .getPublicUrl(filePath);

      return {
        path: data.path,
        url: publicUrl,
        fileName: finalFileName
      };
    } catch (error) {
      console.error('Error in uploadObjectSprite:', error);
      return null;
    }
  }

  /**
   * Get all available object sprites from storage
   * @returns {Promise<Array>} Array of object sprite objects with URLs
   */
  async getAvailableObjectSprites() {
    try {
      const { data, error } = await supabase.storage
        .from('fish-sprites')
        .list('objects', {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Error fetching object sprites:', error);
        return [];
      }

      const sprites = data
        .filter(file => file.name && !file.name.includes('.emptyFolderPlaceholder'))
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('fish-sprites')
            .getPublicUrl(`objects/${file.name}`);
          
          return {
            name: file.name,
            url: publicUrl,
            path: `objects/${file.name}`,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at
          };
        });

      return sprites;
    } catch (error) {
      console.error('Error in getAvailableObjectSprites:', error);
      return [];
    }
  }

  /**
   * Delete a sprite from storage
   * @param {string} filePath - Path to the file in storage
   * @returns {Promise<boolean>} Success status
   */
  async deleteSprite(filePath) {
    try {
      const { error } = await supabase.storage
        .from('fish-sprites')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting sprite:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSprite:', error);
      return false;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to fish changes
   * @param {Function} callback - Callback function for fish changes
   * @returns {Object} Subscription object
   */
  subscribeFishChanges(callback) {
    const subscription = supabase
      .channel('fish_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.FISH 
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * Subscribe to settings changes
   * @param {Function} callback - Callback function for settings changes
   * @returns {Object} Subscription object
   */
  subscribeSettingsChanges(callback) {
    const subscription = supabase
      .channel('settings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.AQUARIUM_SETTINGS 
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  // ==================== PLACED OBJECTS ====================
  
  /**
   * Get all placed objects for the current user
   * @returns {Promise<Array>} Array of placed objects ordered by layer
   */
  async getPlacedObjects() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('placed_objects')
        .select('*')
        .order('layer', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching placed objects:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPlacedObjects:', error);
      return [];
    }
  }

  /**
   * Save a placed object to the database
   * @param {Object} objectData - Object data to save
   * @param {string} objectData.object_id - Unique object ID
   * @param {string} objectData.sprite_url - URL of the sprite
   * @param {number} objectData.grid_x - Grid X position
   * @param {number} objectData.grid_y - Grid Y position  
   * @param {number} objectData.size - Size in tiles (default: 6)
   * @param {number} objectData.layer - Rendering layer (default: 0)
   * @returns {Promise<Object|null>} Saved object data or null if error
   */
  async savePlacedObject(objectData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const placedObjectData = {
        user_id: user.id,
        object_id: objectData.object_id,
        sprite_url: objectData.sprite_url,
        grid_x: objectData.grid_x,
        grid_y: objectData.grid_y,
        size: objectData.size || 6,
        layer: objectData.layer || 0
      };

      const { data, error } = await supabase
        .from('placed_objects')
        .insert(placedObjectData)
        .select()
        .single();

      if (error) {
        console.error('Error saving placed object:', error);
        return null;
      }

      console.log('Placed object saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in savePlacedObject:', error);
      return null;
    }
  }

  /**
   * Update a placed object in the database
   * @param {string} objectId - Object ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated object data or null if error
   */
  async updatePlacedObject(objectId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('placed_objects')
        .update(updates)
        .eq('object_id', objectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating placed object:', error);
        return null;
      }

      console.log('Placed object updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in updatePlacedObject:', error);
      return null;
    }
  }

  /**
   * Delete a placed object from the database
   * @param {string} objectId - Object ID to delete
   * @returns {Promise<boolean>} True if successful, false if error
   */
  async deletePlacedObject(objectId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('placed_objects')
        .delete()
        .eq('object_id', objectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting placed object:', error);
        return false;
      }

      console.log('Placed object deleted successfully:', objectId);
      return true;
    } catch (error) {
      console.error('Error in deletePlacedObject:', error);
      return false;
    }
  }

  /**
   * Delete all placed objects for the current user
   * @returns {Promise<boolean>} True if successful, false if error
   */
  async deleteAllPlacedObjects() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('placed_objects')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting all placed objects:', error);
        return false;
      }

      console.log('All placed objects deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteAllPlacedObjects:', error);
      return false;
    }
  }

  /**
   * Move an object to the foreground (increase layer by 1)
   * @param {string} objectId - Object ID to move
   * @returns {Promise<Object|null>} Updated object data or null if error
   */
  async moveObjectToForeground(objectId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get current object to know its current layer
      const { data: currentObj, error: fetchError } = await supabase
        .from('placed_objects')
        .select('layer')
        .eq('object_id', objectId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current object layer:', fetchError);
        return null;
      }

      const newLayer = (currentObj.layer || 0) + 1;

      return await this.updatePlacedObject(objectId, { layer: newLayer });
    } catch (error) {
      console.error('Error in moveObjectToForeground:', error);
      return null;
    }
  }

  /**
   * Move an object to the background (decrease layer by 1, minimum 0)
   * @param {string} objectId - Object ID to move
   * @returns {Promise<Object|null>} Updated object data or null if error
   */
  async moveObjectToBackground(objectId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get current object to know its current layer
      const { data: currentObj, error: fetchError } = await supabase
        .from('placed_objects')
        .select('layer')
        .eq('object_id', objectId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current object layer:', fetchError);
        return null;
      }

      const newLayer = Math.max(0, (currentObj.layer || 0) - 1);

      return await this.updatePlacedObject(objectId, { layer: newLayer });
    } catch (error) {
      console.error('Error in moveObjectToBackground:', error);
      return null;
    }
  }

  /**
   * Set specific layer for an object
   * @param {string} objectId - Object ID to update
   * @param {number} layer - New layer value
   * @returns {Promise<Object|null>} Updated object data or null if error
   */
  async setObjectLayer(objectId, layer) {
    try {
      const validLayer = Math.max(0, Math.floor(layer));
      return await this.updatePlacedObject(objectId, { layer: validLayer });
    } catch (error) {
      console.error('Error in setObjectLayer:', error);
      return null;
    }
  }

  // ==================== UI SETTINGS ====================

  /**
   * Get UI settings for the current user
   * @returns {Promise<UISettingsData|null>} UI settings or null if not found
   */
  async getUISettings(): Promise<UISettingsData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.UI_SETTINGS || 'ui_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching UI settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUISettings:', error);
      return null;
    }
  }

  /**
   * Update UI settings for the current user
   * @param {Partial<UISettingsData>} settings - UI settings to update
   * @returns {Promise<UISettingsData|null>} Updated settings or null if error
   */
  async updateUISettings(settings: Partial<UISettingsData>): Promise<UISettingsData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // First try to get existing settings
      const existingSettings = await this.getUISettings();
      
      const settingsData = {
        user_id: user.id,
        brutalist_primary_color: settings.brutalist_primary_color,
        brutalist_secondary_color: settings.brutalist_secondary_color,
        show_brutalist_panel: settings.show_brutalist_panel,
      };

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from(TABLES.UI_SETTINGS || 'ui_settings')
          .update(settingsData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Insert new settings
        result = await supabase
          .from(TABLES.UI_SETTINGS || 'ui_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error updating UI settings:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error in updateUISettings:', error);
      return null;
    }
  }

  // ==================== COMPONENT PREFERENCES ====================

  /**
   * Get component view preference for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<ViewMode|null>} View mode preference or null if not found
   */
  async getComponentViewPreference(componentId: string): Promise<ViewMode | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.COMPONENT_PREFERENCES)
        .select('view_mode')
        .eq('user_id', user.id)
        .eq('component_id', componentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching component preference:', error);
        return null;
      }

      return data?.view_mode || null;
    } catch (error) {
      console.error('Error in getComponentViewPreference:', error);
      return null;
    }
  }

  /**
   * Save component view preference for the current user
   * @param {string} componentId - Component identifier
   * @param {ViewMode} viewMode - View mode preference
   * @returns {Promise<ComponentPreference|null>} Saved preference or null if error
   */
  async saveComponentViewPreference(componentId: string, viewMode: ViewMode): Promise<ComponentPreference | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if preference already exists
      const existingPreference = await this.getComponentViewPreference(componentId);
      
      const preferenceData = {
        user_id: user.id,
        component_id: componentId,
        view_mode: viewMode
      };

      let result;
      if (existingPreference) {
        // Update existing preference
        result = await supabase
          .from(TABLES.COMPONENT_PREFERENCES)
          .update({ view_mode: viewMode })
          .eq('user_id', user.id)
          .eq('component_id', componentId)
          .select()
          .single();
      } else {
        // Insert new preference
        result = await supabase
          .from(TABLES.COMPONENT_PREFERENCES)
          .insert(preferenceData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving component preference:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error in saveComponentViewPreference:', error);
      return null;
    }
  }

  /**
   * Get all component preferences for the current user
   * @returns {Promise<ComponentPreference[]>} Array of component preferences
   */
  async getAllComponentPreferences(): Promise<ComponentPreference[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from(TABLES.COMPONENT_PREFERENCES)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching component preferences:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllComponentPreferences:', error);
      return [];
    }
  }

  /**
   * Delete component preference for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteComponentViewPreference(componentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.COMPONENT_PREFERENCES)
        .delete()
        .eq('user_id', user.id)
        .eq('component_id', componentId);

      if (error) {
        console.error('Error deleting component preference:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteComponentViewPreference:', error);
      return false;
    }
  }

  // ==================== COMPONENT POSITIONS ====================

  /**
   * Get component position for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<Position|null>} Component position or null if not found
   */
  async getComponentPosition(componentId: string): Promise<Position | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.COMPONENT_POSITIONS)
        .select('x, y')
        .eq('user_id', user.id)
        .eq('component_id', componentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching component position:', error);
        return null;
      }

      return data ? { x: data.x, y: data.y } : null;
    } catch (error) {
      console.error('Error in getComponentPosition:', error);
      return null;
    }
  }

  /**
   * Save component position for the current user
   * @param {string} componentId - Component identifier
   * @param {Position} position - Position coordinates
   * @returns {Promise<ComponentPosition|null>} Saved position or null if error
   */
  async saveComponentPosition(componentId: string, position: Position): Promise<ComponentPosition | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if position already exists
      const existingPosition = await this.getComponentPosition(componentId);
      
      const positionData = {
        user_id: user.id,
        component_id: componentId,
        x: position.x,
        y: position.y
      };

      let result;
      if (existingPosition) {
        // Update existing position
        result = await supabase
          .from(TABLES.COMPONENT_POSITIONS)
          .update({ x: position.x, y: position.y })
          .eq('user_id', user.id)
          .eq('component_id', componentId)
          .select()
          .single();
      } else {
        // Insert new position
        result = await supabase
          .from(TABLES.COMPONENT_POSITIONS)
          .insert(positionData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving component position:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error in saveComponentPosition:', error);
      return null;
    }
  }

  /**
   * Get all component positions for the current user
   * @returns {Promise<{[componentId: string]: Position}>} Object with component positions
   */
  async getAllComponentPositions(): Promise<{[componentId: string]: Position}> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from(TABLES.COMPONENT_POSITIONS)
        .select('component_id, x, y')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching component positions:', error);
        return {};
      }

      // Convert array to object with componentId as key
      const positions: {[componentId: string]: Position} = {};
      if (data) {
        data.forEach(item => {
          positions[item.component_id] = { x: item.x, y: item.y };
        });
      }

      return positions;
    } catch (error) {
      console.error('Error in getAllComponentPositions:', error);
      return {};
    }
  }

  /**
   * Delete component position for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteComponentPosition(componentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.COMPONENT_POSITIONS)
        .delete()
        .eq('user_id', user.id)
        .eq('component_id', componentId);

      if (error) {
        console.error('Error deleting component position:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteComponentPosition:', error);
      return false;
    }
  }

  // ==================== CARD STATE ====================

  /**
   * Get card state for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<CardState|null>} Card state or null if not found
   */
  async getCardState(componentId: string): Promise<CardState | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.CARD_STATE)
        .select('*')
        .eq('user_id', user.id)
        .eq('component_id', componentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching card state:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCardState:', error);
      return null;
    }
  }

  /**
   * Save card state for the current user
   * @param {string} componentId - Component identifier
   * @param {Partial<CardState>} cardState - Card state data
   * @returns {Promise<CardState|null>} Saved card state or null if error
   */
  async saveCardState(componentId: string, cardState: Partial<CardState>): Promise<CardState | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if card state already exists
      const existingState = await this.getCardState(componentId);
      
      const stateData = {
        user_id: user.id,
        component_id: componentId,
        is_open: cardState.is_open,
        position: cardState.position,
        size: cardState.size,
        is_draggable: cardState.is_draggable,
        draggable_x: cardState.draggable_x,
        draggable_y: cardState.draggable_y,
        hide_when_closed: cardState.hide_when_closed,
        collapsible: cardState.collapsible
      };

      let result;
      if (existingState) {
        // Update existing state
        result = await supabase
          .from(TABLES.CARD_STATE)
          .update(stateData)
          .eq('user_id', user.id)
          .eq('component_id', componentId)
          .select()
          .single();
      } else {
        // Insert new state
        result = await supabase
          .from(TABLES.CARD_STATE)
          .insert(stateData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving card state:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error in saveCardState:', error);
      return null;
    }
  }

  /**
   * Get all card states for the current user
   * @returns {Promise<{[componentId: string]: CardState}>} Object with card states
   */
  async getAllCardStates(): Promise<{[componentId: string]: CardState}> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from(TABLES.CARD_STATE)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching card states:', error);
        return {};
      }

      // Convert array to object with componentId as key
      const states: {[componentId: string]: CardState} = {};
      if (data) {
        data.forEach(item => {
          states[item.component_id] = item;
        });
      }

      return states;
    } catch (error) {
      console.error('Error in getAllCardStates:', error);
      return {};
    }
  }

  /**
   * Delete card state for the current user
   * @param {string} componentId - Component identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteCardState(componentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.CARD_STATE)
        .delete()
        .eq('user_id', user.id)
        .eq('component_id', componentId);

      if (error) {
        console.error('Error deleting card state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCardState:', error);
      return false;
    }
  }

  // ==================== PERFORMANCE LOGGING ====================

  /**
   * Log performance metrics to the database
   * @param {PerformanceLogData} performanceData - Performance metrics to log
   * @returns {Promise<PerformanceLogData|null>} Logged data or null if error
   */
  async logPerformanceMetrics(performanceData: PerformanceLogData): Promise<PerformanceLogData | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const logData = {
        user_id: user.id,
        framerate: performanceData.framerate,
        objects_on_screen: performanceData.objects_on_screen,
        fish_count: performanceData.fish_count,
        visible_objects: performanceData.visible_objects,
        total_placed_objects: performanceData.total_placed_objects,
        current_zoom: performanceData.current_zoom,
        visible_tiles_horizontal: performanceData.visible_tiles_horizontal,
        visible_tiles_vertical: performanceData.visible_tiles_vertical,
        visible_tiles_total: performanceData.visible_tiles_total,
        viewport_x: performanceData.viewport_x,
        viewport_y: performanceData.viewport_y,
        viewport_percentage_x: performanceData.viewport_percentage_x,
        viewport_percentage_y: performanceData.viewport_percentage_y,
        current_mood: performanceData.current_mood,
        grid_visible: performanceData.grid_visible,
        screen_width: performanceData.screen_width,
        screen_height: performanceData.screen_height,
        device_pixel_ratio: performanceData.device_pixel_ratio,
        memory_used_mb: performanceData.memory_used_mb || null,
        memory_limit_mb: performanceData.memory_limit_mb || null,
        session_duration_ms: performanceData.session_duration_ms,
        logged_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .insert(logData)
        .select()
        .single();

      if (error) {
        console.error('Error logging performance metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in logPerformanceMetrics:', error);
      return null;
    }
  }

  /**
   * Get recent performance logs for the current user
   * @param {number} hours - Number of hours to look back (default: 24)
   * @param {number} limit - Maximum number of logs to return (default: 100)
   * @returns {Promise<PerformanceLogData[]>} Array of performance logs
   */
  async getRecentPerformanceLogs(hours: number = 24, limit: number = 100): Promise<PerformanceLogData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', hoursAgo.toISOString())
        .order('logged_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching performance logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecentPerformanceLogs:', error);
      return [];
    }
  }

  /**
   * Get performance statistics for the current user
   * @param {number} hours - Number of hours to analyze (default: 24)
   * @returns {Promise<Object|null>} Performance statistics or null if error
   */
  async getPerformanceStats(hours: number = 24): Promise<{
    avgFramerate: number;
    minFramerate: number;
    maxFramerate: number;
    avgObjects: number;
    avgFish: number;
    totalLogs: number;
    timeRange: string;
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_user_performance_stats', {
          user_uuid: user.id,
          hours_back: hours
        });

      if (error) {
        console.error('Error fetching performance stats:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in getPerformanceStats:', error);
      return null;
    }
  }

  /**
   * Clean up old performance logs (called automatically by the database function)
   * @returns {Promise<boolean>} Success status
   */
  async cleanupOldPerformanceLogs(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_performance_logs');

      if (error) {
        console.error('Error cleaning up old performance logs:', error);
        return false;
      }

      console.log(`Cleaned up ${data} old performance logs`);
      return true;
    } catch (error) {
      console.error('Error in cleanupOldPerformanceLogs:', error);
      return false;
    }
  }

  /**
   * Delete all performance logs for the current user
   * @returns {Promise<boolean>} Success status
   */
  async deleteAllPerformanceLogs(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting all performance logs:', error);
        return false;
      }

      console.log('All performance logs deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteAllPerformanceLogs:', error);
      return false;
    }
  }

  /**
   * Get the most recent performance log entry for debugging
   * @returns {Promise<Object|null>} Most recent performance log or null
   */
  async getLatestPerformanceLog(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ Database: No authenticated user for performance log query');
        return null;
      }

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Database: No performance logs found for user');
        } else {
          console.error('Error fetching latest performance log:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestPerformanceLog:', error);
      return null;
    }
  }

  /**
   * Create a test performance log for debugging purposes
   * @returns {Promise<boolean>} Success status
   */
  async createTestPerformanceLog(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Database: Cannot create test log - no authenticated user');
        return false;
      }

      const testLog = {
        user_id: user.id,
        framerate: 60.0,
        objects_on_screen: 5,
        fish_count: 3,
        visible_objects: 8,
        total_placed_objects: 12,
        current_zoom: 1.0,
        visible_tiles_horizontal: 20,
        visible_tiles_vertical: 15,
        visible_tiles_total: 300,
        viewport_x: 0,
        viewport_y: 0,
        viewport_percentage_x: 0,
        viewport_percentage_y: 0,
        current_mood: 'test',
        grid_visible: true,
        screen_width: 1920,
        screen_height: 1080,
        device_pixel_ratio: 1.0,
        memory_used_mb: 150.5,
        memory_limit_mb: 4096.0,
        session_duration_ms: 60000,
        logged_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .insert(testLog)
        .select()
        .single();

      if (error) {
        console.error('❌ Database: Error creating test performance log:', error);
        return false;
      }

      console.log('✅ Database: Test performance log created successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Database: Error in createTestPerformanceLog:', error);
      return false;
    }
  }

  /**
   * Get the most recent performance data (last 5 minutes)
   * @returns {Promise<Array>} Array of recent chart data points
   */
  async getRecentChartData(): Promise<Array<{
    timestamp: string;
    time: string;
    fps: number;
    fishCount: number;
  }>> {
    return this.getChartData(5/60, 50); // 5 minutes = 0.083 hours
  }

  /**
   * Get chart data with relative time labels (e.g., "2 min ago", "1 min ago", "now")
   * @param {number} hours - Number of hours to look back
   * @param {number} dataPoints - Maximum number of data points to return
   * @returns {Promise<Array>} Array of chart data points with relative time labels
   */
  async getChartDataWithRelativeTimes(hours: number = 24, dataPoints: number = 50): Promise<Array<{
    timestamp: string;
    time: string;
    relativeTime: string;
    fps: number;
    fishCount: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .select('framerate, fish_count, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', hoursAgo.toISOString())
        .order('logged_at', { ascending: true })
        .limit(dataPoints);

      if (error) {
        console.error('Error fetching chart data with relative times:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Format data for charts with relative time labels
      return data.map(log => {
        const timestamp = new Date(log.logged_at);
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffSeconds = Math.floor((diffMs % 60000) / 1000);

        let relativeTime: string;
        if (diffMinutes === 0) {
          if (diffSeconds <= 5) {
            relativeTime = 'now';
          } else {
            relativeTime = `${diffSeconds}s ago`;
          }
        } else if (diffMinutes === 1) {
          relativeTime = '1 min ago';
        } else {
          relativeTime = `${diffMinutes} min ago`;
        }

        return {
          timestamp: log.logged_at,
          time: timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          relativeTime,
          fps: Math.round(log.framerate || 0),
          fishCount: log.fish_count || 0
        };
      });
    } catch (error) {
      console.error('Error in getChartDataWithRelativeTimes:', error);
      return [];
    }
  }

  /**
   * Get chart data for FPS and fish count over time
   * @param {number} hours - Number of hours to look back (default: 24)
   * @param {number} dataPoints - Maximum number of data points to return (default: 50)
   * @returns {Promise<Array>} Array of chart data points
   */
  async getChartData(hours: number = 24, dataPoints: number = 50): Promise<Array<{
    timestamp: string;
    time: string;
    fps: number;
    fishCount: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      console.log(`🔍 Database: Querying performance logs for user ${user.id}`);
      console.log(`🔍 Database: Looking for data from ${hoursAgo.toISOString()} (${hours} hours ago)`);

      const { data, error } = await supabase
        .from(TABLES.PERFORMANCE_LOGS)
        .select('framerate, fish_count, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', hoursAgo.toISOString())
        .order('logged_at', { ascending: true })
        .limit(dataPoints);

      if (error) {
        console.error('Error fetching chart data:', error);
        return [];
      }

      console.log(`📊 Database: Found ${data?.length || 0} performance log entries`);

      if (!data || data.length === 0) {
        console.warn('⚠️ Database: No performance data found for the specified time range');
        return [];
      }

      // Format data for charts with proper time formatting
      return data.map(log => {
        const timestamp = new Date(log.logged_at);
        return {
          timestamp: log.logged_at,
          time: timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          fps: Math.round(log.framerate || 0),
          fishCount: log.fish_count || 0
        };
      });
    } catch (error) {
      console.error('Error in getChartData:', error);
      return [];
    }
  }

  /**
   * Get aggregated chart data with sampling for larger time ranges
   * @param {number} hours - Number of hours to look back
   * @param {number} interval - Sampling interval in minutes (default: 5)
   * @returns {Promise<Array>} Array of aggregated chart data points
   */
  async getAggregatedChartData(hours: number = 24, interval: number = 5): Promise<Array<{
    timestamp: string;
    time: string;
    avgFps: number;
    maxFps: number;
    minFps: number;
    avgFishCount: number;
    maxFishCount: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      // Use raw SQL to aggregate data by time intervals
      const { data, error } = await supabase
        .rpc('get_aggregated_performance_data', {
          user_uuid: user.id,
          hours_back: hours,
          interval_minutes: interval
        });

      if (error) {
        console.error('Error fetching aggregated chart data:', error);
        // Fallback to regular method if RPC fails
        return this.getChartData(hours, Math.floor(hours * 12)); // Approximate data points
      }

      if (!data || data.length === 0) return [];

      return data.map((item: any) => ({
        timestamp: item.time_bucket,
        time: new Date(item.time_bucket).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        avgFps: Math.round(item.avg_fps || 0),
        maxFps: Math.round(item.max_fps || 0),
        minFps: Math.round(item.min_fps || 0),
        avgFishCount: Math.round(item.avg_fish_count || 0),
        maxFishCount: item.max_fish_count || 0
      }));
    } catch (error) {
      console.error('Error in getAggregatedChartData:', error);
      // Fallback to regular chart data
      return this.getChartData(hours, Math.floor(hours * 12));
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
