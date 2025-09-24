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
     * @param {number} objectData.layer - Rendering layer (default: 0)
     * @param {number} tileSize - Size of each tile in pixels
     */
    constructor(objectData, tileSize) {
        this.id = objectData.id;
        this.spriteUrl = objectData.spriteUrl;
        this.gridX = objectData.gridX;
        this.gridY = objectData.gridY;
        this.size = objectData.size || 6; // Default to 6x6 tiles
        this.layer = objectData.layer || 0; // Default to layer 0
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
            
            // Enable interactivity for click detection
            this.sprite.interactive = true;
            this.sprite.interactiveChildren = false;
            this.sprite.cursor = 'pointer';
            
            // Store object ID reference for click handling
            this.sprite.objectId = this.id;
            
            this.isLoaded = true;
            
            console.log(`Object sprite loaded at grid (${this.gridX}, ${this.gridY})`);
            
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
        
        // Enable interactivity for click detection
        graphics.interactive = true;
        graphics.interactiveChildren = false;
        graphics.cursor = 'pointer';
        
        // Store object ID reference for click handling
        graphics.objectId = this.id;
        
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
     * Update the layer of this object
     * @param {number} newLayer - New layer value
     */
    updateLayer(newLayer) {
        this.layer = Math.max(0, Math.floor(newLayer));
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
            size: this.size,
            layer: this.layer
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
        
        // Selection and sprite blinking system
        this.selectedObjectId = null;
        this.selectedObject = null; // Reference to the selected AquariumObject
        this.blinkTicker = null;
        this.isBlinking = false;
        this.clickCallback = null; // Callback for when an object is clicked
        
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
     * Check if a grid area is within bounds (allows overlapping)
     * @param {number} gridX - Starting grid X position
     * @param {number} gridY - Starting grid Y position  
     * @param {number} size - Size of the object (6 for 6x6)
     * @returns {boolean} True if area is within world bounds
     */
    isGridAreaInBounds(gridX, gridY, size = 6) {
        return !(gridX < 0 || gridY < 0 || 
                gridX + size > this.tilesHorizontal || 
                gridY + size > this.tilesVertical);
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
     * Find the nearest valid grid position for placement (allows overlapping)
     * @param {number} worldX - World X coordinate where drop occurred
     * @param {number} worldY - World Y coordinate where drop occurred
     * @param {number} size - Size of object to place
     * @returns {Object|null} {gridX, gridY} or null if out of bounds
     */
    findNearestAvailablePosition(worldX, worldY, size = 6) {
        // Convert world coordinates to grid coordinates
        const targetGridX = Math.floor(worldX / this.tileSize);
        const targetGridY = Math.floor(worldY / this.tileSize);
        
        // Try the exact position first (allow overlapping)
        if (this.isGridAreaInBounds(targetGridX, targetGridY, size)) {
            return { gridX: targetGridX, gridY: targetGridY };
        }
        
        // If out of bounds, find nearest in-bounds position
        const clampedGridX = Math.max(0, Math.min(targetGridX, this.tilesHorizontal - size));
        const clampedGridY = Math.max(0, Math.min(targetGridY, this.tilesVertical - size));
        
        // Double-check the clamped position is valid
        if (this.isGridAreaInBounds(clampedGridX, clampedGridY, size)) {
            return { gridX: clampedGridX, gridY: clampedGridY };
        }
        
        return null; // This should rarely happen unless the world is too small for the object
    }
    
    /**
     * Add a new object to the aquarium (using world coordinates)
     * @param {string} spriteUrl - URL of the sprite to add
     * @param {number} worldX - World X coordinate for placement
     * @param {number} worldY - World Y coordinate for placement  
     * @param {number} size - Size of the object (default: 6)
     * @param {number} layer - Rendering layer (default: 0)
     * @returns {string|null} Object ID if successful, null if failed
     */
    async addObject(spriteUrl, worldX, worldY, size = 6, layer = 0) {
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
            size: size,
            layer: layer
        };
        
        const aquariumObject = new AquariumObject(objectData, this.tileSize);
        
        // Wait for sprite to load
        while (!aquariumObject.isLoaded) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Track the object first
        this.objects.set(objectId, aquariumObject);
        this.markGridAreaOccupied(objectId, position.gridX, position.gridY, size);
        
        // Add click listener if callback is set
        this.addClickListener(aquariumObject);
        
        // Add to container with proper layer ordering
        this.addSpriteToContainerInOrder(aquariumObject.sprite, layer);
        
        console.log(`Object placed at grid (${position.gridX}, ${position.gridY}) with layer ${layer} and ID: ${objectId}`);
        
        return objectId;
    }
    
    /**
     * Add a new object at specific grid coordinates
     * @param {string} spriteUrl - URL of the sprite to add
     * @param {number} gridX - Grid X coordinate (top-left tile)
     * @param {number} gridY - Grid Y coordinate (top-left tile)
     * @param {number} size - Size of the object (default: 6)
     * @param {number} layer - Rendering layer (default: 0)
     * @returns {string|null} Object ID if successful, null if failed
     */
    async addObjectAtGrid(spriteUrl, gridX, gridY, size = 6, layer = 0) {
        // Check if the grid position is valid and within bounds
        if (!this.isGridAreaInBounds(gridX, gridY, size)) {
            console.warn(`Grid position (${gridX}, ${gridY}) is out of bounds for ${size}x${size} object`);
            return null;
        }
        
        // Allow overlapping for now (as requested)
        // In the future, you could add overlap checking here: !this.isGridAreaAvailable(gridX, gridY, size)
        
        const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const objectData = {
            id: objectId,
            spriteUrl: spriteUrl,
            gridX: gridX,
            gridY: gridY,
            size: size,
            layer: layer
        };
        
        const aquariumObject = new AquariumObject(objectData, this.tileSize);
        
        // Wait for sprite to load
        while (!aquariumObject.isLoaded) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Track the object
        this.objects.set(objectId, aquariumObject);
        this.markGridAreaOccupied(objectId, gridX, gridY, size);
        
        // Add click listener if callback is set
        this.addClickListener(aquariumObject);
        
        // Add to container with proper layer ordering
        this.addSpriteToContainerInOrder(aquariumObject.sprite, layer);
        
        console.log(`Object placed at precise grid (${gridX}, ${gridY}) with layer ${layer} and ID: ${objectId}`);
        
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
        
        // Sort objects by layer (ascending order)
        const sortedObjectsData = [...objectsData].sort((a, b) => (a.layer || 0) - (b.layer || 0));
        
        for (const objectData of sortedObjectsData) {
            const aquariumObject = new AquariumObject(objectData, this.tileSize);
            
            // Wait for sprite to load
            while (!aquariumObject.isLoaded) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Add to container (already in layer order)
            this.container.addChild(aquariumObject.sprite);
            
            // Track the object
            this.objects.set(objectData.id, aquariumObject);
            this.markGridAreaOccupied(objectData.id, objectData.gridX, objectData.gridY, objectData.size);
            
            // Add click listener if callback is set
            this.addClickListener(aquariumObject);
        }
        
        console.log(`Loaded ${objectsData.length} objects from data (sorted by layer)`);
    }
    
    /**
     * Add sprite to container maintaining layer order
     * @param {PIXI.Sprite} sprite - Sprite to add
     * @param {number} layer - Layer of the sprite
     */
    addSpriteToContainerInOrder(sprite, layer) {
        // Find the correct index to insert the sprite based on layer
        let insertIndex = 0;
        
        for (const [objectId, aquariumObject] of this.objects) {
            if (aquariumObject.layer < layer && aquariumObject.sprite && aquariumObject.sprite.parent === this.container) {
                insertIndex++;
            }
        }
        
        this.container.addChildAt(sprite, insertIndex);
    }
    
    /**
     * Update object layer and reorder in container
     * @param {string} objectId - Object ID to update
     * @param {number} newLayer - New layer value
     */
    updateObjectLayer(objectId, newLayer) {
        const aquariumObject = this.objects.get(objectId);
        if (!aquariumObject) return false;
        
        // Update the object's layer
        aquariumObject.updateLayer(newLayer);
        
        // Remove sprite from container and re-add in correct order
        if (aquariumObject.sprite && aquariumObject.sprite.parent === this.container) {
            this.container.removeChild(aquariumObject.sprite);
            this.addSpriteToContainerInOrder(aquariumObject.sprite, newLayer);
        }
        
        return true;
    }
    
    /**
     * Move an object to foreground (increase layer by 1)
     * @param {string} objectId - Object ID to move
     */
    moveObjectToForeground(objectId) {
        const aquariumObject = this.objects.get(objectId);
        if (!aquariumObject) return false;
        
        const newLayer = aquariumObject.layer + 1;
        return this.updateObjectLayer(objectId, newLayer);
    }
    
    /**
     * Move an object to background (decrease layer by 1, minimum 0)
     * @param {string} objectId - Object ID to move
     */
    moveObjectToBackground(objectId) {
        const aquariumObject = this.objects.get(objectId);
        if (!aquariumObject) return false;
        
        const newLayer = Math.max(0, aquariumObject.layer - 1);
        return this.updateObjectLayer(objectId, newLayer);
    }
    
    /**
     * Clear all objects
     */
    clearAllObjects() {
        // Clear selection before destroying objects
        this.clearSelection();
        
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
    
    /**
     * Set click callback for object selection
     * @param {Function} callback - Function to call when an object is clicked
     */
    setClickCallback(callback) {
        console.log(`🎯 Setting click callback: ${!!callback ? 'enabled' : 'disabled'}, objects count: ${this.objects.size}`);
        this.clickCallback = callback;
        
        // Add click listeners to all existing objects
        for (const aquariumObject of this.objects.values()) {
            this.addClickListener(aquariumObject);
        }
    }
    
    /**
     * Add click listener to an object sprite
     * @param {AquariumObject} aquariumObject - The object to add listener to
     */
    addClickListener(aquariumObject) {
        if (!aquariumObject.sprite || !this.clickCallback) {
            console.log(`Cannot add click listener: sprite=${!!aquariumObject.sprite}, callback=${!!this.clickCallback}`);
            return;
        }
        
        aquariumObject.sprite.removeAllListeners('pointerdown'); // Remove existing listeners
        aquariumObject.sprite.on('pointerdown', (event) => {
            event.stopPropagation();
            console.log(`🔥 Object clicked: ${aquariumObject.id}`, aquariumObject.toData());
            this.selectObject(aquariumObject.id);
            this.clickCallback(aquariumObject.toData());
        });
        
        console.log(`✅ Click listener added to object: ${aquariumObject.id}`);
    }
    
    /**
     * Select an object and make its sprite blink
     * @param {string} objectId - ID of object to select
     */
    selectObject(objectId) {
        // Clear previous selection
        this.clearSelection();
        
        const aquariumObject = this.objects.get(objectId);
        if (!aquariumObject || !aquariumObject.sprite) return;
        
        this.selectedObjectId = objectId;
        this.selectedObject = aquariumObject;
        this.startBlinking();
        
        console.log(`Selected object: ${objectId} - sprite will blink`);
    }
    
    /**
     * Clear object selection and stop blinking
     */
    clearSelection() {
        this.selectedObjectId = null;
        this.selectedObject = null;
        this.stopBlinking();
    }
    
    // Outline methods removed - now using sprite blinking instead
    
    /**
     * Start blinking animation for selected sprite
     */
    startBlinking() {
        this.stopBlinking(); // Stop any existing blink
        
        if (!this.selectedObject || !this.selectedObject.sprite) return;
        
        this.isBlinking = true;
        let blinkState = true;
        
        this.blinkTicker = setInterval(() => {
            if (!this.selectedObject || !this.selectedObject.sprite || !this.isBlinking) {
                this.stopBlinking();
                return;
            }
            
            blinkState = !blinkState;
            
            if (blinkState) {
                // Bright green tint with full opacity
                this.selectedObject.sprite.alpha = 1.0;
                this.selectedObject.sprite.tint = 0x00ff88; // Bright green
            } else {
                // Normal appearance 
                this.selectedObject.sprite.alpha = 0.7;
                this.selectedObject.sprite.tint = 0xffffff; // White (normal)
            }
        }, 400); // Fast blink for visibility
        
        console.log(`Started blinking for selected object: ${this.selectedObject.id}`);
    }
    
    /**
     * Stop blinking animation and restore sprite to normal appearance
     */
    stopBlinking() {
        this.isBlinking = false;
        if (this.blinkTicker) {
            clearInterval(this.blinkTicker);
            this.blinkTicker = null;
        }
        
        // Restore sprite to normal appearance
        if (this.selectedObject && this.selectedObject.sprite) {
            this.selectedObject.sprite.alpha = 1.0;
            this.selectedObject.sprite.tint = 0xffffff; // Reset to white (normal)
            console.log(`Stopped blinking for object: ${this.selectedObject.id}`);
        }
    }
    
    /**
     * Get selected object ID
     * @returns {string|null} Selected object ID or null
     */
    getSelectedObjectId() {
        return this.selectedObjectId;
    }
    
    /**
     * Public method to manually select an object (for UI selection)
     * @param {string} objectId - ID of object to select
     */
    selectObjectById(objectId) {
        this.selectObject(objectId);
    }
}
