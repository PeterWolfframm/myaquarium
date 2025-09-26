/**
 * Performance optimization utilities for the Fish Aquarium
 */

import { PERFORMANCE } from '../constants/index';
import type { PerformanceSettings } from '../types/global';

/**
 * Throttle function calls to improve performance
 */
export function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  let lastExecTime = 0;
  
  return function (...args: Parameters<T>): void {
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
 */
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return function (...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Calculate optimal entity count based on screen size and performance considerations
 */
export function calculateOptimalEntityCounts(screenWidth: number, screenHeight: number, isMobile: boolean = false): { fish: number } {
  const screenArea = screenWidth * screenHeight;
  const baseArea = 1920 * 1080; // Reference full HD resolution
  const areaRatio = Math.min(screenArea / baseArea, 2); // Cap at 2x reference
  
  const baseFishCount = isMobile ? 20 : 30;
  const maxFishCount = isMobile ? 30 : 60;
  
  const fishCount = Math.floor(baseFishCount + (maxFishCount - baseFishCount) * areaRatio);
  
  return {
    fish: Math.max(20, Math.min(maxFishCount, fishCount))
  };
}

/**
 * Check if device is mobile based on screen width
 */
export function isMobileDevice(): boolean {
  return window.innerWidth <= PERFORMANCE.MOBILE_BREAKPOINT;
}

/**
 * Get performance-appropriate update interval based on device capabilities
 */
export function getOptimalUpdateInterval(): number {
  const isMobile = isMobileDevice();
  return isMobile ? PERFORMANCE.UPDATE_INTERVAL_MS * 1.5 : PERFORMANCE.UPDATE_INTERVAL_MS;
}

/**
 * Safe bounds checking utility
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation utility
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * clamp(factor, 0, 1);
}

/**
 * Check if two rectangles intersect (for collision detection)
 */
export function rectsIntersect(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

/**
 * Generate a random number within a range
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Pick a random element from an array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
