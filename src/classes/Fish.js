import * as PIXI from 'pixi.js';
import { FISH_CONFIG, COLORS, MOODS } from '../constants/index.js';
import { randomRange, randomChoice, clamp, calculateOptimalEntityCounts, isMobileDevice } from '../utils/performance.js';
import { useFishStore } from '../stores/fishStore.js';

/**
 * Individual fish entity with swimming behavior and animation
 */
export class Fish {
    /**
     * Create a new fish instance
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     * @param {Object} safeZone - Safe zone boundaries {x, y, width, height}
     * @param {Object} fishData - Optional data from database to restore fish state
     */
    constructor(worldWidth, worldHeight, safeZone, fishData = null) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        
        if (fishData) {
            // Restore fish from database data
            this.id = fishData.id;
            this.name = fishData.name;
            this.baseSpeed = fishData.baseSpeed || randomRange(FISH_CONFIG.BASE_SPEED_MIN, FISH_CONFIG.BASE_SPEED_MAX);
            this.currentSpeed = fishData.currentSpeed || this.baseSpeed;
            this.direction = fishData.direction || (Math.random() > 0.5 ? 1 : -1);
            this.targetY = fishData.targetY || this.getRandomTargetY();
            this.verticalSpeed = fishData.verticalSpeed || randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
            this.driftInterval = fishData.driftInterval || Math.round(randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX));
            this.animationSpeed = fishData.animationSpeed || Math.round(randomRange(FISH_CONFIG.ANIMATION_SPEED_MIN, FISH_CONFIG.ANIMATION_SPEED_MAX));
            this.frameCount = fishData.frameCount || FISH_CONFIG.ANIMATION_FRAMES;
            this.currentFrame = fishData.currentFrame || 0;
            this.color = fishData.color || randomChoice(COLORS.FISH_COLORS);
            this.spriteUrl = fishData.spriteUrl || null;
        } else {
            // Create new random fish
            this.id = null; // Will be assigned when saved to database
            this.name = null;
            this.baseSpeed = randomRange(FISH_CONFIG.BASE_SPEED_MIN, FISH_CONFIG.BASE_SPEED_MAX);
            this.currentSpeed = this.baseSpeed;
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.targetY = this.getRandomTargetY();
            this.verticalSpeed = randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
            this.driftInterval = Math.round(randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX));
            this.animationSpeed = Math.round(randomRange(FISH_CONFIG.ANIMATION_SPEED_MIN, FISH_CONFIG.ANIMATION_SPEED_MAX));
            this.frameCount = FISH_CONFIG.ANIMATION_FRAMES;
            this.currentFrame = 0;
            this.color = randomChoice(COLORS.FISH_COLORS);
            this.spriteUrl = null;
        }
        
        // Animation properties
        this.driftTimer = 0;
        this.lastFrameTime = 0;
        
        // Sprite loading properties
        this.spriteTexture = null;
        this.isUsingCustomSprite = false;
        
        // Create sprite
        this.createSprite();
        
        if (fishData && fishData.positionX !== undefined && fishData.positionY !== undefined) {
            // Restore position from database
            this.sprite.x = fishData.positionX;
            this.sprite.y = fishData.positionY;
        } else {
            // Random spawn position
            this.respawn();
        }
    }
    
    /**
     * Create the fish sprite with graphics or custom sprite
     */
    createSprite() {
        try {
            if (this.spriteUrl) {
                this.loadCustomSprite();
            } else {
                this.createGraphicsSprite();
            }
        } catch (error) {
            console.error('Error creating fish sprite:', error);
            // Fallback to graphics sprite
            this.createGraphicsSprite();
        }
    }
    
    /**
     * Load custom sprite from URL
     */
    async loadCustomSprite() {
        try {
            const texture = await PIXI.Assets.load(this.spriteUrl);
            this.spriteTexture = texture;
            
            // Remove old sprite if exists
            if (this.sprite) {
                if (this.sprite.parent) {
                    this.sprite.parent.removeChild(this.sprite);
                }
                this.sprite.destroy();
            }
            
            // Create new sprite with loaded texture
            this.sprite = new PIXI.Sprite(texture);
            this.sprite.anchor.set(0.5, 0.5);
            
            // Scale sprite to reasonable size (maintain aspect ratio)
            const targetSize = Math.max(FISH_CONFIG.SPRITE_SIZE.width, FISH_CONFIG.SPRITE_SIZE.height);
            const scale = targetSize / Math.max(texture.width, texture.height);
            this.sprite.scale.set(scale * 0.8); // Make it slightly smaller than default fish
            
            // Ensure proper settings for PIXI v7
            this.sprite.interactive = false;
            this.sprite.interactiveChildren = false;
            
            this.isUsingCustomSprite = true;
            
            console.log(`Custom sprite loaded successfully from ${this.spriteUrl}`);
        } catch (error) {
            console.error('Error loading custom sprite:', error);
            // Fallback to graphics sprite
            this.createGraphicsSprite();
        }
    }
    
    /**
     * Create graphics-based fish sprite (original method)
     */
    createGraphicsSprite() {
        try {
            // Remove old sprite if exists
            if (this.sprite) {
                if (this.sprite.parent) {
                    this.sprite.parent.removeChild(this.sprite);
                }
                this.sprite.destroy();
            }
            
            this.sprite = new PIXI.Graphics();
            
            // Ensure proper settings for PIXI v7
            this.sprite.interactive = false;
            this.sprite.interactiveChildren = false;
            
            this.isUsingCustomSprite = false;
            this.updateFrame();
            
            console.log(`Graphics fish sprite created successfully with color 0x${this.color.toString(16)}`);
        } catch (error) {
            console.error('Error creating graphics fish sprite:', error);
            throw error;
        }
    }
    
    /**
     * Update the fish sprite animation frame
     */
    updateFrame() {
        try {
            // Only update graphics-based sprites, custom sprites don't need frame updates
            if (!this.isUsingCustomSprite && this.sprite instanceof PIXI.Graphics) {
                this.sprite.clear();
                
                // Draw fish body
                this.sprite.ellipse(0, 0, FISH_CONFIG.SPRITE_SIZE.width, FISH_CONFIG.SPRITE_SIZE.height);
                this.sprite.fill({ color: this.color, alpha: 0.8 });
                
                // Tail animation (oscillates based on frame)
                const tailOffset = Math.sin(this.currentFrame / this.frameCount * Math.PI * 2) * 3;
                this.sprite.poly([
                    -15, tailOffset - 4,
                    -25, tailOffset - 8,
                    -25, tailOffset + 8,
                    -15, tailOffset + 4
                ]);
                this.sprite.fill({ color: this.color, alpha: 0.6 });
                
                // Eye
                this.sprite.circle(8, -2, FISH_CONFIG.EYE_SIZE);
                this.sprite.fill(COLORS.EYE_WHITE);
                this.sprite.circle(9, -2, FISH_CONFIG.EYE_SIZE / 2);
                this.sprite.fill(COLORS.EYE_BLACK);
            }
        } catch (error) {
            console.error('Error updating fish frame:', error);
        }
    }
    
    /**
     * Update fish sprite (e.g., when sprite URL changes)
     */
    async updateSprite(newSpriteUrl) {
        this.spriteUrl = newSpriteUrl;
        const oldX = this.sprite.x;
        const oldY = this.sprite.y;
        const oldScaleX = this.sprite.scale.x;
        
        if (newSpriteUrl) {
            await this.loadCustomSprite();
        } else {
            this.createGraphicsSprite();
        }
        
        // Restore position and direction
        this.sprite.x = oldX;
        this.sprite.y = oldY;
        this.sprite.scale.x = Math.abs(this.sprite.scale.x) * Math.sign(oldScaleX);
    }
    
    /**
     * Get a random Y position within safe swimming area
     * @returns {number} Random Y coordinate
     */
    getRandomTargetY() {
        return randomRange(FISH_CONFIG.VERTICAL_MARGIN, this.worldHeight - FISH_CONFIG.VERTICAL_MARGIN);
    }
    
    /**
     * Get a random spawn position outside the safe zone
     * @returns {Object} Position object {x, y}
     */
    getRandomSpawnPosition() {
        let x, y;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
            x = Math.random() * this.worldWidth;
            y = this.getRandomTargetY();
            attempts++;
        } while (this.isInSafeZone(x, y) && attempts < maxAttempts);
        
        // If we couldn't find a spot outside safe zone, spawn at edges
        if (attempts >= maxAttempts) {
            x = Math.random() > 0.5 ? -FISH_CONFIG.BOUNDARY_MARGIN : this.worldWidth + FISH_CONFIG.BOUNDARY_MARGIN;
            y = this.getRandomTargetY();
        }
        
        return { x, y };
    }
    
    /**
     * Check if a position is within the safe zone (UI overlay area)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} Whether position is in safe zone
     */
    isInSafeZone(x, y) {
        return x >= this.safeZone.x && 
               x <= this.safeZone.x + this.safeZone.width &&
               y >= this.safeZone.y && 
               y <= this.safeZone.y + this.safeZone.height;
    }
    
    /**
     * Respawn the fish at a new random position
     */
    respawn() {
        const pos = this.getRandomSpawnPosition();
        this.sprite.x = pos.x;
        this.sprite.y = pos.y;
        this.targetY = this.getRandomTargetY();
    }
    
    /**
     * Set the fish speed based on mood multiplier
     * @param {number} multiplier - Speed multiplier (0.3 for pause, 1.0 for work, 2.0 for lunch)
     */
    setMoodSpeed(multiplier) {
        this.currentSpeed = clamp(this.baseSpeed * multiplier, 0.1, 5.0);
    }
    
    /**
     * Update fish position, animation, and behavior
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        // Update animation frame
        this.lastFrameTime += deltaTime;
        if (this.lastFrameTime >= this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.updateFrame();
            this.lastFrameTime = 0;
        }
        
        // Horizontal movement
        this.sprite.x += this.direction * this.currentSpeed * deltaTime * 0.1;
        
        // Check world boundaries and flip direction
        if (this.sprite.x < -FISH_CONFIG.BOUNDARY_MARGIN) {
            this.direction = 1;
            this.sprite.scale.x = 1;
        } else if (this.sprite.x > this.worldWidth + FISH_CONFIG.BOUNDARY_MARGIN) {
            this.direction = -1;
            this.sprite.scale.x = -1;
        }
        
        // Update vertical drift
        this.driftTimer += deltaTime;
        if (this.driftTimer >= this.driftInterval) {
            this.targetY = this.getRandomTargetY();
            this.driftTimer = 0;
            this.driftInterval = randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX);
        }
        
        // Move toward target Y
        const yDiff = this.targetY - this.sprite.y;
        if (Math.abs(yDiff) > 2) {
            this.sprite.y += Math.sign(yDiff) * this.verticalSpeed * deltaTime * 0.1;
        }
        
        // Ensure fish direction sprite flipping
        if (this.direction > 0) {
            this.sprite.scale.x = 1;
        } else {
            this.sprite.scale.x = -1;
        }
    }
}

/**
 * Manages all fish entities in the aquarium
 */
export class FishManager {
    /**
     * Create a new fish manager
     * @param {PIXI.Container} container - PIXI container for fish sprites
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     * @param {Object} safeZone - Safe zone boundaries {x, y, width, height}
     */
    constructor(container, worldWidth, worldHeight, safeZone) {
        this.container = container;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        this.fish = [];
        
        // Determine fish count based on screen size and performance
        this.maxFish = this.getOptimalFishCount();
        this.moodMultiplier = 1.0;
        
        // Track database sync
        this.lastSyncTime = Date.now();
        this.syncInterval = 5000; // Sync fish positions every 5 seconds
        
        // Initialize fish from Fish Store instead of database directly
        this.initializeFishFromStore();
        
        // Subscribe to fish store changes for real-time updates
        this.setupStoreSubscription();
    }
    
    /**
     * Calculate optimal fish count based on screen size and device capabilities
     * @returns {number} Optimal number of fish
     */
    getOptimalFishCount() {
        const entityCounts = calculateOptimalEntityCounts(
            window.innerWidth, 
            window.innerHeight, 
            isMobileDevice()
        );
        return entityCounts.fish;
    }
    
    /**
     * Initialize fish from Fish Store data
     */
    async initializeFishFromStore() {
        try {
            // Wait for Fish Store to finish loading from database
            await this.waitForStoreToLoad();
            
            // Get fish store state after loading is complete
            const { fish: storeFish, needsDefaultPopulation, populateDefaultFish } = useFishStore.getState();
            
            console.log(`Fish Store loaded, contains ${storeFish.length} fish, needs population: ${needsDefaultPopulation}`);
            
            // If store indicates we need default fish, populate them
            if (needsDefaultPopulation && storeFish.length === 0) {
                console.log('Populating default fish as requested by store...');
                await populateDefaultFish(this.maxFish, this.worldWidth, this.worldHeight);
                
                // Wait a moment for the fish to be added to store via real-time subscription
                setTimeout(() => {
                    this.createVisualFishFromStore();
                }, 200);
            } else {
                // Create visual fish from existing store data
                this.createVisualFishFromStore();
            }
            
        } catch (error) {
            console.error('Error loading fish from store, falling back to random fish:', error);
            this.spawnRandomFish();
        }
    }
    
    /**
     * Wait for Fish Store to finish loading from database
     */
    async waitForStoreToLoad() {
        return new Promise((resolve) => {
            const checkLoading = () => {
                const { isLoading } = useFishStore.getState();
                if (!isLoading) {
                    console.log('Fish Store finished loading');
                    resolve();
                } else {
                    console.log('Waiting for Fish Store to finish loading...');
                    setTimeout(checkLoading, 50); // Check every 50ms
                }
            };
            checkLoading();
        });
    }
    
    /**
     * Create visual fish instances from current Fish Store data
     */
    createVisualFishFromStore() {
        try {
            const { fish: storeFish, convertDbFishToRuntime } = useFishStore.getState();
            
            // Clear existing fish
            this.clearAllFish();
            
            // Create fish instances from store data
            for (const storeFishData of storeFish) {
                const fishData = convertDbFishToRuntime(storeFishData);
                const fish = new Fish(this.worldWidth, this.worldHeight, this.safeZone, fishData);
                this.fish.push(fish);
                this.container.addChild(fish.sprite);
            }
            
            console.log(`Created ${this.fish.length} visual fish from store data`);
            
            // If still no fish after all attempts, create fallback fish
            if (this.fish.length === 0) {
                console.log('No fish created from store, creating random fish as fallback');
                this.spawnRandomFish();
            }
            
        } catch (error) {
            console.error('Error creating visual fish from store:', error);
            this.spawnRandomFish();
        }
    }
    
    /**
     * Subscribe to Fish Store changes for real-time updates
     */
    setupStoreSubscription() {
        // Subscribe to fish store changes
        this.storeUnsubscribe = useFishStore.subscribe((state, prevState) => {
            // Check if fish data has changed
            if (state.fish !== prevState.fish) {
                console.log('Fish store updated, refreshing visual fish');
                this.createVisualFishFromStore();
            }
        });
    }
    
    /**
     * Cleanup method to unsubscribe from store and clean up resources
     */
    destroy() {
        // Unsubscribe from store changes
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
        
        // Clear all fish
        this.clearAllFish();
        
        console.log('FishManager destroyed and cleaned up');
    }
    
    /**
     * Clear all visual fish from the aquarium
     */
    clearAllFish() {
        for (const fish of this.fish) {
            if (fish.sprite && fish.sprite.parent) {
                this.container.removeChild(fish.sprite);
            }
        }
        this.fish = [];
    }
    
    /**
     * Spawn random fish (fallback method)
     */
    spawnRandomFish() {
        console.log(`Creating ${this.maxFish} random fish as fallback`);
        
        for (let i = 0; i < this.maxFish; i++) {
            try {
                const fish = new Fish(this.worldWidth, this.worldHeight, this.safeZone);
                this.fish.push(fish);
                this.container.addChild(fish.sprite);
                
                // Apply current mood speed
                fish.setMoodSpeed(this.moodMultiplier);
                
                console.log(`Created fish ${i + 1}/${this.maxFish} at position (${fish.sprite.x.toFixed(1)}, ${fish.sprite.y.toFixed(1)})`);
            } catch (error) {
                console.error(`Error creating fish ${i + 1}:`, error);
            }
        }
        
        console.log(`Successfully created ${this.fish.length} fish sprites and added to container`);
    }
    
    /**
     * Set the mood for all fish, affecting their swimming speed
     * @param {string} mood - Mood identifier ('work', 'pause', 'lunch')
     */
    setMood(mood) {
        const moodConfig = Object.values(MOODS).find(m => m.id === mood);
        this.moodMultiplier = moodConfig ? moodConfig.speedMultiplier : MOODS.WORK.speedMultiplier;
        
        this.fish.forEach(fish => {
            fish.setMoodSpeed(this.moodMultiplier);
        });
    }
    
    /**
     * Update all fish positions and animations
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        this.fish.forEach(fish => {
            fish.update(deltaTime);
        });
        
        // Periodically sync fish positions to database
        const now = Date.now();
        if (now - this.lastSyncTime > this.syncInterval) {
            this.syncFishPositionsToDatabase();
            this.lastSyncTime = now;
        }
    }
    
    /**
     * Sync fish positions to the database
     */
    async syncFishPositionsToDatabase() {
        try {
            // Import database service for updating positions
            const { databaseService } = await import('../services/database.js');
            
            const positionUpdates = this.fish
                .filter(fish => fish.id) // Only sync fish that have database IDs
                .map(fish => ({
                    id: fish.id,
                    position_x: fish.sprite.x,
                    position_y: fish.sprite.y,
                    target_y: fish.targetY,
                    current_frame: Math.round(fish.currentFrame),
                    direction: fish.direction
                }));
                
            if (positionUpdates.length > 0) {
                await databaseService.updateFishPositions(positionUpdates);
            }
        } catch (error) {
            console.error('Error syncing fish positions:', error);
        }
    }
    
    /**
     * Handle aquarium resize by updating fish boundaries and count
     * @param {number} newWorldWidth - New world width in pixels
     * @param {number} newWorldHeight - New world height in pixels
     * @param {Object} newSafeZone - New safe zone boundaries
     */
    resize(newWorldWidth, newWorldHeight, newSafeZone) {
        this.worldWidth = newWorldWidth;
        this.worldHeight = newWorldHeight;
        this.safeZone = newSafeZone;
        
        // Update all fish with new boundaries
        this.fish.forEach(fish => {
            fish.worldWidth = newWorldWidth;
            fish.worldHeight = newWorldHeight;
            fish.safeZone = newSafeZone;
            
            // Ensure fish are within new bounds
            if (fish.sprite.y > newWorldHeight - FISH_CONFIG.VERTICAL_MARGIN) {
                fish.sprite.y = newWorldHeight - FISH_CONFIG.VERTICAL_MARGIN;
            }
            fish.targetY = fish.getRandomTargetY();
        });
        
        // Adjust fish count if needed
        const newOptimalCount = this.getOptimalFishCount();
        if (newOptimalCount > this.fish.length) {
            // Add more fish
            const fishToAdd = newOptimalCount - this.fish.length;
            for (let i = 0; i < fishToAdd; i++) {
                const fish = new Fish(this.worldWidth, this.worldHeight, this.safeZone);
                fish.setMoodSpeed(this.moodMultiplier);
                this.fish.push(fish);
                this.container.addChild(fish.sprite);
            }
        } else if (newOptimalCount < this.fish.length) {
            // Remove excess fish
            const fishToRemove = this.fish.length - newOptimalCount;
            for (let i = 0; i < fishToRemove; i++) {
                const fish = this.fish.pop();
                this.container.removeChild(fish.sprite);
            }
        }
        
        this.maxFish = newOptimalCount;
    }
    
    /**
     * Clean up fish manager resources
     */
    destroy() {
        this.fish.forEach(fish => {
            if (fish.sprite && fish.sprite.parent) {
                fish.sprite.parent.removeChild(fish.sprite);
            }
        });
        this.fish = [];
    }
}
