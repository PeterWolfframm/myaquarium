import * as PIXI from 'pixi.js';
import { FISH_CONFIG, COLORS, MOODS } from '../constants/index.js';
import { randomRange, randomChoice, clamp, calculateOptimalEntityCounts, isMobileDevice } from '../utils/performance.js';

/**
 * Individual fish entity with swimming behavior and animation
 */
export class Fish {
    /**
     * Create a new fish instance
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     * @param {Object} safeZone - Safe zone boundaries {x, y, width, height}
     */
    constructor(worldWidth, worldHeight, safeZone) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        
        // Movement properties
        this.baseSpeed = randomRange(FISH_CONFIG.BASE_SPEED_MIN, FISH_CONFIG.BASE_SPEED_MAX);
        this.currentSpeed = this.baseSpeed;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        
        // Vertical drift properties
        this.targetY = this.getRandomTargetY();
        this.verticalSpeed = randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
        this.driftTimer = 0;
        this.driftInterval = randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX);
        
        // Animation properties
        this.frameCount = FISH_CONFIG.ANIMATION_FRAMES;
        this.currentFrame = 0;
        this.animationSpeed = randomRange(FISH_CONFIG.ANIMATION_SPEED_MIN, FISH_CONFIG.ANIMATION_SPEED_MAX);
        this.lastFrameTime = 0;
        
        // Visual properties
        this.color = randomChoice(COLORS.FISH_COLORS);
        
        // Create sprite
        this.createSprite();
        this.respawn();
    }
    
    /**
     * Create the fish sprite with graphics
     */
    createSprite() {
        this.sprite = new PIXI.Graphics();
        this.updateFrame();
    }
    
    /**
     * Update the fish sprite animation frame
     */
    updateFrame() {
        this.sprite.clear();
        
        // Draw fish body
        this.sprite.beginFill(this.color, 0.8);
        this.sprite.drawEllipse(0, 0, FISH_CONFIG.SPRITE_SIZE.width, FISH_CONFIG.SPRITE_SIZE.height);
        
        // Tail animation (oscillates based on frame)
        const tailOffset = Math.sin(this.currentFrame / this.frameCount * Math.PI * 2) * 3;
        this.sprite.beginFill(this.color, 0.6);
        this.sprite.drawPolygon([
            -15, tailOffset - 4,
            -25, tailOffset - 8,
            -25, tailOffset + 8,
            -15, tailOffset + 4
        ]);
        
        // Eye
        this.sprite.beginFill(COLORS.EYE_WHITE);
        this.sprite.drawCircle(8, -2, FISH_CONFIG.EYE_SIZE);
        this.sprite.beginFill(COLORS.EYE_BLACK);
        this.sprite.drawCircle(9, -2, FISH_CONFIG.EYE_SIZE / 2);
        
        this.sprite.endFill();
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
        
        this.spawnFish();
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
     * Spawn all fish in the aquarium
     */
    spawnFish() {
        for (let i = 0; i < this.maxFish; i++) {
            const fish = new Fish(this.worldWidth, this.worldHeight, this.safeZone);
            this.fish.push(fish);
            this.container.addChild(fish.sprite);
        }
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
