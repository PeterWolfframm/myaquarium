import { useState } from 'preact/hooks';

function Collapsible({ 
  title, 
  children, 
  isOpen: externalIsOpen, 
  onToggle,
  position = 'top-left',
  className = '',
  size = 'medium',
  collapsible = true,
  hideWhenClosed = false
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
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

  return (
    <div className={`collapsible ${getPositionClass()} ${getSizeClass()} ${className} ${isOpen ? 'open' : 'closed'}`}>
      <div className="collapsible-header" onClick={handleToggle}>
        <h3 className="collapsible-title">{title}</h3>
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
