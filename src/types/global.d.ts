// Global type declarations for the fish aquarium project

import type * as PIXI from 'pixi.js';

// ==================== ASSET MODULES ====================

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

// ==================== CORE ENTITIES ====================

export interface FishData {
  id: string | null;
  name: string | null;
  spriteUrl: string;
  baseSpeed: number;
  currentSpeed: number;
  direction: 1 | -1;
  targetY: number;
  verticalSpeed: number;
  driftInterval: number;
  animationSpeed: number;
  frameCount: number;
  currentFrame: number;
  color: number;
  size: number;
  mood?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AquariumObjectData {
  id: string;
  spriteUrl: string;
  gridX: number;
  gridY: number;
  size: number;
  layer: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ViewportPosition {
  currentX: number;
  currentY: number;
  maxX: number;
  maxY: number;
  percentageX: number;
  percentageY: number;
  tileX: number;
  tileY: number;
}

export interface TileDimensions {
  horizontalTiles: number;
  verticalTiles: number;
  totalTiles: number;
}

export interface PerformanceLogData {
  id?: string;
  user_id?: string;
  framerate: number;
  objects_on_screen: number;
  fish_count: number;
  visible_objects: number;
  total_placed_objects: number;
  current_zoom: number;
  visible_tiles_horizontal: number;
  visible_tiles_vertical: number;
  visible_tiles_total: number;
  viewport_x: number;
  viewport_y: number;
  viewport_percentage_x: number;
  viewport_percentage_y: number;
  current_mood: string;
  grid_visible: boolean;
  screen_width: number;
  screen_height: number;
  device_pixel_ratio: number;
  memory_used_mb?: number;
  memory_limit_mb?: number;
  logged_at?: string;
  session_duration_ms: number;
}

export interface ZoomInfo {
  currentZoom: number;
  zoomPercentage: number;
  visibleVerticalTiles: number;
  minZoom: number;
  maxZoom: number;
}

// ==================== CONFIGURATION TYPES ====================

export interface AquariumConfig {
  DEFAULT_TILES_HORIZONTAL: number;
  DEFAULT_TILES_VERTICAL: number;
  TILE_SIZE: number;
  MIN_TILES_HORIZONTAL: number;
  MAX_TILES_HORIZONTAL: number;
  MIN_TILES_VERTICAL: number;
  MAX_TILES_VERTICAL: number;
}

export interface PerformanceConfig {
  TARGET_FPS: number;
  UPDATE_INTERVAL_MS: number;
  ANIMATION_FRAME_TIME_MS: number;
  MOBILE_BREAKPOINT: number;
  LOGGING_INTERVAL_MS: number;
  MAX_LOG_RETENTION_DAYS: number;
}

export interface FishConfig {
  MIN_FISH_COUNT: number;
  MAX_FISH_COUNT: number;
  BASE_SPEED_MIN: number;
  BASE_SPEED_MAX: number;
  VERTICAL_SPEED_MIN: number;
  VERTICAL_SPEED_MAX: number;
  DRIFT_INTERVAL_MIN: number;
  DRIFT_INTERVAL_MAX: number;
  ANIMATION_FRAMES: number;
  ANIMATION_SPEED_MIN: number;
  ANIMATION_SPEED_MAX: number;
  DEFAULT_SPRITE_URL: string;
  BOUNDARY_MARGIN: number;
  VERTICAL_MARGIN: number;
}


export interface Mood {
  id: string;
  label: string;
  speedMultiplier: number;
}

export interface MoodConfig {
  WORK: Mood;
  PAUSE: Mood;
  LUNCH: Mood;
}

export interface ColorConfig {
  BACKGROUND: number;
  OCEAN_GRADIENT_START: number;
  OCEAN_GRADIENT_END: number;
  WATER_OVERLAY: number;
  SAND_BASE: number;
  SAND_TEXTURES: number[];
  SEAWEED: number;
  ROCKS: number[];
  GRID_LINES: number;
  ORANGE_CUBE: number;
  FISH_COLORS: number[];
  EYE_WHITE: number;
  EYE_BLACK: number;
}

export interface UIConfig {
  SAFE_ZONE: {
    WIDTH: number;
    HEIGHT: number;
    TOP_MARGIN: number;
  };
  GRID_LINE_OPACITY: number;
  GRID_LINE_WIDTH: number;
  CUBE_MOVE_INTERVAL: number;
  CUBE_SIZE_RATIO: number;
  FLOOR_HEIGHT: number;
  SEAWEED_SPACING: number;
  SEAWEED_HEIGHT_MIN: number;
  SEAWEED_HEIGHT_MAX: number;
  SEAWEED_SEGMENTS: number;
  ROCK_SPACING: number;
  ROCK_SIZE_MIN: number;
  ROCK_SIZE_MAX: number;
}

// ==================== STORE TYPES ====================

export interface AquariumStoreState {
  tilesHorizontal: number;
  tilesVertical: number;
  tileSize: number;
  defaultVisibleVerticalTiles: number;
  minZoom: number | null;
  maxZoom: number | null;
  showGrid: boolean;
  worldWidth: number;
  worldHeight: number;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export interface AquariumStoreActions {
  setTilesHorizontal: (value: number) => Promise<void>;
  setTilesVertical: (value: number) => Promise<void>;
  setDefaultVisibleVerticalTiles: (value: number) => Promise<void>;
  setMinZoom: (value: number | null) => Promise<void>;
  setMaxZoom: (value: number | null) => Promise<void>;
  toggleGrid: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export interface FishStoreState {
  fish: FishData[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  subscription: any;
  needsDefaultPopulation: boolean;
}

export interface FishStoreActions {
  initializeFromDatabase: () => Promise<void>;
  setupRealtimeSubscription: () => void;
  populateDefaultFish: (aquariumWidth: number, aquariumHeight: number, safeZone: SafeZone) => Promise<void>;
  addFish: (fishData: Partial<FishData>) => Promise<void>;
  updateFish: (id: string, fishData: Partial<FishData>) => Promise<void>;
  deleteFish: (id: string) => Promise<void>;
  clearAllFish: () => Promise<void>;
  syncFishToDatabase: (fishInstances: any[]) => Promise<void>;
}

// ==================== COMPONENT PROP TYPES ====================

export interface PanelPositions {
  timer: Position;
  stats: Position;
  objectsManager: Position;
  cardShowcase2: Position;
  settings: Position;
  fishEditor: Position;
}

export interface FishInfo {
  horizontalCount: number;
  verticalCount: number;
  total: number;
}

export interface TimerSession {
  id?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  mood: string;
  user_id?: string;
}

// ==================== DATABASE TYPES ====================

export interface DatabaseError {
  message: string;
  code?: string;
  details?: any;
}

export interface SpriteData {
  id: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  category?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UISettingsData {
  id?: string;
  user_id?: string;
  brutalist_primary_color: string;
  brutalist_secondary_color: string;
  show_brutalist_panel: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AquariumSettings {
  id?: string;
  user_id: string;
  tiles_horizontal: number;
  tiles_vertical: number;
  default_visible_vertical_tiles: number;
  min_zoom?: number;
  max_zoom?: number;
  show_grid: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==================== PIXI.JS EXTENSIONS ====================

export interface PIXISprite extends PIXI.Sprite {
  fishId?: string;
  objectId?: string;
}

export interface PIXIApplication extends PIXI.Application {
  aquarium?: any; // Reference to Aquarium class
}

// ==================== UTILITY TYPES ====================

export type MoodType = 'work' | 'pause' | 'lunch';

export type EventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: EventType;
  new: T | null;
  old: T | null;
  errors: any[];
}

export interface PerformanceSettings {
  targetFPS: number;
  entityCounts: {
    fish: number;
  };
  isMobile: boolean;
}

// ==================== COMPONENT PREFERENCES TYPES ====================

export type ViewMode = 'sticky' | 'fullscreen';

export interface ComponentPreference {
  id?: string;
  user_id: string;
  component_id: string;
  view_mode: ViewMode;
  created_at?: string;
  updated_at?: string;
}

export interface ComponentPosition {
  id?: string;
  user_id: string;
  component_id: string;
  x: number;
  y: number;
  created_at?: string;
  updated_at?: string;
}

export interface CardState {
  id?: string;
  user_id: string;
  component_id: string;
  is_open: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'static';
  size: 'small' | 'medium' | 'large';
  is_draggable: boolean;
  draggable_x?: number;
  draggable_y?: number;
  hide_when_closed: boolean;
  collapsible: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==================== DRAG AND DROP TYPES ====================

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current: any;
    };
  };
  delta: {
    x: number;
    y: number;
  };
}

export interface DraggableData {
  type: 'panel';
  panelId: string;
}

// ==================== JSX EXTENSIONS ====================

declare global {
  namespace preact.JSX {
    interface HTMLAttributes {
      // Add any global custom attributes here if needed
    }
  }
}

export {};
