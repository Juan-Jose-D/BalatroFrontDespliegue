/**
 * Servicio de autenticación con AWS Cognito
 * Maneja login, registro, logout y obtención de tokens
 */

import { Amplify } from 'aws-amplify';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
  type SignInOutput,
  type SignUpOutput,
  type AuthUser,
} from 'aws-amplify/auth';

// Configuración de Amplify (se inicializa en el main.tsx)
export const configureAmplify = () => {
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  const userPoolId = import.meta.env.VITE_AWS_USER_POOL_ID;
  const clientId = import.meta.env.VITE_AWS_CLIENT_ID;

  // Debug: verificar qué variables se están cargando
  console.log('🔍 Verificando variables de entorno:', {
    region,
    userPoolId: userPoolId ? `${userPoolId.substring(0, 10)}...` : 'NO DEFINIDO',
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NO DEFINIDO',
    todasLasEnv: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
  });

  if (!userPoolId || !clientId) {
    console.error('❌ Variables de entorno de Cognito no configuradas');
    console.error('📋 Variables disponibles:', {
      VITE_AWS_REGION: import.meta.env.VITE_AWS_REGION,
      VITE_AWS_USER_POOL_ID: import.meta.env.VITE_AWS_USER_POOL_ID,
      VITE_AWS_CLIENT_ID: import.meta.env.VITE_AWS_CLIENT_ID,
      VITE_AWS_COGNITO_DOMAIN: import.meta.env.VITE_AWS_COGNITO_DOMAIN,
    });
    return;
  }

  const cognitoDomain = import.meta.env.VITE_AWS_COGNITO_DOMAIN;
  
  const amplifyConfig: any = {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId: clientId,
        region,
      },
    },
  };

  // Solo configurar OAuth si el dominio está configurado
  if (cognitoDomain) {
    // Detectar la URL actual del frontend
    const currentOrigin = window.location.origin;
    const redirectUrls = [
      currentOrigin + '/',
      'http://localhost:5173/',
      'http://localhost:5174/',
      'http://localhost:5175/',
      'http://front-balatro.s3-website-us-east-1.amazonaws.com/',
    ];
    
    console.log('🔐 Configurando OAuth:', {
      domain: cognitoDomain,
      redirectSignIn: redirectUrls,
      redirectSignOut: redirectUrls,
    });
    
    amplifyConfig.Auth.Cognito.loginWith = {
      oauth: {
        domain: cognitoDomain,
        scopes: ['openid', 'email', 'profile'],
        redirectSignIn: redirectUrls,
        redirectSignOut: redirectUrls,
        responseType: 'code',
      },
    };
  }

  Amplify.configure(amplifyConfig);

  console.log('✅ AWS Amplify configurado para Cognito');
  console.log('📋 Configuración:', {
    region,
    userPoolId,
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'no configurado',
    cognitoDomain: cognitoDomain || 'no configurado',
  });
};

export interface SignUpParams {
  username: string;
  password: string;
  email: string;
}

export interface SignInParams {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
}

class AuthService {
  /**
   * Registrar un nuevo usuario
   */
  async register(params: SignUpParams): Promise<SignUpOutput> {
    try {
      // Validar que el username no esté vacío
      const usernameToUse = params.username.trim();
      
      if (!usernameToUse) {
        throw new Error('El nombre de usuario es obligatorio');
      }
      
      // Si el User Pool tiene "email alias" habilitado, el username NO puede ser un email
      if (usernameToUse.includes('@')) {
        throw new Error('El nombre de usuario no puede ser un email. Usa un nombre de usuario diferente.');
      }
      
      const output = await signUp({
        username: usernameToUse,
        password: params.password,
        options: {
          userAttributes: {
            email: params.email,
          },
          // Solo auto-sign-in si el usuario no requiere verificación
          // Si requiere verificación, el usuario deberá confirmar primero
          autoSignIn: {
            enabled: false, // Desactivado para permitir verificación de código
          },
        },
      });

      console.log('✅ Usuario registrado exitosamente');
      console.log('📝 Username:', usernameToUse);
      console.log('📧 Email:', params.email);
      console.log('📋 Resultado del registro:', {
        hasNextStep: !!output.nextStep,
        nextStep: output.nextStep,
        isSignUpComplete: output.isSignUpComplete,
      });
      return output;
    } catch (error) {
      console.error('❌ Error al registrar usuario:', error);
      throw error;
    }
  }

  /**
   * Confirmar registro con código de verificación
   */
  async confirmRegistration(username: string, confirmationCode: string): Promise<void> {
    try {
      await confirmSignUp({
        username,
        confirmationCode,
      });
      console.log('✅ Registro confirmado');
    } catch (error) {
      console.error('❌ Error al confirmar registro:', error);
      throw error;
    }
  }

  /**
   * Reenviar código de verificación
   */
  async resendConfirmationCode(username: string): Promise<void> {
    try {
      await resendSignUpCode({ username });
      console.log('✅ Código de verificación reenviado');
    } catch (error) {
      console.error('❌ Error al reenviar código:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión
   * Acepta username o email (si el User Pool tiene email alias habilitado)
   * Cuando el User Pool tiene email alias, el usuario puede iniciar sesión con su email
   */
  async login(params: SignInParams): Promise<SignInOutput> {
    try {
      // Validar que los parámetros no estén vacíos
      if (!params.username || !params.password) {
        throw new Error('Usuario y contraseña son requeridos');
      }

      const loginIdentifier = params.username.trim();
      
      if (!loginIdentifier) {
        throw new Error('El usuario no puede estar vacío');
      }

      if (!params.password.trim()) {
        throw new Error('La contraseña no puede estar vacía');
      }

      console.log('🔐 Intentando iniciar sesión con:', loginIdentifier.includes('@') ? 'email' : 'username');
      console.log('📝 Username/Email:', loginIdentifier.substring(0, 3) + '***');
      console.log('🔑 Longitud de contraseña:', params.password.length);
      
      // Amplify debería manejar automáticamente el email alias si está configurado en el User Pool
      const output = await signIn({
        username: loginIdentifier, // Puede ser username o email (si email alias está habilitado)
        password: params.password,
      });

      console.log('✅ Usuario autenticado exitosamente');
      return output;
    } catch (error: any) {
      console.error('❌ Error al iniciar sesión:', error);
      console.error('❌ Detalles del error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        __type: error.__type,
        $metadata: error.$metadata,
      });
      
      // Manejar diferentes tipos de errores
      if (error.name === 'NotAuthorizedException' || error.__type === 'NotAuthorizedException') {
        const enhancedError = new Error('Usuario o contraseña incorrectos. Verifica tus credenciales.');
        enhancedError.name = error.name || 'NotAuthorizedException';
        throw enhancedError;
      }
      
      if (error.name === 'UserNotFoundException' || error.__type === 'UserNotFoundException') {
        const enhancedError = new Error('El usuario no existe. Verifica que el nombre de usuario sea correcto.');
        enhancedError.name = error.name || 'UserNotFoundException';
        throw enhancedError;
      }
      
      // Si es un error 400, puede ser un problema de formato o configuración
      if (error.statusCode === 400 || error.code === 'BadRequestException' || error.__type === 'BadRequestException') {
        // Si el mensaje contiene información sobre credenciales incorrectas
        if (error.message?.toLowerCase().includes('incorrect') || 
            error.message?.toLowerCase().includes('password') ||
            error.message?.toLowerCase().includes('username')) {
          const enhancedError = new Error('Usuario o contraseña incorrectos. Verifica que estés usando el mismo username que usaste al registrarte.');
          enhancedError.name = 'NotAuthorizedException';
          throw enhancedError;
        }
        
        const enhancedError = new Error(
          'Error en la solicitud. Verifica que el usuario y la contraseña sean correctos. ' +
          'Asegúrate de usar el mismo username que ingresaste al registrarte.'
        );
        enhancedError.name = error.name || 'BadRequestException';
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      await signOut();
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      console.log('⚠️ No hay usuario autenticado');
      return null;
    }
  }

  /**
   * Decodificar JWT token (sin verificar firma)
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('❌ Error al decodificar JWT:', error);
      return null;
    }
  }

  /**
   * Obtener email del usuario actual desde el ID token
   */
  async getUserEmail(): Promise<string | null> {
    try {
      // Obtener directamente desde el ID token (más confiable y no requiere scopes adicionales)
      const tokens = await this.getTokens();
      if (tokens.idToken) {
        const decoded = this.decodeJWT(tokens.idToken);
        console.log('📋 ID Token decodificado para email:', decoded);
        if (decoded.email) {
          console.log('✅ Email obtenido desde ID token:', decoded.email);
          return decoded.email;
        }
      }
      
      // Solo intentar fetchUserAttributes como último recurso (puede fallar por falta de scopes)
      try {
        const attributes = await fetchUserAttributes();
        if (attributes.email) {
          console.log('✅ Email obtenido desde fetchUserAttributes:', attributes.email);
          return attributes.email;
        }
      } catch (error) {
        console.log('⚠️ fetchUserAttributes no disponible (falta de scopes), usando ID token');
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Error al obtener el email del usuario:', error);
      return null;
    }
  }

  /**
   * Obtener nombre del usuario actual desde el ID token
   */
  async getUserName(): Promise<string | null> {
    try {
      // Obtener directamente desde el ID token (más confiable y no requiere scopes adicionales)
      const tokens = await this.getTokens();
      if (tokens.idToken) {
        const decoded = this.decodeJWT(tokens.idToken);
        console.log('📋 ID Token decodificado para nombre:', decoded);
        
        // Intentar obtener preferred_username primero
        if (decoded.preferred_username) {
          console.log('✅ Usando preferred_username desde ID token:', decoded.preferred_username);
          return decoded.preferred_username;
        }
        
        // Si hay un nombre completo, usarlo
        if (decoded.name) {
          console.log('✅ Usando name desde ID token:', decoded.name);
          return decoded.name;
        }
        
        // Si no hay nombre, extraer el nombre de usuario del email (parte antes del @)
        if (decoded.email) {
          const emailParts = decoded.email.split('@');
          if (emailParts.length > 0 && emailParts[0]) {
            console.log('✅ Usando nombre extraído del email:', emailParts[0]);
            return emailParts[0];
          }
        }
      }
      
      // Solo intentar fetchUserAttributes como último recurso (puede fallar por falta de scopes)
      try {
        const attributes = await fetchUserAttributes();
        console.log('📋 Atributos obtenidos:', Object.keys(attributes));
        
        // Intentar obtener preferred_username primero (nombre de usuario de Google)
        if (attributes.preferred_username) {
          console.log('✅ Usando preferred_username:', attributes.preferred_username);
          return attributes.preferred_username;
        }
        
        // Si hay un nombre completo, usarlo
        if (attributes.name) {
          console.log('✅ Usando name:', attributes.name);
          return attributes.name;
        }
      } catch (error) {
        console.log('⚠️ fetchUserAttributes no disponible (falta de scopes), usando ID token');
      }
      
      console.log('⚠️ No se encontró nombre disponible');
      return null;
    } catch (error: any) {
      console.error('❌ Error al obtener el nombre del usuario:', error);
      return null;
    }
  }

  /**
   * Obtener tokens de autenticación (JWT)
   */
  async getTokens(): Promise<AuthTokens> {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens) {
        console.warn('⚠️ No hay tokens en la sesión. El usuario puede no estar autenticado.');
        return {
          accessToken: null,
          idToken: null,
          refreshToken: null,
        };
      }
      
      const accessToken = session.tokens?.accessToken?.toString() || null;
      const idToken = session.tokens?.idToken?.toString() || null;
      const refreshToken = (session.tokens as any)?.refreshToken?.toString() || null;
      
      if (accessToken) {
        console.log('✅ Tokens obtenidos correctamente');
      } else {
        console.warn('⚠️ No se pudo obtener el access token');
      }
      
      return {
        accessToken,
        idToken,
        refreshToken,
      };
    } catch (error: any) {
      console.error('❌ Error al obtener tokens:', error);
      console.error('❌ Detalles del error:', error.message, error.name, error.code);
      
      // Si el error es de sesión expirada, intentar refrescar
      if (error.name === 'NotAuthorizedException' || error.message?.includes('session') || error.code === 'NotAuthorizedException') {
        console.log('🔄 Sesión expirada o inválida. El usuario necesita volver a autenticarse.');
      }
      
      return {
        accessToken: null,
        idToken: null,
        refreshToken: null,
      };
    }
  }

  /**
   * Obtener token de acceso (para enviar al backend)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.getTokens();
      if (tokens.accessToken) {
        console.log('✅ Token de acceso obtenido correctamente');
        return tokens.accessToken;
      } else {
        console.warn('⚠️ No se pudo obtener el token de acceso');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error al obtener token de acceso:', error);
      console.error('❌ Detalles:', error.message, error.name);
      
      // Si el error es de sesión expirada o no autenticado, intentar refrescar
      if (error.name === 'NotAuthorizedException' || error.message?.includes('session')) {
        console.log('🔄 Intentando refrescar la sesión...');
        try {
          // Amplify debería manejar el refresh automáticamente
          const tokens = await this.getTokens();
          return tokens.accessToken;
        } catch (refreshError) {
          console.error('❌ Error al refrescar sesión:', refreshError);
          return null;
        }
      }
      
      return null;
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch {
      return false;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(username: string): Promise<void> {
    try {
      await resetPassword({ username });
      console.log('✅ Código de restablecimiento enviado');
    } catch (error) {
      console.error('❌ Error al solicitar restablecimiento:', error);
      throw error;
    }
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      await confirmResetPassword({
        username,
        confirmationCode,
        newPassword,
      });
      console.log('✅ Contraseña restablecida');
    } catch (error) {
      console.error('❌ Error al confirmar restablecimiento:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión con Google
   */
  async signInWithGoogle(): Promise<void> {
    try {
      await signInWithRedirect({
        provider: 'Google',
      });
      console.log('✅ Redirigiendo a Google para autenticación');
    } catch (error) {
      console.error('❌ Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  /**
   * Manejar el callback de OAuth después del redirect
   * En Amplify v6, el callback se maneja automáticamente al verificar el usuario
   */
  async handleOAuthRedirect(): Promise<{ isSignedIn: boolean }> {
    try {
      // En Amplify v6, simplemente verificamos si hay un usuario después del redirect
      // El callback se procesa automáticamente cuando se verifica el usuario
      const user = await this.getCurrentUser();
      return { isSignedIn: user !== null };
    } catch (error: any) {
      // Si no hay usuario, no es un error crítico
      console.log('ℹ️ No hay usuario autenticado después del redirect');
      return { isSignedIn: false };
    }
  }
}

export const authService = new AuthService();

