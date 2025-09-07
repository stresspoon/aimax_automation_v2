import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchJSON } from '@/lib/httpClient'

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  companyName?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: { email: string; password: string; name?: string; phone?: string; companyName?: string; agreeMarketing?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => 
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        }),

      setLoading: (loading) => 
        set({ isLoading: loading }),

      login: async (email, password) => {
        try {
          const data = await fetchJSON<{ user: User }>('\/api\/auth\/login', {
            method: 'POST',
            body: { email, password },
          });
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      signup: async (userData) => {
        try {
          const data = await fetchJSON<{ user: User }>('\/api\/auth\/signup', {
            method: 'POST',
            body: userData,
          });
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await fetchJSON('\/api\/auth\/logout', { method: 'POST' });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // 에러가 발생해도 로컬 상태는 초기화
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          const data = await fetchJSON<{ user: User }>('\/api\/auth\/me');
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          // 401 등은 비로그인 상태 처리
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
