import { create } from 'zustand';
import { databaseService } from '../services/database';
import type { AuthStoreState, AuthStoreActions } from '../types/global';

/**
 * Zustand store for authentication state management
 */
export const useAuthStore = create<AuthStoreState & AuthStoreActions>((set, get) => ({
  // Authentication state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isSigningIn: false,
  isSigningOut: false,
  error: null,

  // Authentication actions
  signInWithEmail: async (email: string, password: string) => {
    set({ isSigningIn: true, error: null });

    try {
      const { data, error } = await databaseService.signInWithEmail(email, password);

      if (error) {
        throw error;
      }

      if (data?.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          isSigningIn: false,
          error: null
        });

        // Initialize user data after successful sign in
        await get().initializeUserData();

        return data.user;
      } else {
        throw new Error('Sign in failed - no user data returned');
      }
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      set({
        error: error.message || 'Failed to sign in',
        isSigningIn: false
      });
      throw error;
    }
  },

  signUpWithEmail: async (email: string, password: string, username?: string) => {
    set({ isSigningIn: true, error: null });

    try {
      const { data, error } = await databaseService.signUpWithEmail(email, password, username);

      if (error) {
        throw error;
      }

      if (data?.user) {
        // For email confirmation flow, we might not have immediate access
        // The user will need to verify their email first
        set({
          user: data.user,
          isAuthenticated: false, // Don't set as authenticated until email is confirmed
          isSigningIn: false,
          error: null
        });

        return data.user;
      } else {
        throw new Error('Sign up failed - no user data returned');
      }
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      set({
        error: error.message || 'Failed to sign up',
        isSigningIn: false
      });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ isSigningIn: true, error: null });

    try {
      const { data, error } = await databaseService.signInWithGoogle();

      if (error) {
        throw error;
      }

      if (data?.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          isSigningIn: false,
          error: null
        });

        // Initialize user data after successful Google sign in
        await get().initializeUserData();

        return data.user;
      } else {
        throw new Error('Google sign in failed - no user data returned');
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      set({
        error: error.message || 'Failed to sign in with Google',
        isSigningIn: false
      });
      throw error;
    }
  },

  signInAnonymously: async () => {
    set({ isSigningIn: true, error: null });

    try {
      const user = await databaseService.signInAnonymously();

      if (user) {
        set({
          user,
          isAuthenticated: true,
          isSigningIn: false,
          error: null
        });

        // Initialize user data after successful anonymous sign in
        await get().initializeUserData();

        return user;
      } else {
        throw new Error('Anonymous sign in failed');
      }
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      set({
        error: error.message || 'Failed to sign in anonymously',
        isSigningIn: false
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isSigningOut: true, error: null });

    try {
      const success = await databaseService.signOut();

      if (success) {
        set({
          user: null,
          isAuthenticated: false,
          isSigningOut: false,
          error: null
        });

        // Perform soft refresh to clear all app state
        await get().performSoftRefresh();
      } else {
        throw new Error('Sign out failed');
      }
    } catch (error: any) {
      console.error('Error signing out:', error);
      set({
        error: error.message || 'Failed to sign out',
        isSigningOut: false
      });
      throw error;
    }
  },

  // Initialize user data and authentication state with timeout
  initializeAuth: async () => {
    set({ isLoading: true, error: null });

    try {
      // Create a timeout promise for auth initialization
      const authTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), 5000);
      });

      // Race auth initialization against timeout
      const user = await Promise.race([
        databaseService.getCurrentUser(),
        authTimeout
      ]);

      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });

        // Initialize user data
        await get().initializeUserData();
      } else {
        // No user found, set as not authenticated but not loading
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error: any) {
      console.error('Error initializing auth:', error);
      
      // If it's a timeout, go to guest mode
      if (error.message?.includes('timeout')) {
        console.warn('Authentication timed out after 5 seconds, switching to guest mode');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      } else {
        set({
          error: error.message || 'Failed to initialize authentication',
          isLoading: false
        });
      }
    }
  },

  // Initialize user-specific data after authentication
  initializeUserData: async () => {
    const state = get();

    if (!state.isAuthenticated || !state.user) {
      console.warn('Cannot initialize user data: not authenticated');
      return;
    }

    try {
      // Initialize all stores that depend on user data
      // This will be called by the App component to coordinate store initialization
      console.log(`Initializing data for user: ${state.user.id}`);
    } catch (error: any) {
      console.error('Error initializing user data:', error);
      set({
        error: error.message || 'Failed to initialize user data'
      });
    }
  },

  // Clear any authentication errors
  clearError: () => {
    set({ error: null });
  },

  // Perform soft refresh after logout to clear all app state
  performSoftRefresh: async () => {
    try {
      // Import stores dynamically to avoid circular dependencies
      const { useFishStore } = await import('./fishStore');
      const { useAquariumStore } = await import('./aquariumStore');
      const { useUIStore } = await import('./uiStore');
      const { useCardStateStore } = await import('./cardStateStore');

      // Reset all stores to their initial state
      useFishStore.getState().reset?.();
      useAquariumStore.getState().reset?.();
      useUIStore.getState().reset?.();
      useCardStateStore.getState().reset?.();

      console.log('Soft refresh completed - all stores reset to guest mode');
    } catch (error) {
      console.error('Error during soft refresh:', error);
    }
  },

  // Reset the store to initial state
  reset: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSigningIn: false,
      isSigningOut: false,
      error: null
    });
  }
}));
