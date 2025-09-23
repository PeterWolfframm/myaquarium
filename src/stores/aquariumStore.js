import { create } from 'zustand';
import { AQUARIUM_CONFIG } from '../constants/index.js';
import { validateAquariumConfig, sanitizeNumericInput } from '../utils/validation.js';
import { databaseService } from '../services/database.js';

/**
 * Zustand store for aquarium configuration and state management
 * Uses fixed 64px tile system as requested
 */
export const useAquariumStore = create((set, get) => ({
      // Aquarium configuration with fixed 64px tiles
      tilesHorizontal: AQUARIUM_CONFIG.DEFAULT_TILES_HORIZONTAL,
      tilesVertical: AQUARIUM_CONFIG.DEFAULT_TILES_VERTICAL,
      tileSize: AQUARIUM_CONFIG.TILE_SIZE, // Always 64px
      
      // Default zoom level - how many vertical tiles to show when app opens
      defaultVisibleVerticalTiles: 20,
        
      // Grid visibility toggle
      showGrid: true,
      
      // Calculated properties
      worldWidth: AQUARIUM_CONFIG.DEFAULT_TILES_HORIZONTAL * AQUARIUM_CONFIG.TILE_SIZE,
      worldHeight: AQUARIUM_CONFIG.DEFAULT_TILES_VERTICAL * AQUARIUM_CONFIG.TILE_SIZE,

      // Database synchronization state
      isLoading: false,
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
  
      // Actions to update configuration with validation
      setTilesHorizontal: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_TILES_HORIZONTAL, 
          AQUARIUM_CONFIG.MAX_TILES_HORIZONTAL, 
          AQUARIUM_CONFIG.DEFAULT_TILES_HORIZONTAL
        );
        set({ 
          tilesHorizontal: sanitized,
          worldWidth: sanitized * AQUARIUM_CONFIG.TILE_SIZE
        });
        
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
      
      setTilesVertical: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_TILES_VERTICAL, 
          AQUARIUM_CONFIG.MAX_TILES_VERTICAL, 
          AQUARIUM_CONFIG.DEFAULT_TILES_VERTICAL
        );
        set({ 
          tilesVertical: sanitized,
          worldHeight: sanitized * AQUARIUM_CONFIG.TILE_SIZE
        });
        
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
      
      setDefaultVisibleVerticalTiles: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          5, 
          50, 
          20
        );
        set({ defaultVisibleVerticalTiles: sanitized });
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
      
      // Toggle grid visibility
      toggleGrid: async () => {
        const state = get();
        set({ showGrid: !state.showGrid });
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
  
  // Get current world dimensions (always uses fixed 64px tiles)
  getWorldDimensions: () => {
    const state = get();
    return {
      worldWidth: state.tilesHorizontal * AQUARIUM_CONFIG.TILE_SIZE,
      worldHeight: state.tilesVertical * AQUARIUM_CONFIG.TILE_SIZE,
      tileSize: AQUARIUM_CONFIG.TILE_SIZE
    };
  },

  // ==================== DATABASE SYNC METHODS ====================

  /**
   * Initialize the store by loading settings from Supabase
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

      // Load settings from database
      const settings = await databaseService.getAquariumSettings();
      
      if (settings) {
        // Update store with database settings
        set({
          tilesHorizontal: settings.tiles_horizontal,
          tilesVertical: settings.tiles_vertical,
          tileSize: AQUARIUM_CONFIG.TILE_SIZE, // Always use fixed 64px
          defaultVisibleVerticalTiles: settings.default_visible_vertical_tiles || 20,
          showGrid: settings.show_grid,
          worldWidth: settings.tiles_horizontal * AQUARIUM_CONFIG.TILE_SIZE,
          worldHeight: settings.tiles_vertical * AQUARIUM_CONFIG.TILE_SIZE,
          lastSyncTime: new Date(),
          isLoading: false
        });
      } else {
        // No settings in database, save current defaults
        const state = get();
        await databaseService.saveAquariumSettings({
          tilesHorizontal: state.tilesHorizontal,
          tilesVertical: state.tilesVertical,
          tileSize: AQUARIUM_CONFIG.TILE_SIZE,
          defaultVisibleVerticalTiles: state.defaultVisibleVerticalTiles,
          showGrid: state.showGrid
        });
        
        set({ 
          isLoading: false,
          lastSyncTime: new Date()
        });
      }
    } catch (error) {
      console.error('Error initializing from database:', error);
      set({ 
        isLoading: false, 
        syncError: error.message 
      });
    }
  },

  /**
   * Save current settings to Supabase
   */
  syncToDatabase: async () => {
    const state = get();
    set({ isSyncing: true, syncError: null });
    
    try {
      await databaseService.saveAquariumSettings({
        tilesHorizontal: state.tilesHorizontal,
        tilesVertical: state.tilesVertical,
        tileSize: AQUARIUM_CONFIG.TILE_SIZE,
        defaultVisibleVerticalTiles: state.defaultVisibleVerticalTiles,
        showGrid: state.showGrid
      });
      
      set({ 
        isSyncing: false,
        lastSyncTime: new Date()
      });
    } catch (error) {
      console.error('Error syncing to database:', error);
      set({ 
        isSyncing: false, 
        syncError: error.message 
      });
    }
  },

  /**
   * Clear sync error
   */
  clearSyncError: () => {
    set({ syncError: null });
  }
}));
