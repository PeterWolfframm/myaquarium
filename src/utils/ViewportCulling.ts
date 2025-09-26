import type { Viewport } from 'pixi-viewport';
import type { PIXISprite } from '../types/global';

/**
 * Viewport culling utility for performance optimization
 * Determines which entities are visible in the current viewport
 */
export class ViewportCulling {
    private viewport: Viewport;
    private margin: number;

    /**
     * Create a new viewport culling system
     * @param viewport - The pixi-viewport instance
     * @param margin - Extra margin around viewport for smoother culling (default: 100px)
     */
    constructor(viewport: Viewport, margin: number = 100) {
        this.viewport = viewport;
        this.margin = margin;
    }

    /**
     * Update the viewport reference (useful for viewport changes)
     * @param viewport - Updated viewport instance
     */
    updateViewport(viewport: Viewport): void {
        this.viewport = viewport;
    }

    /**
     * Get the current visible bounds with margin
     * @returns Object with viewport bounds
     */
    getVisibleBounds() {
        try {
            const bounds = this.viewport.getVisibleBounds();
            return {
                x: bounds.x - this.margin,
                y: bounds.y - this.margin,
                width: bounds.width + (this.margin * 2),
                height: bounds.height + (this.margin * 2),
                right: bounds.x + bounds.width + this.margin,
                bottom: bounds.y + bounds.height + this.margin
            };
        } catch (error) {
            console.warn('Error getting visible bounds for culling:', error);
            // Return a very large bounds as fallback
            return {
                x: -10000,
                y: -10000,
                width: 20000,
                height: 20000,
                right: 10000,
                bottom: 10000
            };
        }
    }

    /**
     * Check if a sprite is visible in the current viewport
     * @param sprite - PIXI sprite to check
     * @returns True if sprite is visible (or potentially visible)
     */
    isSpriteVisible(sprite: PIXISprite): boolean {
        if (!sprite || !this.viewport) {
            return true; // Assume visible if we can't determine
        }

        const bounds = this.getVisibleBounds();
        const spriteX = sprite.x;
        const spriteY = sprite.y;

        // Simple point-in-bounds check
        // For more accuracy, could consider sprite dimensions, but this is sufficient for most cases
        return spriteX >= bounds.x && 
               spriteX <= bounds.right && 
               spriteY >= bounds.y && 
               spriteY <= bounds.bottom;
    }

    /**
     * Check if a position is visible in the current viewport
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns True if position is visible (or potentially visible)
     */
    isPositionVisible(x: number, y: number): boolean {
        if (!this.viewport) {
            return true; // Assume visible if we can't determine
        }

        const bounds = this.getVisibleBounds();
        return x >= bounds.x && 
               x <= bounds.right && 
               y >= bounds.y && 
               y <= bounds.bottom;
    }

    /**
     * Check if a rectangular area is visible in the current viewport
     * @param x - X coordinate of top-left corner
     * @param y - Y coordinate of top-left corner
     * @param width - Width of the area
     * @param height - Height of the area
     * @returns True if area intersects with viewport
     */
    isAreaVisible(x: number, y: number, width: number, height: number): boolean {
        if (!this.viewport) {
            return true; // Assume visible if we can't determine
        }

        const bounds = this.getVisibleBounds();
        
        // Check if rectangles intersect (AABB collision)
        return !(x + width < bounds.x || 
                x > bounds.right || 
                y + height < bounds.y || 
                y > bounds.bottom);
    }

    /**
     * Cull a list of sprites, setting visibility and returning visible ones
     * @param sprites - Array of objects with sprite property
     * @returns Array of visible sprites for updating
     */
    cullSprites<T extends { sprite: PIXISprite; id?: string }>(sprites: T[]): T[] {
        const visibleSprites: T[] = [];
        const bounds = this.getVisibleBounds();

        for (const item of sprites) {
            if (!item.sprite) continue;

            const isVisible = this.isSpriteVisible(item.sprite);
            
            // Set sprite visibility
            item.sprite.visible = isVisible;
            
            // Add to visible list for updates
            if (isVisible) {
                visibleSprites.push(item);
            }
        }

        return visibleSprites;
    }

    /**
     * Get culling statistics for debugging
     * @param sprites - Array of sprites to analyze
     * @returns Statistics object
     */
    getCullingStats<T extends { sprite: PIXISprite }>(sprites: T[]) {
        const totalSprites = sprites.length;
        let visibleSprites = 0;
        let hiddenSprites = 0;

        for (const item of sprites) {
            if (!item.sprite) continue;
            
            if (this.isSpriteVisible(item.sprite)) {
                visibleSprites++;
            } else {
                hiddenSprites++;
            }
        }

        return {
            total: totalSprites,
            visible: visibleSprites,
            hidden: hiddenSprites,
            cullingRatio: totalSprites > 0 ? (hiddenSprites / totalSprites) * 100 : 0,
            viewportBounds: this.getVisibleBounds()
        };
    }
}
