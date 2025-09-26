import { useState, useEffect } from 'preact/hooks';
import { useDraggable } from '@dnd-kit/core';
import { databaseService } from '../services/database';

export type ViewMode = 'sticky' | 'fullscreen';

interface CardComponentProps {
  // Basic props
  title: string;
  children: any;
  componentId: string; // Unique identifier for storing preferences
  
  // Visibility control
  isOpen: boolean;
  onToggle: () => void;
  
  // View mode control
  defaultViewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  
  // Sticky mode props (when viewMode = 'sticky')
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'static';
  size?: 'small' | 'medium' | 'large';
  collapsible?: boolean;
  hideWhenClosed?: boolean;
  
  // Draggable props (sticky mode only)
  isDraggable?: boolean;
  draggablePosition?: { x: number; y: number } | null;
  
  // Fullscreen mode props
  closable?: boolean;
  
  // Common props
  className?: string;
}

export default function CardComponent({
  title,
  children,
  componentId,
  isOpen,
  onToggle,
  defaultViewMode = 'sticky',
  onViewModeChange,
  position = 'top-left',
  size = 'medium',
  collapsible = true,
  hideWhenClosed = false,
  isDraggable = false,
  draggablePosition = null,
  closable = true,
  className = ''
}: CardComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true); // Start as true to prevent initial flash
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Load view preference from database on mount
  useEffect(() => {
    loadViewPreference();
  }, [componentId]);

  const loadViewPreference = async () => {
    // Skip database call if componentId is invalid
    if (!componentId || componentId.trim() === '') {
      console.warn('Skipping preference load: invalid componentId');
      setIsLoadingPreference(false);
      setHasLoadedOnce(true);
      return;
    }
    
    try {
      // Add timeout to prevent hanging database calls from blocking UI
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database preference loading timeout')), 1000); // Shorter timeout for better UX
      });
      
      const preferencePromise = databaseService.getComponentViewPreference(componentId);
      
      const preference = await Promise.race([preferencePromise, timeoutPromise]) as ViewMode | null;
      
      if (preference && preference !== defaultViewMode) {
        setViewMode(preference);
        onViewModeChange?.(preference);
      }
    } catch (error) {
      console.warn('Could not load view preference (using default):', (error as Error).message);
      // Continue with default view mode - don't let database issues break functionality
    } finally {
      setIsLoadingPreference(false);
      setHasLoadedOnce(true);
    }
  };

  const handleViewModeToggle = async () => {
    const newViewMode: ViewMode = viewMode === 'sticky' ? 'fullscreen' : 'sticky';
    setViewMode(newViewMode);
    onViewModeChange?.(newViewMode);
    
    // Save preference to database (in background, don't block UI)
    if (!componentId || componentId.trim() === '') {
      console.warn('Skipping preference save: invalid componentId');
      return;
    }
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database preference save timeout')), 3000);
      });
      
      const savePromise = databaseService.saveComponentViewPreference(componentId, newViewMode);
      
      await Promise.race([savePromise, timeoutPromise]);
    } catch (error) {
      console.warn('Could not save view preference (change still applied locally):', (error as Error).message);
      // Don't block UI even if database save fails - user sees their change immediately
    }
  };

  // Drag functionality for sticky mode
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: componentId,
    disabled: !isDraggable || viewMode !== 'sticky'
  });

  // Note: We render immediately with default view mode, then update when preference loads

  // Handle fullscreen mode
  if (viewMode === 'fullscreen') {
    return <FullscreenCard 
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}
      onViewModeToggle={handleViewModeToggle}
      closable={closable}
      size={size}
      className={className}
    >
      {children}
    </FullscreenCard>;
  }

  // Handle sticky mode
  return <StickyCard
    title={title}
    isOpen={isOpen}
    onToggle={onToggle}
    onViewModeToggle={handleViewModeToggle}
    position={position}
    size={size}
    collapsible={collapsible}
    hideWhenClosed={hideWhenClosed}
    isDraggable={isDraggable}
    draggablePosition={draggablePosition}
    className={className}
    // Drag props
    setNodeRef={setNodeRef}
    attributes={attributes}
    listeners={listeners}
    transform={transform}
    isDragging={isDragging}
    componentId={componentId}
  >
    {children}
  </StickyCard>;
}

// Fullscreen Card Component
interface FullscreenCardProps {
  title: string;
  children: any;
  isOpen: boolean;
  onToggle: () => void;
  onViewModeToggle: () => void;
  closable: boolean;
  size: string;
  className: string;
}

function FullscreenCard({ 
  title, 
  children, 
  isOpen, 
  onToggle, 
  onViewModeToggle,
  closable, 
  size, 
  className 
}: FullscreenCardProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && closable) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onToggle, closable]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && closable) {
      onToggle();
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'size-fullscreen-small';
      case 'large': return 'size-fullscreen-large';
      case 'medium':
      default: return 'size-fullscreen-medium';
    }
  };

  return (
    <div 
      className="card-fullscreen-overlay"
      onClick={handleOverlayClick}
    >
      <div className={`card-fullscreen-content card-hover ${getSizeClass()} ${className}`}>
        <div className="card-header-fullscreen">
          <h2 className="card-title-fullscreen">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="card-view-mode-btn"
              onClick={onViewModeToggle}
              title="Switch to sticky view"
            >
              📌
            </button>
            {closable && (
              <button 
                className="card-close-btn"
                onClick={onToggle}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="card-content-fullscreen">
          {children}
        </div>
      </div>
    </div>
  );
}

// Sticky Card Component  
interface StickyCardProps {
  title: string;
  children: any;
  isOpen: boolean;
  onToggle: () => void;
  onViewModeToggle: () => void;
  position: string;
  size: string;
  collapsible: boolean;
  hideWhenClosed: boolean;
  isDraggable: boolean;
  draggablePosition: { x: number; y: number } | null;
  className: string;
  // Drag props
  setNodeRef: any;
  attributes: any;
  listeners: any;
  transform: any;
  isDragging: boolean;
  componentId: string;
}

function StickyCard({
  title,
  children,
  isOpen,
  onToggle,
  onViewModeToggle,
  position,
  size,
  collapsible,
  hideWhenClosed,
  isDraggable,
  draggablePosition,
  className,
  setNodeRef,
  attributes,
  listeners,
  transform,
  isDragging,
  componentId
}: StickyCardProps) {
  // If hideWhenClosed is true and component is closed, don't render anything
  if (hideWhenClosed && !isOpen) {
    return null;
  }

  const getPositionClass = () => {
    if (isDraggable) return ''; // No position class for draggable items
    
    switch (position) {
      case 'top-left': return 'position-top-left';
      case 'top-right': return 'position-top-right';
      case 'bottom-left': return 'position-bottom-left';
      case 'bottom-right': return 'position-bottom-right';
      case 'center': return 'position-center';
      case 'static': return '';
      default: return 'position-top-left';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'size-small';
      case 'large': return 'size-large';
      case 'medium':
      default: return 'size-medium';
    }
  };

  // Calculate styles for draggable items with viewport constraints
  const containerStyle = isDraggable ? {
    position: 'fixed' as const,
    left: Math.max(0, Math.min((draggablePosition?.x || 0) + (transform?.x || 0), window.innerWidth - 300)),
    top: Math.max(0, Math.min((draggablePosition?.y || 0) + (transform?.y || 0), window.innerHeight - 200)),
    zIndex: isDragging ? 1000 : 100,
    transition: isDragging ? 'none' : 'transform 0.2s ease',
    maxWidth: 'calc(100vw - 20px)',
    maxHeight: 'calc(100vh - 20px)',
  } : {};

  // Enhanced title with drag handle for draggable items and view mode toggle
  const enhancedTitle = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {isDraggable && (
        <div 
          className={`drag-handle ${isDragging ? 'drag-handle-cursor dragging' : 'drag-handle-cursor'}`}
          {...attributes}
          {...listeners}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="currentColor"
            className="drag-handle-icon"
          >
            <rect x="2" y="2" width="2" height="2"/>
            <rect x="8" y="2" width="2" height="2"/>
            <rect x="2" y="5" width="2" height="2"/>
            <rect x="8" y="5" width="2" height="2"/>
            <rect x="2" y="8" width="2" height="2"/>
            <rect x="8" y="8" width="2" height="2"/>
          </svg>
        </div>
      )}
      <span 
        className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono font-bold uppercase tracking-wider"
      >
        {title}
      </span>
      <button 
        className="card-view-mode-btn-sticky"
        onClick={(e) => {
          e.stopPropagation();
          onViewModeToggle();
        }}
        title="Switch to fullscreen view"
      >
        🔳
      </button>
    </div>
  );

  return (
    <div 
      ref={isDraggable ? setNodeRef : null}
      style={containerStyle}
      data-draggable-id={componentId}
      className={`card-base card-sticky card-hover ${getPositionClass()} ${getSizeClass()} ${className} ${isOpen ? 'opacity-100' : 'opacity-85'} ${isDraggable ? 'card-draggable' : ''} ${isDragging ? 'card-dragging' : ''}`}
    >
      <div 
        className="card-header"
        onClick={collapsible ? onToggle : undefined}
      >
        <h3 
          className="card-title"
        >
          {enhancedTitle}
        </h3>
        {collapsible && (
          <button 
            className="card-toggle-btn"
          >
            {isOpen ? '−' : '+'}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="card-content">
          {children}
        </div>
      )}
    </div>
  );
}
