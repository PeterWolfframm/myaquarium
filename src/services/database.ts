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
  Position
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
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
