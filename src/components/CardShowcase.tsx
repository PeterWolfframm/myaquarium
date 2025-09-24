import { useState } from 'preact/hooks';
import CardComponent from './CardComponent';

/**
 * CardShowcase Component
 * 
 * This component demonstrates all the new @apply classes extracted from repeated patterns
 * across the card components. It serves as both a design system showcase and a reference
 * for developers to see how the new utility classes work.
 */
function CardShowcase({ 
  isOpen, 
  onToggle, 
  isDraggable = false, 
  draggablePosition = null 
}: {
  isOpen: boolean;
  onToggle: () => void;
  isDraggable?: boolean;
  draggablePosition?: { x: number; y: number } | null;
}) {
  const [selectedExample, setSelectedExample] = useState('buttons');
  const [demoValues, setDemoValues] = useState({
    textInput: 'Sample text',
    selectValue: 'option1',
    checkboxValue: false,
    radioValue: 'radio1'
  });

  const showcaseContent = () => {
    switch (selectedExample) {
      case 'buttons':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Button System (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Primary Buttons</div>
              <div className="flex gap-3 flex-wrap">
                <button className="btn-primary-enhanced">Primary Button</button>
                <button className="btn-secondary-enhanced">Secondary Button</button>
                <button className="btn-action">Action Button</button>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Status Buttons</div>
              <div className="flex gap-3 flex-wrap">
                <button className="btn-success-enhanced">Success</button>
                <button className="btn-warning-enhanced">Warning</button>
                <button className="btn-danger-enhanced">Danger</button>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Compact & Icon Buttons</div>
              <div className="flex gap-3 flex-wrap items-center">
                <button className="btn-compact bg-primary-500/20 text-primary-400 border-primary-500/50 hover:bg-primary-500/40">Compact</button>
                <button className="btn-icon bg-primary-500/20 text-primary-400 border-primary-500/50 hover:bg-primary-500/40">🔧</button>
                <button className="btn-icon bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40">❌</button>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Card Buttons (from original system)</div>
              <div className="flex gap-3 flex-wrap">
                <button className="card-view-mode-btn">📌 Sticky</button>
                <button className="card-view-mode-btn">🔳 Fullscreen</button>
                <button className="card-toggle-btn">+</button>
                <button className="card-close-btn">×</button>
              </div>
            </div>
          </div>
        );

      case 'cards':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Card Components (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Card Base Styles</div>
              <div className="card-base card-hover p-4 rounded-lg">
                <div className="card-title">Card with Base + Hover Classes</div>
                <div className="text-mono-small mt-2">Uses: card-base + card-hover</div>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Draggable Card Example</div>
              <div className="card-base card-hover card-draggable p-4">
                <div className="flex items-center gap-3">
                  <div className="drag-handle drag-handle-cursor">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="drag-handle-icon">
                      <rect x="2" y="2" width="2" height="2"/>
                      <rect x="8" y="2" width="2" height="2"/>
                      <rect x="2" y="5" width="2" height="2"/>
                      <rect x="8" y="5" width="2" height="2"/>
                      <rect x="2" y="8" width="2" height="2"/>
                      <rect x="8" y="8" width="2" height="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">Draggable Card</div>
                    <div className="text-mono-small">Uses: drag-handle classes</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Card Header Styles</div>
              <div className="card-base rounded-lg overflow-hidden">
                <div className="card-header border-b border-white/10">
                  <div className="card-title">Card Header</div>
                  <button className="card-toggle-btn">−</button>
                </div>
                <div className="card-content">
                  <div className="text-mono-small">Content area with card-content class</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Gallery & Interactive Items (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Gallery Items</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="gallery-item-enhanced">
                  <div className="gallery-thumbnail-enhanced bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  <div className="text-mono-small mt-2">Normal Item</div>
                </div>
                <div className="gallery-item-enhanced gallery-item-selected">
                  <div className="gallery-thumbnail-enhanced bg-gradient-to-br from-green-500 to-blue-500"></div>
                  <div className="text-mono-small mt-2">Selected Item</div>
                </div>
                <div className="gallery-item-enhanced gallery-item-dragging">
                  <div className="gallery-thumbnail-enhanced bg-gradient-to-br from-red-500 to-pink-500"></div>
                  <div className="text-mono-small mt-2">Dragging Item</div>
                </div>
                <div className="gallery-item-enhanced hover-lift hover-glow">
                  <div className="gallery-thumbnail-enhanced bg-gradient-to-br from-yellow-500 to-orange-500"></div>
                  <div className="text-mono-small mt-2">Enhanced Hover</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'forms':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Form Components (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Form Inputs</div>
              <div className="space-y-4">
                <div>
                  <label className="form-label-enhanced">Text Input</label>
                  <input 
                    type="text" 
                    className="form-input-enhanced" 
                    value={demoValues.textInput}
                    onInput={(e) => setDemoValues(prev => ({ ...prev, textInput: (e.target as HTMLInputElement).value }))}
                    placeholder="Enter text here"
                  />
                </div>
                
                <div>
                  <label className="form-label-enhanced">Select Input</label>
                  <select 
                    className="form-input-enhanced"
                    value={demoValues.selectValue}
                    onChange={(e) => setDemoValues(prev => ({ ...prev, selectValue: (e.target as HTMLSelectElement).value }))}
                  >
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                  </select>
                </div>

                <div>
                  <label className="form-label-enhanced flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="checkbox-primary"
                      checked={demoValues.checkboxValue}
                      onChange={(e) => setDemoValues(prev => ({ ...prev, checkboxValue: (e.target as HTMLInputElement).checked }))}
                    />
                    Checkbox Input
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="form-label-enhanced">Radio Options</div>
                  <label className="form-label-enhanced flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="demo-radio"
                      value="radio1"
                      className="checkbox-primary"
                      checked={demoValues.radioValue === 'radio1'}
                      onChange={(e) => setDemoValues(prev => ({ ...prev, radioValue: (e.target as HTMLInputElement).value }))}
                    />
                    Radio Option 1
                  </label>
                  <label className="form-label-enhanced flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="demo-radio"
                      value="radio2"
                      className="checkbox-primary"
                      checked={demoValues.radioValue === 'radio2'}
                      onChange={(e) => setDemoValues(prev => ({ ...prev, radioValue: (e.target as HTMLInputElement).value }))}
                    />
                    Radio Option 2
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Alert & Status Components (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Alert Types</div>
              <div className="space-y-3">
                <div className="error-alert">
                  <span>Error Alert - Something went wrong!</span>
                  <button className="hover:bg-red-500/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>
                
                <div className="warning-alert">
                  <span>Warning Alert - Please review this.</span>
                  <button className="hover:bg-yellow-500/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>
                
                <div className="success-alert">
                  <span>Success Alert - Operation completed!</span>
                  <button className="hover:bg-green-500/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>
                
                <div className="info-alert">
                  <span>Info Alert - Here's some information.</span>
                  <button className="hover:bg-blue-500/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Status Indicators</div>
              <div className="flex gap-3 flex-wrap">
                <span className="status-online">Online</span>
                <span className="status-offline">Offline</span>
                <span className="status-loading">Loading</span>
                <span className="status-syncing">Syncing</span>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Empty & Loading States</div>
              <div className="space-y-3">
                <div className="loading-state">Loading content...</div>
                <div className="empty-state">No items to display</div>
              </div>
            </div>
          </div>
        );

      case 'positioning':
        return (
          <div className="space-y-6">
            <div className="text-section-title">Positioning & Sizing (@apply)</div>
            
            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Position Classes</div>
              <div className="text-mono-small space-y-1">
                <div>position-top-left: top-5 left-5 right-auto bottom-auto</div>
                <div>position-top-right: top-[70px] right-5 left-auto bottom-auto</div>
                <div>position-bottom-left: bottom-5 left-5 right-auto top-auto</div>
                <div>position-bottom-right: bottom-5 right-5 left-auto top-auto</div>
                <div>position-center: top-5 left-1/2 transform -translate-x-1/2</div>
              </div>
            </div>

            <div className="form-section-enhanced">
              <div className="form-label-enhanced">Size Classes</div>
              <div className="space-y-3">
                <div className="card-base size-small p-3 rounded">
                  <div className="text-mono-small">size-small</div>
                </div>
                <div className="card-base size-medium p-3 rounded">
                  <div className="text-mono-small">size-medium</div>
                </div>
                <div className="card-base size-large p-3 rounded">
                  <div className="text-mono-small">size-large</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-mono-small">Select an example from the menu.</div>;
    }
  };

  return (
    <CardComponent
      title="Card Design System Showcase"
      componentId="card-showcase"
      isOpen={isOpen}
      onToggle={onToggle}
      position="center"
      size="large"
      isDraggable={isDraggable}
      draggablePosition={draggablePosition}
      className="z-50"
    >
      <div className="space-y-4">
        {/* Navigation */}
        <div className="form-section-enhanced">
          <div className="form-label-enhanced">Examples</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'buttons', label: 'Buttons' },
              { id: 'cards', label: 'Cards' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'forms', label: 'Forms' },
              { id: 'alerts', label: 'Alerts' },
              { id: 'positioning', label: 'Positioning' }
            ].map(item => (
              <button
                key={item.id}
                className={`btn-compact text-left ${
                  selectedExample === item.id 
                    ? 'bg-primary-500 text-white border-primary-600' 
                    : 'bg-slate-800/70 text-primary-300 border-primary-400/50 hover:bg-primary-500/20'
                }`}
                onClick={() => setSelectedExample(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {showcaseContent()}
        </div>

        {/* Usage Info */}
        <div className="info-alert">
          <div>
            <strong>Usage:</strong> These @apply classes extract common patterns from the card components. 
            Use them to maintain consistency and reduce repetitive inline styles.
          </div>
        </div>
      </div>
    </CardComponent>
  );
}

export default CardShowcase;
