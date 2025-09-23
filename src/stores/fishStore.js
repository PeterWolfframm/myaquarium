import { create } from 'zustand';
import { databaseService } from '../services/database.js';
import { COLORS } from '../constants/index.js';

/**
 * Zustand store for fish data management with Supabase integration
 */
export const useFishStore = create((set, get) => ({
  // Fish data state
  fish: [],
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  subscription: null,
  needsDefaultPopulation: false,

  // ==================== INITIALIZATION ====================

  /**
   * Initialize fish store by loading from Supabase
   */
  initializeFromDatabase: async () => {
    set({ isLoading: true, syncError: null });
    
    try {
      // Ensure user is authenticated
      let user = await databaseService.getCurrentUser();
      if (!user) {
        user = await databaseService.signInAnonymously();
        if (!user) {
          throw new Error('Failed to authenticate user');
        }
      }

      // Load fish from database
      const fishData = await databaseService.getAllFish();
      
      set({ 
        fish: fishData || [],
        isLoading: false,
        lastSyncTime: new Date(),
        needsDefaultPopulation: !fishData || fishData.length === 0 // Flag if defaults needed
      });

      // Set up real-time subscription
      get().setupRealtimeSubscription();
      
    } catch (error) {
      console.error('Error initializing fish from database:', error);
      set({ 
        isLoading: false, 
        syncError: error.message,
        needsDefaultPopulation: true // Assume we need defaults on error
      });
    }
  },

  /**
   * Set up real-time subscription for fish changes
   */
  setupRealtimeSubscription: () => {
    const state = get();
    
    // Clean up existing subscription
    if (state.subscription) {
      state.subscription.unsubscribe();
    }
    
    const subscription = databaseService.subscribeFishChanges((payload) => {
      console.log('Fish change received:', payload);
      
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const currentFish = get().fish;
      
      switch (eventType) {
        case 'INSERT':
          if (newRecord && !currentFish.find(f => f.id === newRecord.id)) {
            set({ fish: [...currentFish, newRecord] });
          }
          break;
          
        case 'UPDATE':
          if (newRecord) {
            const updatedFish = currentFish.map(fish => 
              fish.id === newRecord.id ? newRecord : fish
            );
            set({ fish: updatedFish });
          }
          break;
          
        case 'DELETE':
          if (oldRecord) {
            const filteredFish = currentFish.filter(fish => fish.id !== oldRecord.id);
            set({ fish: filteredFish });
          }
          break;
      }
    });
    
    set({ subscription });
  },

  // ==================== FISH CRUD OPERATIONS ====================

  /**
   * Add a new fish to the database
   * @param {Object} fishData - Fish properties
   * @returns {Promise<Object|null>} Created fish or null if error
   */
  addFish: async (fishData) => {
    set({ isSyncing: true, syncError: null });
    
    try {
      const savedFish = await databaseService.saveFish(fishData);
      
      if (savedFish) {
        // Fish will be added via real-time subscription
        set({ 
          isSyncing: false,
          lastSyncTime: new Date()
        });
        return savedFish;
      } else {
        throw new Error('Failed to save fish to database');
      }
    } catch (error) {
      console.error('Error adding fish:', error);
      set({ 
        isSyncing: false, 
        syncError: error.message 
      });
      return null;
    }
  },

  /**
   * Update fish data in the database
   * @param {string} fishId - Fish ID to update
   * @param {Object} updates - Fish updates
   * @returns {Promise<boolean>} Success status
   */
  updateFish: async (fishId, updates) => {
    try {
      const updatedFish = await databaseService.updateFish(fishId, updates);
      
      if (updatedFish) {
        // Fish will be updated via real-time subscription
        return true;
      } else {
        throw new Error('Failed to update fish in database');
      }
    } catch (error) {
      console.error('Error updating fish:', error);
      set({ syncError: error.message });
      return false;
    }
  },

  /**
   * Bulk update fish positions (for performance)
   * @param {Array} fishUpdates - Array of fish position updates
   * @returns {Promise<boolean>} Success status
   */
  updateFishPositions: async (fishUpdates) => {
    try {
      return await databaseService.updateFishPositions(fishUpdates);
    } catch (error) {
      console.error('Error updating fish positions:', error);
      return false;
    }
  },

  /**
   * Remove a fish from the database
   * @param {string} fishId - Fish ID to remove
   * @returns {Promise<boolean>} Success status
   */
  removeFish: async (fishId) => {
    set({ isSyncing: true, syncError: null });
    
    try {
      const success = await databaseService.deleteFish(fishId);
      
      if (success) {
        // Fish will be removed via real-time subscription
        set({ 
          isSyncing: false,
          lastSyncTime: new Date()
        });
        return true;
      } else {
        throw new Error('Failed to delete fish from database');
      }
    } catch (error) {
      console.error('Error removing fish:', error);
      set({ 
        isSyncing: false, 
        syncError: error.message 
      });
      return false;
    }
  },

  /**
   * Clear all fish from the database
   * @returns {Promise<boolean>} Success status
   */
  clearAllFish: async () => {
    set({ isSyncing: true, syncError: null });
    
    try {
      const success = await databaseService.clearAllFish();
      
      if (success) {
        set({ 
          fish: [],
          isSyncing: false,
          lastSyncTime: new Date()
        });
        return true;
      } else {
        throw new Error('Failed to clear fish from database');
      }
    } catch (error) {
      console.error('Error clearing fish:', error);
      set({ 
        isSyncing: false, 
        syncError: error.message 
      });
      return false;
    }
  },

  // ==================== FISH GENERATION ====================

  /**
   * Generate fish data for saving to database
   * @param {Object} fishInstance - Fish class instance
   * @returns {Object} Fish data for database
   */
  createFishData: (fishInstance) => {
    return {
      name: `Fish_${Date.now()}`,
      color: fishInstance.color.toString(16).padStart(6, '0'), // Convert to hex string
      spriteUrl: fishInstance.spriteUrl,
      baseSpeed: fishInstance.baseSpeed,
      currentSpeed: fishInstance.currentSpeed,
      direction: fishInstance.direction,
      positionX: fishInstance.sprite.x,
      positionY: fishInstance.sprite.y,
      targetY: fishInstance.targetY,
      verticalSpeed: fishInstance.verticalSpeed,
      driftInterval: Math.round(fishInstance.driftInterval),
      animationSpeed: Math.round(fishInstance.animationSpeed),
      frameCount: Math.round(fishInstance.frameCount),
      currentFrame: Math.round(fishInstance.currentFrame)
    };
  },

  /**
   * Convert database fish data to runtime format
   * @param {Object} dbFish - Fish data from database
   * @returns {Object} Fish data for runtime use
   */
  convertDbFishToRuntime: (dbFish) => {
    return {
      id: dbFish.id,
      name: dbFish.name,
      color: parseInt(dbFish.color, 16), // Convert hex string to number
      spriteUrl: dbFish.sprite_url,
      baseSpeed: parseFloat(dbFish.base_speed),
      currentSpeed: parseFloat(dbFish.current_speed),
      direction: dbFish.direction,
      positionX: parseFloat(dbFish.position_x),
      positionY: parseFloat(dbFish.position_y),
      targetY: parseFloat(dbFish.target_y),
      verticalSpeed: parseFloat(dbFish.vertical_speed),
      driftInterval: dbFish.drift_interval,
      animationSpeed: dbFish.animation_speed,
      frameCount: dbFish.frame_count,
      currentFrame: dbFish.current_frame,
      createdAt: dbFish.created_at,
      updatedAt: dbFish.updated_at
    };
  },

  /**
   * Populate aquarium with default fish if empty
   * @param {number} count - Number of fish to create
   * @param {number} worldWidth - World width
   * @param {number} worldHeight - World height
   * @returns {Promise<boolean>} Success status
   */
  populateDefaultFish: async (count, worldWidth, worldHeight) => {
    const state = get();
    
    // Only populate if the flag indicates we need defaults and there are no fish
    if (!state.needsDefaultPopulation || state.fish.length > 0) {
      return true; // Already has fish or doesn't need population
    }
    
    set({ isSyncing: true, syncError: null });
    
    try {
      const promises = [];
      
      for (let i = 0; i < count; i++) {
        const fishData = {
          name: `DefaultFish_${i + 1}`,
          color: COLORS.FISH_COLORS[Math.floor(Math.random() * COLORS.FISH_COLORS.length)].toString(16).padStart(6, '0'),
          baseSpeed: 0.5 + Math.random() * 1.5, // 0.5 to 2.0
          currentSpeed: 1.0,
          direction: Math.random() > 0.5 ? 1 : -1,
          positionX: Math.random() * worldWidth,
          positionY: 50 + Math.random() * (worldHeight - 100),
          targetY: 50 + Math.random() * (worldHeight - 100),
          verticalSpeed: 0.1 + Math.random() * 0.2, // 0.1 to 0.3
          driftInterval: Math.round(3000 + Math.random() * 4000), // 3-7 seconds
          animationSpeed: Math.round(100 + Math.random() * 100), // 100-200ms
          frameCount: 4,
          currentFrame: Math.floor(Math.random() * 4)
        };
        
        promises.push(databaseService.saveFish(fishData));
      }
      
      await Promise.all(promises);
      
      set({ 
        isSyncing: false,
        needsDefaultPopulation: false, // Clear the flag after successful population
        lastSyncTime: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error populating default fish:', error);
      set({ 
        isSyncing: false, 
        syncError: error.message 
      });
      return false;
    }
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Get fish count
   * @returns {number} Number of fish
   */
  getFishCount: () => {
    return get().fish.length;
  },

  /**
   * Get fish by ID
   * @param {string} fishId - Fish ID
   * @returns {Object|null} Fish data or null
   */
  getFishById: (fishId) => {
    const state = get();
    return state.fish.find(fish => fish.id === fishId) || null;
  },

  /**
   * Clear sync error
   */
  clearSyncError: () => {
    set({ syncError: null });
  },

  /**
   * Clean up store resources
   */
  cleanup: () => {
    const state = get();
    
    if (state.subscription) {
      state.subscription.unsubscribe();
    }
    
    set({
      fish: [],
      subscription: null,
      isLoading: false,
      isSyncing: false,
      syncError: null
    });
  }
}));
