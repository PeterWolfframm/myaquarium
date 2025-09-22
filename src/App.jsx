import { useState, useEffect } from 'preact/hooks';
import AquariumContainer from './components/AquariumContainer';
import TimerOverlay from './components/TimerOverlay';
import AquariumSettings from './components/AquariumSettings';
import FishEditor from './components/FishEditor';
import DataPanel from './components/DataPanel';
import { useAquariumStore } from './stores/aquariumStore.js';
import { useFishStore } from './stores/fishStore.js';
import { databaseService } from './services/database.js';

function App() {
  const [mood, setMood] = useState('work');
  const [time, setTime] = useState('00:00');
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [visibleCubes, setVisibleCubes] = useState(0);
  const [fishInfo, setFishInfo] = useState({ horizontalCount: 0, verticalCount: 0, total: 0 });
  const [viewportPosition, setViewportPosition] = useState({ 
    currentX: 0, currentY: 0, maxX: 0, maxY: 0, 
    percentageX: 0, percentageY: 0, tileX: 0, tileY: 0 
  });
  const [tileDimensions, setTileDimensions] = useState({ 
    horizontalTiles: 0, verticalTiles: 0, totalTiles: 0 
  });
  const [aquariumRef, setAquariumRef] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFishEditor, setShowFishEditor] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // Get store initialization functions
  const initializeAquariumStore = useAquariumStore(state => state.initializeFromDatabase);
  const initializeFishStore = useFishStore(state => state.initializeFromDatabase);
  const aquariumLoading = useAquariumStore(state => state.isLoading);
  const fishLoading = useFishStore(state => state.isLoading);

  // Initialize stores from Supabase on app start
  useEffect(() => {
    const initializeStores = async () => {
      try {
        console.log('Initializing aquarium and fish stores from Supabase...');
        await Promise.all([
          initializeAquariumStore(),
          initializeFishStore()
        ]);
        console.log('Stores initialized successfully');
        
        // Initialize time tracking
        await initializeTimeTracking();
      } catch (error) {
        console.error('Error initializing stores:', error);
      }
    };

    initializeStores();
  }, [initializeAquariumStore, initializeFishStore]);

  // Initialize time tracking
  const initializeTimeTracking = async () => {
    try {
      // Check if there's an active session
      const activeSession = await databaseService.getCurrentTimeTrackingSession();
      if (activeSession) {
        setCurrentSession(activeSession);
        setSessionStartTime(new Date(activeSession.start_time));
        setMood(activeSession.mood);
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
  const startNewSession = async (newMood) => {
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
        const elapsedMs = now - sessionStartTime;
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
      }
    };
    
    // Update every 100ms for smooth updates during navigation
    const interval = setInterval(updateAquariumInfo, 100);
    
    return () => clearInterval(interval);
  }, [aquariumRef]);

  const handleMoodChange = async (newMood) => {
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
      const localSession = {
        id: `temp-${Date.now()}`,
        mood: newMood,
        start_time: new Date().toISOString(),
        is_active: true
      };
      setCurrentSession(localSession);
    }
  };

  const handleAquariumReady = (aquarium) => {
    setAquariumRef(aquarium);
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  const closeSettings = () => {
    setShowSettings(false);
  };

  const toggleFishEditor = () => {
    setShowFishEditor(!showFishEditor);
  };
  
  const closeFishEditor = () => {
    setShowFishEditor(false);
  };

  const toggleTimer = () => {
    setShowTimer(!showTimer);
  };

  const toggleStats = () => {
    setShowStats(!showStats);
  };

  return (
    <div className="aquarium-container">
      {/* Show loading indicator while stores are initializing */}
      {(aquariumLoading || fishLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">🐠</div>
          <div className="loading-text">Loading aquarium from cloud...</div>
        </div>
      )}
      
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
      </div>

      {showTimer && (
        <TimerOverlay 
          time={time} 
          mood={mood} 
          onMoodChange={handleMoodChange}
          currentSession={currentSession}
        />
      )}
      <AquariumContainer 
        mood={mood} 
        onAquariumReady={handleAquariumReady}
      />
      <AquariumSettings 
        isVisible={showSettings}
        onClose={closeSettings}
      />
      <FishEditor 
        isVisible={showFishEditor}
        onClose={closeFishEditor}
      />
      {showStats && (
        <DataPanel 
          visibleCubes={visibleCubes}
          fishInfo={fishInfo}
          viewportPosition={viewportPosition}
          tileDimensions={tileDimensions}
        />
      )}
    </div>
  );
}

export default App;
