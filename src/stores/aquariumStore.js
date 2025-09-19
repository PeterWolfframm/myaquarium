import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AQUARIUM_CONFIG, STORAGE_KEYS } from '../constants/index.js';
import { validateAquariumConfig, sanitizeNumericInput } from '../utils/validation.js';

/**
 * Zustand store for aquarium configuration and state management
 */
export const useAquariumStore = create(
  persist(
    (set, get) => ({
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
  
      // Actions to update configuration with validation
      setTilesHorizontal: (value) => {
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
      },
      
      setTilesVertical: (value) => {
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
      },
      
      setTileSize: (value) => {
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
      },
  
      setSizeMode: (mode) => {
        const validModes = ['fixed', 'adaptive'];
        if (validModes.includes(mode)) {
          set({ sizeMode: mode });
        }
      },
      
      setTargetVerticalTiles: (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_VISIBLE_TILES, 
          AQUARIUM_CONFIG.MAX_VISIBLE_TILES, 
          AQUARIUM_CONFIG.TARGET_VERTICAL_TILES
        );
        set({ targetVerticalTiles: sanitized });
      },
      
      setDefaultVisibleVerticalTiles: (value) => {
        const sanitized = sanitizeNumericInput(
          value, 
          AQUARIUM_CONFIG.MIN_VISIBLE_TILES, 
          AQUARIUM_CONFIG.MAX_VISIBLE_TILES, 
          AQUARIUM_CONFIG.DEFAULT_VISIBLE_VERTICAL_TILES
        );
        set({ defaultVisibleVerticalTiles: sanitized });
      },
      
      // Toggle grid visibility
      toggleGrid: () => {
        const state = get();
        set({ showGrid: !state.showGrid });
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
  }
}),
    {
      name: STORAGE_KEYS.AQUARIUM_SETTINGS, // unique name for localStorage key
      // Only persist the configuration values, not computed methods
      partialize: (state) => ({
        tilesHorizontal: state.tilesHorizontal,
        tilesVertical: state.tilesVertical,
        tileSize: state.tileSize,
        sizeMode: state.sizeMode,
        defaultVisibleVerticalTiles: state.defaultVisibleVerticalTiles,
        targetVerticalTiles: state.targetVerticalTiles,
        showGrid: state.showGrid,
      }),
    }
  )
);
