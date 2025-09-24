import { create } from 'zustand';
import { databaseService } from '../services/database';

export interface UIStoreState {
  // Brutalist panel colors
  brutalistPrimaryColor: string;
  brutalistSecondaryColor: string;
  
  // Panel visibility
  showBrutalistPanel: boolean;
  
  // Database synchronization state
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
}

export interface UIStoreActions {
  // Color actions
  setBrutalistPrimaryColor: (color: string) => Promise<void>;
  setBrutalistSecondaryColor: (color: string) => Promise<void>;
  
  // Panel visibility actions
  setShowBrutalistPanel: (show: boolean) => void;
  toggleBrutalistPanel: () => void;
  
  // Database sync actions
  initializeFromDatabase: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  setLoadingFalse: () => void;
}

/**
 * Zustand store for UI configuration and state management
 * Manages brutalist panel colors and other UI settings
 */
export const useUIStore = create<UIStoreState & UIStoreActions>((set, get) => ({
  // Default brutalist colors - refined and bold
  brutalistPrimaryColor: '#1e3a8a', // Navy blue
  brutalistSecondaryColor: '#ea580c', // Orange
  
  // Panel visibility
  showBrutalistPanel: true,
  
  // Database synchronization state
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,

  // Actions to update colors with database sync
  setBrutalistPrimaryColor: async (color: string) => {
    set({ brutalistPrimaryColor: color });
    
    // Auto-sync to database
    try {
      await get().syncToDatabase();
    } catch (error) {
      console.warn('Failed to sync primary color to database:', error);
    }
  },

  setBrutalistSecondaryColor: async (color: string) => {
    set({ brutalistSecondaryColor: color });
    
    // Auto-sync to database
    try {
      await get().syncToDatabase();
    } catch (error) {
      console.warn('Failed to sync secondary color to database:', error);
    }
  },

  // Panel visibility actions
  setShowBrutalistPanel: (show: boolean) => {
    set({ showBrutalistPanel: show });
  },

  toggleBrutalistPanel: () => {
    const { showBrutalistPanel } = get();
    set({ showBrutalistPanel: !showBrutalistPanel });
  },

  // Database synchronization
  initializeFromDatabase: async () => {
    const state = get();
    if (state.isLoading) return;
    
    set({ isLoading: true, syncError: null });
    
    try {
      // Try to get UI settings from database
      const settings = await databaseService.getUISettings();
      
      if (settings) {
        set({
          brutalistPrimaryColor: settings.brutalist_primary_color || '#1e3a8a',
          brutalistSecondaryColor: settings.brutalist_secondary_color || '#ea580c',
          showBrutalistPanel: settings.show_brutalist_panel ?? true,
          lastSyncTime: new Date().toISOString(),
          isLoading: false
        });
      } else {
        // No settings found, use defaults and create initial record
        await state.syncToDatabase();
        set({ 
          isLoading: false,
          lastSyncTime: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error initializing UI store from database:', error);
      set({ 
        syncError: error.message,
        isLoading: false
      });
    }
  },

  syncToDatabase: async () => {
    const state = get();
    if (state.isSyncing) return;
    
    set({ isSyncing: true, syncError: null });
    
    try {
      await databaseService.updateUISettings({
        brutalist_primary_color: state.brutalistPrimaryColor,
        brutalist_secondary_color: state.brutalistSecondaryColor,
        show_brutalist_panel: state.showBrutalistPanel
      });
      
      set({ 
        lastSyncTime: new Date().toISOString(),
        isSyncing: false
      });
    } catch (error) {
      console.error('Error syncing UI settings to database:', error);
      set({ 
        syncError: error.message,
        isSyncing: false
      });
    }
  },

  setLoadingFalse: () => {
    set({ isLoading: false });
  }
}));
