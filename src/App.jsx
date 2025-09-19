import { useState, useEffect } from 'preact/hooks';
import AquariumContainer from './components/AquariumContainer';
import TimerOverlay from './components/TimerOverlay';
import AquariumSettings from './components/AquariumSettings';
import DataPanel from './components/DataPanel';

function App() {
  const [mood, setMood] = useState('work');
  const [time, setTime] = useState('25:00');
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

  // Timer logic (optional - could be enhanced later)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setTime(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleMoodChange = (newMood) => {
    setMood(newMood);
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

  return (
    <div className="aquarium-container">
      <TimerOverlay 
        time={time} 
        mood={mood} 
        onMoodChange={handleMoodChange}
      />
      <button className="settings-button" onClick={toggleSettings}>
        ⚙️ Settings
      </button>
      <AquariumContainer 
        mood={mood} 
        onAquariumReady={handleAquariumReady}
      />
      <AquariumSettings 
        isVisible={showSettings}
        onClose={closeSettings}
      />
      <DataPanel 
        visibleCubes={visibleCubes}
        fishInfo={fishInfo}
        viewportPosition={viewportPosition}
        tileDimensions={tileDimensions}
      />
    </div>
  );
}

export default App;
