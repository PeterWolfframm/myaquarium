import { create } from 'zustand';
import { databaseService } from '../services/database';
import type { CardState } from '../types/global';

export interface CardStateStoreState {
  // Card states by component ID
  cardStates: { [componentId: string]: CardState };
  
  // Auto-save state
  isAutoSaving: boolean;
  lastSaveTime: Date | null;
  saveError: string | null;
  
  // Loading state
  isLoading: boolean;
  loadError: string | null;
}

export interface CardStateStoreActions {
  // State management
  updateCardState: (componentId: string, updates: Partial<CardState>) => void;
  setCardOpen: (componentId: string, isOpen: boolean) => void;
  setCardPosition: (componentId: string, position: CardState['position']) => void;
  setCardSize: (componentId: string, size: CardState['size']) => void;
  setCardDraggable: (componentId: string, isDraggable: boolean, x?: number, y?: number) => void;
  
  // Database operations
  initializeFromDatabase: () => Promise<void>;
  saveAllCardStates: () => Promise<void>;
  saveCardState: (componentId: string) => Promise<void>;
  
  // Auto-save management
  startAutoSave: () => void;
  stopAutoSave: () => void;
  
  // Utility
  getCardState: (componentId: string) => CardState | null;
  resetCardState: (componentId: string) => void;
}

// Default card state
const getDefaultCardState = (componentId: string): CardState => ({
  user_id: '',
  component_id: componentId,
  is_open: true,
  position: 'top-left',
  size: 'medium',
  is_draggable: false,
  draggable_x: undefined,
  draggable_y: undefined,
  hide_when_closed: false,
  collapsible: true
});

// Auto-save interval ID
let autoSaveInterval: NodeJS.Timeout | null = null;

/**
 * Zustand store for card state management with auto-save functionality
 */
export const useCardStateStore = create<CardStateStoreState & CardStateStoreActions>((set, get) => ({
  // Initial state
  cardStates: {},
  isAutoSaving: false,
  lastSaveTime: null,
  saveError: null,
  isLoading: false,
  loadError: null,

  // ==================== STATE MANAGEMENT ====================

  /**
   * Update card state for a specific component
   */
  updateCardState: (componentId: string, updates: Partial<CardState>) => {
    set((state) => {
      const currentState = state.cardStates[componentId] || getDefaultCardState(componentId);
      return {
        cardStates: {
          ...state.cardStates,
          [componentId]: {
            ...currentState,
            ...updates,
            component_id: componentId // Ensure component_id is always set
          }
        }
      };
    });
  },

  /**
   * Set card open/closed state
   */
  setCardOpen: (componentId: string, isOpen: boolean) => {
    get().updateCardState(componentId, { is_open: isOpen });
  },

  /**
   * Set card position
   */
  setCardPosition: (componentId: string, position: CardState['position']) => {
    get().updateCardState(componentId, { position });
  },

  /**
   * Set card size
   */
  setCardSize: (componentId: string, size: CardState['size']) => {
    get().updateCardState(componentId, { size });
  },

  /**
   * Set card draggable state and position
   */
  setCardDraggable: (componentId: string, isDraggable: boolean, x?: number, y?: number) => {
    const updates: Partial<CardState> = { is_draggable: isDraggable };
    if (isDraggable && x !== undefined && y !== undefined) {
      updates.draggable_x = x;
      updates.draggable_y = y;
    }
    get().updateCardState(componentId, updates);
  },

  // ==================== DATABASE OPERATIONS ====================

  /**
   * Initialize card states from database
   */
  initializeFromDatabase: async () => {
    set({ isLoading: true, loadError: null });
    
    try {
      // Ensure user is authenticated
      let user = await databaseService.getCurrentUser();
      if (!user) {
        user = await databaseService.signInAnonymously();
        if (!user) {
          throw new Error('Failed to authenticate user');
        }
      }

      // Load all card states from database
      const cardStates = await databaseService.getAllCardStates();
      
      set({ 
        cardStates,
        isLoading: false,
        lastSaveTime: new Date()
      });

      console.log(`Loaded ${Object.keys(cardStates).length} card states from database`);
      
    } catch (error) {
      console.error('Error initializing card states from database:', error);
      set({ 
        isLoading: false, 
        loadError: error.message
      });
    }
  },

  /**
   * Save all card states to database
   */
  saveAllCardStates: async () => {
    const { cardStates, isAutoSaving } = get();
    
    if (isAutoSaving) return; // Prevent concurrent saves
    
    set({ isAutoSaving: true, saveError: null });
    
    try {
      const savePromises = Object.entries(cardStates).map(([componentId, cardState]) =>
        databaseService.saveCardState(componentId, cardState)
      );
      
      await Promise.all(savePromises);
      
      set({ 
        isAutoSaving: false,
        lastSaveTime: new Date()
      });
      
      console.log(`Auto-saved ${Object.keys(cardStates).length} card states to database`);
      
    } catch (error) {
      console.error('Error saving card states:', error);
      set({ 
        isAutoSaving: false,
        saveError: error.message
      });
    }
  },

  /**
   * Save a specific card state to database
   */
  saveCardState: async (componentId: string) => {
    const { cardStates } = get();
    const cardState = cardStates[componentId];
    
    if (!cardState) return;
    
    try {
      await databaseService.saveCardState(componentId, cardState);
      console.log(`Saved card state for ${componentId}`);
    } catch (error) {
      console.error(`Error saving card state for ${componentId}:`, error);
    }
  },

  // ==================== AUTO-SAVE MANAGEMENT ====================

  /**
   * Start auto-save functionality (every 5 seconds)
   */
  startAutoSave: () => {
    // Clear any existing interval
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
    
    // Set up new interval for every 5 seconds
    autoSaveInterval = setInterval(() => {
      get().saveAllCardStates();
    }, 5000);
    
    console.log('Card state auto-save started (every 5 seconds)');
  },

  /**
   * Stop auto-save functionality
   */
  stopAutoSave: () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
    
    console.log('Card state auto-save stopped');
  },

  // ==================== UTILITY ====================

  /**
   * Get card state for a component, with default if not exists
   */
  getCardState: (componentId: string): CardState | null => {
    const { cardStates } = get();
    return cardStates[componentId] || null;
  },

  /**
   * Reset card state to default for a component
   */
  resetCardState: (componentId: string) => {
    set((state) => ({
      cardStates: {
        ...state.cardStates,
        [componentId]: getDefaultCardState(componentId)
      }
    }));
  }
}));

// Auto-start auto-save when the store is created
// This ensures auto-save starts as soon as the store is initialized
setTimeout(() => {
  useCardStateStore.getState().startAutoSave();
}, 1000); // Start after 1 second to allow for initialization

export default useCardStateStore;
