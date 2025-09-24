import * as PIXI from 'pixi.js';
import { FISH_CONFIG, COLORS, MOODS } from '../constants/index.js';
import { randomRange, randomChoice, clamp } from '../utils/performance.js';

/**
 * Shark entity with swimming behavior similar to fish but using sprite image
 */
export class Shark {
    /**
     * Create a new shark instance
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     * @param {Object} safeZone - Safe zone boundaries {x, y, width, height}
     * @param {Object} sharkData - Optional data to restore shark state
     */
    constructor(worldWidth, worldHeight, safeZone, sharkData = null) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        
        if (sharkData) {
            // Restore shark from data
            this.id = sharkData.id;
            this.name = sharkData.name;
            this.baseSpeed = (sharkData.baseSpeed !== undefined && sharkData.baseSpeed > 0) ? sharkData.baseSpeed : randomRange(FISH_CONFIG.BASE_SPEED_MIN * 1.5, FISH_CONFIG.BASE_SPEED_MAX * 1.5); // Sharks are faster
            this.currentSpeed = (sharkData.currentSpeed !== undefined && sharkData.currentSpeed > 0) ? sharkData.currentSpeed : this.baseSpeed;
            this.direction = (sharkData.direction !== undefined && (sharkData.direction === 1 || sharkData.direction === -1)) ? sharkData.direction : (Math.random() > 0.5 ? 1 : -1);
            this.targetY = sharkData.targetY || this.getRandomTargetY();
            this.verticalSpeed = (sharkData.verticalSpeed !== undefined && sharkData.verticalSpeed > 0) ? sharkData.verticalSpeed : randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
            this.driftInterval = sharkData.driftInterval || Math.round(randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX));
        } else {
            // Create new random shark
            this.id = null;
            this.name = null;
            this.baseSpeed = randomRange(FISH_CONFIG.BASE_SPEED_MIN * 1.5, FISH_CONFIG.BASE_SPEED_MAX * 1.5); // Sharks are faster
            this.currentSpeed = this.baseSpeed;
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.targetY = this.getRandomTargetY();
            this.verticalSpeed = randomRange(FISH_CONFIG.VERTICAL_SPEED_MIN, FISH_CONFIG.VERTICAL_SPEED_MAX);
            this.driftInterval = Math.round(randomRange(FISH_CONFIG.DRIFT_INTERVAL_MIN, FISH_CONFIG.DRIFT_INTERVAL_MAX));
        }
        
        // Movement properties
        this.driftTimer = 0;
        
        // Create sprite (will be initialized after texture loads)
        this.sprite = null;
        this.textureLoaded = false;
        
        // Load texture and create sprite
        this.loadTexture().then(() => {
            if (sharkData && sharkData.positionX !== undefined && sharkData.positionY !== undefined) {
                // Restore position from data
                this.sprite.x = sharkData.positionX;
                this.sprite.y = sharkData.positionY;
            } else {
                // Random spawn position
                this.respawn();
            }
        });
    }
    
    /**
     * Load shark texture and create sprite
     */
    async loadTexture() {
        try {
            // Load the shark texture - use relative import path for Vite
            const texture = await PIXI.Assets.load(new URL('../sprites/shark.png', import.meta.url).href);
            
            // Create sprite from texture
            this.sprite = new PIXI.Sprite(texture);
            
            // Configure sprite properties
            this.sprite.interactive = false;
            this.sprite.interactiveChildren = false;
            
            // Set anchor to center for proper rotation/scaling
            this.sprite.anchor.set(0.5, 0.5);
            
            // Scale the shark to be larger than fish but not too large
            this.sprite.scale.set(0.8, 0.8);
            
            this.textureLoaded = true;
            console.log('Shark texture loaded successfully');
            
        } catch (error) {
            console.error('Error loading shark texture:', error);
            // Fallback to a simple graphics if image fails to load
            this.createFallbackSprite();
        }
    }
    
    /**
     * Create a fallback sprite if image loading fails
     */
    createFallbackSprite() {
        this.sprite = new PIXI.Graphics();
        
        // Draw a larger, darker fish shape as fallback
        this.sprite.ellipse(0, 0, FISH_CONFIG.SPRITE_SIZE.width * 1.5, FISH_CONFIG.SPRITE_SIZE.height * 1.2);
        this.sprite.fill({ color: 0x4A4A4A, alpha: 0.9 }); // Dark gray shark color
        
        // Shark fin on top
        this.sprite.poly([
            0, -FISH_CONFIG.SPRITE_SIZE.height * 0.8,
            -8, -FISH_CONFIG.SPRITE_SIZE.height * 1.5,
            8, -FISH_CONFIG.SPRITE_SIZE.height * 1.5
        ]);
        this.sprite.fill({ color: 0x3A3A3A, alpha: 0.9 });
        
        // Tail
        this.sprite.poly([
            -FISH_CONFIG.SPRITE_SIZE.width * 0.8, -6,
            -FISH_CONFIG.SPRITE_SIZE.width * 1.2, -12,
            -FISH_CONFIG.SPRITE_SIZE.width * 1.2, 12,
            -FISH_CONFIG.SPRITE_SIZE.width * 0.8, 6
        ]);
        this.sprite.fill({ color: 0x4A4A4A, alpha: 0.8 });
        
        // Eye
        this.sprite.circle(FISH_CONFIG.SPRITE_SIZE.width * 0.4, -FISH_CONFIG.SPRITE_SIZE.height * 0.2, FISH_CONFIG.EYE_SIZE);
        this.sprite.fill(COLORS.EYE_WHITE);
        this.sprite.circle(FISH_CONFIG.SPRITE_SIZE.width * 0.45, -FISH_CONFIG.SPRITE_SIZE.height * 0.2, FISH_CONFIG.EYE_SIZE / 2);
        this.sprite.fill(COLORS.EYE_BLACK);
        
        this.sprite.interactive = false;
        this.sprite.interactiveChildren = false;
        
        this.textureLoaded = true;
        console.log('Shark fallback sprite created');
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
     * Respawn the shark at a new random position
     */
    respawn() {
        if (!this.sprite) return;
        
        const pos = this.getRandomSpawnPosition();
        this.sprite.x = pos.x;
        this.sprite.y = pos.y;
        this.targetY = this.getRandomTargetY();
    }
    
    /**
     * Set the shark speed based on mood multiplier
     * @param {number} multiplier - Speed multiplier (0.3 for pause, 1.0 for work, 2.0 for lunch)
     */
    setMoodSpeed(multiplier) {
        this.currentSpeed = clamp(this.baseSpeed * multiplier, 0.1, 8.0); // Higher max speed for sharks
    }
    
    /**
     * Update shark position and behavior
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.sprite || !this.textureLoaded) return;
        
        // Horizontal movement
        this.sprite.x += this.direction * this.currentSpeed * deltaTime * 0.1;
        
        // Check world boundaries and flip direction
        if (this.sprite.x < -FISH_CONFIG.BOUNDARY_MARGIN) {
            this.direction = 1;
            this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Face right
        } else if (this.sprite.x > this.worldWidth + FISH_CONFIG.BOUNDARY_MARGIN) {
            this.direction = -1;
            this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Face left
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
        
        // Ensure shark direction sprite flipping
        if (this.direction > 0) {
            this.sprite.scale.x = Math.abs(this.sprite.scale.x);
        } else {
            this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
        }
    }
}

/**
 * Manages shark entities in the aquarium
 */
export class SharkManager {
    /**
     * Create a new shark manager
     * @param {PIXI.Container} container - PIXI container for shark sprites
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     * @param {Object} safeZone - Safe zone boundaries {x, y, width, height}
     */
    constructor(container, worldWidth, worldHeight, safeZone) {
        this.container = container;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        this.sharks = [];
        
        // Sharks are fewer than fish - usually 1-3 sharks
        this.maxSharks = Math.min(3, Math.max(1, Math.floor(worldWidth * worldHeight / 200000))); // 1 shark per 200k pixels
        this.moodMultiplier = 1.0;
        
        console.log(`SharkManager initialized with max ${this.maxSharks} sharks`);
        
        // Create sharks
        this.spawnSharks();
    }
    
    /**
     * Spawn sharks in the aquarium
     */
    async spawnSharks() {
        console.log(`Creating ${this.maxSharks} sharks`);
        
        for (let i = 0; i < this.maxSharks; i++) {
            try {
                const shark = new Shark(this.worldWidth, this.worldHeight, this.safeZone);
                this.sharks.push(shark);
                
                // Wait for texture to load before adding to container
                this.waitForSharkTexture(shark);
                
                // Apply current mood speed
                shark.setMoodSpeed(this.moodMultiplier);
                
                console.log(`Created shark ${i + 1}/${this.maxSharks}`);
            } catch (error) {
                console.error(`Error creating shark ${i + 1}:`, error);
            }
        }
        
        console.log(`Successfully created ${this.sharks.length} sharks`);
    }
    
    /**
     * Wait for shark texture to load and add to container
     * @param {Shark} shark - Shark instance
     */
    async waitForSharkTexture(shark) {
        // Poll until texture is loaded
        const checkTexture = () => {
            if (shark.textureLoaded && shark.sprite) {
                this.container.addChild(shark.sprite);
                console.log('Shark sprite added to container');
            } else {
                setTimeout(checkTexture, 100); // Check again in 100ms
            }
        };
        checkTexture();
    }
    
    /**
     * Set the mood for all sharks, affecting their swimming speed
     * @param {string} mood - Mood identifier ('work', 'pause', 'lunch')
     */
    setMood(mood) {
        const moodConfig = Object.values(MOODS).find(m => m.id === mood);
        this.moodMultiplier = moodConfig ? moodConfig.speedMultiplier : MOODS.WORK.speedMultiplier;
        
        this.sharks.forEach(shark => {
            shark.setMoodSpeed(this.moodMultiplier);
        });
    }
    
    /**
     * Update all sharks positions and behavior
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        this.sharks.forEach(shark => {
            shark.update(deltaTime);
        });
    }
    
    /**
     * Handle aquarium resize by updating shark boundaries
     * @param {number} newWorldWidth - New world width in pixels
     * @param {number} newWorldHeight - New world height in pixels
     * @param {Object} newSafeZone - New safe zone boundaries
     */
    resize(newWorldWidth, newWorldHeight, newSafeZone) {
        this.worldWidth = newWorldWidth;
        this.worldHeight = newWorldHeight;
        this.safeZone = newSafeZone;
        
        // Update all sharks with new boundaries
        this.sharks.forEach(shark => {
            shark.worldWidth = newWorldWidth;
            shark.worldHeight = newWorldHeight;
            shark.safeZone = newSafeZone;
            
            // Ensure sharks are within new bounds
            if (shark.sprite && shark.sprite.y > newWorldHeight - FISH_CONFIG.VERTICAL_MARGIN) {
                shark.sprite.y = newWorldHeight - FISH_CONFIG.VERTICAL_MARGIN;
            }
            shark.targetY = shark.getRandomTargetY();
        });
    }
    
    /**
     * Clean up shark manager resources
     */
    destroy() {
        this.sharks.forEach(shark => {
            if (shark.sprite && shark.sprite.parent) {
                shark.sprite.parent.removeChild(shark.sprite);
            }
        });
        this.sharks = [];
    }
}
