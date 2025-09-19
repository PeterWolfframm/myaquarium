import { create } from 'zustand';

export const useAquariumStore = create((set, get) => ({
  // Aquarium configuration
  tilesHorizontal: 300,
  tilesVertical: 64,
  tileSize: 64,
  
  // Mode: 'fixed' for fixed tile size, 'adaptive' for adaptive tile size
  sizeMode: 'fixed',
  
  // Default number of vertical tiles to show when app opens (current: 17)
  defaultVisibleVerticalTiles: 17,
  
  // When in adaptive mode, target number of vertical tiles to show in viewport
  targetVerticalTiles: 20,
  
  // Calculated properties (will be computed in components)
  worldWidth: 300 * 64,
  worldHeight: 64 * 64,
  
  // Actions to update configuration
  setTilesHorizontal: (value) => {
    const state = get();
    set({ 
      tilesHorizontal: value,
      worldWidth: value * state.tileSize
    });
  },
  
  setTilesVertical: (value) => {
    const state = get();
    set({ 
      tilesVertical: value,
      worldHeight: value * state.tileSize
    });
  },
  
  setTileSize: (value) => {
    const state = get();
    set({ 
      tileSize: value,
      worldWidth: state.tilesHorizontal * value,
      worldHeight: state.tilesVertical * value
    });
  },
  
  setSizeMode: (mode) => {
    set({ sizeMode: mode });
  },
  
  setTargetVerticalTiles: (value) => {
    set({ targetVerticalTiles: value });
  },
  
  setDefaultVisibleVerticalTiles: (value) => {
    set({ defaultVisibleVerticalTiles: value });
  },
  
  // Calculate tile size based on default visible tiles (for app initialization)
  calculateDefaultTileSize: (viewportHeight) => {
    const state = get();
    const adaptiveTileSize = Math.floor(viewportHeight / state.defaultVisibleVerticalTiles);
    return Math.max(16, Math.min(128, adaptiveTileSize)); // Clamp between 16-128px
  },
  
  // Calculate adaptive tile size based on viewport height
  calculateAdaptiveTileSize: (viewportHeight) => {
    const state = get();
    if (state.sizeMode === 'adaptive') {
      const adaptiveTileSize = Math.floor(viewportHeight / state.targetVerticalTiles);
      return Math.max(16, Math.min(128, adaptiveTileSize)); // Clamp between 16-128px
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
}));
