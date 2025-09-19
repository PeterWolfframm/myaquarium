import { useState, useEffect } from 'preact/hooks';
import AquariumContainer from './components/AquariumContainer';
import TimerOverlay from './components/TimerOverlay';

function App() {
  const [mood, setMood] = useState('work');
  const [time, setTime] = useState('25:00');
  const [visibleCubes, setVisibleCubes] = useState(0);
  const [aquariumRef, setAquariumRef] = useState(null);

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

  // Update visible cubes count periodically
  useEffect(() => {
    if (!aquariumRef) return;
    
    const updateVisibleCubes = () => {
      if (aquariumRef && aquariumRef.getVisibleCubesCount) {
        setVisibleCubes(aquariumRef.getVisibleCubesCount());
      }
    };
    
    // Update every 100ms for smooth updates during navigation
    const interval = setInterval(updateVisibleCubes, 100);
    
    return () => clearInterval(interval);
  }, [aquariumRef]);

  const handleMoodChange = (newMood) => {
    setMood(newMood);
  };

  const handleAquariumReady = (aquarium) => {
    setAquariumRef(aquarium);
  };

  return (
    <div className="aquarium-container">
      <TimerOverlay 
        time={time} 
        mood={mood} 
        onMoodChange={handleMoodChange}
        visibleCubes={visibleCubes}
      />
      <AquariumContainer 
        mood={mood} 
        onAquariumReady={handleAquariumReady}
      />
    </div>
  );
}

export default App;
