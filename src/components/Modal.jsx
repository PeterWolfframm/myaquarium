import { useEffect } from 'preact/hooks';

function Modal({ 
  isVisible, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  className = '',
  closable = true 
}) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible && closable) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, onClose, closable]);

  if (!isVisible) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closable) {
      onClose();
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'modal-small';
      case 'large': return 'modal-large';
      case 'medium':
      default: return 'modal-medium';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-panel ${getSizeClass()} ${className}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {closable && (
            <button className="modal-close-button" onClick={onClose}>×</button>
          )}
        </div>
        
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
