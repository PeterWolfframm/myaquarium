import { useState } from 'preact/hooks';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';

function DragAndDropProvider({ 
  children, 
  onPositionChange,
  positions = {}
}) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    
    // Handle object sprite drops on aquarium
    if (active.data.current?.type === 'object-sprite' && over?.id === 'aquarium-drop-zone') {
      // Get the aquarium instance from the global scope or props
      // We'll need to pass this through props or get it from a global store
      console.log('Object sprite dropped on aquarium:', {
        spriteUrl: active.data.current.spriteUrl,
        spriteName: active.data.current.spriteName,
        dropPosition: over.rect
      });
      
      // For now, we'll emit a custom event that the App component can listen to
      const dropEvent = new CustomEvent('aquarium-object-drop', {
        detail: {
          spriteUrl: active.data.current.spriteUrl,
          spriteName: active.data.current.spriteName,
          // Approximate drop position - we'll need to convert to world coordinates
          screenX: over.rect.left + over.rect.width / 2,
          screenY: over.rect.top + over.rect.height / 2
        }
      });
      window.dispatchEvent(dropEvent);
    }
    // Handle panel position changes (existing functionality)
    else if (onPositionChange && active && delta) {
      const currentPosition = positions[active.id] || { x: 0, y: 0 };
      const newPosition = {
        x: currentPosition.x + delta.x,
        y: currentPosition.y + delta.y
      };
      
      onPositionChange(active.id, newPosition);
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      {children}
    </DndContext>
  );
}

export default DragAndDropProvider;
