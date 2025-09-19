import * as PIXI from 'pixi.js';

export class Fish {
    constructor(worldWidth, worldHeight, safeZone) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        
        // Movement properties
        this.baseSpeed = 0.5 + Math.random() * 1.5; // 0.5-2.0
        this.currentSpeed = this.baseSpeed;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        
        // Vertical drift properties
        this.targetY = this.getRandomTargetY();
        this.verticalSpeed = 0.1 + Math.random() * 0.2; // 0.1-0.3
        this.driftTimer = 0;
        this.driftInterval = 3000 + Math.random() * 4000; // 3-7 seconds
        
        // Sprite properties
        this.frameCount = 4; // Number of animation frames
        this.currentFrame = 0;
        this.animationSpeed = 100 + Math.random() * 100; // 100-200ms per frame
        this.lastFrameTime = 0;
        
        // Create sprite
        this.createSprite();
        this.respawn();
    }
    
    createSprite() {
        // Create a simple colored rectangle for now (will be replaced with actual fish sprites)
        this.sprite = new PIXI.Graphics();
        this.updateFrame();
        
        // Set random color
        const colors = [0x4CAF50, 0x2196F3, 0xFF9800, 0xE91E63, 0x9C27B0, 0x00BCD4];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateFrame() {
        this.sprite.clear();
        
        // Draw fish body
        this.sprite.beginFill(this.color, 0.8);
        
        // Body (ellipse)
        this.sprite.drawEllipse(0, 0, 20, 8);
        
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
        this.sprite.beginFill(0xFFFFFF);
        this.sprite.drawCircle(8, -2, 3);
        this.sprite.beginFill(0x000000);
        this.sprite.drawCircle(9, -2, 1.5);
        
        this.sprite.endFill();
    }
    
    getRandomTargetY() {
        const margin = 50;
        return margin + Math.random() * (this.worldHeight - margin * 2);
    }
    
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
            x = Math.random() > 0.5 ? -50 : this.worldWidth + 50;
            y = this.getRandomTargetY();
        }
        
        return { x, y };
    }
    
    isInSafeZone(x, y) {
        return x >= this.safeZone.x && 
               x <= this.safeZone.x + this.safeZone.width &&
               y >= this.safeZone.y && 
               y <= this.safeZone.y + this.safeZone.height;
    }
    
    respawn() {
        const pos = this.getRandomSpawnPosition();
        this.sprite.x = pos.x;
        this.sprite.y = pos.y;
        this.targetY = this.getRandomTargetY();
    }
    
    setMoodSpeed(multiplier) {
        this.currentSpeed = this.baseSpeed * multiplier;
    }
    
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
        if (this.sprite.x < -30) {
            this.direction = 1;
            this.sprite.scale.x = 1;
        } else if (this.sprite.x > this.worldWidth + 30) {
            this.direction = -1;
            this.sprite.scale.x = -1;
        }
        
        // Update vertical drift
        this.driftTimer += deltaTime;
        if (this.driftTimer >= this.driftInterval) {
            this.targetY = this.getRandomTargetY();
            this.driftTimer = 0;
            this.driftInterval = 3000 + Math.random() * 4000;
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

export class FishManager {
    constructor(container, worldWidth, worldHeight, safeZone) {
        this.container = container;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.safeZone = safeZone;
        this.fish = [];
        
        // Determine fish count based on screen size
        this.maxFish = this.getOptimalFishCount();
        this.moodMultiplier = 1.0;
        
        this.spawnFish();
    }
    
    getOptimalFishCount() {
        const isMobile = window.innerWidth <= 768;
        return isMobile ? Math.floor(20 + Math.random() * 10) : Math.floor(30 + Math.random() * 30);
    }
    
    spawnFish() {
        for (let i = 0; i < this.maxFish; i++) {
            const fish = new Fish(this.worldWidth, this.worldHeight, this.safeZone);
            this.fish.push(fish);
            this.container.addChild(fish.sprite);
        }
    }
    
    setMood(mood) {
        // Different speed multipliers for different moods
        const moodSpeeds = {
            work: 1.0,      // Normal speed
            pause: 0.3,     // Slow and relaxed
            lunch: 2.0      // Fast and energetic
        };
        
        this.moodMultiplier = moodSpeeds[mood] || 1.0;
        
        this.fish.forEach(fish => {
            fish.setMoodSpeed(this.moodMultiplier);
        });
    }
    
    update(deltaTime) {
        this.fish.forEach(fish => {
            fish.update(deltaTime);
        });
    }
    
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
            if (fish.sprite.y > newWorldHeight - 50) {
                fish.sprite.y = newWorldHeight - 50;
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
}
