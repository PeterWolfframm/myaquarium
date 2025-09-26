import { AssetManager } from './AssetManager';
import { poolManager } from './EntityPool';

/**
 * Performance monitoring system for tracking optimization effectiveness
 * Implements monitoring strategy from PIXI_OPTIMIZATION_ANALYSIS.md
 */
export class PerformanceMonitor {
    private metrics: {
        fps: number;
        entityCount: number;
        memoryUsage: number;
        texturesCached: number;
        poolStats: Record<string, any>;
        drawCalls: number;
        lastUpdateTime: number;
    };
    
    private recommendations: string[];
    private app: any; // PIXI Application reference

    constructor(pixiApp?: any) {
        this.app = pixiApp;
        this.metrics = {
            fps: 0,
            entityCount: 0,
            memoryUsage: 0,
            texturesCached: 0,
            poolStats: {},
            drawCalls: 0,
            lastUpdateTime: Date.now()
        };
        this.recommendations = [];
    }

    /**
     * Update performance metrics
     */
    update(): void {
        const now = Date.now();
        
        // FPS from PIXI ticker
        if (this.app && this.app.ticker) {
            this.metrics.fps = this.app.ticker.FPS;
        }

        // Memory usage from browser API
        if ('memory' in performance && (performance as any).memory) {
            const memory = (performance as any).memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize;
        }

        // Asset cache statistics
        const cacheStats = AssetManager.getCacheStats();
        this.metrics.texturesCached = cacheStats.cacheSize;

        // Entity pool statistics
        this.metrics.poolStats = poolManager.getAllPoolStats();

        // Update recommendations
        this.generateRecommendations();

        this.metrics.lastUpdateTime = now;
    }

    /**
     * Generate performance recommendations based on current metrics
     */
    private generateRecommendations(): void {
        this.recommendations = [];

        // FPS recommendations
        if (this.metrics.fps < 30) {
            this.recommendations.push('⚠️ Low FPS detected. Consider reducing entity count or enabling culling.');
        } else if (this.metrics.fps > 55) {
            this.recommendations.push('✅ Good FPS performance. Room for more visual effects.');
        }

        // Memory recommendations
        const memoryMB = this.metrics.memoryUsage / (1024 * 1024);
        if (memoryMB > 100) {
            this.recommendations.push('⚠️ High memory usage. Check for memory leaks.');
        } else if (memoryMB < 50) {
            this.recommendations.push('✅ Efficient memory usage.');
        }

        // Cache recommendations
        if (this.metrics.texturesCached < 5) {
            this.recommendations.push('💡 Few textures cached. Consider preloading more assets.');
        } else {
            this.recommendations.push('✅ Good texture caching utilization.');
        }

        // Pool recommendations
        const poolKeys = Object.keys(this.metrics.poolStats);
        if (poolKeys.length === 0) {
            this.recommendations.push('💡 No entity pools active. Consider implementing pooling for frequently created objects.');
        } else {
            let totalUtilization = 0;
            poolKeys.forEach(key => {
                totalUtilization += this.metrics.poolStats[key].utilizationPercent || 0;
            });
            const avgUtilization = totalUtilization / poolKeys.length;
            
            if (avgUtilization > 80) {
                this.recommendations.push('⚠️ High pool utilization. Consider increasing pool sizes.');
            } else if (avgUtilization < 20) {
                this.recommendations.push('💡 Low pool utilization. Pool sizes could be reduced.');
            } else {
                this.recommendations.push('✅ Good entity pool utilization.');
            }
        }
    }

    /**
     * Get complete performance report
     */
    getReport(): {
        metrics: typeof this.metrics;
        recommendations: string[];
        summary: string;
        optimizationEffectiveness: string;
    } {
        this.update();

        // Calculate optimization effectiveness
        let effectivenessScore = 0;
        let maxScore = 4;

        // FPS score (0-1)
        if (this.metrics.fps >= 50) effectivenessScore += 1;
        else if (this.metrics.fps >= 30) effectivenessScore += 0.7;
        else if (this.metrics.fps >= 20) effectivenessScore += 0.4;

        // Memory score (0-1)
        const memoryMB = this.metrics.memoryUsage / (1024 * 1024);
        if (memoryMB <= 50) effectivenessScore += 1;
        else if (memoryMB <= 80) effectivenessScore += 0.7;
        else if (memoryMB <= 120) effectivenessScore += 0.4;

        // Cache effectiveness (0-1)
        if (this.metrics.texturesCached >= 5) effectivenessScore += 1;
        else if (this.metrics.texturesCached >= 2) effectivenessScore += 0.6;

        // Pool effectiveness (0-1)
        const poolKeys = Object.keys(this.metrics.poolStats);
        if (poolKeys.length > 0) {
            effectivenessScore += 1;
        }

        const effectivenessPercent = Math.round((effectivenessScore / maxScore) * 100);
        
        let effectivenessText = '';
        if (effectivenessPercent >= 85) {
            effectivenessText = '🟢 Excellent optimization implementation';
        } else if (effectivenessPercent >= 70) {
            effectivenessText = '🟡 Good optimization implementation';
        } else if (effectivenessPercent >= 50) {
            effectivenessText = '🟠 Moderate optimization implementation';
        } else {
            effectivenessText = '🔴 Poor optimization implementation';
        }

        return {
            metrics: { ...this.metrics },
            recommendations: [...this.recommendations],
            summary: `FPS: ${this.metrics.fps.toFixed(1)} | Memory: ${(this.metrics.memoryUsage / (1024 * 1024)).toFixed(1)}MB | Cached Textures: ${this.metrics.texturesCached} | Pools: ${poolKeys.length}`,
            optimizationEffectiveness: `${effectivenessText} (${effectivenessPercent}%)`
        };
    }

    /**
     * Log performance report to console
     */
    logReport(): void {
        const report = this.getReport();
        
        console.group('📊 Performance Report - Batch 1 Optimizations');
        console.log('📈 Summary:', report.summary);
        console.log('🎯 Effectiveness:', report.optimizationEffectiveness);
        
        if (report.recommendations.length > 0) {
            console.group('💡 Recommendations:');
            report.recommendations.forEach(rec => console.log(rec));
            console.groupEnd();
        }
        
        console.group('📋 Detailed Metrics:');
        console.log('FPS:', report.metrics.fps.toFixed(2));
        console.log('Memory Usage:', (report.metrics.memoryUsage / (1024 * 1024)).toFixed(2), 'MB');
        console.log('Textures Cached:', report.metrics.texturesCached);
        
        if (Object.keys(report.metrics.poolStats).length > 0) {
            console.log('Pool Statistics:', report.metrics.poolStats);
        }
        
        console.groupEnd();
        console.groupEnd();
    }

    /**
     * Set PIXI application reference for FPS monitoring
     */
    setPixiApp(app: any): void {
        this.app = app;
    }

    /**
     * Get simple metrics for external monitoring
     */
    getSimpleMetrics(): {
        fps: number;
        memoryMB: number;
        texturesCached: number;
        activePoolsCount: number;
    } {
        this.update();
        
        return {
            fps: Math.round(this.metrics.fps * 10) / 10,
            memoryMB: Math.round((this.metrics.memoryUsage / (1024 * 1024)) * 10) / 10,
            texturesCached: this.metrics.texturesCached,
            activePoolsCount: Object.keys(this.metrics.poolStats).length
        };
    }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
