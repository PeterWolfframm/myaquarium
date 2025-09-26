import { useState, useEffect } from 'preact/hooks';
import AquariumContainer from './components/AquariumContainer';
import TimerOverlay from './components/TimerOverlay';
import AquariumSettings from './components/AquariumSettings';
import FishEditor from './components/FishEditor';
import ObjectsEditor from './components/ObjectsEditor';
import DataPanel from './components/DataPanel';
import CardDesignShowcase2 from './components/CardDesignShowcase2';
import LoginCard from './components/LoginCard';
import UserAccountOverview from './components/UserAccountOverview';
import DragAndDropProvider from './components/DragAndDropProvider';
import { Toaster } from './components/ui/toaster';
import { useAquariumStore } from './stores/aquariumStore';
import { useFishStore } from './stores/fishStore';
import { useUIStore } from './stores/uiStore';
import { useCardStateStore } from './stores/cardStateStore';
import { useAuthStore } from './stores/authStore';
import { databaseService } from './services/database';
import type {
  MoodType,
  TimerSession,
  FishInfo,
  ViewportPosition,
  TileDimensions,
  ZoomInfo,
  PanelPositions,
  Position
} from './types/global';

// Utility function to ensure positions stay within viewport bounds
const constrainToViewport = (position: Position, panelWidth: number = 300, panelHeight: number = 200): Position => {
  const margin = 20; // Minimum margin from viewport edge
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  return {
    x: Math.max(margin, Math.min(position.x, viewportWidth - panelWidth - margin)),
    y: Math.max(margin, Math.min(position.y, viewportHeight - panelHeight - margin))
  };
};

// Function to get safe default positions
  const getSafeDefaultPositions = (): PanelPositions => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 20;
    
    return {
      timer: constrainToViewport({ x: Math.max(margin, viewportWidth / 2 - 150), y: 50 }, 300, 200),
      stats: constrainToViewport({ x: Math.max(margin, viewportWidth - 320), y: 50 }, 320, 300),
      objectsManager: constrainToViewport({ x: margin, y: 120 }, 350, 400),
      cardShowcase2: constrainToViewport({ x: Math.max(margin, viewportWidth / 2 - 250), y: 80 }, 500, 600),
      settings: constrainToViewport({ x: Math.max(margin, viewportWidth / 2 - 200), y: 100 }, 400, 500),
      fishEditor: constrainToViewport({ x: Math.max(margin, viewportWidth / 2 - 250), y: 80 }, 500, 600)
    };
  };

function App() {
  const [mood, setMood] = useState<MoodType>('work');
  const [time, setTime] = useState<string>('00:00');
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [visibleCubes, setVisibleCubes] = useState<number>(0);
  const [fishInfo, setFishInfo] = useState<FishInfo>({ horizontalCount: 0, verticalCount: 0, total: 0 });
  const [viewportPosition, setViewportPosition] = useState<ViewportPosition>({
    currentX: 0, currentY: 0, maxX: 0, maxY: 0,
    percentageX: 0, percentageY: 0, tileX: 0, tileY: 0
  });
  const [tileDimensions, setTileDimensions] = useState<TileDimensions>({
    horizontalTiles: 0, verticalTiles: 0, totalTiles: 0
  });
  const [zoomInfo, setZoomInfo] = useState<ZoomInfo>({
    currentZoom: 1.0,
    zoomPercentage: 100,
    visibleVerticalTiles: 0,
    minZoom: 0.1,
    maxZoom: 4.0
  });
  const [fps, setFps] = useState<number>(0);
  const [aquariumRef, setAquariumRef] = useState<any>(null); // TODO: Type Aquarium class properly
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showUserAccount, setShowUserAccount] = useState<boolean>(false);
  
  // Panel positions for drag and drop - using safe default positions
  const [panelPositions, setPanelPositions] = useState<PanelPositions>(getSafeDefaultPositions());
  
  // Card state management using store
  const cardStates = useCardStateStore(state => state.cardStates);
  const setCardOpen = useCardStateStore(state => state.setCardOpen);
  const getCardState = useCardStateStore(state => state.getCardState);
  const initializeCardStore = useCardStateStore(state => state.initializeFromDatabase);
  
  const [positionsLoading, setPositionsLoading] = useState<boolean>(true);

  // Handle panel position changes
  const handlePositionChange = async (panelId: string, newPosition: Position): Promise<void> => {
    // Constrain position to viewport bounds
    const constrainedPosition = constrainToViewport(newPosition);
    const updatedPositions = {
      ...panelPositions,
      [panelId]: constrainedPosition
    };
    setPanelPositions(updatedPositions);
    
    // Persist to Supabase
    try {
      await databaseService.saveComponentPosition(panelId, constrainedPosition);
    } catch (error) {
      console.warn('Failed to save panel position to database:', error);
      // Note: No localStorage fallback - using database only
    }
  };

  // Authentication store
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    initializeAuth,
    signOut
  } = useAuthStore();

  // Get store initialization functions
  const initializeAquariumStore = useAquariumStore(state => (state as any).initializeFromDatabase);
  const initializeFishStore = useFishStore(state => (state as any).initializeFromDatabase);
  const initializeUIStore = useUIStore(state => (state as any).initializeFromDatabase);
  const aquariumLoading = useAquariumStore(state => state.isLoading);
  const fishLoading = useFishStore(state => state.isLoading);
  const uiLoading = useUIStore(state => state.isLoading);
  const cardStateLoading = useCardStateStore(state => state.isLoading);
  
  // Combined loading state for components that should wait for everything to load
  const isFullyLoaded = !aquariumLoading && !fishLoading && !uiLoading && !cardStateLoading && !positionsLoading && !authLoading;

  // Load component positions from database
  useEffect(() => {
    const loadPositions = async () => {
      try {
        setPositionsLoading(true);
        const savedPositions = await databaseService.getAllComponentPositions();
        
        if (Object.keys(savedPositions).length > 0) {
          // Merge saved positions with safe defaults for any missing components
          const defaultPositions = getSafeDefaultPositions();
          
          // Constrain all saved positions to ensure they're within viewport bounds
          const constrainedSavedPositions: Partial<PanelPositions> = {};
          for (const [panelId, position] of Object.entries(savedPositions)) {
            constrainedSavedPositions[panelId as keyof PanelPositions] = constrainToViewport(position as Position);
          }
          
          const mergedPositions = { ...defaultPositions, ...constrainedSavedPositions };
          setPanelPositions(mergedPositions);
        }
      } catch (error) {
        console.warn('Could not load positions from database, using defaults:', error);
      } finally {
        setPositionsLoading(false);
      }
    };

    loadPositions();
  }, []);

  // Handle window resize to keep panels within bounds
  useEffect(() => {
    const handleResize = () => {
      setPanelPositions(currentPositions => {
        const constrainedPositions = { ...currentPositions };
        for (const [panelId, position] of Object.entries(currentPositions)) {
          constrainedPositions[panelId as keyof PanelPositions] = constrainToViewport(position);
        }
        return constrainedPositions;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle object drops on aquarium
  useEffect(() => {
    const handleObjectDrop = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        spriteUrl: string;
        spriteName: string;
        selectedSize: number;
        screenX: number;
        screenY: number;
        useGridPlacement: boolean;
      }>;
      const { spriteUrl, spriteName, selectedSize, screenX, screenY, useGridPlacement } = customEvent.detail;
      
      if (aquariumRef) {
        console.log(`Placing object: ${spriteName} at screen position (${screenX}, ${screenY})`);
        
        let success = false;
        
        if (useGridPlacement) {
          // Convert absolute screen coordinates to canvas-relative coordinates
          const canvas = document.getElementById('aquarium-canvas');
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const canvasX = screenX - rect.left;
            const canvasY = screenY - rect.top;
            
            // Use precise grid-based placement with canvas-relative coordinates
            const objectSize = selectedSize || 6;
            const gridCoords = aquariumRef.screenToGridCoordinates(canvasX, canvasY, objectSize);
            console.log(`🎯 Placing object at grid (${gridCoords.gridX}, ${gridCoords.gridY}) with size ${objectSize}x${objectSize}`);
            
            success = await aquariumRef.placeObjectAtGrid(
              spriteUrl, 
              gridCoords.gridX, 
              gridCoords.gridY, 
              objectSize, // Use selected size or default to 6
              0  // layer
            );
          } else {
            console.warn('Canvas element not found for coordinate conversion');
          }
        } else {
          // Use legacy world coordinate placement
          const worldPos = aquariumRef.screenToWorld(screenX, screenY);
          success = await aquariumRef.placeObject(spriteUrl, worldPos.worldX, worldPos.worldY);
        }
        
        if (success) {
          console.log(`Object ${spriteName} placed successfully!`);
          // Show success message or update UI as needed
        } else {
          console.warn(`Failed to place object ${spriteName} - position not available`);
          // Show error message to user
        }
      }
    };

    window.addEventListener('aquarium-object-drop', handleObjectDrop);
    return () => {
      window.removeEventListener('aquarium-object-drop', handleObjectDrop);
    };
  }, [aquariumRef]);

  // Initialize authentication and stores from Supabase on app start with timeout fallback
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing authentication and stores from Supabase...');

        // First initialize authentication
        await initializeAuth();

        // Create timeout promises for each store initialization
        const timeoutDuration = 5000; // 5 seconds

        const aquariumInitPromise = initializeAquariumStore();
        const fishInitPromise = initializeFishStore();
        const uiInitPromise = initializeUIStore();
        const cardStateInitPromise = initializeCardStore();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Store initialization timeout')), timeoutDuration);
        });

        try {
          // Race the initialization against the timeout
          await Promise.race([
            Promise.all([aquariumInitPromise, fishInitPromise, uiInitPromise, cardStateInitPromise]),
            timeoutPromise
          ]);
          console.log('Stores initialized successfully');
        } catch (error: any) {
          if (error?.message?.includes('timeout')) {
            console.warn('Store initialization timed out after 5 seconds, using temporary settings');
            // Force all stores to stop loading and use defaults
            (useAquariumStore.getState() as any).setLoadingFalse?.();
            (useFishStore.getState() as any).setLoadingFalse?.();
            (useUIStore.getState() as any).setLoadingFalse?.();
          } else {
            throw error;
          }
        }

        // Initialize time tracking
        await initializeTimeTracking();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  initializeApp();
}, [initializeAuth, initializeAquariumStore, initializeFishStore, initializeUIStore, initializeCardStore]);

  // Initialize time tracking
  const initializeTimeTracking = async (): Promise<void> => {
    try {
      // Check if there's an active session
      const activeSession = await databaseService.getCurrentTimeTrackingSession();
      if (activeSession) {
        setCurrentSession(activeSession);
        setSessionStartTime(new Date(activeSession.start_time));
        setMood(activeSession.mood as MoodType);
      } else {
        // Start a new session with default mood
        await startNewSession('work');
      }
    } catch (error) {
      console.error('Error initializing time tracking:', error);
      // Fallback to starting a new session
      await startNewSession('work');
    }
  };

  // Start a new time tracking session
  const startNewSession = async (newMood: MoodType): Promise<void> => {
    try {
      const session = await databaseService.startTimeTrackingSession(newMood);
      if (session) {
        setCurrentSession(session);
        setSessionStartTime(new Date(session.start_time));
        setMood(newMood);
      }
    } catch (error) {
      console.error('Error starting new session:', error);
    }
  };

  // Timer logic - shows elapsed time for current session
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStartTime) {
        const now = new Date();
        const elapsedMs = now.getTime() - sessionStartTime.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        setTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTime('00:00');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Update visible cubes count, fish info, and viewport position periodically
  useEffect(() => {
    if (!aquariumRef) return;
    
    const updateAquariumInfo = () => {
      if (aquariumRef) {
        if (aquariumRef.getVisibleCubesCount) {
          setVisibleCubes(aquariumRef.getVisibleCubesCount());
        }
        if (aquariumRef.getVisibleFishInfo) {
          setFishInfo(aquariumRef.getVisibleFishInfo());
        }
        if (aquariumRef.getViewportPosition) {
          setViewportPosition(aquariumRef.getViewportPosition());
        }
        if (aquariumRef.getVisibleTileDimensions) {
          setTileDimensions(aquariumRef.getVisibleTileDimensions());
        }
        if (aquariumRef.getZoomInfo) {
          setZoomInfo(aquariumRef.getZoomInfo());
        }
        if (aquariumRef.getFPS) {
          setFps(Math.round(aquariumRef.getFPS()));
        }
      }
    };
    
    // Update every 100ms for smooth updates during navigation
    const interval = setInterval(updateAquariumInfo, 100);
    
    return () => clearInterval(interval);
  }, [aquariumRef]);

  const handleMoodChange = async (newMood: MoodType): Promise<void> => {
    if (newMood === mood) return; // No change needed
    
    // Update UI immediately for responsiveness
    const previousMood = mood;
    const previousSession = currentSession;
    const previousStartTime = sessionStartTime;
    
    setMood(newMood);
    setSessionStartTime(new Date());
    
    try {
      // Save current session and start new one in background
      const newSession = await databaseService.switchMoodAndSaveSession(newMood);
      if (newSession) {
        setCurrentSession(newSession);
        setSessionStartTime(new Date(newSession.start_time));
      } else {
        // If database operation failed, revert to previous state
        setMood(previousMood);
        setCurrentSession(previousSession);
        setSessionStartTime(previousStartTime);
      }
    } catch (error) {
      console.error('Error switching mood:', error);
      // Try to recover by creating a local session state
      const localSession: TimerSession = {
        id: `temp-${Date.now()}`,
        mood: newMood,
        start_time: new Date().toISOString()
      };
      setCurrentSession(localSession);
    }
  };

  const handleAquariumReady = (aquarium: any): void => { // TODO: Type Aquarium class properly
    setAquariumRef(aquarium);
  };
  
  // Helper function to get card open state with default
  const getCardOpen = (componentId: string, defaultOpen: boolean = false): boolean => {
    const cardState = getCardState(componentId);
    return cardState ? cardState.is_open : defaultOpen;
  };

  const toggleSettings = (): void => {
    const isOpen = getCardOpen('settings', false);
    setCardOpen('settings', !isOpen);
  };

  const toggleFishEditor = (): void => {
    const isOpen = getCardOpen('fish-editor', false);
    setCardOpen('fish-editor', !isOpen);
  };

  const toggleTimer = (): void => {
    const isOpen = getCardOpen('timer', true);
    setCardOpen('timer', !isOpen);
  };

  const toggleStats = (): void => {
    const isOpen = getCardOpen('stats', true);
    setCardOpen('stats', !isOpen);
  };

  const toggleUserAccount = (): void => {
    setShowUserAccount(!showUserAccount);
  };

  const toggleObjectsManager = (): void => {
    const isOpen = getCardOpen('objects', false);
    setCardOpen('objects', !isOpen);
  };

  const toggleCardShowcase2 = (): void => {
    const isOpen = getCardOpen('card-showcase', false);
    setCardOpen('card-showcase', !isOpen);
  };

  const toggleLogin = (): void => {
    setShowLogin(!showLogin);
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      // Reload the page to reset all state
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSoftResetAquarium = (): void => {
    // First attempt: Try to properly destroy and reinitialize the aquarium
    if (aquariumRef && aquariumRef.destroy) {
      try {
        console.log('🔄 Attempting soft reset - destroying current aquarium instance...');
        aquariumRef.destroy();
        
        // Wait a brief moment then reload the page as fallback
        setTimeout(() => {
          console.log('🔄 Reloading page to complete soft reset...');
          window.location.reload();
        }, 100);
      } catch (error) {
        console.error('Error during soft reset, falling back to page reload:', error);
        window.location.reload();
      }
    } else {
      // If aquarium instance is not available, just reload
      console.log('🔄 Aquarium instance not available, reloading page...');
      window.location.reload();
    }
  };


  return (
    <DragAndDropProvider
      onPositionChange={handlePositionChange}
      positions={panelPositions}
    >
      <div className="aquarium-container">
        {/* Show loading indicator while stores are initializing */}
        {(aquariumLoading || fishLoading || uiLoading || cardStateLoading || positionsLoading || authLoading) && (
          <div className="loading-overlay">
            <div className="loading-spinner">🐠</div>
            <div className="loading-text">
              {authLoading
                ? 'Authenticating...'
                : 'Loading aquarium from cloud...'
              }
            </div>
          </div>
        )}
        
        {/* Top Status Bar */}
        <div className="top-status-bar">
          <div className="auth-status">
            {isAuthenticated && user ? (
              <div className="user-info clickable" onClick={toggleUserAccount}>
                <span className="user-avatar">👤</span>
                <span className="user-details">
                  <span className="user-name">{user.email || `User ${user.id.slice(-4)}`}</span>
                  <span className="user-status">Signed In</span>
                </span>
              </div>
            ) : (
              <div className="user-info clickable" onClick={() => setShowLogin(true)}>
                <span className="user-avatar">👤</span>
                <span className="user-details">
                  <span className="user-name">Guest</span>
                  <span className="user-status">Click to Sign In</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="control-buttons">
          <button className="control-button timer-button" onClick={toggleTimer}>
            ⏱️ Timer
          </button>
          <button className="control-button stats-button" onClick={toggleStats}>
            📊 Stats
          </button>
          <button className="control-button settings-button" onClick={toggleSettings}>
            ⚙️ Settings
          </button>
          <button className="control-button fish-editor-button" onClick={toggleFishEditor}>
            🐠 Edit Fish
          </button>
          <button className="control-button objects-manager-button" onClick={toggleObjectsManager}>
            🎨 Objects
          </button>
          <button className="control-button card-showcase2-button" onClick={toggleCardShowcase2}>
            ✨ Modern UI
          </button>

          {/* Authentication Button */}
          {isAuthenticated && user ? (
            <button className="control-button" onClick={handleSignOut} title={`Signed in as ${user.email || 'Anonymous'}`}>
              🚪 Sign Out
            </button>
          ) : (
            <button className="control-button" onClick={toggleLogin}>
              🔐 Login
            </button>
          )}

          <button className="control-button soft-reset-button" onClick={handleSoftResetAquarium}>
            🔄 Soft Reset
          </button>
        </div>

        <div className="component-panel">
            {/* Only render timer and stats when fully loaded to prevent pop-in */}
            {isFullyLoaded && (
              <>
                <TimerOverlay 
                  time={time} 
                  mood={mood} 
                  onMoodChange={handleMoodChange}
                  currentSession={currentSession}
                  isOpen={getCardOpen('timer', true)}
                  onToggle={toggleTimer}
                  isDraggable={true}
                  draggableId="timer"
                  draggablePosition={panelPositions.timer}
                />

                <DataPanel 
                  visibleCubes={visibleCubes}
                  fishInfo={fishInfo}
                  viewportPosition={viewportPosition}
                  tileDimensions={tileDimensions}
                  zoomInfo={zoomInfo}
                  fps={fps}
                  aquarium={aquariumRef}
                  isOpen={getCardOpen('stats', true)}
                  onToggle={toggleStats}
                  isDraggable={true}
                  draggableId="stats"
                  draggablePosition={panelPositions.stats}
                />
              </>
            )}

            <ObjectsEditor 
              isOpen={getCardOpen('objects', false)}
              onToggle={toggleObjectsManager}
              isDraggable={true}
              draggableId="objectsManager"
              draggablePosition={panelPositions.objectsManager}
              aquarium={aquariumRef}
            />


            <AquariumSettings 
              isOpen={getCardOpen('settings', false)}
              onToggle={toggleSettings}
              aquarium={aquariumRef}
              isDraggable={true}
              draggableId="settings"
              draggablePosition={panelPositions.settings}
            />
            
            <FishEditor 
              isOpen={getCardOpen('fish-editor', false)}
              onToggle={toggleFishEditor}
              isDraggable={true}
              draggableId="fishEditor"
              draggablePosition={panelPositions.fishEditor}
            />
            
            <CardDesignShowcase2
              isOpen={getCardOpen('card-showcase', false)}
              onToggle={toggleCardShowcase2}
              isDraggable={true}
              draggablePosition={panelPositions.cardShowcase2}
            />
        </div>

        {/* Login Card */}
        <LoginCard
          isOpen={showLogin}
          onToggle={toggleLogin}
          isDraggable={true}
          draggableId="login"
          draggablePosition={panelPositions.cardShowcase2}
        />

        {/* User Account Overview */}
        <UserAccountOverview
          isOpen={showUserAccount}
          onToggle={toggleUserAccount}
          isDraggable={true}
          draggableId="user-account"
          draggablePosition={panelPositions.cardShowcase2}
        />

        <AquariumContainer
          mood={mood}
          onAquariumReady={handleAquariumReady}
        />

        <Toaster />
      </div>
    </DragAndDropProvider>
  );
}

export default App;
