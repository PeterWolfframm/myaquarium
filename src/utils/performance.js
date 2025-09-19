/**
 * Performance optimization utilities for the Fish Aquarium
 */

import { PERFORMANCE } from '../constants/index.js';

/**
 * Throttle function calls to improve performance
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Debounce function calls to improve performance
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Calculate optimal entity count based on screen size and performance considerations
 * @param {number} screenWidth - Screen width in pixels
 * @param {number} screenHeight - Screen height in pixels
 * @param {boolean} isMobile - Whether the device is mobile
 * @returns {Object} Optimal counts for fish and bubbles
 */
export function calculateOptimalEntityCounts(screenWidth, screenHeight, isMobile = false) {
  const screenArea = screenWidth * screenHeight;
  const baseArea = 1920 * 1080; // Reference full HD resolution
  const areaRatio = Math.min(screenArea / baseArea, 2); // Cap at 2x reference
  
  const baseFishCount = isMobile ? 20 : 30;
  const maxFishCount = isMobile ? 30 : 60;
  
  const fishCount = Math.floor(baseFishCount + (maxFishCount - baseFishCount) * areaRatio);
  const bubbleCount = Math.floor(screenArea / PERFORMANCE.BUBBLE_DENSITY_RATIO);
  
  return {
    fish: Math.max(PERFORMANCE.MIN_BUBBLES, Math.min(maxFishCount, fishCount)),
    bubbles: Math.max(PERFORMANCE.MIN_BUBBLES, Math.min(PERFORMANCE.MAX_BUBBLES, bubbleCount))
  };
}

/**
 * Check if device is mobile based on screen width
 * @returns {boolean} Whether the device is considered mobile
 */
export function isMobileDevice() {
  return window.innerWidth <= PERFORMANCE.MOBILE_BREAKPOINT;
}

/**
 * Get performance-appropriate update interval based on device capabilities
 * @returns {number} Update interval in milliseconds
 */
export function getOptimalUpdateInterval() {
  const isMobile = isMobileDevice();
  return isMobile ? PERFORMANCE.UPDATE_INTERVAL_MS * 1.5 : PERFORMANCE.UPDATE_INTERVAL_MS;
}

/**
 * Safe bounds checking utility
 * @param {number} value - Value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation utility
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, factor) {
  return start + (end - start) * clamp(factor, 0, 1);
}

/**
 * Check if two rectangles intersect (for collision detection)
 * @param {Object} rect1 - First rectangle {x, y, width, height}
 * @param {Object} rect2 - Second rectangle {x, y, width, height}
 * @returns {boolean} Whether rectangles intersect
 */
export function rectsIntersect(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

/**
 * Generate a random number within a range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number within range
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Pick a random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element from array
 */
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}
