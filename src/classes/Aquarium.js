import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { FishManager } from './Fish.js';
import { BubbleManager } from './Bubble.js';

export class Aquarium {
    constructor(canvasElement) {
        this.app = null;
        this.viewport = null;
        this.fishManager = null;
        this.bubbleManager = null;
        this.canvasElement = canvasElement;
        
        // Tile grid properties
        this.tileSize = 64; // 64 pixels per tile
        this.tilesVertical = 1; // Will be calculated based on screen height
        
        // World dimensions (will be calculated based on screen and tile size)
        this.worldWidth = 6000;
        this.worldHeight = window.innerHeight;
        
        // Safe zone for UI overlay (center area)
        this.safeZone = {
            x: this.worldWidth / 2 - 200,
            y: 50,
            width: 400,
            height: 150
        };
        
        // Layer containers
        this.backgroundContainer = null;
        this.fishContainer = null;
        this.bubbleContainer = null;
        this.gridContainer = null;
        
        // Orange cube properties
        this.orangeCube = null;
        this.cubePosition = { x: 0, y: 0 }; // Grid position
        this.lastMoveTime = 0;
        this.moveInterval = 1000; // 1 second
        
        // Current mood
        this.currentMood = 'work';
        
        this.init();
    }
    
    init() {
        this.calculateDimensions();
        this.createPixiApp();
        this.setupViewport();
        this.createLayers();
        this.createGrid();
        this.createOrangeCube();
        this.createBackground();
        this.spawnEntities();
        this.setupEventListeners();
        this.startGameLoop();
        
        // Initial resize to fit container
        this.resize();
    }
    
    calculateDimensions() {
        // Calculate number of tiles based on fixed 64-pixel tile size
        this.worldHeight = window.innerHeight;
        this.tilesVertical = Math.ceil(this.worldHeight / this.tileSize);
        
        // Calculate horizontal tiles to maintain aspect ratio or extend as needed
        this.tilesHorizontal = Math.ceil(this.worldWidth / this.tileSize);
        
        // Adjust world dimensions to fit exact number of tiles
        this.worldHeight = this.tilesVertical * this.tileSize;
        this.worldWidth = this.tilesHorizontal * this.tileSize;
    }
    
    createPixiApp() {
        // Create Pixi application
        this.app = new PIXI.Application({
            view: this.canvasElement,
            resizeTo: this.canvasElement.parentElement,
            backgroundColor: 0x001133,
            antialias: false // Keep pixel art sharp
        });
        
        // Set scale mode to NEAREST for sharp pixel art
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        
        // Disable context menu on right click
        this.app.view.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    setupViewport() {
        // Create viewport with pixi-viewport
        this.viewport = new Viewport({
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            interaction: this.app.renderer.plugins.interaction
        });
        
        // Add viewport to stage
        this.app.stage.addChild(this.viewport);
        
        // Configure viewport plugins
        this.viewport
            .drag({
                mouseButtons: 'left'
            })
            .pinch()
            .wheel()
            .clampZoom({
                minScale: 0.1,
                maxScale: 3.0
            })
            .clamp({
                left: 0,
                right: this.worldWidth,
                top: 0,
                bottom: this.worldHeight,
                underflow: 'center'
            });
        
        // Start centered but ensure cube is visible
        this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
    }
    
    createLayers() {
        // Create separate containers for organized rendering
        this.backgroundContainer = new PIXI.Container();
        this.gridContainer = new PIXI.Container();
        this.bubbleContainer = new PIXI.Container();
        this.fishContainer = new PIXI.Container();
        
        // Add containers to viewport in order (back to front)
        this.viewport.addChild(this.backgroundContainer);
        this.viewport.addChild(this.gridContainer);
        this.viewport.addChild(this.bubbleContainer);
        this.viewport.addChild(this.fishContainer);
    }
    
    createGrid() {
        // Create visible tile grid
        const grid = new PIXI.Graphics();
        
        // Disable interactivity to prevent PIXI event errors
        grid.interactive = false;
        grid.interactiveChildren = false;
        grid.eventMode = 'none';
        
        grid.lineStyle(1, 0xFFFFFF, 0.3); // White lines with low opacity
        
        // Vertical lines
        for (let x = 0; x <= this.tilesHorizontal; x++) {
            const xPos = x * this.tileSize;
            grid.moveTo(xPos, 0);
            grid.lineTo(xPos, this.worldHeight);
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.tilesVertical; y++) {
            const yPos = y * this.tileSize;
            grid.moveTo(0, yPos);
            grid.lineTo(this.worldWidth, yPos);
        }
        
        this.gridContainer.addChild(grid);
    }
    
    createOrangeCube() {
        // Create orange cube sprite
        this.orangeCube = new PIXI.Graphics();
        
        // Disable interactivity to prevent PIXI event errors
        this.orangeCube.interactive = false;
        this.orangeCube.interactiveChildren = false;
        this.orangeCube.eventMode = 'none';
        
        this.orangeCube.clear();
        this.orangeCube.beginFill(0xFF6600); // Orange color
        
        // Draw a filled rectangle (cube) - positioned at 0,0
        const cubeSize = this.tileSize * 0.8;
        this.orangeCube.drawRect(0, 0, cubeSize, cubeSize);
        this.orangeCube.endFill();
        
        // Center the anchor point
        this.orangeCube.pivot.set(cubeSize / 2, cubeSize / 2);
        
        // Set initial position in center of screen for visibility
        this.cubePosition.x = Math.floor(this.tilesHorizontal / 2);
        this.cubePosition.y = Math.floor(this.tilesVertical / 2);
        this.updateOrangeCubePosition();
        
        this.gridContainer.addChild(this.orangeCube);
        
        console.log(`Orange cube created at grid position (${this.cubePosition.x}, ${this.cubePosition.y})`);
        console.log(`World position: (${this.orangeCube.x}, ${this.orangeCube.y})`);
    }
    
    updateOrangeCubePosition() {
        // Convert grid position to world position (center of tile)
        this.orangeCube.x = (this.cubePosition.x + 0.5) * this.tileSize;
        this.orangeCube.y = (this.cubePosition.y + 0.5) * this.tileSize;
    }
    
    moveOrangeCube() {
        // Generate random adjacent position or stay in place
        const directions = [
            { x: -1, y: 0 },  // Left
            { x: 1, y: 0 },   // Right
            { x: 0, y: -1 },  // Up
            { x: 0, y: 1 },   // Down
            { x: 0, y: 0 }    // Stay in place
        ];
        
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const newX = this.cubePosition.x + direction.x;
        const newY = this.cubePosition.y + direction.y;
        
        // Ensure new position is within bounds
        if (newX >= 0 && newX < this.tilesHorizontal && 
            newY >= 0 && newY < this.tilesVertical) {
            this.cubePosition.x = newX;
            this.cubePosition.y = newY;
            this.updateOrangeCubePosition();
            
            console.log(`Orange cube moved to grid position (${this.cubePosition.x}, ${this.cubePosition.y})`);
            console.log(`World position: (${this.orangeCube.x}, ${this.orangeCube.y})`);
        }
    }
    
    createBackground() {
        // Create ocean floor
        const floor = new PIXI.Graphics();
        floor.beginFill(0x8B4513, 0.8); // Brown sand
        floor.drawRect(0, this.worldHeight - 80, this.worldWidth, 80);
        
        // Add some texture to the floor
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.worldWidth;
            const y = this.worldHeight - 80 + Math.random() * 80;
            const size = 2 + Math.random() * 4;
            const color = Math.random() > 0.5 ? 0x654321 : 0xD2691E;
            
            floor.beginFill(color, 0.6);
            floor.drawCircle(x, y, size);
        }
        floor.endFill();
        
        this.backgroundContainer.addChild(floor);
        
        // Create seaweed and decorations
        this.createSeaweed();
        this.createRocks();
        
        // Create water effect gradient
        const waterGradient = new PIXI.Graphics();
        waterGradient.beginFill(0x004466, 0.1);
        waterGradient.drawRect(0, 0, this.worldWidth, this.worldHeight);
        waterGradient.endFill();
        
        this.backgroundContainer.addChild(waterGradient);
    }
    
    createSeaweed() {
        const seaweedCount = Math.floor(this.worldWidth / 300); // One every 300 pixels
        
        for (let i = 0; i < seaweedCount; i++) {
            const x = (i + 0.5) * 300 + (Math.random() - 0.5) * 100;
            const height = 100 + Math.random() * 150;
            
            // Skip if in safe zone
            if (x >= this.safeZone.x && x <= this.safeZone.x + this.safeZone.width) {
                continue;
            }
            
            const seaweed = new PIXI.Graphics();
            seaweed.beginFill(0x228B22, 0.7);
            
            // Draw swaying seaweed
            const segments = 8;
            const segmentHeight = height / segments;
            let currentX = x;
            let currentY = this.worldHeight - 80;
            
            for (let j = 0; j < segments; j++) {
                const nextX = currentX + (Math.random() - 0.5) * 20;
                const nextY = currentY - segmentHeight;
                const width = 8 - (j * 0.8); // Taper toward top
                
                seaweed.drawPolygon([
                    currentX - width/2, currentY,
                    currentX + width/2, currentY,
                    nextX + width/2, nextY,
                    nextX - width/2, nextY
                ]);
                
                currentX = nextX;
                currentY = nextY;
            }
            
            seaweed.endFill();
            this.backgroundContainer.addChild(seaweed);
        }
    }
    
    createRocks() {
        const rockCount = Math.floor(this.worldWidth / 500); // One every 500 pixels
        
        for (let i = 0; i < rockCount; i++) {
            const x = Math.random() * this.worldWidth;
            const y = this.worldHeight - 40;
            
            // Skip if in safe zone
            if (x >= this.safeZone.x - 50 && x <= this.safeZone.x + this.safeZone.width + 50) {
                continue;
            }
            
            const rock = new PIXI.Graphics();
            const rockSize = 20 + Math.random() * 30;
            const rockColor = Math.random() > 0.5 ? 0x696969 : 0x808080;
            
            rock.beginFill(rockColor, 0.9);
            rock.drawEllipse(x, y, rockSize, rockSize * 0.6);
            rock.endFill();
            
            this.backgroundContainer.addChild(rock);
        }
    }
    
    spawnEntities() {
        // Create fish manager
        this.fishManager = new FishManager(
            this.fishContainer,
            this.worldWidth,
            this.worldHeight,
            this.safeZone
        );
        
        // Create bubble manager
        this.bubbleManager = new BubbleManager(
            this.bubbleContainer,
            this.worldWidth,
            this.worldHeight
        );
    }
    
    setupEventListeners() {
        // Optional: Toggle bubbles with 'B' key
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'b') {
                this.bubbleContainer.visible = !this.bubbleContainer.visible;
            }
        });
    }
    
    startGameLoop() {
        // Main game loop
        this.app.ticker.add((deltaTime) => {
            const dt = this.app.ticker.deltaMS;
            
            // Update orange cube movement
            if (this.orangeCube) {
                this.lastMoveTime += dt;
                if (this.lastMoveTime >= this.moveInterval) {
                    this.moveOrangeCube();
                    this.lastMoveTime = 0;
                }
            }
            
            // Update entities
            if (this.fishManager) {
                this.fishManager.update(dt);
            }
            
            if (this.bubbleManager) {
                this.bubbleManager.update(dt);
            }
        });
    }
    
    setMood(mood) {
        this.currentMood = mood;
        
        // Update fish speed
        if (this.fishManager) {
            this.fishManager.setMood(mood);
        }
        
        console.log(`Mood set to: ${mood}`);
    }
    
    resize() {
        if (!this.app || !this.viewport) return;
        
        // Recalculate dimensions based on new screen size
        this.calculateDimensions();
        
        // Update viewport screen size and world size
        this.viewport.resize(this.app.screen.width, this.app.screen.height, this.worldWidth, this.worldHeight);
        
        // Recalculate safe zone based on screen size
        const screenCenterX = this.app.screen.width / 2;
        const screenCenterY = this.app.screen.height / 2;
        
        // Convert screen coordinates to world coordinates
        const worldCenter = this.viewport.toWorld(screenCenterX, screenCenterY);
        
        this.safeZone = {
            x: worldCenter.x - 200,
            y: Math.max(50, worldCenter.y - 75),
            width: 400,
            height: 150
        };
        
        // Recreate grid with new dimensions
        if (this.gridContainer) {
            this.gridContainer.removeChildren();
            this.createGrid();
            
            // Update orange cube size and position
            if (this.orangeCube) {
                this.gridContainer.removeChild(this.orangeCube);
                this.createOrangeCube();
            }
        }
        
        // Update managers with new dimensions
        if (this.fishManager) {
            this.fishManager.resize(this.worldWidth, this.worldHeight, this.safeZone);
        }
        
        if (this.bubbleManager) {
            this.bubbleManager.resize(this.worldWidth, this.worldHeight);
        }
    }
    
    // Public API methods
    getMood() {
        return this.currentMood;
    }
    
    toggleBubbles() {
        if (this.bubbleContainer) {
            this.bubbleContainer.visible = !this.bubbleContainer.visible;
        }
    }
    
    // Performance monitoring
    getFPS() {
        return this.app.ticker.FPS;
    }
    
    getEntityCounts() {
        return {
            fish: this.fishManager ? this.fishManager.fish.length : 0,
            bubbles: this.bubbleManager ? this.bubbleManager.bubbles.length : 0
        };
    }
    
    destroy() {
        if (this.app) {
            this.app.destroy(true, true);
        }
    }
}
