import { useState, useEffect } from 'preact/hooks';
import AquariumContainer from './components/AquariumContainer';
import TimerOverlay from './components/TimerOverlay';

function App() {
  const [mood, setMood] = useState('work');
  const [time, setTime] = useState('25:00');

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

  const handleMoodChange = (newMood) => {
    setMood(newMood);
  };

  return (
    <div className="aquarium-container">
      <TimerOverlay 
        time={time} 
        mood={mood} 
        onMoodChange={handleMoodChange} 
      />
      <AquariumContainer mood={mood} />
    </div>
  );
}

export default App;
