import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '로그인에 실패했습니다');
          }

          set({ 
            user: data.user, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          });
          throw error;
        }
      },

      signup: async (userData) => {
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '회원가입에 실패했습니다');
          }

          set({ 
            user: data.user, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
          });

          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          });
        } catch (error) {
          console.error('Logout error:', error);
          // 에러가 발생해도 로컬 상태는 초기화
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          
          const response = await fetch('/api/auth/me');
          
          if (response.ok) {
            const data = await response.json();
            set({ 
              user: data.user, 
              isAuthenticated: true,
              isLoading: false 
            });
          } else {
            set({ 
              user: null, 
              isAuthenticated: false,
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          });
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