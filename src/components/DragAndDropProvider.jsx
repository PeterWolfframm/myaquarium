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
    const { active, delta } = event;
    
    if (onPositionChange && active) {
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
