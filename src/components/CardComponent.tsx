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
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);

  // Load view preference from database on mount
  useEffect(() => {
    loadViewPreference();
  }, [componentId]);

  const loadViewPreference = async () => {
    // Skip database call if componentId is invalid
    if (!componentId || componentId.trim() === '') {
      console.warn('Skipping preference load: invalid componentId');
      return;
    }
    
    try {
      setIsLoadingPreference(true);
      
      // Add timeout to prevent hanging database calls from blocking UI
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database preference loading timeout')), 2000);
      });
      
      const preferencePromise = databaseService.getComponentViewPreference(componentId);
      
      const preference = await Promise.race([preferencePromise, timeoutPromise]) as ViewMode | null;
      
      if (preference) {
        setViewMode(preference);
        onViewModeChange?.(preference);
      }
    } catch (error) {
      console.warn('Could not load view preference (using default):', (error as Error).message);
      // Continue with default view mode - don't let database issues break functionality
    } finally {
      setIsLoadingPreference(false);
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
      case 'small': return 'min-w-[min(300px,calc(100vw-40px))] max-w-[min(500px,calc(100vw-40px))] w-[90%]';
      case 'large': return 'min-w-[min(600px,calc(100vw-40px))] max-w-[min(900px,calc(100vw-40px))] w-[90%]';
      case 'medium':
      default: return 'min-w-[min(400px,calc(100vw-40px))] max-w-[min(600px,calc(100vw-40px))] w-[90%]';
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 w-screen h-screen bg-black/80 flex justify-center items-center z-[1000] backdrop-blur-sm p-5 box-border"
      onClick={handleOverlayClick}
    >
      <div className={`bg-slate-900/95 border-2 border-white/20 rounded-2xl p-0 max-h-[calc(100vh-40px)] max-w-[calc(100vw-40px)] overflow-hidden relative box-border ${getSizeClass()} ${className}`}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-slate-800/70 rounded-t-2xl">
          <h2 
            className="text-white text-xl font-bold m-0 font-mono uppercase tracking-wider"
            style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded px-2 py-1 text-xs cursor-pointer transition-all duration-200 hover:bg-primary-500/30 hover:border-primary-500/50 hover:scale-105 active:scale-95 font-mono font-bold"
              onClick={onViewModeToggle}
              title="Switch to sticky view"
              style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}
            >
              📌
            </button>
            {closable && (
              <button 
                className="bg-transparent border-none text-white text-2xl cursor-pointer p-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 font-mono font-bold"
                onClick={onToggle} 
                style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="px-6 py-5 max-h-[calc(100vh-160px)] overflow-y-auto box-border">
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
      case 'top-left': return 'top-5 left-5 right-auto bottom-auto';
      case 'top-right': return 'top-[70px] right-5 left-auto bottom-auto';
      case 'bottom-left': return 'bottom-5 left-5 right-auto top-auto';
      case 'bottom-right': return 'bottom-5 right-5 left-auto top-auto';
      case 'center': return 'top-5 left-1/2 transform -translate-x-1/2 right-auto bottom-auto max-w-[calc(100vw-40px)]';
      case 'static': return '';
      default: return 'top-5 left-5 right-auto bottom-auto';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'min-w-[min(200px,calc(100vw-40px))] max-w-[calc(100vw-40px)]';
      case 'large': return 'min-w-[min(350px,calc(100vw-40px))] max-w-[calc(100vw-40px)]';
      case 'medium':
      default: return 'min-w-[min(250px,calc(100vw-40px))] max-w-[calc(100vw-40px)]';
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
          className="flex items-center justify-center w-5 h-5 rounded bg-white/10 transition-all duration-200 cursor-grab opacity-70 flex-shrink-0 hover:bg-white/20 hover:opacity-100 hover:scale-110 active:cursor-grabbing active:bg-white/30 active:scale-95"
          {...attributes}
          {...listeners}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="currentColor"
            className="text-white opacity-80 transition-opacity duration-200 hover:opacity-100"
            style={{ filter: 'contrast(2) brightness(0.8)' }}
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
        style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        {title}
      </span>
      <button 
        className="bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded px-1 py-0.5 text-[10px] cursor-pointer transition-all duration-200 ml-2 flex-shrink-0 hover:bg-primary-500/30 hover:border-primary-500/50 hover:scale-105 active:scale-95 font-mono font-bold"
        onClick={(e) => {
          e.stopPropagation();
          onViewModeToggle();
        }}
        title="Switch to fullscreen view"
        style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}
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
      className={`absolute z-10 bg-black/70 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] box-border ${getPositionClass()} ${getSizeClass()} ${className} ${isOpen ? 'opacity-100' : 'opacity-80'} ${isDraggable ? 'rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200' : ''} ${isDragging ? 'rotate-1 shadow-[0_8px_25px_rgba(0,0,0,0.5)] bg-slate-700/95 backdrop-blur-[10px] border-primary-500/50 border-2 z-[1000]' : ''}`}
    >
      <div 
        className="flex justify-between items-center px-5 py-3 cursor-pointer select-none transition-colors duration-200 hover:bg-white/5"
        onClick={collapsible ? onToggle : undefined}
      >
        <h3 
          className="m-0 text-white text-base font-bold font-mono"
          style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}
        >
          {enhancedTitle}
        </h3>
        {collapsible && (
          <button 
            className="bg-transparent border-none text-white text-xl cursor-pointer p-0 w-5 h-5 flex items-center justify-center rounded transition-colors duration-200 hover:bg-white/10 font-mono font-bold"
            style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 700 }}
          >
            {isOpen ? '−' : '+'}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="px-5 pb-4 animate-slideDown max-h-[calc(100vh-120px)] overflow-y-auto box-border">
          {children}
        </div>
      )}
    </div>
  );
}
