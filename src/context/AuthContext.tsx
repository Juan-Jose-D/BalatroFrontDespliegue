/**
 * Contexto de autenticación para React
 * Proporciona estado y funciones de autenticación a toda la aplicación
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService, type SignUpParams, type SignInParams } from '../services/AuthService';
import type { AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
  // Estado
  user: AuthUser | null;
  userEmail: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (params: SignInParams) => Promise<void>;
  register: (params: SignUpParams) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  confirmRegistration: (username: string, code: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  requestPasswordReset: (username: string) => Promise<void>;
  confirmPasswordReset: (username: string, code: string, newPassword: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verificar estado de autenticación al cargar
   * También maneja el callback de OAuth si el usuario viene de un redirect
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Verificar si hay un código de OAuth en la URL (callback de Google)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code || state) {
          console.log('🔄 Detectado callback de OAuth, procesando...');
          // Limpiar la URL para evitar problemas
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // En Amplify v6, el callback de OAuth se maneja automáticamente
        // Solo necesitamos verificar si hay un usuario autenticado
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ Usuario autenticado encontrado');
          console.log('📋 Usuario:', currentUser);
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Esperar un poco para que los atributos estén disponibles después del OAuth redirect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Obtener el email y nombre del usuario
          try {
            const email = await authService.getUserEmail();
            const name = await authService.getUserName();
            setUserEmail(email);
            setUserName(name);
          } catch (err: any) {
            console.error('❌ Error al obtener los atributos del usuario:', err);
            setUserEmail(null);
            setUserName(null);
          }
        } else {
          setUser(null);
          setUserEmail(null);
          setUserName(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error al verificar autenticación:', err);
        setUser(null);
        setUserEmail(null);
        setUserName(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (params: SignInParams) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.login(params);
      
      // Verificar usuario después del login
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Obtener el email y nombre del usuario
        try {
          const email = await authService.getUserEmail();
          const name = await authService.getUserName();
          setUserEmail(email);
          setUserName(name);
        } catch (err) {
          console.log('⚠️ No se pudo obtener los atributos del usuario');
          setUserEmail(null);
          setUserName(null);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: SignUpParams) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.register(params);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al registrar usuario';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.logout();
      
      setUser(null);
      setUserEmail(null);
      setUserName(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cerrar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRegistration = async (username: string, code: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.confirmRegistration(username, code);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al confirmar registro';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationCode = async (username: string) => {
    try {
      setError(null);
      await authService.resendConfirmationCode(username);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al reenviar código';
      setError(errorMessage);
      throw err;
    }
  };

  const requestPasswordReset = async (username: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.requestPasswordReset(username);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al solicitar restablecimiento';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (username: string, code: string, newPassword: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await authService.confirmPasswordReset(username, code, newPassword);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al confirmar restablecimiento';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await authService.signInWithGoogle();
      // La redirección se maneja automáticamente
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión con Google';
      setError(errorMessage);
      throw err;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await authService.getAccessToken();
    } catch (err) {
      console.error('Error al obtener token:', err);
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    // Estado
    user,
    userEmail,
    userName,
    isAuthenticated,
    isLoading,
    error,

    // Acciones
    login,
    register,
    logout,
    signInWithGoogle,
    confirmRegistration,
    resendConfirmationCode,
    requestPasswordReset,
    confirmPasswordReset,
    getAccessToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

