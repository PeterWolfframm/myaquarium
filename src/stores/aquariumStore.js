import { create } from 'zustand';
import { AQUARIUM_CONFIG } from '../constants/index.js';
import { validateAquariumConfig, sanitizeNumericInput } from '../utils/validation.js';
import { databaseService } from '../services/database.js';

/**
 * Zustand store for aquarium configuration and state management
 */
export const useAquariumStore = create((set, get) => ({
      // Aquarium configuration with defaults from constants
      tilesHorizontal: AQUARIUM_CONFIG.DEFAULT_TILES_HORIZONTAL,
      tilesVertical: AQUARIUM_CONFIG.DEFAULT_TILES_VERTICAL,
      tileSize: AQUARIUM_CONFIG.DEFAULT_TILE_SIZE,
      
      // Mode: 'fixed' for fixed tile size, 'adaptive' for adaptive tile size
      sizeMode: 'fixed',
      
      // Default number of vertical tiles to show when app opens
      defaultVisibleVerticalTiles: AQUARIUM_CONFIG.DEFAULT_VISIBLE_VERTICAL_TILES,
      
      // When in adaptive mode, target number of vertical tiles to show in viewport
      targetVerticalTiles: AQUARIUM_CONFIG.TARGET_VERTICAL_TILES,
      
      // Grid visibility toggle
      showGrid: true,
      
      // Calculated properties (will be computed in components)
      worldWidth: AQUARIUM_CONFIG.DEFAULT_TILES_HORIZONTAL * AQUARIUM_CONFIG.DEFAULT_TILE_SIZE,
      worldHeight: AQUARIUM_CONFIG.DEFAULT_TILES_VERTICAL * AQUARIUM_CONFIG.DEFAULT_TILE_SIZE,

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
        const state = get();
        set({ 
          tilesHorizontal: sanitized,
          worldWidth: sanitized * state.tileSize
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
        const state = get();
        set({ 
          tilesVertical: sanitized,
          worldHeight: sanitized * state.tileSize
        });
        
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
      
      setTileSize: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_TILE_SIZE, 
          AQUARIUM_CONFIG.MAX_TILE_SIZE, 
          AQUARIUM_CONFIG.DEFAULT_TILE_SIZE
        );
        const state = get();
        set({ 
          tileSize: sanitized,
          worldWidth: state.tilesHorizontal * sanitized,
          worldHeight: state.tilesVertical * sanitized
        });
        
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
  
      setSizeMode: async (mode) => {
        const validModes = ['fixed', 'adaptive'];
        if (validModes.includes(mode)) {
          set({ sizeMode: mode });
          // Auto-sync to database
          get().syncToDatabase().catch(error => {
            console.error('Failed to sync settings to database:', error);
            set({ syncError: error.message });
          });
        }
      },
      
      setTargetVerticalTiles: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_VISIBLE_TILES, 
          AQUARIUM_CONFIG.MAX_VISIBLE_TILES, 
          AQUARIUM_CONFIG.TARGET_VERTICAL_TILES
        );
        set({ targetVerticalTiles: sanitized });
        // Auto-sync to database
        get().syncToDatabase().catch(error => {
          console.error('Failed to sync settings to database:', error);
          set({ syncError: error.message });
        });
      },
      
      setDefaultVisibleVerticalTiles: async (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_VISIBLE_TILES, 
          AQUARIUM_CONFIG.MAX_VISIBLE_TILES, 
          AQUARIUM_CONFIG.DEFAULT_VISIBLE_VERTICAL_TILES
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
  
      // Calculate tile size based on default visible tiles (for app initialization)
      calculateDefaultTileSize: (viewportHeight) => {
        const state = get();
        const adaptiveTileSize = Math.floor(viewportHeight / state.defaultVisibleVerticalTiles);
        return Math.max(AQUARIUM_CONFIG.MIN_TILE_SIZE, Math.min(AQUARIUM_CONFIG.MAX_TILE_SIZE, adaptiveTileSize));
      },
      
      // Calculate adaptive tile size based on viewport height
      calculateAdaptiveTileSize: (viewportHeight) => {
        const state = get();
        if (state.sizeMode === 'adaptive') {
          const adaptiveTileSize = Math.floor(viewportHeight / state.targetVerticalTiles);
          return Math.max(AQUARIUM_CONFIG.MIN_TILE_SIZE, Math.min(AQUARIUM_CONFIG.MAX_TILE_SIZE, adaptiveTileSize));
        }
        return state.tileSize;
      },
  
  // Get current world dimensions (considering adaptive mode and default visible tiles)
  getWorldDimensions: (viewportHeight = null, isInitialLoad = false) => {
    const state = get();
    let currentTileSize = state.tileSize;
    
    if (isInitialLoad && viewportHeight) {
      // On initial load, always calculate tile size based on default visible tiles
      currentTileSize = state.calculateDefaultTileSize(viewportHeight);
    } else if (state.sizeMode === 'adaptive' && viewportHeight) {
      currentTileSize = state.calculateAdaptiveTileSize(viewportHeight);
    }
    
    return {
      worldWidth: state.tilesHorizontal * currentTileSize,
      worldHeight: state.tilesVertical * currentTileSize,
      tileSize: currentTileSize
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
          tileSize: settings.tile_size,
          sizeMode: settings.size_mode,
          defaultVisibleVerticalTiles: settings.default_visible_vertical_tiles,
          targetVerticalTiles: settings.target_vertical_tiles,
          showGrid: settings.show_grid,
          worldWidth: settings.tiles_horizontal * settings.tile_size,
          worldHeight: settings.tiles_vertical * settings.tile_size,
          lastSyncTime: new Date(),
          isLoading: false
        });
      } else {
        // No settings in database, save current defaults
        const state = get();
        await databaseService.saveAquariumSettings({
          tilesHorizontal: state.tilesHorizontal,
          tilesVertical: state.tilesVertical,
          tileSize: state.tileSize,
          sizeMode: state.sizeMode,
          defaultVisibleVerticalTiles: state.defaultVisibleVerticalTiles,
          targetVerticalTiles: state.targetVerticalTiles,
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
        tileSize: state.tileSize,
        sizeMode: state.sizeMode,
        defaultVisibleVerticalTiles: state.defaultVisibleVerticalTiles,
        targetVerticalTiles: state.targetVerticalTiles,
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
