import * as PIXI from 'pixi.js';
import { BUBBLE_CONFIG, COLORS, PERFORMANCE } from '../constants/index.js';
import { randomRange } from '../utils/performance.js';

/**
 * Individual bubble entity with floating animation
 */
export class Bubble {
    /**
     * Create a new bubble instance
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     */
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Movement properties
        this.speed = randomRange(BUBBLE_CONFIG.SPEED_MIN, BUBBLE_CONFIG.SPEED_MAX);
        this.wobble = Math.random() * BUBBLE_CONFIG.WOBBLE_MAX;
        this.wobbleSpeed = randomRange(BUBBLE_CONFIG.WOBBLE_SPEED_MIN, BUBBLE_CONFIG.WOBBLE_SPEED_MAX);
        this.wobbleOffset = Math.random() * Math.PI * 2;
        
        // Visual properties
        this.size = randomRange(BUBBLE_CONFIG.SIZE_MIN, BUBBLE_CONFIG.SIZE_MAX);
        this.opacity = randomRange(BUBBLE_CONFIG.OPACITY_MIN, BUBBLE_CONFIG.OPACITY_MAX);
        
        this.createSprite();
        this.respawn();
    }
    
    /**
     * Create the bubble sprite with graphics
     */
    createSprite() {
        this.sprite = new PIXI.Graphics();
        
        // Disable interactivity to prevent PIXI event errors
        this.sprite.interactive = false;
        this.sprite.interactiveChildren = false;
        
        this.updateGraphics();
    }
    
    /**
     * Update bubble graphics with current properties
     */
    updateGraphics() {
        this.sprite.clear();
        
        // Draw bubble with gradient effect
        this.sprite.circle(0, 0, this.size).fill({ color: COLORS.BUBBLE_BASE, alpha: this.opacity });
        
        // Add highlight for 3D effect
        this.sprite.circle(-this.size * 0.3, -this.size * 0.3, this.size * 0.3).fill({ color: COLORS.BUBBLE_HIGHLIGHT, alpha: this.opacity * 0.6 });
    }
    
    /**
     * Respawn the bubble at the bottom of the screen
     */
    respawn() {
        this.sprite.x = Math.random() * this.worldWidth;
        this.sprite.y = this.worldHeight + this.size;
        this.initialX = this.sprite.x;
    }
    
    /**
     * Update bubble position and animation
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        // Move upward
        this.sprite.y -= this.speed * deltaTime * 0.1;
        
        // Add horizontal wobble
        this.wobbleOffset += this.wobbleSpeed * deltaTime * 0.01;
        this.sprite.x = this.initialX + Math.sin(this.wobbleOffset) * this.wobble * BUBBLE_CONFIG.WOBBLE_AMPLITUDE;
        
        // Respawn when reaching top
        if (this.sprite.y < -this.size) {
            this.respawn();
        }
    }
}

/**
 * Manages all bubble entities in the aquarium
 */
export class BubbleManager {
    /**
     * Create a new bubble manager
     * @param {PIXI.Container} container - PIXI container for bubble sprites
     * @param {number} worldWidth - World width in pixels
     * @param {number} worldHeight - World height in pixels
     */
    constructor(container, worldWidth, worldHeight) {
        this.container = container;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.bubbles = [];
        
        // Use regular Container instead of ParticleContainer for Graphics objects
        this.bubbleContainer = new PIXI.Container();
        
        // Disable interactivity to prevent PIXI event errors
        this.bubbleContainer.interactive = false;
        this.bubbleContainer.interactiveChildren = false;
        
        this.container.addChild(this.bubbleContainer);
        
        // Determine bubble count based on world size and performance
        this.maxBubbles = this.getOptimalBubbleCount();
        
        this.spawnBubbles();
    }
    
    /**
     * Calculate optimal bubble count based on world size
     * @returns {number} Optimal number of bubbles
     */
    getOptimalBubbleCount() {
        const bubbleCount = Math.floor((this.worldWidth * this.worldHeight) / PERFORMANCE.BUBBLE_DENSITY_RATIO);
        return Math.max(PERFORMANCE.MIN_BUBBLES, Math.min(PERFORMANCE.MAX_BUBBLES, bubbleCount));
    }
    
    /**
     * Spawn all bubbles in the aquarium
     */
    spawnBubbles() {
        for (let i = 0; i < this.maxBubbles; i++) {
            const bubble = new Bubble(this.worldWidth, this.worldHeight);
            
            // Stagger initial positions for natural effect
            bubble.sprite.y = this.worldHeight + Math.random() * this.worldHeight;
            
            this.bubbles.push(bubble);
            this.bubbleContainer.addChild(bubble.sprite);
        }
    }
    
    /**
     * Update all bubble positions and animations
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        this.bubbles.forEach(bubble => {
            bubble.update(deltaTime);
        });
    }
    
    /**
     * Handle aquarium resize by updating bubble boundaries and count
     * @param {number} newWorldWidth - New world width in pixels
     * @param {number} newWorldHeight - New world height in pixels
     */
    resize(newWorldWidth, newWorldHeight) {
        this.worldWidth = newWorldWidth;
        this.worldHeight = newWorldHeight;
        
        // Update all bubbles with new boundaries
        this.bubbles.forEach(bubble => {
            bubble.worldWidth = newWorldWidth;
            bubble.worldHeight = newWorldHeight;
        });
        
        // Adjust bubble count based on new world size
        const newOptimalCount = this.getOptimalBubbleCount();
        
        if (newOptimalCount > this.bubbles.length) {
            // Add more bubbles
            const bubblesToAdd = newOptimalCount - this.bubbles.length;
            for (let i = 0; i < bubblesToAdd; i++) {
                const bubble = new Bubble(this.worldWidth, this.worldHeight);
                this.bubbles.push(bubble);
                this.bubbleContainer.addChild(bubble.sprite);
            }
        } else if (newOptimalCount < this.bubbles.length) {
            // Remove excess bubbles
            const bubblesToRemove = this.bubbles.length - newOptimalCount;
            for (let i = 0; i < bubblesToRemove; i++) {
                const bubble = this.bubbles.pop();
                this.bubbleContainer.removeChild(bubble.sprite);
            }
        }
        
        this.maxBubbles = newOptimalCount;
    }
    
    /**
     * Toggle bubble visibility
     * @param {boolean} enabled - Whether bubbles should be visible
     */
    setEnabled(enabled) {
        this.bubbleContainer.visible = enabled;
    }
    
    /**
     * Clean up bubble manager resources
     */
    destroy() {
        this.bubbles.forEach(bubble => {
            if (bubble.sprite && bubble.sprite.parent) {
                bubble.sprite.parent.removeChild(bubble.sprite);
            }
        });
        this.bubbles = [];
        
        if (this.bubbleContainer && this.bubbleContainer.parent) {
            this.bubbleContainer.parent.removeChild(this.bubbleContainer);
        }
    }
}
