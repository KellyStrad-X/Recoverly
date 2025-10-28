import { create } from 'zustand';

interface User {
  uid: string;
  email: string;
  displayName: string;
  subscriptionStatus?: 'free' | 'active' | 'cancelled' | 'expired';
  subscriptionTier?: 'monthly' | 'annual' | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updateSubscriptionStatus: (status: User['subscriptionStatus'], tier?: User['subscriptionTier']) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  updateSubscriptionStatus: (status, tier) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, subscriptionStatus: status, subscriptionTier: tier }
        : null,
    })),
  signOut: () => set({ user: null }),
}));