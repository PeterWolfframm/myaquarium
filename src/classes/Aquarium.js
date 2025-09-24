import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { FishManager } from './Fish.js';
import { SharkManager } from './Shark.js';
import { BubbleManager } from './Bubble.js';
import { ObjectManager } from './Object.js';
import { useAquariumStore } from '../stores/aquariumStore.js';
import { AQUARIUM_CONFIG, NAVIGATION, UI_CONFIG, COLORS } from '../constants/index.js';
import { databaseService } from '../services/database.js';

export class Aquarium {
    constructor(canvasElement) {
        this.app = null;
        this.viewport = null;
        this.fishManager = null;
        this.sharkManager = null;
        this.bubbleManager = null;
        this.objectManager = null;
        this.canvasElement = canvasElement;
        
        // Store reference
        this.store = useAquariumStore.getState();
        
        // Subscribe to store changes
        this.unsubscribe = useAquariumStore.subscribe((state) => {
            this.updateFromStore(state);
        });
        
        // Fixed tile system - always 64px tiles
        this.tileSize = AQUARIUM_CONFIG.TILE_SIZE;
        this.tilesHorizontal = this.store.tilesHorizontal;
        this.tilesVertical = this.store.tilesVertical;
        this.worldWidth = this.tilesHorizontal * this.tileSize;
        this.worldHeight = this.tilesVertical * this.tileSize;
        
        console.log(`Aquarium initialized: ${this.tilesHorizontal}x${this.tilesVertical} tiles (${this.worldWidth}x${this.worldHeight}px) with fixed ${this.tileSize}px tiles`);
        
        // Safe zone for UI overlay (center area)
        this.safeZone = {
            x: this.worldWidth / 2 - UI_CONFIG.SAFE_ZONE.WIDTH / 2,
            y: UI_CONFIG.SAFE_ZONE.TOP_MARGIN,
            width: UI_CONFIG.SAFE_ZONE.WIDTH,
            height: UI_CONFIG.SAFE_ZONE.HEIGHT
        };
        
        // Layer containers
        this.backgroundContainer = null;
        this.objectContainer = null;
        this.fishContainer = null;
        this.sharkContainer = null;
        this.bubbleContainer = null;
        this.gridContainer = null;
        this.grid = null;
        
        // Tile highlighting for drag and drop
        this.tileHighlightContainer = null;
        this.tileHighlight = null;
        this.isDragActive = false;
        
        // Orange cube properties
        this.orangeCube = null;
        this.cubePosition = { x: 0, y: 0 }; // Grid position
        this.lastMoveTime = 0;
        this.moveInterval = UI_CONFIG.CUBE_MOVE_INTERVAL;
        
        // Current mood
        this.currentMood = 'work';
        
        // Grid visibility state
        this.showGrid = this.store.showGrid;
        
        // Zoom level tracking
        this.currentZoomLevel = 1.0;
        this.defaultVisibleVerticalTiles = this.store.defaultVisibleVerticalTiles || 20;
        
        this.init().catch(error => {
            console.error('Error initializing aquarium:', error);
        });
    }
    
    async init() {
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
    
    updateFromStore(newState) {
        // Check if grid visibility has changed
        const gridVisibilityChanged = newState.showGrid !== this.showGrid;
        
        // Check if dimensions have changed
        const dimensionsChanged = 
            newState.tilesHorizontal !== this.store.tilesHorizontal ||
            newState.tilesVertical !== this.store.tilesVertical;
            
        // Check if default zoom changed
        const defaultZoomChanged = newState.defaultVisibleVerticalTiles !== this.store.defaultVisibleVerticalTiles;
        
        this.store = newState;
        
        // Update default visible tiles
        if (defaultZoomChanged) {
            this.defaultVisibleVerticalTiles = newState.defaultVisibleVerticalTiles;
            if (this.app && this.viewport) {
                this.setDefaultZoom();
            }
        }
        
        if (dimensionsChanged) {
            // Update tile counts and recalculate world dimensions
            this.tilesHorizontal = newState.tilesHorizontal;
            this.tilesVertical = newState.tilesVertical;
            this.worldWidth = this.tilesHorizontal * this.tileSize;
            this.worldHeight = this.tilesVertical * this.tileSize;
            
            console.log(`Dimensions changed: ${this.tilesHorizontal}x${this.tilesVertical} tiles (${this.worldWidth}x${this.worldHeight}px)`);
            
            if (this.app && this.viewport) {
                // Force update of zoom constraints when dimensions change
                this.updateZoomConstraints();
                this.resize();
            }
        }
        
        // Update grid visibility if changed
        if (gridVisibilityChanged) {
            this.showGrid = newState.showGrid;
            this.updateGridVisibility();
        }
    }
    
    /**
     * Force update zoom constraints - useful when world dimensions change
     */
    updateZoomConstraints() {
        if (!this.viewport || !this.app) return;
        
        const minScale = this.calculateMinZoomScale();
        
        // Remove and re-add clamp-zoom plugin to ensure constraints are updated
        this.viewport.plugins.remove('clamp-zoom');
        this.viewport.clampZoom({
            minScale: minScale,
            maxScale: this.calculateMaxZoomScale()
        });
        
        console.log(`Force updated zoom constraints: minScale = ${minScale.toFixed(4)}`);
        
        // If current zoom is less than the new minimum, adjust it
        const currentScale = this.viewport.scale.x;
        if (currentScale < minScale) {
            this.viewport.setZoom(minScale, true);
            console.log(`Adjusted zoom from ${currentScale.toFixed(4)} to ${minScale.toFixed(4)}`);
        }
    }
    
    async createPixiApp() {
        // Configure PIXI for v8 - use Texture.defaultOptions instead of BaseTexture
        if (PIXI.Texture && PIXI.Texture.defaultOptions) {
            PIXI.Texture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
        }
        
        // Create Pixi application using v8 API - initialization is now asynchronous
        this.app = new PIXI.Application();
        
        // Initialize the application with v8 async pattern
        await this.app.init({
            canvas: this.canvasElement, // 'view' is deprecated, use 'canvas'
            resizeTo: this.canvasElement.parentElement,
            backgroundColor: COLORS.BACKGROUND,
            antialias: false, // Keep pixel art sharp
            powerPreference: 'default', // Use safer power preference
            resolution: 1 // Fixed resolution to avoid scaling issues
        });
        
        // Disable context menu on right click - use the original canvas element
        this.canvasElement.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    /**
     * Calculate minimum zoom scale to ensure you cannot zoom out more than showing all vertical tiles
     * This respects user-defined minimum zoom boundaries when set
     */
    calculateMinZoomScale() {
        if (!this.app || this.worldHeight <= 0) {
            console.warn('Cannot calculate zoom: app or worldHeight invalid', {
                app: !!this.app,
                worldHeight: this.worldHeight
            });
            // Return a reasonable fallback when we can't calculate properly
            return 0.5;
        }
        
        // Check if user has set a custom minimum zoom boundary
        const customMinZoom = this.store.minZoom;
        if (customMinZoom !== null && customMinZoom > 0) {
            console.log(`Using custom minimum zoom: ${customMinZoom.toFixed(4)}`);
            return customMinZoom;
        }
        
        // Calculate the scale needed to show all vertical tiles in the viewport
        const viewportHeight = this.app.screen.height;
        const scaleToFit = viewportHeight / this.worldHeight;

        // Always use the scale that fits all vertical tiles - never allow zooming out beyond this
        const minScaleTarget = scaleToFit;
        
        // Use the calculated scale that shows all tiles - ignore the hardcoded minimum
        // because it's too permissive (0.1) and allows zooming out beyond the aquarium bounds
        const minScale = minScaleTarget;
        
        
        return minScale;
    }

    /**
     * Calculate maximum zoom scale respecting user-defined boundaries
     */
    calculateMaxZoomScale() {
        // Check if user has set a custom maximum zoom boundary
        const customMaxZoom = this.store.maxZoom;
        if (customMaxZoom !== null && customMaxZoom > 0) {
            console.log(`Using custom maximum zoom: ${customMaxZoom.toFixed(4)}`);
            return customMaxZoom;
        }
        
        // Use system default maximum zoom
        return NAVIGATION.MAX_ZOOM_SCALE;
    }

    setupViewport() {
        // Create viewport with pixi-viewport
        this.viewport = new Viewport({
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            events: this.app.renderer.events // v8 uses events instead of interaction
        });
        
        // Add viewport to stage
        this.app.stage.addChild(this.viewport);
        
        // Calculate minimum and maximum zoom scales
        const minScale = this.calculateMinZoomScale();
        const maxScale = this.calculateMaxZoomScale();
        
        // Configure viewport plugins - only clamping, no mouse interactions
        this.viewport
            .clampZoom({
                minScale: minScale,
                maxScale: maxScale
            })
            .clamp({
                left: 0,
                right: this.worldWidth,
                top: 0,
                bottom: this.worldHeight,
                underflow: NAVIGATION.CLAMP_UNDERFLOW
            });
        
        // Explicitly disable mouse wheel zooming - keyboard only
        this.viewport.options.disableOnContextMenu = true;
        
        // Remove any wheel plugin if it exists
        if (this.viewport.plugins.get('wheel')) {
            this.viewport.plugins.remove('wheel');
        }
        
        // Set up zoom level tracking
        this.viewport.on('zoomed', () => {
            this.updateCurrentZoomLevel();
            this.updateGridForScale();
        });
        
        // Start centered horizontally and show the bottom (ground) of the aquarium
        const viewportCenterX = this.worldWidth / 2;
        const viewportCenterY = Math.max(
            this.app.screen.height / 2, 
            this.worldHeight - (this.app.screen.height / 2)
        );
        this.viewport.moveCenter(viewportCenterX, viewportCenterY);
        
        // Set default zoom level based on default visible vertical tiles
        this.setDefaultZoom();
        
        console.log(`Viewport setup complete: ${this.worldWidth}x${this.worldHeight}px world, min zoom: ${minScale.toFixed(4)}`);
    }
    
    createLayers() {
        // Create separate containers for organized rendering
        this.backgroundContainer = new PIXI.Container();
        this.objectContainer = new PIXI.Container();
        this.gridContainer = new PIXI.Container();
        this.tileHighlightContainer = new PIXI.Container();
        this.bubbleContainer = new PIXI.Container();
        this.fishContainer = new PIXI.Container();
        this.sharkContainer = new PIXI.Container();
        
        // Add containers to viewport in order (back to front)
        this.viewport.addChild(this.backgroundContainer);
        this.viewport.addChild(this.objectContainer); // Objects above background
        this.viewport.addChild(this.gridContainer);
        this.viewport.addChild(this.tileHighlightContainer); // Tile highlights above grid
        this.viewport.addChild(this.bubbleContainer);
        this.viewport.addChild(this.fishContainer);
        this.viewport.addChild(this.sharkContainer); // Sharks on top of fish
    }
    
    /**
     * Create grid that draws EVERY tile as requested by the user
     * No performance optimizations that skip tiles - always draw the complete grid
     */
    createGrid() {
        const grid = new PIXI.Graphics();
        
        // Properly disable interactivity to prevent PIXI event errors
        grid.interactive = false;
        grid.interactiveChildren = false;
        grid.cursor = 'default';
        
        // PIXI.js v8: Set stroke style with fixed line width
        grid.setStrokeStyle({
            width: UI_CONFIG.GRID_LINE_WIDTH,
            color: COLORS.GRID_LINES,
            alpha: UI_CONFIG.GRID_LINE_OPACITY
        });
        
        // Draw EVERY vertical line (one for each tile column + boundary)
        for (let x = 0; x <= this.tilesHorizontal; x++) {
            const xPos = x * this.tileSize;
            grid.moveTo(xPos, 0);
            grid.lineTo(xPos, this.worldHeight);
        }
        
        // Draw EVERY horizontal line (one for each tile row + boundary)
        for (let y = 0; y <= this.tilesVertical; y++) {
            const yPos = y * this.tileSize;
            grid.moveTo(0, yPos);
            grid.lineTo(this.worldWidth, yPos);
        }
        
        // PIXI.js v8: Apply the stroke
        grid.stroke();
        
        this.gridContainer.addChild(grid);
        
        // Store the grid reference for updates
        this.grid = grid;
        
        // Set initial visibility based on store state
        this.updateGridVisibility();
        
        const totalLines = this.tilesHorizontal + this.tilesVertical + 2;
        console.log(`Grid created: ${totalLines} lines total (${this.tilesHorizontal + 1} vertical + ${this.tilesVertical + 1} horizontal)`);
        console.log(`Grid covers ${this.tilesHorizontal}x${this.tilesVertical} tiles at ${this.tileSize}px each`);
    }
    
    updateGridVisibility() {
        // Toggle grid container visibility
        if (this.gridContainer) {
            this.gridContainer.visible = this.showGrid;
        }
    }
    
    /**
     * Create or update tile highlight for 6x6 area
     * @param {number} gridX - Grid X position (top-left tile)
     * @param {number} gridY - Grid Y position (top-left tile)
     * @param {number} size - Size in tiles (default 6 for 6x6)
     */
    showTileHighlight(gridX, gridY, size = 6) {
        // Remove existing highlight
        this.hideTileHighlight();
        
        // Ensure grid is visible during drag
        if (this.gridContainer) {
            this.gridContainer.visible = true;
        }
        
        // Create new highlight graphics
        this.tileHighlight = new PIXI.Graphics();
        
        // Disable interactivity
        this.tileHighlight.interactive = false;
        this.tileHighlight.interactiveChildren = false;
        
        // Calculate world position and size
        const worldX = gridX * this.tileSize;
        const worldY = gridY * this.tileSize;
        const worldSize = size * this.tileSize;
        
        // Draw highlight rectangle with semi-transparent fill and bright border
        this.tileHighlight.rect(worldX, worldY, worldSize, worldSize);
        this.tileHighlight.fill({ color: 0x00ff00, alpha: 0.2 }); // Green with transparency
        
        this.tileHighlight.rect(worldX, worldY, worldSize, worldSize);
        this.tileHighlight.stroke({ width: 3, color: 0x00ff00, alpha: 0.8 }); // Bright green border
        
        this.tileHighlightContainer.addChild(this.tileHighlight);
        
        // Tile highlight now visible
    }
    
    /**
     * Hide tile highlight
     */
    hideTileHighlight() {
        if (this.tileHighlight) {
            this.tileHighlightContainer.removeChild(this.tileHighlight);
            this.tileHighlight.destroy();
            this.tileHighlight = null;
        }
        
        // Restore original grid visibility
        this.updateGridVisibility();
    }
    
    /**
     * Convert screen coordinates to grid coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} objectSize - Size of the object (default: 6)
     * @returns {Object} {gridX, gridY, worldX, worldY}
     */
    screenToGridCoordinates(screenX, screenY, objectSize = 6) {
        // Convert screen to world coordinates using viewport
        const worldPos = this.viewport.toWorld(screenX, screenY);
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(worldPos.x / this.tileSize);
        const gridY = Math.floor(worldPos.y / this.tileSize);
        
        // Apply clamping to ensure object fits within bounds
        const clampedGridX = Math.max(0, Math.min(gridX, this.tilesHorizontal - objectSize));
        const clampedGridY = Math.max(0, Math.min(gridY, this.tilesVertical - objectSize));
        
        return {
            gridX: clampedGridX,
            gridY: clampedGridY,
            worldX: worldPos.x,
            worldY: worldPos.y
        };
    }
    
    /**
     * Start drag mode - show grid and prepare for tile highlighting
     */
    startDragMode() {
        this.isDragActive = true;
        
        // Ensure grid is visible during drag
        if (this.gridContainer) {
            this.gridContainer.visible = true;
        }
        
        // Grid is now visible during drag
    }
    
    /**
     * End drag mode - hide highlight and restore grid visibility
     */
    endDragMode() {
        this.isDragActive = false;
        this.hideTileHighlight();
        
        // Drag mode ended, highlight hidden
    }
    
    /**
     * Set default zoom level based on default visible vertical tiles
     */
    setDefaultZoom() {
        if (!this.viewport || !this.app || this.defaultVisibleVerticalTiles <= 0) return;
        
        // Calculate scale needed to show the specified number of vertical tiles
        const viewportHeight = this.app.screen.height;
        const targetTileHeight = this.defaultVisibleVerticalTiles * this.tileSize;
        const defaultScale = viewportHeight / targetTileHeight;
        
        // Ensure the scale is within valid bounds
        const minScale = this.calculateMinZoomScale();
        const maxScale = this.calculateMaxZoomScale();
        const clampedScale = Math.max(minScale, Math.min(maxScale, defaultScale));
        
        this.viewport.setZoom(clampedScale, true);
        this.updateCurrentZoomLevel();
        
        console.log(`Set default zoom: ${clampedScale.toFixed(4)}x to show ${this.defaultVisibleVerticalTiles} vertical tiles`);
    }
    
    /**
     * Update current zoom level tracking
     */
    updateCurrentZoomLevel() {
        if (this.viewport) {
            this.currentZoomLevel = this.viewport.scale.x;
        }
    }
    
    /**
     * Update grid line width based on current zoom level for consistent appearance
     */
    updateGridForScale() {
        if (!this.grid || !this.viewport) return;
        
        const currentScale = this.viewport.scale.x;
        // Calculate line width that maintains visual consistency
        const lineWidth = Math.max(0.5, UI_CONFIG.GRID_LINE_WIDTH / currentScale);
        
        // Clear and redraw the grid with new line width
        this.grid.clear();
        
        // PIXI.js v8: Set stroke style with scaled line width
        this.grid.setStrokeStyle({
            width: lineWidth,
            color: COLORS.GRID_LINES,
            alpha: UI_CONFIG.GRID_LINE_OPACITY
        });
        
        // Draw EVERY vertical line
        for (let x = 0; x <= this.tilesHorizontal; x++) {
            const xPos = x * this.tileSize;
            this.grid.moveTo(xPos, 0);
            this.grid.lineTo(xPos, this.worldHeight);
        }
        
        // Draw EVERY horizontal line
        for (let y = 0; y <= this.tilesVertical; y++) {
            const yPos = y * this.tileSize;
            this.grid.moveTo(0, yPos);
            this.grid.lineTo(this.worldWidth, yPos);
        }
        
        // Apply the stroke
        this.grid.stroke();
    }
    
    createOrangeCube() {
        // Create orange cube sprite
        this.orangeCube = new PIXI.Graphics();
        
        // Properly disable interactivity to prevent PIXI event errors
        this.orangeCube.interactive = false;
        this.orangeCube.interactiveChildren = false;
        this.orangeCube.cursor = 'default';
        
        this.orangeCube.clear();
        
        // Draw a filled rectangle (cube) - positioned at 0,0
        const cubeSize = this.tileSize * UI_CONFIG.CUBE_SIZE_RATIO;
        this.orangeCube.rect(0, 0, cubeSize, cubeSize);
        this.orangeCube.fill(COLORS.ORANGE_CUBE);
        
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
            
        }
    }
    
    createBackground() {
        console.log('Creating aquarium background...');
        
        // Create ocean floor
        const floor = new PIXI.Graphics();
        floor.rect(0, this.worldHeight - UI_CONFIG.FLOOR_HEIGHT, this.worldWidth, UI_CONFIG.FLOOR_HEIGHT);
        floor.fill({ color: COLORS.SAND_BASE, alpha: 0.8 });
        
        // Add some texture to the floor
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.worldWidth;
            const y = this.worldHeight - UI_CONFIG.FLOOR_HEIGHT + Math.random() * UI_CONFIG.FLOOR_HEIGHT;
            const size = 2 + Math.random() * 4;
            const color = COLORS.SAND_TEXTURES[Math.floor(Math.random() * COLORS.SAND_TEXTURES.length)];
            
            floor.circle(x, y, size);
            floor.fill({ color: color, alpha: 0.6 });
        }
        
        this.backgroundContainer.addChild(floor);
        
        // Create seaweed and decorations
        this.createSeaweed();
        this.createRocks();
        
        // Create water effect gradient
        const waterGradient = new PIXI.Graphics();
        waterGradient.rect(0, 0, this.worldWidth, this.worldHeight);
        waterGradient.fill({ color: COLORS.WATER_OVERLAY, alpha: 0.1 });
        
        this.backgroundContainer.addChild(waterGradient);
        
        console.log(`Background created: floor, seaweed, rocks, and water gradient added to container`);
        console.log(`Background container children count: ${this.backgroundContainer.children.length}`);
    }
    
    createSeaweed() {
        const seaweedCount = Math.floor(this.worldWidth / UI_CONFIG.SEAWEED_SPACING);
        
        for (let i = 0; i < seaweedCount; i++) {
            const x = (i + 0.5) * UI_CONFIG.SEAWEED_SPACING + (Math.random() - 0.5) * 100;
            const height = UI_CONFIG.SEAWEED_HEIGHT_MIN + Math.random() * (UI_CONFIG.SEAWEED_HEIGHT_MAX - UI_CONFIG.SEAWEED_HEIGHT_MIN);
            
            // Skip if in safe zone
            if (x >= this.safeZone.x && x <= this.safeZone.x + this.safeZone.width) {
                continue;
            }
            
            const seaweed = new PIXI.Graphics();
            
            // Draw swaying seaweed
            const segments = UI_CONFIG.SEAWEED_SEGMENTS;
            const segmentHeight = height / segments;
            let currentX = x;
            let currentY = this.worldHeight - UI_CONFIG.FLOOR_HEIGHT;
            
            for (let j = 0; j < segments; j++) {
                const nextX = currentX + (Math.random() - 0.5) * 20;
                const nextY = currentY - segmentHeight;
                const width = 8 - (j * 0.8); // Taper toward top
                
                seaweed.poly([
                    currentX - width/2, currentY,
                    currentX + width/2, currentY,
                    nextX + width/2, nextY,
                    nextX - width/2, nextY
                ]);
                seaweed.fill({ color: COLORS.SEAWEED, alpha: 0.7 });
                
                currentX = nextX;
                currentY = nextY;
            }
            this.backgroundContainer.addChild(seaweed);
        }
    }
    
    createRocks() {
        const rockCount = Math.floor(this.worldWidth / UI_CONFIG.ROCK_SPACING);
        
        for (let i = 0; i < rockCount; i++) {
            const x = Math.random() * this.worldWidth;
            const y = this.worldHeight - 40;
            
            // Skip if in safe zone
            if (x >= this.safeZone.x - 50 && x <= this.safeZone.x + this.safeZone.width + 50) {
                continue;
            }
            
            const rock = new PIXI.Graphics();
            const rockSize = UI_CONFIG.ROCK_SIZE_MIN + Math.random() * (UI_CONFIG.ROCK_SIZE_MAX - UI_CONFIG.ROCK_SIZE_MIN);
            const rockColor = COLORS.ROCKS[Math.floor(Math.random() * COLORS.ROCKS.length)];
            
            rock.ellipse(x, y, rockSize, rockSize * 0.6);
            rock.fill({ color: rockColor, alpha: 0.9 });
            
            this.backgroundContainer.addChild(rock);
        }
    }
    
    spawnEntities() {
        console.log('Spawning entities...');
        
        // Create object manager
        console.log(`Creating object manager with world size: ${this.worldWidth}x${this.worldHeight}`);
        this.objectManager = new ObjectManager(
            this.objectContainer,
            this.worldWidth,
            this.worldHeight,
            this.tileSize,
            this.tilesHorizontal,
            this.tilesVertical
        );
        
        // Load existing objects from database
        this.loadObjectsFromDatabase();
        
        // Create fish manager
        console.log(`Creating fish manager with world size: ${this.worldWidth}x${this.worldHeight}`);
        this.fishManager = new FishManager(
            this.fishContainer,
            this.worldWidth,
            this.worldHeight,
            this.safeZone
        );
        
        // Create shark manager
        console.log(`Creating shark manager with world size: ${this.worldWidth}x${this.worldHeight}`);
        this.sharkManager = new SharkManager(
            this.sharkContainer,
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
    
    /**
     * Setup keyboard event listeners for tile-based navigation and zoom
     * Arrow keys move the viewport by tile increments
     * +/- keys zoom in/out with proper constraints
     */
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'b') {
                this.bubbleContainer.visible = !this.bubbleContainer.visible;
            }
            
            // Arrow key navigation - move by tile increments
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                
                if (!this.viewport) return;
                
                // Move by the specified number of tiles
                const moveDistance = this.tileSize * NAVIGATION.MOVE_DISTANCE_TILES;
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
                
                // Log movement for debugging
                const tileX = Math.floor(this.viewport.center.x / this.tileSize);
                const tileY = Math.floor(this.viewport.center.y / this.tileSize);
                console.log(`Moved to tile position: (${tileX}, ${tileY})`);
            }
            
            // Zoom controls with + and - keys - manual interception
            if (e.key === '+' || e.key === '=' || e.key === '-') {
                e.preventDefault();
                
                if (!this.viewport) return;
                
                const currentScale = this.viewport.scale.x;
                const zoomFactor = NAVIGATION.ZOOM_FACTOR;
                const viewportHeight = this.app.screen.height;
                const maxZoomScale = this.calculateMaxZoomScale();
                
                if (e.key === '+' || e.key === '=') {
                    // Zoom in - respect max zoom constraint
                    const newScale = Math.min(maxZoomScale, currentScale * zoomFactor);
                    this.viewport.setZoom(newScale, true);
                    this.updateCurrentZoomLevel();
                    this.updateGridForScale();
                    console.log(`Zoomed in to ${newScale.toFixed(4)}x`);
                } else if (e.key === '-') {
                    // Zoom out - prevent going beyond the minimum zoom scale
                    const proposedScale = currentScale / zoomFactor;
                    
                    // Get the actual minimum zoom scale (shows all vertical tiles)
                    const minZoomScale = this.calculateMinZoomScale();
                    
                    // Check if the proposed zoom would be less than minimum
                    if (proposedScale <= minZoomScale) {
                        // If we would go below minimum, set zoom to exactly the minimum level
                        this.viewport.setZoom(minZoomScale, true);
                        console.log(`Zoom intercepted: Set to minimum zoom scale ${minZoomScale.toFixed(4)}x (shows all ${this.tilesVertical} vertical tiles)`);
                    } else {
                        // Normal zoom out
                        this.viewport.setZoom(proposedScale, true);
                        console.log(`Zoomed out to ${proposedScale.toFixed(4)}x`);
                    }
                    
                    this.updateCurrentZoomLevel();
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
            
            if (this.sharkManager) {
                this.sharkManager.update(dt);
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
        
        // Update shark speed
        if (this.sharkManager) {
            this.sharkManager.setMood(mood);
        }
        
        console.log(`Mood set to: ${mood}`);
    }
    
    resize() {
        if (!this.app || !this.viewport) return;
        
        console.log(`Resizing aquarium: viewport ${this.app.screen.width}x${this.app.screen.height}, world ${this.worldWidth}x${this.worldHeight}`);
        
        // Update viewport screen size and world size
        this.viewport.resize(this.app.screen.width, this.app.screen.height, this.worldWidth, this.worldHeight);
        
        // Recalculate and update zoom constraints by removing and re-adding the plugin
        const minScale = this.calculateMinZoomScale();
        
        // Remove existing clamp-zoom plugin and re-add with new constraints
        this.viewport.plugins.remove('clamp-zoom');
        this.viewport.clampZoom({
            minScale: minScale,
            maxScale: this.calculateMaxZoomScale()
        });
        
        console.log(`Updated zoom constraints: minScale = ${minScale.toFixed(4)}`);
        
        // If current zoom is less than the new minimum, adjust it
        const currentScale = this.viewport.scale.x;
        if (currentScale < minScale) {
            this.viewport.setZoom(minScale, true);
            console.log(`Adjusted zoom from ${currentScale.toFixed(4)} to ${minScale.toFixed(4)}`);
        }
        
        // Update safe zone position
        const screenCenterX = this.app.screen.width / 2;
        const screenCenterY = this.app.screen.height / 2;
        const worldCenter = this.viewport.toWorld(screenCenterX, screenCenterY);
        
        this.safeZone = {
            x: worldCenter.x - UI_CONFIG.SAFE_ZONE.WIDTH / 2,
            y: Math.max(UI_CONFIG.SAFE_ZONE.TOP_MARGIN, worldCenter.y - UI_CONFIG.SAFE_ZONE.HEIGHT / 2),
            width: UI_CONFIG.SAFE_ZONE.WIDTH,
            height: UI_CONFIG.SAFE_ZONE.HEIGHT
        };
        
        // Recreate grid with new dimensions if they changed
        if (this.gridContainer) {
            this.gridContainer.removeChildren();
            this.grid = null;
            this.createGrid();
            
            // Update orange cube
            if (this.orangeCube) {
                this.gridContainer.removeChild(this.orangeCube);
                this.createOrangeCube();
            }
        }
        
        // Set default zoom after resize
        this.setDefaultZoom();
        
        // Update managers with new dimensions
        if (this.fishManager) {
            this.fishManager.resize(this.worldWidth, this.worldHeight, this.safeZone);
        }
        
        if (this.sharkManager) {
            this.sharkManager.resize(this.worldWidth, this.worldHeight, this.safeZone);
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
            sharks: this.sharkManager ? this.sharkManager.sharks.length : 0,
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
            
            // Count visible grid tiles
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
    
    /**
     * Get current zoom information for UI display
     */
    getZoomInfo() {
        if (!this.viewport || !this.app) {
            return {
                currentZoom: 1.0,
                minZoom: this.calculateMinZoomScale(),
                maxZoom: NAVIGATION.MAX_ZOOM_SCALE,
                defaultZoom: 1.0,
                zoomPercentage: 100,
                visibleVerticalTiles: 0
            };
        }
        
        try {
            const currentZoom = this.viewport.scale.x;
            const minZoom = this.calculateMinZoomScale();
            const maxZoom = this.calculateMaxZoomScale();
            
            // Calculate how many vertical tiles are currently visible
            const viewportHeight = this.app.screen.height;
            const visibleVerticalTiles = Math.round(viewportHeight / (this.tileSize * currentZoom));
            
            // Calculate default zoom scale
            const defaultZoom = viewportHeight / (this.defaultVisibleVerticalTiles * this.tileSize);
            
            return {
                currentZoom: Math.round(currentZoom * 100) / 100, // Round to 2 decimal places
                minZoom: Math.round(minZoom * 100) / 100,
                maxZoom: Math.round(maxZoom * 100) / 100,
                defaultZoom: Math.round(defaultZoom * 100) / 100,
                zoomPercentage: Math.round(currentZoom * 100),
                visibleVerticalTiles: visibleVerticalTiles,
                defaultVisibleVerticalTiles: this.defaultVisibleVerticalTiles
            };
        } catch (error) {
            console.warn('Error calculating zoom info:', error);
            return {
                currentZoom: 1.0,
                minZoom: this.calculateMinZoomScale(),
                maxZoom: this.calculateMaxZoomScale(),
                defaultZoom: 1.0,
                zoomPercentage: 100,
                visibleVerticalTiles: 0
            };
        }
    }
    
    /**
     * Load existing objects from database
     */
    async loadObjectsFromDatabase() {
        try {
            console.log('Loading placed objects from database...');
            const objectsData = await databaseService.getPlacedObjects();
            
            if (objectsData && objectsData.length > 0) {
                // Convert database format to ObjectManager format
                const convertedData = objectsData.map(obj => ({
                    id: obj.object_id,
                    spriteUrl: obj.sprite_url,
                    gridX: obj.grid_x,
                    gridY: obj.grid_y,
                    size: obj.size || 6,
                    layer: obj.layer || 0
                }));
                
                await this.objectManager.loadObjectsFromData(convertedData);
                console.log(`Loaded ${objectsData.length} objects from database`);
            } else {
                console.log('No objects found in database');
            }
        } catch (error) {
            console.error('Error loading objects from database:', error);
        }
    }
    
    /**
     * Handle object placement from drag and drop (legacy method using world coordinates)
     * @param {string} spriteUrl - URL of the sprite to place
     * @param {number} worldX - World X coordinate for placement
     * @param {number} worldY - World Y coordinate for placement
     * @returns {Promise<boolean>} True if placement successful
     */
    async placeObject(spriteUrl, worldX, worldY) {
        if (!this.objectManager) {
            console.warn('ObjectManager not initialized');
            return false;
        }
        
        try {
            const objectId = await this.objectManager.addObject(spriteUrl, worldX, worldY, 6);
            
            if (objectId) {
                // Save to database
                const objectData = this.objectManager.objects.get(objectId).toData();
                await databaseService.savePlacedObject({
                    object_id: objectData.id,
                    sprite_url: objectData.spriteUrl,
                    grid_x: objectData.gridX,
                    grid_y: objectData.gridY,
                    size: objectData.size,
                    layer: objectData.layer
                });
                
                console.log(`Object placed successfully with ID: ${objectId}`);
                return true;
            } else {
                console.warn('Failed to place object - no available space');
                return false;
            }
        } catch (error) {
            console.error('Error placing object:', error);
            return false;
        }
    }
    
    /**
     * Place object at specific grid coordinates
     * @param {string} spriteUrl - URL of the sprite to place
     * @param {number} gridX - Grid X coordinate (top-left tile)
     * @param {number} gridY - Grid Y coordinate (top-left tile) 
     * @param {number} size - Size in tiles (default 6)
     * @param {number} layer - Rendering layer (default 0)
     * @returns {Promise<boolean>} True if placement successful
     */
    async placeObjectAtGrid(spriteUrl, gridX, gridY, size = 6, layer = 0) {
        if (!this.objectManager) {
            console.warn('ObjectManager not initialized');
            return false;
        }
        
        try {
            const objectId = await this.objectManager.addObjectAtGrid(spriteUrl, gridX, gridY, size, layer);
            
            if (objectId) {
                // Save to database
                const objectData = this.objectManager.objects.get(objectId).toData();
                await databaseService.savePlacedObject({
                    object_id: objectData.id,
                    sprite_url: objectData.spriteUrl,
                    grid_x: objectData.gridX,
                    grid_y: objectData.gridY,
                    size: objectData.size,
                    layer: objectData.layer
                });
                
                console.log(`Object placed at grid (${gridX}, ${gridY}) with ID: ${objectId}`);
                return true;
            } else {
                console.warn(`Failed to place object at grid (${gridX}, ${gridY}) - position not available`);
                return false;
            }
        } catch (error) {
            console.error('Error placing object at grid:', error);
            return false;
        }
    }
    
    /**
     * Remove an object from the aquarium
     * @param {string} objectId - ID of object to remove
     * @returns {Promise<boolean>} True if removal successful
     */
    async removeObject(objectId) {
        if (!this.objectManager) {
            console.warn('ObjectManager not initialized');
            return false;
        }
        
        try {
            this.objectManager.removeObject(objectId);
            await databaseService.deletePlacedObject(objectId);
            console.log(`Object ${objectId} removed successfully`);
            return true;
        } catch (error) {
            console.error('Error removing object:', error);
            return false;
        }
    }
    
    /**
     * Get object count for stats
     * @returns {number} Number of placed objects
     */
    getObjectCount() {
        return this.objectManager ? this.objectManager.getObjectCount() : 0;
    }
    
    /**
     * Enable object selection with click callback
     * @param {Function} clickCallback - Function to call when object is clicked
     */
    enableObjectSelection(clickCallback) {
        if (this.objectManager) {
            this.objectManager.setClickCallback(clickCallback);
        }
    }
    
    /**
     * Disable object selection
     */
    disableObjectSelection() {
        if (this.objectManager) {
            this.objectManager.setClickCallback(null);
            this.objectManager.clearSelection();
        }
    }
    
    /**
     * Clear object selection
     */
    clearObjectSelection() {
        if (this.objectManager) {
            console.log('🧹 Aquarium clearing object selection...');
            this.objectManager.clearSelection();
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} {worldX, worldY} World coordinates
     */
    screenToWorld(screenX, screenY) {
        if (!this.viewport) {
            return { worldX: screenX, worldY: screenY };
        }
        
        const worldPos = this.viewport.toWorld(screenX, screenY);
        return {
            worldX: worldPos.x,
            worldY: worldPos.y
        };
    }
    
    destroy() {
        // Unsubscribe from store updates
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Clean up managers
        if (this.fishManager) {
            this.fishManager.destroy();
        }
        
        if (this.sharkManager) {
            this.sharkManager.destroy();
        }
        
        if (this.bubbleManager) {
            this.bubbleManager.destroy();
        }
        
        if (this.app) {
            this.app.destroy(true, true);
        }
    }
}