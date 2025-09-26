import * as PIXI from 'pixi.js';

/**
 * Global texture cache for efficient asset management
 * Implements the optimization strategy from PIXI_OPTIMIZATION_ANALYSIS.md
 */
class AssetManagerClass {
    private textureCache: Map<string, PIXI.Texture>;
    private isPreloading: boolean;
    private preloadPromise: Promise<void> | null;

    constructor() {
        this.textureCache = new Map();
        this.isPreloading = false;
        this.preloadPromise = null;
    }

    /**
     * Get a cached texture or load it if not cached
     * This replaces individual PIXI.Assets.load() calls throughout the codebase
     * @param url - The URL of the texture to load
     * @returns Promise<PIXI.Texture>
     */
    async getCachedTexture(url: string): Promise<PIXI.Texture> {
        // Return cached texture if available
        if (this.textureCache.has(url)) {
            console.log(`✅ Using cached texture: ${url}`);
            return this.textureCache.get(url)!;
        }

        // Load texture and cache it
        console.log(`🔄 Loading and caching texture: ${url}`);
        try {
            const texture = await PIXI.Assets.load(url);
            this.textureCache.set(url, texture);
            console.log(`💾 Texture cached: ${url}`);
            return texture;
        } catch (error) {
            console.error(`❌ Failed to load texture: ${url}`, error);
            throw error;
        }
    }

    /**
     * Preload all known assets for the application
     * This reduces loading times during gameplay
     */
    async preloadAssets(): Promise<void> {
        if (this.isPreloading && this.preloadPromise) {
            return this.preloadPromise;
        }

        this.isPreloading = true;
        console.log('🚀 Starting asset preloading...');

        this.preloadPromise = this._performPreload();
        
        try {
            await this.preloadPromise;
            console.log('✅ Asset preloading completed successfully');
        } catch (error) {
            console.error('❌ Asset preloading failed:', error);
        } finally {
            this.isPreloading = false;
        }

        return this.preloadPromise;
    }

    private async _performPreload(): Promise<void> {
        // Define all known textures used in the application
        const texturesToPreload = [
            // Fish sprites
            'sprites/shark.png',
            // Add more known sprites here as they are discovered
            // This list should be expanded as we identify more sprites
        ];

        // Batch load all textures
        const loadPromises = texturesToPreload.map(async (url) => {
            try {
                const texture = await PIXI.Assets.load(url);
                this.textureCache.set(url, texture);
                console.log(`💾 Preloaded: ${url}`);
            } catch (error) {
                console.warn(`⚠️ Failed to preload: ${url}`, error);
                // Continue with other assets even if one fails
            }
        });

        await Promise.allSettled(loadPromises);
        console.log(`📦 Preloaded ${this.textureCache.size} textures`);
    }

    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return {
            cacheSize: this.textureCache.size,
            cachedUrls: Array.from(this.textureCache.keys()),
            isPreloading: this.isPreloading
        };
    }

    /**
     * Clear the texture cache (useful for memory management)
     */
    clearCache(): void {
        console.log('🗑️ Clearing texture cache...');
        // Destroy textures to free memory
        for (const texture of this.textureCache.values()) {
            if (texture && texture.destroy) {
                texture.destroy(true);
            }
        }
        this.textureCache.clear();
        console.log('✅ Texture cache cleared');
    }

    /**
     * Remove a specific texture from cache
     */
    removeFromCache(url: string): void {
        const texture = this.textureCache.get(url);
        if (texture) {
            if (texture.destroy) {
                texture.destroy(true);
            }
            this.textureCache.delete(url);
            console.log(`🗑️ Removed from cache: ${url}`);
        }
    }

    /**
     * Check if a texture is cached
     */
    isCached(url: string): boolean {
        return this.textureCache.has(url);
    }
}

// Export singleton instance
export const AssetManager = new AssetManagerClass();

// Export the class for testing purposes
export { AssetManagerClass };
