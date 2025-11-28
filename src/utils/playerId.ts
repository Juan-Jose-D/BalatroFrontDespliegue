/**
 * Utilidad para obtener el playerId correcto
 * Si el usuario está autenticado, usa el username de Cognito
 * Si no, genera un ID aleatorio
 */

import { authService } from '../services/AuthService';

/**
 * Obtiene el playerId correcto basado en el estado de autenticación
 * @returns Promise<string> - El username de Cognito si está autenticado, o un ID aleatorio si no
 */
export async function getPlayerId(): Promise<string> {
  try {
    const user = await authService.getCurrentUser();
    if (user && user.username) {
      console.log('✅ Usando username de Cognito como playerId:', user.username);
      return user.username;
    }
  } catch (error) {
    console.warn('⚠️ No se pudo obtener usuario autenticado, generando ID aleatorio');
  }
  
  // Fallback: generar ID aleatorio
  const randomId = `player-${Math.random().toString(36).slice(2, 11)}`;
  console.log('⚠️ Generando playerId aleatorio:', randomId);
  return randomId;
}

/**
 * Genera un playerId aleatorio (para casos donde no se requiere autenticación)
 * @returns string - ID aleatorio
 */
export function generateRandomPlayerId(): string {
  return `player-${Math.random().toString(36).slice(2, 11)}`;
}


