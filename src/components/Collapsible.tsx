import { useState } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';

function Collapsible({ 
  title, 
  children, 
  isOpen: externalIsOpen, 
  onToggle,
  position = 'top-left',
  className = '',
  size = 'medium',
  collapsible = true,
  hideWhenClosed = false,
  // Drag and drop props
  isDraggable = false,
  draggableId = null,
  draggablePosition = null
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Drag functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: draggableId,
    disabled: !isDraggable
  });
  
  // If hideWhenClosed is true and component is closed, don't render anything
  if (hideWhenClosed && !isOpen) {
    return null;
  }
  
  const handleToggle = () => {
    if (!collapsible) return;
    
    if (onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const getPositionClass = () => {
    if (isDraggable) return ''; // No position class for draggable items
    
    switch (position) {
      case 'top-left': return 'collapsible-top-left';
      case 'top-right': return 'collapsible-top-right';
      case 'bottom-left': return 'collapsible-bottom-left';
      case 'bottom-right': return 'collapsible-bottom-right';
      case 'center': return 'collapsible-center';
      default: return 'collapsible-top-left';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'collapsible-small';
      case 'large': return 'collapsible-large';
      case 'medium':
      default: return 'collapsible-medium';
    }
  };

  // Calculate styles for draggable items
  const containerStyle = isDraggable ? {
    position: 'fixed',
    left: draggablePosition?.x + (transform?.x || 0),
    top: draggablePosition?.y + (transform?.y || 0),
    zIndex: isDragging ? 1000 : 100,
    transition: isDragging ? 'none' : 'transform 0.2s ease',
  } : {};

  // Enhanced title with drag handle for draggable items
  const enhancedTitle = isDraggable ? (
    <div className="draggable-title-container">
      <div 
        className="drag-handle"
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
  ) : title;

  return (
    <div 
      ref={isDraggable ? setNodeRef : null}
      style={containerStyle}
      data-draggable-id={draggableId}
      className={`collapsible ${getPositionClass()} ${getSizeClass()} ${className} ${isOpen ? 'open' : 'closed'} ${isDraggable ? 'draggable-collapsible' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="collapsible-header" onClick={handleToggle}>
        <h3 className="collapsible-title">{enhancedTitle}</h3>
        {collapsible && (
          <button className="collapsible-toggle">
            {isOpen ? '−' : '+'}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default Collapsible;
