import * as PIXI from 'pixi.js';

/**
 * Represents a single object placed in the aquarium
 */
export class AquariumObject {
    /**
     * Create a new aquarium object
     * @param {Object} objectData - Object configuration
     * @param {string} objectData.id - Unique identifier  
     * @param {string} objectData.spriteUrl - URL of the sprite image
     * @param {number} objectData.gridX - Grid X position (in tiles)
     * @param {number} objectData.gridY - Grid Y position (in tiles)
     * @param {number} objectData.size - Size multiplier (default: 6 for 6x6 tiles)
     * @param {number} tileSize - Size of each tile in pixels
     */
    constructor(objectData, tileSize) {
        this.id = objectData.id;
        this.spriteUrl = objectData.spriteUrl;
        this.gridX = objectData.gridX;
        this.gridY = objectData.gridY;
        this.size = objectData.size || 6; // Default to 6x6 tiles
        this.tileSize = tileSize;
        
        // PIXI sprite
        this.sprite = null;
        this.isLoaded = false;
        
        // World position (calculated from grid position)
        this.worldX = (this.gridX + this.size / 2) * this.tileSize;
        this.worldY = (this.gridY + this.size / 2) * this.tileSize;
        
        this.initializeSprite();
    }
    
    /**
     * Initialize the PIXI sprite for this object
     */
    async initializeSprite() {
        try {
            const texture = await PIXI.Assets.load(this.spriteUrl);
            
            this.sprite = new PIXI.Sprite(texture);
            this.sprite.anchor.set(0.5, 0.5);
            
            // Scale sprite to fit the grid size (6x6 tiles by default)
            const targetSize = this.size * this.tileSize;
            const scaleX = targetSize / texture.width;
            const scaleY = targetSize / texture.height;
            const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
            
            this.sprite.scale.set(scale, scale);
            
            // Position the sprite
            this.sprite.x = this.worldX;
            this.sprite.y = this.worldY;
            
            // Disable interactivity
            this.sprite.interactive = false;
            this.sprite.interactiveChildren = false;
            
            this.isLoaded = true;
            
            console.log(`Object sprite loaded: ${this.spriteUrl} at grid (${this.gridX}, ${this.gridY})`);
            
        } catch (error) {
            console.error('Failed to load object sprite:', error);
            this.createFallbackSprite();
        }
    }
    
    /**
     * Create a fallback sprite if image loading fails
     */
    createFallbackSprite() {
        const graphics = new PIXI.Graphics();
        
        // Create a simple colored cube as fallback
        const cubeSize = this.size * this.tileSize;
        graphics.rect(-cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
        graphics.fill(0x888888); // Gray color
        
        // Add border
        graphics.rect(-cubeSize/2, -cubeSize/2, cubeSize, cubeSize);
        graphics.stroke({ width: 2, color: 0x444444 });
        
        graphics.x = this.worldX;
        graphics.y = this.worldY;
        
        graphics.interactive = false;
        graphics.interactiveChildren = false;
        
        this.sprite = graphics;
        this.isLoaded = true;
        
        console.log(`Fallback sprite created for object at grid (${this.gridX}, ${this.gridY})`);
    }
    
    /**
     * Update object position if grid coordinates change
     * @param {number} newGridX - New grid X position
     * @param {number} newGridY - New grid Y position
     */
    updatePosition(newGridX, newGridY) {
        this.gridX = newGridX;
        this.gridY = newGridY;
        this.worldX = (this.gridX + this.size / 2) * this.tileSize;
        this.worldY = (this.gridY + this.size / 2) * this.tileSize;
        
        if (this.sprite) {
            this.sprite.x = this.worldX;
            this.sprite.y = this.worldY;
        }
    }
    
    /**
     * Remove this object and cleanup
     */
    destroy() {
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
        if (this.sprite && this.sprite.destroy) {
            this.sprite.destroy();
        }
        this.sprite = null;
        this.isLoaded = false;
    }
    
    /**
     * Get object data for database storage
     */
    toData() {
        return {
            id: this.id,
            spriteUrl: this.spriteUrl,
            gridX: this.gridX,
            gridY: this.gridY,
            size: this.size
        };
    }
}

/**
 * Manages all placed objects in the aquarium
 */
export class ObjectManager {
    /**
     * Create a new object manager
     * @param {PIXI.Container} container - PIXI container for object sprites
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels  
     * @param {number} tileSize - Size of each tile in pixels
     * @param {number} tilesHorizontal - Number of horizontal tiles
     * @param {number} tilesVertical - Number of vertical tiles
     */
    constructor(container, worldWidth, worldHeight, tileSize, tilesHorizontal, tilesVertical) {
        this.container = container;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.tileSize = tileSize;
        this.tilesHorizontal = tilesHorizontal;
        this.tilesVertical = tilesVertical;
        
        this.objects = new Map(); // Map of object ID to AquariumObject
        this.gridOccupancy = []; // 2D array to track occupied grid positions
        
        this.initializeGrid();
        
        console.log(`ObjectManager initialized for ${tilesHorizontal}x${tilesVertical} grid`);
    }
    
    /**
     * Initialize the grid occupancy tracking
     */
    initializeGrid() {
        this.gridOccupancy = [];
        for (let y = 0; y < this.tilesVertical; y++) {
            this.gridOccupancy[y] = [];
            for (let x = 0; x < this.tilesHorizontal; x++) {
                this.gridOccupancy[y][x] = null; // null = empty, string = object ID
            }
        }
    }
    
    /**
     * Check if a grid area is available for placement
     * @param {number} gridX - Starting grid X position
     * @param {number} gridY - Starting grid Y position  
     * @param {number} size - Size of the object (6 for 6x6)
     * @param {string} excludeObjectId - Object ID to exclude from collision check (for movement)
     * @returns {boolean} True if area is available
     */
    isGridAreaAvailable(gridX, gridY, size = 6, excludeObjectId = null) {
        // Check bounds
        if (gridX < 0 || gridY < 0 || 
            gridX + size > this.tilesHorizontal || 
            gridY + size > this.tilesVertical) {
            return false;
        }
        
        // Check occupancy
        for (let y = gridY; y < gridY + size; y++) {
            for (let x = gridX; x < gridX + size; x++) {
                const occupyingId = this.gridOccupancy[y][x];
                if (occupyingId !== null && occupyingId !== excludeObjectId) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Mark grid area as occupied by an object
     * @param {string} objectId - ID of the object
     * @param {number} gridX - Starting grid X position
     * @param {number} gridY - Starting grid Y position
     * @param {number} size - Size of the object
     */
    markGridAreaOccupied(objectId, gridX, gridY, size = 6) {
        for (let y = gridY; y < gridY + size; y++) {
            for (let x = gridX; x < gridX + size; x++) {
                this.gridOccupancy[y][x] = objectId;
            }
        }
    }
    
    /**
     * Clear grid area occupation
     * @param {number} gridX - Starting grid X position
     * @param {number} gridY - Starting grid Y position  
     * @param {number} size - Size of the area to clear
     */
    clearGridArea(gridX, gridY, size = 6) {
        for (let y = gridY; y < gridY + size; y++) {
            for (let x = gridX; x < gridX + size; x++) {
                if (y >= 0 && y < this.tilesVertical && 
                    x >= 0 && x < this.tilesHorizontal) {
                    this.gridOccupancy[y][x] = null;
                }
            }
        }
    }
    
    /**
     * Find the nearest available grid position for placement
     * @param {number} worldX - World X coordinate where drop occurred
     * @param {number} worldY - World Y coordinate where drop occurred
     * @param {number} size - Size of object to place
     * @returns {Object|null} {gridX, gridY} or null if no space available
     */
    findNearestAvailablePosition(worldX, worldY, size = 6) {
        // Convert world coordinates to grid coordinates
        const targetGridX = Math.floor(worldX / this.tileSize);
        const targetGridY = Math.floor(worldY / this.tileSize);
        
        // Try the exact position first
        if (this.isGridAreaAvailable(targetGridX, targetGridY, size)) {
            return { gridX: targetGridX, gridY: targetGridY };
        }
        
        // Spiral search for nearest available position
        const maxRadius = Math.max(this.tilesHorizontal, this.tilesVertical);
        
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip if not on the edge of the current radius
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }
                    
                    const testX = targetGridX + dx;
                    const testY = targetGridY + dy;
                    
                    if (this.isGridAreaAvailable(testX, testY, size)) {
                        return { gridX: testX, gridY: testY };
                    }
                }
            }
        }
        
        return null; // No available space found
    }
    
    /**
     * Add a new object to the aquarium
     * @param {string} spriteUrl - URL of the sprite to add
     * @param {number} worldX - World X coordinate for placement
     * @param {number} worldY - World Y coordinate for placement  
     * @param {number} size - Size of the object (default: 6)
     * @returns {string|null} Object ID if successful, null if failed
     */
    async addObject(spriteUrl, worldX, worldY, size = 6) {
        const position = this.findNearestAvailablePosition(worldX, worldY, size);
        
        if (!position) {
            console.warn('No available space to place object');
            return null;
        }
        
        const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const objectData = {
            id: objectId,
            spriteUrl: spriteUrl,
            gridX: position.gridX,
            gridY: position.gridY,
            size: size
        };
        
        const aquariumObject = new AquariumObject(objectData, this.tileSize);
        
        // Wait for sprite to load
        while (!aquariumObject.isLoaded) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Add to container
        this.container.addChild(aquariumObject.sprite);
        
        // Track the object
        this.objects.set(objectId, aquariumObject);
        this.markGridAreaOccupied(objectId, position.gridX, position.gridY, size);
        
        console.log(`Object placed at grid (${position.gridX}, ${position.gridY}) with ID: ${objectId}`);
        
        return objectId;
    }
    
    /**
     * Remove an object from the aquarium
     * @param {string} objectId - ID of object to remove
     */
    removeObject(objectId) {
        const object = this.objects.get(objectId);
        if (!object) {
            console.warn(`Object ${objectId} not found`);
            return;
        }
        
        // Clear grid occupancy
        this.clearGridArea(object.gridX, object.gridY, object.size);
        
        // Remove from container and cleanup
        object.destroy();
        
        // Remove from tracking
        this.objects.delete(objectId);
        
        console.log(`Object ${objectId} removed`);
    }
    
    /**
     * Get all objects data for persistence
     * @returns {Array} Array of object data
     */
    getAllObjectsData() {
        return Array.from(this.objects.values()).map(obj => obj.toData());
    }
    
    /**
     * Load objects from data (e.g., from database)
     * @param {Array} objectsData - Array of object data
     */
    async loadObjectsFromData(objectsData) {
        // Clear existing objects
        this.clearAllObjects();
        
        for (const objectData of objectsData) {
            const aquariumObject = new AquariumObject(objectData, this.tileSize);
            
            // Wait for sprite to load
            while (!aquariumObject.isLoaded) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Add to container
            this.container.addChild(aquariumObject.sprite);
            
            // Track the object
            this.objects.set(objectData.id, aquariumObject);
            this.markGridAreaOccupied(objectData.id, objectData.gridX, objectData.gridY, objectData.size);
        }
        
        console.log(`Loaded ${objectsData.length} objects from data`);
    }
    
    /**
     * Clear all objects
     */
    clearAllObjects() {
        for (const object of this.objects.values()) {
            object.destroy();
        }
        this.objects.clear();
        this.initializeGrid();
    }
    
    /**
     * Get count of placed objects
     * @returns {number} Number of objects
     */
    getObjectCount() {
        return this.objects.size;
    }
}
