import { supabase, TABLES } from '../config/supabase.js';

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
   * @returns {Promise<Array>} Array of placed objects
   */
  async getPlacedObjects() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('placed_objects')
        .select('*')
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
        size: objectData.size || 6
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
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
