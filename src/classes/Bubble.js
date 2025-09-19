import * as PIXI from 'pixi.js';

export class Bubble {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Movement properties
        this.speed = 0.2 + Math.random() * 0.3; // 0.2-0.5
        this.wobble = Math.random() * 0.5; // Horizontal wobble
        this.wobbleSpeed = 0.02 + Math.random() * 0.02; // 0.02-0.04
        this.wobbleOffset = Math.random() * Math.PI * 2;
        
        // Sprite properties
        this.size = 3 + Math.random() * 4; // 3-7 pixels
        this.opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7
        
        this.createSprite();
        this.respawn();
    }
    
    createSprite() {
        this.sprite = new PIXI.Graphics();
        
        // Disable interactivity to prevent PIXI event errors
        this.sprite.interactive = false;
        this.sprite.interactiveChildren = false;
        this.sprite.eventMode = 'none';
        
        this.updateGraphics();
    }
    
    updateGraphics() {
        this.sprite.clear();
        
        // Draw bubble with gradient effect
        this.sprite.beginFill(0x87CEEB, this.opacity);
        this.sprite.drawCircle(0, 0, this.size);
        
        // Add highlight
        this.sprite.beginFill(0xFFFFFF, this.opacity * 0.6);
        this.sprite.drawCircle(-this.size * 0.3, -this.size * 0.3, this.size * 0.3);
        
        this.sprite.endFill();
    }
    
    respawn() {
        this.sprite.x = Math.random() * this.worldWidth;
        this.sprite.y = this.worldHeight + this.size;
        this.initialX = this.sprite.x;
    }
    
    update(deltaTime) {
        // Move upward
        this.sprite.y -= this.speed * deltaTime * 0.1;
        
        // Add horizontal wobble
        this.wobbleOffset += this.wobbleSpeed * deltaTime * 0.01;
        this.sprite.x = this.initialX + Math.sin(this.wobbleOffset) * this.wobble * 20;
        
        // Respawn when reaching top
        if (this.sprite.y < -this.size) {
            this.respawn();
        }
    }
}

export class BubbleManager {
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
        this.bubbleContainer.eventMode = 'none';
        
        this.container.addChild(this.bubbleContainer);
        
        // Determine bubble count based on world size
        this.maxBubbles = Math.floor((worldWidth * worldHeight) / 50000); // Roughly 1 bubble per 50k pixels
        this.maxBubbles = Math.max(10, Math.min(this.maxBubbles, 50)); // Clamp between 10-50
        
        this.spawnBubbles();
    }
    
    spawnBubbles() {
        for (let i = 0; i < this.maxBubbles; i++) {
            const bubble = new Bubble(this.worldWidth, this.worldHeight);
            
            // Stagger initial positions for natural effect
            bubble.sprite.y = this.worldHeight + Math.random() * this.worldHeight;
            
            this.bubbles.push(bubble);
            this.bubbleContainer.addChild(bubble.sprite);
        }
    }
    
    update(deltaTime) {
        this.bubbles.forEach(bubble => {
            bubble.update(deltaTime);
        });
    }
    
    resize(newWorldWidth, newWorldHeight) {
        this.worldWidth = newWorldWidth;
        this.worldHeight = newWorldHeight;
        
        // Update all bubbles with new boundaries
        this.bubbles.forEach(bubble => {
            bubble.worldWidth = newWorldWidth;
            bubble.worldHeight = newWorldHeight;
        });
        
        // Adjust bubble count based on new world size
        const newOptimalCount = Math.floor((newWorldWidth * newWorldHeight) / 50000);
        const clampedCount = Math.max(10, Math.min(newOptimalCount, 50));
        
        if (clampedCount > this.bubbles.length) {
            // Add more bubbles
            const bubblesToAdd = clampedCount - this.bubbles.length;
            for (let i = 0; i < bubblesToAdd; i++) {
                const bubble = new Bubble(this.worldWidth, this.worldHeight);
                this.bubbles.push(bubble);
                this.bubbleContainer.addChild(bubble.sprite);
            }
        } else if (clampedCount < this.bubbles.length) {
            // Remove excess bubbles
            const bubblesToRemove = this.bubbles.length - clampedCount;
            for (let i = 0; i < bubblesToRemove; i++) {
                const bubble = this.bubbles.pop();
                this.bubbleContainer.removeChild(bubble.sprite);
            }
        }
        
        this.maxBubbles = clampedCount;
    }
    
    setEnabled(enabled) {
        this.bubbleContainer.visible = enabled;
    }
}
