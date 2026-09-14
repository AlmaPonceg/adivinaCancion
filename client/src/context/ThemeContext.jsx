import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../socket';

const ThemeContext = createContext({
  theme: 'neutral',
  isAlmaTheme: false,
  isUnlockModalOpen: false,
  openUnlockModal: () => {},
  closeUnlockModal: () => {},
  unlockAlmaTheme: async () => {},
  lockTheme: () => {},
});

const STORAGE_KEY = 'trivia_memory_theme_unlocked';
const TOKEN_KEY = 'trivia_memory_theme_token';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'true' ? 'alma' : 'neutral';
    } catch {
      return 'neutral';
    }
  });

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const isAlmaTheme = theme === 'alma';

  // Dynamic document title update based on active theme
  useEffect(() => {
    if (isAlmaTheme) {
      document.title = 'Adiviná la Canción — Cumple Alma #24';
    } else {
      document.title = 'Adiviná la Canción — Trivia Musical en Vivo';
    }
  }, [isAlmaTheme]);

  const openUnlockModal = useCallback(() => {
    setIsUnlockModalOpen(true);
  }, []);

  const closeUnlockModal = useCallback(() => {
    setIsUnlockModalOpen(false);
  }, []);

  const unlockAlmaTheme = useCallback(async (code) => {
    try {
      const baseUrl = SERVER_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/verify-memory-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Código incorrecto. Verificá los caracteres e intentá nuevamente.',
        };
      }

      setTheme('alma');
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
        }
      } catch (e) {
        console.warn('Could not persist theme to localStorage', e);
      }

      setIsUnlockModalOpen(false);
      return { success: true };
    } catch (err) {
      console.error('Error verifying memory code:', err);
      return {
        success: false,
        error: 'No se pudo contactar al servidor. Comprobá tu conexión a internet.',
      };
    }
  }, []);

  const lockTheme = useCallback(() => {
    setTheme('neutral');
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Could not remove theme from localStorage', e);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isAlmaTheme,
        isUnlockModalOpen,
        openUnlockModal,
        closeUnlockModal,
        unlockAlmaTheme,
        lockTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
