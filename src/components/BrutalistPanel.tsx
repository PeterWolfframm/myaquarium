import { useState } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';
import { useUIStore } from '../stores/uiStore';

function BrutalistPanel({ 
  title = "BRUTALIST UI", 
  children, 
  isOpen: externalIsOpen, 
  onToggle,
  position = 'top-right',
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
  const { brutalistPrimaryColor, brutalistSecondaryColor } = useUIStore();
  
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
      case 'top-left': return 'brutalist-panel-top-left';
      case 'top-right': return 'brutalist-panel-top-right';
      case 'bottom-left': return 'brutalist-panel-bottom-left';
      case 'bottom-right': return 'brutalist-panel-bottom-right';
      case 'center': return 'brutalist-panel-center';
      default: return 'brutalist-panel-top-right';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'brutalist-panel-small';
      case 'large': return 'brutalist-panel-large';
      case 'medium':
      default: return 'brutalist-panel-medium';
    }
  };

  // Calculate styles for draggable items and brutalist colors
  const containerStyle = {
    ...(isDraggable ? {
      position: 'fixed',
      left: draggablePosition?.x + (transform?.x || 0),
      top: draggablePosition?.y + (transform?.y || 0),
      zIndex: isDragging ? 1000 : 100,
      transition: isDragging ? 'none' : 'transform 0.2s ease',
    } : {}),
    '--brutalist-primary': brutalistPrimaryColor,
    '--brutalist-secondary': brutalistSecondaryColor,
  };

  // Enhanced title with drag handle for draggable items
  const enhancedTitle = isDraggable ? (
    <div className="brutalist-draggable-title-container">
      <div 
        className="brutalist-drag-handle"
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="currentColor"
          className="brutalist-drag-handle-icon"
        >
          <rect x="2" y="2" width="2" height="2"/>
          <rect x="8" y="2" width="2" height="2"/>
          <rect x="2" y="5" width="2" height="2"/>
          <rect x="8" y="5" width="2" height="2"/>
          <rect x="2" y="8" width="2" height="2"/>
          <rect x="8" y="8" width="2" height="2"/>
        </svg>
      </div>
      <span className="brutalist-draggable-title-text">{title}</span>
    </div>
  ) : title;

  // Demo UI elements content
  const demoContent = (
    <div className="brutalist-demo-content">
      <div className="brutalist-section">
        <h4 className="brutalist-section-title">BUTTONS</h4>
        <div className="brutalist-button-grid">
          <button className="brutalist-btn brutalist-btn-primary">PRIMARY</button>
          <button className="brutalist-btn brutalist-btn-secondary">SECONDARY</button>
          <button className="brutalist-btn brutalist-btn-danger">DANGER</button>
          <button className="brutalist-btn brutalist-btn-success">SUCCESS</button>
        </div>
      </div>

      <div className="brutalist-section">
        <h4 className="brutalist-section-title">INPUTS</h4>
        <div className="brutalist-input-group">
          <input type="text" className="brutalist-input" placeholder="TEXT INPUT" />
          <input type="number" className="brutalist-input" placeholder="123" />
          <select className="brutalist-select">
            <option>OPTION 1</option>
            <option>OPTION 2</option>
            <option>OPTION 3</option>
          </select>
        </div>
      </div>

      <div className="brutalist-section">
        <h4 className="brutalist-section-title">TOGGLES</h4>
        <div className="brutalist-toggle-group">
          <label className="brutalist-checkbox">
            <input type="checkbox" />
            <span className="brutalist-checkmark"></span>
            CHECKBOX
          </label>
          <label className="brutalist-radio">
            <input type="radio" name="demo" />
            <span className="brutalist-radiomark"></span>
            RADIO
          </label>
        </div>
      </div>

      <div className="brutalist-section">
        <h4 className="brutalist-section-title">PROGRESS</h4>
        <div className="brutalist-progress-bar">
          <div className="brutalist-progress-fill" style={{ width: '65%' }}></div>
        </div>
        <div className="brutalist-progress-text">65% COMPLETE</div>
      </div>

      <div className="brutalist-section">
        <h4 className="brutalist-section-title">ALERTS</h4>
        <div className="brutalist-alert brutalist-alert-info">INFO MESSAGE</div>
        <div className="brutalist-alert brutalist-alert-warning">WARNING MESSAGE</div>
      </div>

      <div className="brutalist-section">
        <h4 className="brutalist-section-title">TYPOGRAPHY</h4>
        <p className="brutalist-text-large">LARGE TEXT</p>
        <p className="brutalist-text-normal">Normal text for content</p>
        <p className="brutalist-text-small">Small text for details</p>
      </div>
    </div>
  );

  return (
    <div 
      ref={isDraggable ? setNodeRef : null}
      style={containerStyle}
      data-draggable-id={draggableId}
      className={`brutalist-panel ${getPositionClass()} ${getSizeClass()} ${className} ${isOpen ? 'open' : 'closed'} ${isDraggable ? 'draggable-brutalist-panel' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="brutalist-panel-header" onClick={handleToggle}>
        <h3 className="brutalist-panel-title">{enhancedTitle}</h3>
        {collapsible && (
          <button className="brutalist-panel-toggle">
            {isOpen ? '×' : '+'}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="brutalist-panel-content">
          {children || demoContent}
        </div>
      )}
    </div>
  );
}

export default BrutalistPanel;
