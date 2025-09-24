import { useEffect, useRef } from 'preact/hooks';
import { useDroppable } from '@dnd-kit/core';
import { Aquarium } from '../classes/Aquarium.js';
import { useAquariumStore } from '../stores/aquariumStore.js';

function AquariumContainer({ mood, onAquariumReady }) {
  const canvasRef = useRef(null);
  const aquariumRef = useRef(null);
  const store = useAquariumStore();

  // Set up drop zone for sprite placement
  const { isOver, setNodeRef } = useDroppable({
    id: 'aquarium-drop-zone',
    data: {
      type: 'aquarium-canvas'
    }
  });

  useEffect(() => {
    // Initialize aquarium when component mounts
    if (canvasRef.current && !aquariumRef.current) {
      aquariumRef.current = new Aquarium(canvasRef.current);
      
      // Notify parent component that aquarium is ready
      if (onAquariumReady) {
        onAquariumReady(aquariumRef.current);
      }
    }

    // Cleanup when component unmounts
    return () => {
      if (aquariumRef.current) {
        aquariumRef.current.destroy();
        aquariumRef.current = null;
      }
    };
  }, []);
  
  // Watch for store changes that require aquarium recreation
  useEffect(() => {
    if (aquariumRef.current) {
      // The store subscription in Aquarium class will handle updates
      // No need to recreate the aquarium here as it handles live updates
    }
  }, [store.tilesHorizontal, store.tilesVertical, store.showGrid]);

  useEffect(() => {
    // Update mood when it changes
    if (aquariumRef.current) {
      aquariumRef.current.setMood(mood);
    }
  }, [mood]);

  useEffect(() => {
    // Handle resize events
    const handleResize = () => {
      if (aquariumRef.current) {
        aquariumRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={setNodeRef}
      className={`aquarium-drop-zone ${isOver ? 'drag-over' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      <canvas ref={canvasRef} id="aquarium-canvas" />
      {isOver && (
        <div className="drop-overlay">
          <div className="drop-message">
            Release to place object in aquarium
          </div>
        </div>
      )}
    </div>
  );
}

export default AquariumContainer;
