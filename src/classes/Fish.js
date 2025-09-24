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
            this.baseSpeed = (fishData.baseSpeed !== undefined && fishData.baseSpeed > 0) ? fishData.baseSpeed : randomRange(FISH_CONFIG.BASE_SPEED_MIN, FISH_CONFIG.BASE_SPEED_MAX);
            this.currentSpeed = (fishData.currentSpeed !== undefined && fishData.currentSpeed > 0) ? fishData.currentSpeed : this.baseSpeed;
            this.direction = (fishData.direction !== undefined && (fishData.direction === 1 || fishData.direction === -1)) ? fishData.direction : (Math.random() > 0.5 ? 1 : -1);
            this.targetY = fishData.targetY || this.getRandomTargetY();
            this.verticalSpeed = (fishData.verticalSpeed !== undefined && fishData.verticalSpeed > 0) ? fishData.verticalSpeed : randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
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
        
        // Store position data for later use
        this.initialPositionX = fishData?.positionX;
        this.initialPositionY = fishData?.positionY;
        this.spriteReady = false;
        this.hasWarnedZeroMovement = false;
        
        // Create sprite (async for custom sprites)
        this.createSprite();
    }
    
    /**
     * Create the fish sprite with graphics or custom sprite
     */
    async createSprite() {
        try {
            if (this.spriteUrl) {
                await this.loadCustomSprite();
            } else {
                this.createGraphicsSprite();
            }
            
            // Set initial position after sprite is created
            this.setSpritePosition();
        } catch (error) {
            console.error('Error creating fish sprite:', error);
            // Fallback to graphics sprite
            this.createGraphicsSprite();
            this.setSpritePosition();
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
            
            // Scale sprite to reasonable size (similar to shark scaling)
            this.sprite.scale.set(0.8, 0.8); // Use same scaling approach as shark
            
            // Ensure proper settings for PIXI v7
            this.sprite.interactive = false;
            this.sprite.interactiveChildren = false;
            
            this.isUsingCustomSprite = true;
            this.spriteReady = true;
            
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
            this.spriteReady = true;
            this.updateFrame();
            
            console.log(`Graphics fish sprite created successfully with color 0x${this.color.toString(16)}`);
        } catch (error) {
            console.error('Error creating graphics fish sprite:', error);
            throw error;
        }
    }
    
    /**
     * Set sprite position based on initial data or random spawn
     */
    setSpritePosition() {
        if (!this.sprite || !this.spriteReady) return;
        
        if (this.initialPositionX !== undefined && this.initialPositionY !== undefined) {
            // Restore position from database
            this.sprite.x = this.initialPositionX;
            this.sprite.y = this.initialPositionY;
        } else {
            // Random spawn position
            this.respawn();
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
        const oldX = this.sprite?.x;
        const oldY = this.sprite?.y;
        const oldScaleX = this.sprite?.scale?.x;
        
        if (newSpriteUrl) {
            await this.loadCustomSprite();
        } else {
            this.createGraphicsSprite();
        }
        
        // Restore position and direction if sprite is ready
        if (this.sprite && this.spriteReady) {
            if (oldX !== undefined) this.sprite.x = oldX;
            if (oldY !== undefined) this.sprite.y = oldY;
            if (oldScaleX !== undefined) {
                // Restore the sign of the scale while preserving the new calculated magnitude
                this.sprite.scale.x = Math.abs(this.sprite.scale.x) * Math.sign(oldScaleX);
            }
        }
    }

    /**
     * Update fish color and redraw
     */
    updateColor(newColor) {
        this.color = typeof newColor === 'string' ? parseInt(newColor, 16) : newColor;
        if (!this.isUsingCustomSprite && this.sprite instanceof PIXI.Graphics) {
            this.updateFrame(); // This will redraw with new color
        }
    }

    /**
     * Update fish name
     */
    updateName(newName) {
        this.name = newName;
    }

    /**
     * Update multiple fish properties at once
     */
    async updateProperties(updates) {
        if (updates.color !== undefined) {
            this.updateColor(updates.color);
        }
        if (updates.name !== undefined) {
            this.updateName(updates.name);
        }
        if (updates.sprite_url !== undefined) {
            await this.updateSprite(updates.sprite_url);
        }
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
        if (!this.sprite || !this.spriteReady) return;
        
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
        // Don't update if sprite isn't ready
        if (!this.sprite || !this.spriteReady) return;
        
        // Debug: Check for zero movement issues (warn only once)
        if ((this.currentSpeed <= 0 || this.direction === 0 || this.verticalSpeed <= 0) && !this.hasWarnedZeroMovement) {
            console.warn(`Fish ${this.id || 'unnamed'} has zero movement! currentSpeed: ${this.currentSpeed}, direction: ${this.direction}, verticalSpeed: ${this.verticalSpeed}`);
            this.hasWarnedZeroMovement = true;
        }
        
        // Update animation frame
        this.lastFrameTime += deltaTime;
        if (this.lastFrameTime >= this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.updateFrame();
            this.lastFrameTime = 0;
        }
        
        // Horizontal movement
        this.sprite.x += this.direction * this.currentSpeed * deltaTime * 0.1;
        
        // Check world boundaries and bounce with random direction
        if (this.sprite.x < -FISH_CONFIG.BOUNDARY_MARGIN) {
            // Hit left boundary - choose random direction favoring right
            this.direction = Math.random() > 0.2 ? 1 : -1; // 80% chance to go right, 20% to stay left
            this.sprite.scale.x = this.direction > 0 ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
            
            // Also randomize vertical target for more chaotic bouncing behavior
            this.targetY = this.getRandomTargetY();
        } else if (this.sprite.x > this.worldWidth + FISH_CONFIG.BOUNDARY_MARGIN) {
            // Hit right boundary - choose random direction favoring left
            this.direction = Math.random() > 0.2 ? -1 : 1; // 80% chance to go left, 20% to stay right
            this.sprite.scale.x = this.direction > 0 ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
            
            // Also randomize vertical target for more chaotic bouncing behavior
            this.targetY = this.getRandomTargetY();
        }
        
        // Check vertical boundaries and bounce
        if (this.sprite.y < FISH_CONFIG.VERTICAL_MARGIN) {
            // Hit top boundary - set target to lower area
            this.targetY = randomRange(this.worldHeight * 0.3, this.worldHeight - FISH_CONFIG.VERTICAL_MARGIN);
        } else if (this.sprite.y > this.worldHeight - FISH_CONFIG.VERTICAL_MARGIN) {
            // Hit bottom boundary - set target to upper area
            this.targetY = randomRange(FISH_CONFIG.VERTICAL_MARGIN, this.worldHeight * 0.7);
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
        
        // Ensure fish direction sprite flipping (sprites naturally face right, so flip for right movement)
        if (this.direction > 0) {
            this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Flip for right movement
        } else {
            this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Normal for left movement
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
        this.syncDebounceTimer = null;
        
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
                
                // Wait for sprite to be ready before adding to container
                this.waitForFishSprite(fish);
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
                console.log('Fish store updated, handling changes intelligently');
                this.handleFishStoreChanges(state.fish, prevState.fish);
            }
        });
    }

    /**
     * Handle fish store changes by updating individual fish instead of recreating all
     */
    async handleFishStoreChanges(newFish, oldFish) {
        try {
            const { convertDbFishToRuntime } = useFishStore.getState();
            
            // Create maps for easier comparison
            const oldFishMap = new Map(oldFish.map(f => [f.id, f]));
            const newFishMap = new Map(newFish.map(f => [f.id, f]));
            const visualFishMap = new Map(this.fish.map(f => [f.id, f]));

            // Handle removed fish
            for (const [fishId] of oldFishMap) {
                if (!newFishMap.has(fishId)) {
                    const visualFish = visualFishMap.get(fishId);
                    if (visualFish) {
                        this.container.removeChild(visualFish.sprite);
                        this.fish = this.fish.filter(f => f.id !== fishId);
                        console.log(`Removed fish ${fishId}`);
                    }
                }
            }

            // Handle new fish
            for (const [fishId, fishData] of newFishMap) {
                if (!oldFishMap.has(fishId)) {
                    const runtimeData = convertDbFishToRuntime(fishData);
                    const newFish = new Fish(this.worldWidth, this.worldHeight, this.safeZone, runtimeData);
                    this.fish.push(newFish);
                    
                    // Wait for sprite to be ready before adding to container
                    this.waitForFishSprite(newFish);
                    newFish.setMoodSpeed(this.moodMultiplier);
                    console.log(`Added new fish ${fishId}`);
                }
            }

            // Handle updated fish
            for (const [fishId, newFishData] of newFishMap) {
                const oldFishData = oldFishMap.get(fishId);
                if (oldFishData && this.hasFishChanged(oldFishData, newFishData)) {
                    const visualFish = visualFishMap.get(fishId);
                    if (visualFish) {
                        // Convert database format to runtime format for updates
                        const updates = {};
                        if (oldFishData.color !== newFishData.color) {
                            updates.color = newFishData.color;
                        }
                        if (oldFishData.name !== newFishData.name) {
                            updates.name = newFishData.name;
                        }
                        if (oldFishData.sprite_url !== newFishData.sprite_url) {
                            updates.sprite_url = newFishData.sprite_url;
                        }

                        await visualFish.updateProperties(updates);
                        console.log(`Updated fish ${fishId} properties:`, Object.keys(updates));
                    }
                }
            }
        } catch (error) {
            console.error('Error handling fish store changes:', error);
            // Fallback to full recreation on error
            this.createVisualFishFromStore();
        }
    }

    /**
     * Wait for fish sprite to be ready and add to container
     * @param {Fish} fish - Fish instance
     */
    waitForFishSprite(fish) {
        const checkSprite = () => {
            if (fish.spriteReady && fish.sprite) {
                this.container.addChild(fish.sprite);
                console.log(`Fish sprite ${fish.id || 'unnamed'} added to container`);
            } else {
                setTimeout(checkSprite, 10); // Check again in 10ms
            }
        };
        checkSprite();
    }

    /**
     * Check if fish data has changed in ways that affect visuals
     */
    hasFishChanged(oldFish, newFish) {
        return oldFish.color !== newFish.color ||
               oldFish.name !== newFish.name ||
               oldFish.sprite_url !== newFish.sprite_url;
    }
    
    /**
     * Cleanup method to unsubscribe from store and clean up resources
     */
    destroy() {
        // Clear debounce timer
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
            this.syncDebounceTimer = null;
        }
        
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
                
                // Wait for sprite to be ready before adding to container
                this.waitForFishSprite(fish);
                
                // Apply current mood speed
                fish.setMoodSpeed(this.moodMultiplier);
                
                console.log(`Created fish ${i + 1}/${this.maxFish}`);
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
        
        // Debounced sync to database (only sync if no updates for a while)
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }
        
        this.syncDebounceTimer = setTimeout(() => {
            const now = Date.now();
            if (now - this.lastSyncTime > this.syncInterval) {
                this.syncFishPositionsToDatabase();
                this.lastSyncTime = now;
            }
        }, 1000); // Debounce by 1 second
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
                
                // Wait for sprite to be ready before adding to container
                this.waitForFishSprite(fish);
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
