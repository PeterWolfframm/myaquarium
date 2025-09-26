/**
 * FPS Tracking System
 * Measures framerate every 0.5 seconds, calculates 5-second averages, and logs to Supabase
 */

import { performanceMonitor } from './PerformanceMonitor';
import { databaseService } from '../services/database';
import type { PerformanceLogData } from '../types/global';

export class FPSTracker {
    private measurements: number[] = [];
    private measurementInterval: NodeJS.Timeout | null = null;
    private loggingInterval: NodeJS.Timeout | null = null;
    private isTracking: boolean = false;
    private sessionStartTime: number = Date.now();
    
    // Configuration
    private readonly MEASUREMENT_INTERVAL_MS = 500; // 0.5 seconds
    private readonly LOGGING_INTERVAL_MS = 5000; // 5 seconds
    private readonly MAX_MEASUREMENTS = 10; // 5 seconds / 0.5 seconds = 10 measurements
    
    // Context for detailed logging
    private aquariumInstance: any = null;
    private currentMood: string = 'work';

    constructor() {
        this.sessionStartTime = Date.now();
    }

    /**
     * Start FPS tracking
     */
    start(): void {
        if (this.isTracking) {
            console.warn('FPS tracking is already active');
            return;
        }

        this.isTracking = true;
        this.sessionStartTime = Date.now();
        this.measurements = [];
        
        console.log('🎯 FPS Tracker started - measuring every 0.5s, logging averages every 5s');

        // Start measuring FPS every 0.5 seconds
        this.measurementInterval = setInterval(() => {
            this.measureFPS();
        }, this.MEASUREMENT_INTERVAL_MS);

        // Start logging averages every 5 seconds
        this.loggingInterval = setInterval(() => {
            this.logAverageToSupabase();
        }, this.LOGGING_INTERVAL_MS);
    }

    /**
     * Stop FPS tracking
     */
    stop(): void {
        if (!this.isTracking) {
            return;
        }

        this.isTracking = false;
        
        if (this.measurementInterval) {
            clearInterval(this.measurementInterval);
            this.measurementInterval = null;
        }
        
        if (this.loggingInterval) {
            clearInterval(this.loggingInterval);
            this.loggingInterval = null;
        }

        // Log any remaining measurements
        if (this.measurements.length > 0) {
            this.logAverageToSupabase();
        }

        console.log('🛑 FPS Tracker stopped');
    }

    /**
     * Measure current FPS and add to buffer
     */
    private measureFPS(): void {
        const currentFPS = performanceMonitor.getSimpleMetrics().fps;
        
        // Add measurement to buffer
        this.measurements.push(currentFPS);
        
        // Keep only the last MAX_MEASUREMENTS
        if (this.measurements.length > this.MAX_MEASUREMENTS) {
            this.measurements = this.measurements.slice(-this.MAX_MEASUREMENTS);
        }

        // Optional: Log individual measurements for debugging
        // console.log(`📊 FPS measurement: ${currentFPS.toFixed(1)} (buffer: ${this.measurements.length})`);
    }

    /**
     * Calculate average FPS and log to Supabase
     */
    private async logAverageToSupabase(): Promise<void> {
        if (this.measurements.length === 0) {
            console.warn('⚠️ No FPS measurements to log');
            return;
        }

        // Calculate average FPS
        const averageFPS = this.measurements.reduce((sum, fps) => sum + fps, 0) / this.measurements.length;
        
        // Get additional performance context
        const performanceMetrics = performanceMonitor.getSimpleMetrics();
        
        // Prepare performance log data
        const performanceData: PerformanceLogData = {
            framerate: Math.round(averageFPS * 100) / 100, // Round to 2 decimal places
            objects_on_screen: this.getObjectsOnScreen(),
            fish_count: this.getFishCount(),
            visible_objects: this.getVisibleObjects(),
            total_placed_objects: this.getTotalPlacedObjects(),
            current_zoom: this.getCurrentZoom(),
            visible_tiles_horizontal: this.getVisibleTilesHorizontal(),
            visible_tiles_vertical: this.getVisibleTilesVertical(),
            visible_tiles_total: this.getVisibleTilesTotal(),
            viewport_x: this.getViewportX(),
            viewport_y: this.getViewportY(),
            viewport_percentage_x: this.getViewportPercentageX(),
            viewport_percentage_y: this.getViewportPercentageY(),
            current_mood: this.currentMood,
            grid_visible: this.getGridVisible(),
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
            device_pixel_ratio: window.devicePixelRatio || 1.0,
            memory_used_mb: this.getMemoryUsage(),
            memory_limit_mb: this.getMemoryLimit(),
            session_duration_ms: Date.now() - this.sessionStartTime
        };

        try {
            const result = await databaseService.logPerformanceMetrics(performanceData);
            
            if (result) {
                console.log(`📈 Logged 5s avg FPS: ${averageFPS.toFixed(2)} (${this.measurements.length} samples)`);
                
                // Optional: Show measurement details
                const minFPS = Math.min(...this.measurements);
                const maxFPS = Math.max(...this.measurements);
                console.log(`    Range: ${minFPS.toFixed(1)} - ${maxFPS.toFixed(1)} FPS`);
            } else {
                console.error('❌ Failed to log performance metrics to Supabase');
            }
        } catch (error) {
            console.error('❌ Error logging FPS to Supabase:', error);
        }

        // Clear measurements buffer for next period
        this.measurements = [];
    }

    /**
     * Set aquarium instance for context data
     */
    setAquariumInstance(aquarium: any): void {
        this.aquariumInstance = aquarium;
    }

    /**
     * Set current mood for logging context
     */
    setCurrentMood(mood: string): void {
        this.currentMood = mood;
    }

    /**
     * Get current status
     */
    getStatus(): {
        isTracking: boolean;
        measurementCount: number;
        sessionDuration: number;
        averageFPS: number;
    } {
        const averageFPS = this.measurements.length > 0 
            ? this.measurements.reduce((sum, fps) => sum + fps, 0) / this.measurements.length 
            : 0;

        return {
            isTracking: this.isTracking,
            measurementCount: this.measurements.length,
            sessionDuration: Date.now() - this.sessionStartTime,
            averageFPS: Math.round(averageFPS * 10) / 10
        };
    }

    // ==================== CONTEXT DATA GETTERS ====================
    
    private getObjectsOnScreen(): number {
        return this.aquariumInstance?.getObjectsOnScreen?.() || 0;
    }

    private getFishCount(): number {
        return this.aquariumInstance?.getFishCount?.() || 0;
    }

    private getVisibleObjects(): number {
        return this.aquariumInstance?.getVisibleObjects?.() || 0;
    }

    private getTotalPlacedObjects(): number {
        return this.aquariumInstance?.getTotalPlacedObjects?.() || 0;
    }

    private getCurrentZoom(): number {
        return this.aquariumInstance?.getCurrentZoom?.() || 1.0;
    }

    private getVisibleTilesHorizontal(): number {
        return this.aquariumInstance?.getVisibleTilesHorizontal?.() || 0;
    }

    private getVisibleTilesVertical(): number {
        return this.aquariumInstance?.getVisibleTilesVertical?.() || 0;
    }

    private getVisibleTilesTotal(): number {
        const h = this.getVisibleTilesHorizontal();
        const v = this.getVisibleTilesVertical();
        return h * v;
    }

    private getViewportX(): number {
        return this.aquariumInstance?.getViewportX?.() || 0;
    }

    private getViewportY(): number {
        return this.aquariumInstance?.getViewportY?.() || 0;
    }

    private getViewportPercentageX(): number {
        return this.aquariumInstance?.getViewportPercentageX?.() || 0;
    }

    private getViewportPercentageY(): number {
        return this.aquariumInstance?.getViewportPercentageY?.() || 0;
    }

    private getGridVisible(): boolean {
        return this.aquariumInstance?.getGridVisible?.() || false;
    }

    private getMemoryUsage(): number | undefined {
        if ('memory' in performance && (performance as any).memory) {
            const memory = (performance as any).memory;
            return Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
        }
        return undefined;
    }

    private getMemoryLimit(): number | undefined {
        if ('memory' in performance && (performance as any).memory) {
            const memory = (performance as any).memory;
            return Math.round((memory.jsHeapSizeLimit / (1024 * 1024)) * 100) / 100;
        }
        return undefined;
    }
}

// Export singleton instance
export const fpsTracker = new FPSTracker();
