/**
 * Application-wide constants for the Fish Aquarium project
 */

// Aquarium Configuration - Fixed 64px Tile System
export const AQUARIUM_CONFIG = {
  DEFAULT_TILES_HORIZONTAL: 100,
  DEFAULT_TILES_VERTICAL: 50,
  TILE_SIZE: 64, // Fixed 64px tiles as requested
  MIN_TILES_HORIZONTAL: 10,
  MAX_TILES_HORIZONTAL: 1000,
  MIN_TILES_VERTICAL: 10,
  MAX_TILES_VERTICAL: 500
};

// Performance Constants
export const PERFORMANCE = {
  TARGET_FPS: 60,
  UPDATE_INTERVAL_MS: 100,
  ANIMATION_FRAME_TIME_MS: 16.67, // ~60fps
  BUBBLE_DENSITY_RATIO: 50000, // One bubble per 50k pixels
  MIN_BUBBLES: 10,
  MAX_BUBBLES: 50,
  MOBILE_BREAKPOINT: 768
};

// Fish Configuration
export const FISH_CONFIG = {
  MIN_FISH_COUNT: 20,
  MAX_FISH_COUNT: 60,
  BASE_SPEED_MIN: 0.5,
  BASE_SPEED_MAX: 2.0,
  VERTICAL_SPEED_MIN: 0.1,
  VERTICAL_SPEED_MAX: 0.3,
  DRIFT_INTERVAL_MIN: 3000,
  DRIFT_INTERVAL_MAX: 7000,
  ANIMATION_FRAMES: 4,
  ANIMATION_SPEED_MIN: 100,
  ANIMATION_SPEED_MAX: 200,
  SPRITE_SIZE: { width: 20, height: 8 },
  TAIL_SIZE: { width: 10, height: 12 },
  EYE_SIZE: 3,
  BOUNDARY_MARGIN: 30,
  VERTICAL_MARGIN: 50
};

// Bubble Configuration
export const BUBBLE_CONFIG = {
  SIZE_MIN: 3,
  SIZE_MAX: 7,
  OPACITY_MIN: 0.3,
  OPACITY_MAX: 0.7,
  SPEED_MIN: 0.2,
  SPEED_MAX: 0.5,
  WOBBLE_MAX: 0.5,
  WOBBLE_SPEED_MIN: 0.02,
  WOBBLE_SPEED_MAX: 0.04,
  WOBBLE_AMPLITUDE: 20
};

// Mood System
export const MOODS = {
  WORK: {
    id: 'work',
    label: 'Work',
    speedMultiplier: 1.0
  },
  PAUSE: {
    id: 'pause',
    label: 'Pause',
    speedMultiplier: 0.3
  },
  LUNCH: {
    id: 'lunch',
    label: 'Lunch',
    speedMultiplier: 2.0
  }
};

// Colors
export const COLORS = {
  BACKGROUND: 0x001133,
  OCEAN_GRADIENT_START: 0x004466,
  OCEAN_GRADIENT_END: 0x001133,
  WATER_OVERLAY: 0x004466,
  SAND_BASE: 0x8B4513,
  SAND_TEXTURES: [0x654321, 0xD2691E],
  SEAWEED: 0x228B22,
  ROCKS: [0x696969, 0x808080],
  GRID_LINES: 0xFFFFFF,
  ORANGE_CUBE: 0xFF6600,
  BUBBLE_BASE: 0x87CEEB,
  BUBBLE_HIGHLIGHT: 0xFFFFFF,
  FISH_COLORS: [0x4CAF50, 0x2196F3, 0xFF9800, 0xE91E63, 0x9C27B0, 0x00BCD4],
  EYE_WHITE: 0xFFFFFF,
  EYE_BLACK: 0x000000
};

// UI Configuration
export const UI_CONFIG = {
  SAFE_ZONE: {
    WIDTH: 400,
    HEIGHT: 150,
    TOP_MARGIN: 50
  },
  GRID_LINE_OPACITY: 0.3,
  GRID_LINE_WIDTH: 1,
  CUBE_MOVE_INTERVAL: 1000,
  CUBE_SIZE_RATIO: 0.8,
  FLOOR_HEIGHT: 80,
  SEAWEED_SPACING: 300,
  SEAWEED_HEIGHT_MIN: 100,
  SEAWEED_HEIGHT_MAX: 250,
  SEAWEED_SEGMENTS: 8,
  ROCK_SPACING: 500,
  ROCK_SIZE_MIN: 20,
  ROCK_SIZE_MAX: 50
};

// Navigation Controls
export const NAVIGATION = {
  MOVE_DISTANCE_TILES: 5, // How many tiles to move per arrow key press
  ZOOM_FACTOR: 1.2, // 20% zoom per key press
  MIN_ZOOM_SCALE: 0.1, // Minimum zoom (will be calculated to show all vertical tiles)
  MAX_ZOOM_SCALE: 4.0, // Maximum zoom
  CLAMP_UNDERFLOW: 'center'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AQUARIUM_SETTINGS: 'aquarium-settings'
};

// Keyboard Controls
export const KEYBOARD = {
  TOGGLE_BUBBLES: 'b',
  ZOOM_IN: ['+', '='],
  ZOOM_OUT: ['-'],
  ARROW_KEYS: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
};
