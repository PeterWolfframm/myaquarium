/**
 * Validation utilities for the Fish Aquarium application
 */

import { AQUARIUM_CONFIG } from '../constants/index.js';

/**
 * Validate aquarium configuration values
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateAquariumConfig(config) {
  const errors = [];
  
  // Validate horizontal tiles
  if (!Number.isInteger(config.tilesHorizontal) || 
      config.tilesHorizontal < AQUARIUM_CONFIG.MIN_TILES_HORIZONTAL || 
      config.tilesHorizontal > AQUARIUM_CONFIG.MAX_TILES_HORIZONTAL) {
    errors.push(`Horizontal tiles must be between ${AQUARIUM_CONFIG.MIN_TILES_HORIZONTAL} and ${AQUARIUM_CONFIG.MAX_TILES_HORIZONTAL}`);
  }
  
  // Validate vertical tiles
  if (!Number.isInteger(config.tilesVertical) || 
      config.tilesVertical < AQUARIUM_CONFIG.MIN_TILES_VERTICAL || 
      config.tilesVertical > AQUARIUM_CONFIG.MAX_TILES_VERTICAL) {
    errors.push(`Vertical tiles must be between ${AQUARIUM_CONFIG.MIN_TILES_VERTICAL} and ${AQUARIUM_CONFIG.MAX_TILES_VERTICAL}`);
  }
  
  // Validate tile size
  if (!Number.isInteger(config.tileSize) || 
      config.tileSize < AQUARIUM_CONFIG.MIN_TILE_SIZE || 
      config.tileSize > AQUARIUM_CONFIG.MAX_TILE_SIZE) {
    errors.push(`Tile size must be between ${AQUARIUM_CONFIG.MIN_TILE_SIZE} and ${AQUARIUM_CONFIG.MAX_TILE_SIZE} pixels`);
  }
  
  // Validate visible vertical tiles
  if (config.defaultVisibleVerticalTiles !== undefined) {
    if (!Number.isInteger(config.defaultVisibleVerticalTiles) || 
        config.defaultVisibleVerticalTiles < AQUARIUM_CONFIG.MIN_VISIBLE_TILES || 
        config.defaultVisibleVerticalTiles > AQUARIUM_CONFIG.MAX_VISIBLE_TILES) {
      errors.push(`Default visible vertical tiles must be between ${AQUARIUM_CONFIG.MIN_VISIBLE_TILES} and ${AQUARIUM_CONFIG.MAX_VISIBLE_TILES}`);
    }
  }
  
  // Validate target vertical tiles
  if (config.targetVerticalTiles !== undefined) {
    if (!Number.isInteger(config.targetVerticalTiles) || 
        config.targetVerticalTiles < AQUARIUM_CONFIG.MIN_VISIBLE_TILES || 
        config.targetVerticalTiles > AQUARIUM_CONFIG.MAX_VISIBLE_TILES) {
      errors.push(`Target vertical tiles must be between ${AQUARIUM_CONFIG.MIN_VISIBLE_TILES} and ${AQUARIUM_CONFIG.MAX_VISIBLE_TILES}`);
    }
  }
  
  // Validate size mode
  if (config.sizeMode && !['fixed', 'adaptive'].includes(config.sizeMode)) {
    errors.push('Size mode must be either "fixed" or "adaptive"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate mood value
 * @param {string} mood - Mood to validate
 * @returns {boolean} Whether mood is valid
 */
export function validateMood(mood) {
  return ['work', 'pause', 'lunch'].includes(mood);
}

/**
 * Validate viewport position
 * @param {Object} position - Position object {x, y}
 * @param {number} worldWidth - World width in pixels
 * @param {number} worldHeight - World height in pixels
 * @returns {boolean} Whether position is valid
 */
export function validateViewportPosition(position, worldWidth, worldHeight) {
  return position &&
         typeof position.x === 'number' &&
         typeof position.y === 'number' &&
         position.x >= 0 &&
         position.x <= worldWidth &&
         position.y >= 0 &&
         position.y <= worldHeight;
}

/**
 * Validate PIXI application state
 * @param {Object} app - PIXI Application instance
 * @returns {boolean} Whether app is in valid state
 */
export function validatePixiApp(app) {
  return app &&
         app.stage &&
         app.renderer &&
         app.ticker &&
         !app.destroyed;
}

/**
 * Sanitize and validate numeric input
 * @param {*} value - Value to sanitize
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Sanitized numeric value
 */
export function sanitizeNumericInput(value, min, max, defaultValue) {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Validate canvas element for PIXI initialization
 * @param {HTMLCanvasElement} canvas - Canvas element to validate
 * @returns {boolean} Whether canvas is valid for PIXI
 */
export function validateCanvas(canvas) {
  return canvas &&
         canvas instanceof HTMLCanvasElement &&
         canvas.parentElement &&
         canvas.getContext;
}

/**
 * Check if browser supports required features
 * @returns {Object} Support status for various features
 */
export function checkBrowserSupport() {
  const support = {
    webgl: false,
    localStorage: false,
    requestAnimationFrame: false,
    canvas: false
  };
  
  try {
    // Check WebGL support
    const canvas = document.createElement('canvas');
    support.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    support.canvas = !!canvas.getContext('2d');
  } catch (e) {
    // WebGL not supported
  }
  
  // Check localStorage support
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    support.localStorage = true;
  } catch (e) {
    // localStorage not supported
  }
  
  // Check requestAnimationFrame support
  support.requestAnimationFrame = !!(window.requestAnimationFrame || 
                                    window.webkitRequestAnimationFrame || 
                                    window.mozRequestAnimationFrame);
  
  return support;
}
