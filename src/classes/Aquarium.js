import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { FishManager } from './Fish.js';
import { BubbleManager } from './Bubble.js';
import { useAquariumStore } from '../stores/aquariumStore.js';

export class Aquarium {
    constructor(canvasElement) {
        this.app = null;
        this.viewport = null;
        this.fishManager = null;
        this.bubbleManager = null;
        this.canvasElement = canvasElement;
        
        // Store reference
        this.store = useAquariumStore.getState();
        
        // Subscribe to store changes
        this.unsubscribe = useAquariumStore.subscribe((state) => {
            this.updateFromStore(state);
        });
        
        // Initialize dimensions from store (with initial load flag)
        this.updateDimensionsFromStore(true);
        
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
        this.grid = null;
        
        // Orange cube properties
        this.orangeCube = null;
        this.cubePosition = { x: 0, y: 0 }; // Grid position
        this.lastMoveTime = 0;
        this.moveInterval = 1000; // 1 second
        
        // Current mood
        this.currentMood = 'work';
        
        // Grid visibility state
        this.showGrid = this.store.showGrid;
        
        this.init().catch(error => {
            console.error('Error initializing aquarium:', error);
        });
    }
    
    async init() {
        this.calculateDimensions();
        await this.createPixiApp();
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
        
        console.log('Aquarium initialization completed successfully');
        console.log(`Fish container children: ${this.fishContainer.children.length}`);
        console.log(`Bubble container children: ${this.bubbleContainer.children.length}`);
        console.log(`Background container children: ${this.backgroundContainer.children.length}`);
    }
    
    updateDimensionsFromStore(isInitialLoad = false) {
        const state = this.store;
        const viewportHeight = this.app ? this.app.screen.height : window.innerHeight;
        
        if (isInitialLoad) {
            // On initial load, always calculate tile size based on default visible tiles
            this.tileSize = state.calculateDefaultTileSize(viewportHeight);
        } else if (state.sizeMode === 'adaptive') {
            this.tileSize = state.calculateAdaptiveTileSize(viewportHeight);
        } else {
            this.tileSize = state.tileSize;
        }
        
        this.tilesHorizontal = state.tilesHorizontal;
        this.tilesVertical = state.tilesVertical;
        
        this.worldWidth = this.tilesHorizontal * this.tileSize;
        this.worldHeight = this.tilesVertical * this.tileSize;
        
        console.log(`Aquarium dimensions: ${this.worldWidth}x${this.worldHeight} (${this.tilesHorizontal}x${this.tilesVertical} tiles, ${this.tileSize}px tile size)`);
        console.log(`Screen dimensions: ${window.innerWidth}x${window.innerHeight}`);
        console.log(`Visible vertical tiles: ~${Math.floor(viewportHeight / this.tileSize)}`);
    }
    
    updateFromStore(newState) {
        // Check if grid visibility has changed
        const gridVisibilityChanged = newState.showGrid !== this.showGrid;
        
        this.store = newState;
        if (this.app && this.viewport) {
            this.updateDimensionsFromStore(false);
            this.resize();
        }
        
        // Update grid visibility if changed
        if (gridVisibilityChanged) {
            this.showGrid = newState.showGrid;
            this.updateGridVisibility();
        }
    }
    
    calculateDimensions() {
        // Update dimensions based on current store state
        this.updateDimensionsFromStore(false);
    }
    
    async createPixiApp() {
        // Configure PIXI for v8+ compatibility
        // Set default texture scale mode to nearest (for pixel art)
        if (PIXI.BaseTexture && PIXI.BaseTexture.defaultOptions) {
            PIXI.BaseTexture.defaultOptions.scaleMode = 'nearest';
        }
        
        // Alternative for v8+ - set on Texture defaults
        if (PIXI.Texture && PIXI.Texture.defaultOptions) {
            PIXI.Texture.defaultOptions.scaleMode = 'nearest';
        }
        
        // Create Pixi application using v8+ API
        this.app = new PIXI.Application();
        
        // Initialize the application with v8+ init method
        await this.app.init({
            canvas: this.canvasElement,
            resizeTo: this.canvasElement.parentElement,
            backgroundColor: 0x001133,
            antialias: false, // Keep pixel art sharp
            powerPreference: 'default', // Use safer power preference
            resolution: 1, // Fixed resolution to avoid scaling issues
            eventMode: 'static' // Ensure proper event handling
        });
        
        // Disable context menu on right click - use canvas instead of view for v8+
        this.app.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    calculateMinZoomScale() {
        // Calculate minimum scale needed to show all vertical tiles
        // This ensures we can't zoom out further than showing the entire world height
        if (!this.app || this.worldHeight <= 0) {
            return 0.1; // Fallback to original minimum
        }
        
        const viewportHeight = this.app.screen.height;
        const minScale = viewportHeight / this.worldHeight;
        
        // Ensure we have a reasonable minimum (not too small)
        return Math.max(0.05, minScale);
    }

    setupViewport() {
        // Create viewport with pixi-viewport
        this.viewport = new Viewport({
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            events: this.app.renderer.events || this.app.stage // v8+ compatibility
        });
        
        // Add viewport to stage
        this.app.stage.addChild(this.viewport);
        
        // Calculate minimum scale to show all vertical tiles
        const minScale = this.calculateMinZoomScale();
        
        // Configure viewport plugins - only clamping, no mouse interactions
        this.viewport
            .clampZoom({
                minScale: minScale,
                maxScale: 3.0
            })
            .clamp({
                left: 0,
                right: this.worldWidth,
                top: 0,
                bottom: this.worldHeight,
                underflow: 'center'
            });
        
        // Start centered horizontally but show ground at bottom
        // Position viewport to show the ground (bottom of world) and center horizontally
        const viewportCenterX = this.worldWidth / 2;
        const viewportCenterY = this.worldHeight - (this.app.screen.height / 2);
        this.viewport.moveCenter(viewportCenterX, Math.max(this.app.screen.height / 2, viewportCenterY));
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
        
        // Properly disable interactivity to prevent PIXI event errors
        grid.interactive = false;
        grid.interactiveChildren = false;
        grid.eventMode = 'none';
        grid.cursor = 'default';
        
        // Calculate line width based on current viewport scale for consistent appearance
        const currentScale = this.viewport ? this.viewport.scale.x : 1;
        const lineWidth = Math.max(0.5, 1 / currentScale); // Inverse scale to maintain consistent visual width
        
        grid.lineStyle(lineWidth, 0xFFFFFF, 0.3); // White lines with low opacity
        
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
        
        // Store the grid reference for updates
        this.grid = grid;
        
        // Set initial visibility based on store state
        this.updateGridVisibility();
    }
    
    updateGridForScale() {
        // Update grid line width based on current scale to maintain consistent appearance
        if (!this.grid || !this.viewport) return;
        
        const currentScale = this.viewport.scale.x;
        const lineWidth = Math.max(0.5, 1 / currentScale); // Inverse scale to maintain consistent visual width
        
        // Clear and redraw the grid with new line width
        this.grid.clear();
        this.grid.lineStyle(lineWidth, 0xFFFFFF, 0.3);
        
        // Vertical lines
        for (let x = 0; x <= this.tilesHorizontal; x++) {
            const xPos = x * this.tileSize;
            this.grid.moveTo(xPos, 0);
            this.grid.lineTo(xPos, this.worldHeight);
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.tilesVertical; y++) {
            const yPos = y * this.tileSize;
            this.grid.moveTo(0, yPos);
            this.grid.lineTo(this.worldWidth, yPos);
        }
    }
    
    updateGridVisibility() {
        // Toggle grid container visibility
        if (this.gridContainer) {
            this.gridContainer.visible = this.showGrid;
        }
    }
    
    createOrangeCube() {
        // Create orange cube sprite
        this.orangeCube = new PIXI.Graphics();
        
        // Properly disable interactivity to prevent PIXI event errors
        this.orangeCube.interactive = false;
        this.orangeCube.interactiveChildren = false;
        this.orangeCube.eventMode = 'none';
        this.orangeCube.cursor = 'default';
        
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
        console.log('Creating aquarium background...');
        
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
        
        console.log(`Background created: floor, seaweed, rocks, and water gradient added to container`);
        console.log(`Background container children count: ${this.backgroundContainer.children.length}`);
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
        console.log('Spawning entities...');
        
        // Create fish manager
        console.log(`Creating fish manager with world size: ${this.worldWidth}x${this.worldHeight}`);
        this.fishManager = new FishManager(
            this.fishContainer,
            this.worldWidth,
            this.worldHeight,
            this.safeZone
        );
        
        // Create bubble manager
        console.log(`Creating bubble manager with world size: ${this.worldWidth}x${this.worldHeight}`);
        this.bubbleManager = new BubbleManager(
            this.bubbleContainer,
            this.worldWidth,
            this.worldHeight
        );
        
        console.log('Entity spawning completed');
    }
    
    setupEventListeners() {
        // Keyboard-only navigation and zoom controls
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'b') {
                this.bubbleContainer.visible = !this.bubbleContainer.visible;
            }
            
            // Arrow key navigation (horizontal and vertical)
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                
                if (!this.viewport) return;
                
                const moveDistance = this.tileSize * 5; // Move 5 tiles at a time
                const currentX = this.viewport.center.x;
                const currentY = this.viewport.center.y;
                
                if (e.key === 'ArrowLeft') {
                    const newX = Math.max(this.app.screen.width / 2, currentX - moveDistance);
                    this.viewport.moveCenter(newX, currentY);
                } else if (e.key === 'ArrowRight') {
                    const newX = Math.min(this.worldWidth - this.app.screen.width / 2, currentX + moveDistance);
                    this.viewport.moveCenter(newX, currentY);
                } else if (e.key === 'ArrowUp') {
                    const newY = Math.max(this.app.screen.height / 2, currentY - moveDistance);
                    this.viewport.moveCenter(currentX, newY);
                } else if (e.key === 'ArrowDown') {
                    const newY = Math.min(this.worldHeight - this.app.screen.height / 2, currentY + moveDistance);
                    this.viewport.moveCenter(currentX, newY);
                }
            }
            
            // Zoom controls with + and - keys
            if (e.key === '+' || e.key === '=' || e.key === '-') {
                e.preventDefault();
                
                if (!this.viewport) return;
                
                const currentScale = this.viewport.scale.x;
                const zoomFactor = 1.2; // 20% zoom change
                const minScale = this.calculateMinZoomScale();
                
                if (e.key === '+' || e.key === '=') {
                    // Zoom in
                    const newScale = Math.min(3.0, currentScale * zoomFactor);
                    this.viewport.setZoom(newScale, true);
                    // Update grid to maintain consistent line width
                    this.updateGridForScale();
                } else if (e.key === '-') {
                    // Zoom out - respect minimum scale to show all vertical tiles
                    const newScale = Math.max(minScale, currentScale / zoomFactor);
                    this.viewport.setZoom(newScale, true);
                    // Update grid to maintain consistent line width
                    this.updateGridForScale();
                }
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
        
        // Recalculate and update minimum zoom scale after resize
        const minScale = this.calculateMinZoomScale();
        this.viewport.plugins.get('clamp-zoom').options.minScale = minScale;
        
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
            this.grid = null; // Clear the reference before recreating
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
    
    getVisibleCubesCount() {
        if (!this.viewport || !this.app) return 0;
        
        try {
            // Get viewport bounds in world coordinates
            const viewportBounds = this.viewport.getVisibleBounds();
            
            // Calculate which tiles are visible
            const leftTile = Math.floor(viewportBounds.x / this.tileSize);
            const rightTile = Math.ceil((viewportBounds.x + viewportBounds.width) / this.tileSize);
            const topTile = Math.floor(viewportBounds.y / this.tileSize);
            const bottomTile = Math.ceil((viewportBounds.y + viewportBounds.height) / this.tileSize);
            
            // Clamp to grid bounds
            const startX = Math.max(0, leftTile);
            const endX = Math.min(this.tilesHorizontal, rightTile);
            const startY = Math.max(0, topTile);
            const endY = Math.min(this.tilesVertical, bottomTile);
            
            // Count visible grid tiles (our "self made cubes")
            const visibleTiles = (endX - startX) * (endY - startY);
            
            return Math.max(0, visibleTiles);
        } catch (error) {
            console.warn('Error calculating visible cubes:', error);
            return 0;
        }
    }
    
    getVisibleFishInfo() {
        if (!this.viewport || !this.app || !this.fishManager) {
            return {
                horizontalCount: 0,
                verticalCount: 0,
                total: 0
            };
        }
        
        try {
            // Get viewport bounds in world coordinates
            const viewportBounds = this.viewport.getVisibleBounds();
            const visibleFish = [];
            
            // Check each fish to see if it's visible
            this.fishManager.fish.forEach(fish => {
                const fishX = fish.sprite.x;
                const fishY = fish.sprite.y;
                
                if (fishX >= viewportBounds.x && 
                    fishX <= viewportBounds.x + viewportBounds.width &&
                    fishY >= viewportBounds.y && 
                    fishY <= viewportBounds.y + viewportBounds.height) {
                    visibleFish.push({ x: fishX, y: fishY });
                }
            });
            
            // Count unique horizontal and vertical positions
            const horizontalPositions = new Set();
            const verticalPositions = new Set();
            
            visibleFish.forEach(fish => {
                // Group by tile-sized regions for counting
                const horizontalTile = Math.floor(fish.x / this.tileSize);
                const verticalTile = Math.floor(fish.y / this.tileSize);
                
                horizontalPositions.add(horizontalTile);
                verticalPositions.add(verticalTile);
            });
            
            return {
                horizontalCount: horizontalPositions.size,
                verticalCount: verticalPositions.size,
                total: visibleFish.length
            };
        } catch (error) {
            console.warn('Error calculating visible fish info:', error);
            return {
                horizontalCount: 0,
                verticalCount: 0,
                total: 0
            };
        }
    }
    
    getViewportPosition() {
        if (!this.viewport || !this.app) {
            return {
                currentX: 0,
                currentY: 0,
                maxX: 0,
                maxY: 0,
                percentageX: 0,
                percentageY: 0,
                tileX: 0,
                tileY: 0
            };
        }
        
        try {
            // Get current viewport center position
            const center = this.viewport.center;
            
            // Calculate position as percentage of total world
            const percentageX = Math.max(0, Math.min(100, (center.x / this.worldWidth) * 100));
            const percentageY = Math.max(0, Math.min(100, (center.y / this.worldHeight) * 100));
            
            // Calculate current tile position
            const tileX = Math.floor(center.x / this.tileSize);
            const tileY = Math.floor(center.y / this.tileSize);
            
            return {
                currentX: Math.round(center.x),
                currentY: Math.round(center.y),
                maxX: this.worldWidth,
                maxY: this.worldHeight,
                percentageX: Math.round(percentageX * 10) / 10, // Round to 1 decimal
                percentageY: Math.round(percentageY * 10) / 10,
                tileX: Math.max(0, Math.min(this.tilesHorizontal - 1, tileX)),
                tileY: Math.max(0, Math.min(this.tilesVertical - 1, tileY))
            };
        } catch (error) {
            console.warn('Error calculating viewport position:', error);
            return {
                currentX: 0,
                currentY: 0,
                maxX: 0,
                maxY: 0,
                percentageX: 0,
                percentageY: 0,
                tileX: 0,
                tileY: 0
            };
        }
    }
    
    getVisibleTileDimensions() {
        if (!this.viewport || !this.app) {
            return {
                horizontalTiles: 0,
                verticalTiles: 0,
                totalTiles: 0
            };
        }
        
        try {
            // Get viewport bounds in world coordinates
            const viewportBounds = this.viewport.getVisibleBounds();
            
            // Calculate which tiles are visible (same logic as getVisibleCubesCount)
            const leftTile = Math.floor(viewportBounds.x / this.tileSize);
            const rightTile = Math.ceil((viewportBounds.x + viewportBounds.width) / this.tileSize);
            const topTile = Math.floor(viewportBounds.y / this.tileSize);
            const bottomTile = Math.ceil((viewportBounds.y + viewportBounds.height) / this.tileSize);
            
            // Clamp to grid bounds
            const startX = Math.max(0, leftTile);
            const endX = Math.min(this.tilesHorizontal, rightTile);
            const startY = Math.max(0, topTile);
            const endY = Math.min(this.tilesVertical, bottomTile);
            
            // Calculate visible tile dimensions
            const horizontalTiles = Math.max(0, endX - startX);
            const verticalTiles = Math.max(0, endY - startY);
            const totalTiles = horizontalTiles * verticalTiles;
            
            return {
                horizontalTiles,
                verticalTiles,
                totalTiles
            };
        } catch (error) {
            console.warn('Error calculating visible tile dimensions:', error);
            return {
                horizontalTiles: 0,
                verticalTiles: 0,
                totalTiles: 0
            };
        }
    }
    
    destroy() {
        // Unsubscribe from store updates
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        if (this.app) {
            this.app.destroy(true, true);
        }
    }
}
