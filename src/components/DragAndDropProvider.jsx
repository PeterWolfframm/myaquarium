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
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

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
    
    // Set up mouse tracking for accurate drop positioning
    const handleMouseMove = (e) => {
      setLastMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Clean up on drag end
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', cleanup);
    };
    document.addEventListener('mouseup', cleanup);
  };

  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    
    // Handle object sprite drops on aquarium
    if (active.data.current?.type === 'object-sprite' && over?.id === 'aquarium-drop-zone') {
      console.log('Object sprite dropped on aquarium:', {
        spriteUrl: active.data.current.spriteUrl,
        spriteName: active.data.current.spriteName,
        dropPosition: over.rect
      });
      
      // Use actual mouse position instead of drop zone center
      const dropScreenX = lastMousePosition.x;
      const dropScreenY = lastMousePosition.y;
      console.log(`🚀 DND-KIT DROP: over.rect center would be (${over.rect.left + over.rect.width / 2}, ${over.rect.top + over.rect.height / 2})`);
      console.log(`🚀 DND-KIT DROP: Using actual mouse position (${dropScreenX}, ${dropScreenY})`);
      
      // Emit custom event with precise drop position for grid-based placement
      const dropEvent = new CustomEvent('aquarium-object-drop', {
        detail: {
          spriteUrl: active.data.current.spriteUrl,
          spriteName: active.data.current.spriteName,
          // Use the actual mouse position where the drop occurred
          screenX: dropScreenX,
          screenY: dropScreenY,
          // Flag to indicate this should use grid-based placement
          useGridPlacement: true
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
