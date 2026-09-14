import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../socket';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

const TOKEN_STORAGE_KEY = 'hitpop_auth_token';
const USER_STORAGE_KEY = 'hitpop_auth_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = SERVER_URL || window.location.origin;

  // Validate token on mount
  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: {
            'x-auth-token': token,
          },
        });

        const data = await res.json();

        if (isMounted) {
          if (data.success && data.user) {
            setUser(data.user);
            try {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
            } catch (e) {
              console.warn('Storage error persisting user:', e);
            }
          } else {
            // Expired or invalid token
            setUser(null);
            setToken(null);
            try {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
              localStorage.removeItem(USER_STORAGE_KEY);
            } catch (e) {
              console.warn('Storage error clearing expired token:', e);
            }
          }
        }
      } catch (err) {
        console.warn('[Auth] Error verifying session token:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [token, baseUrl]);

  const login = useCallback(
    async (usernameOrEmail, password) => {
      try {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameOrEmail.trim(),
            password: password.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            error: data.error || 'Credenciales inválidas. Por favor comprobá tus datos.',
          };
        }

        setToken(data.token);
        setUser(data.user);

        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          // Keep legacy trivia_creator_name aligned for instant autofill
          localStorage.setItem('trivia_creator_name', data.user.username);
        } catch (e) {
          console.warn('Storage error saving session:', e);
        }

        return { success: true, user: data.user, token: data.token };
      } catch (err) {
        console.error('[Auth] Login error:', err);
        return {
          success: false,
          error: 'Error de conexión con el servidor. Intentá de nuevo.',
        };
      }
    },
    [baseUrl]
  );

  const register = useCallback(
    async ({ username, password, email }) => {
      try {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            email: email ? email.trim() : '',
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            error: data.error || 'Error al registrar la cuenta. Verificá los campos.',
          };
        }

        setToken(data.token);
        setUser(data.user);

        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          localStorage.setItem('trivia_creator_name', data.user.username);
        } catch (e) {
          console.warn('Storage error saving registration session:', e);
        }

        return { success: true, user: data.user, token: data.token };
      } catch (err) {
        console.error('[Auth] Register error:', err);
        return {
          success: false,
          error: 'Error de conexión con el servidor. Intentá de nuevo.',
        };
      }
    },
    [baseUrl]
  );

  const logout = useCallback(() => {
    if (token) {
      fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
      }).catch(() => {});
    }

    setToken(null);
    setUser(null);

    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.warn('Storage error clearing session:', e);
    }
  }, [token, baseUrl]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'x-auth-token': token },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        } catch {}
        return data.user;
      }
    } catch (err) {
      console.warn('Error refreshing user:', err);
    }
    return null;
  }, [token, baseUrl]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
