import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Collapsible from './Collapsible.jsx';

function DraggableCollapsible({ 
  id,
  title, 
  children, 
  position,
  draggablePosition = { x: 0, y: 0 },
  isDragging = false,
  ...collapsibleProps 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: id,
  });

  const style = {
    position: 'fixed',
    left: draggablePosition.x + (transform?.x || 0),
    top: draggablePosition.y + (transform?.y || 0),
    zIndex: dndIsDragging ? 1000 : 100,
    transition: dndIsDragging ? 'none' : 'transform 0.2s ease',
  };

  // Enhanced title with drag handle icon
  const enhancedTitle = (
    <div className="draggable-title-container">
      <div 
        className="drag-handle"
        {...attributes}
        {...listeners}
        style={{ cursor: dndIsDragging ? 'grabbing' : 'grab' }}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="currentColor"
          className="drag-handle-icon"
        >
          <circle cx="3" cy="3" r="1"/>
          <circle cx="9" cy="3" r="1"/>
          <circle cx="3" cy="6" r="1"/>
          <circle cx="9" cy="6" r="1"/>
          <circle cx="3" cy="9" r="1"/>
          <circle cx="9" cy="9" r="1"/>
        </svg>
      </div>
      <span className="draggable-title-text">{title}</span>
    </div>
  );

  return (
    <div 
      ref={setNodeRef}
      style={style}
      data-draggable-id={id}
      className={`draggable-collapsible ${dndIsDragging ? 'dragging' : ''}`}
    >
      <Collapsible
        title={enhancedTitle}
        position="static" // Override position since we handle it with fixed positioning
        {...collapsibleProps}
      >
        {children}
      </Collapsible>
    </div>
  );
}

export default DraggableCollapsible;
