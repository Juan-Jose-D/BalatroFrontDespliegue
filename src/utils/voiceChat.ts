/**
 * Utilidades para el chat de voz usando Cognito como identificador
 */

/**
 * Determina quién es el iniciador de la conexión WebRTC
 * Usa una comparación determinística basada en los usernames de Cognito
 * Ambos jugadores deben llegar a la misma conclusión
 * 
 * @param localCognitoUsername - Username de Cognito del jugador local
 * @param remoteCognitoUsername - Username de Cognito del jugador remoto
 * @returns true si el jugador local es el iniciador, false si es el receptor
 */
export function determineInitiator(
  localCognitoUsername: string, 
  remoteCognitoUsername: string
): boolean {
  if (!localCognitoUsername || !remoteCognitoUsername) {
    console.warn('⚠️ No se pueden determinar roles: faltan usernames de Cognito', {
      localCognitoUsername,
      remoteCognitoUsername
    });
    return false;
  }

  // Normalizar usernames: trim y convertir a minúsculas para comparación consistente
  const normalizedLocal = localCognitoUsername.trim().toLowerCase();
  const normalizedRemote = remoteCognitoUsername.trim().toLowerCase();

  // Validar que no sean iguales después de normalizar
  if (normalizedLocal === normalizedRemote) {
    console.error('❌ ERROR: Los usernames de Cognito son iguales después de normalizar:', {
      localCognitoUsername,
      remoteCognitoUsername,
      normalizedLocal,
      normalizedRemote
    });
    return false;
  }

  // Comparación lexicográfica determinística
  // El jugador con el username "menor" (alfabéticamente) será el iniciador
  const isLocalInitiator = normalizedLocal < normalizedRemote;
  
  console.log('🎯 Determinando iniciador (usando Cognito):', {
    localCognitoUsername,
    remoteCognitoUsername,
    normalizedLocal,
    normalizedRemote,
    comparison: `"${normalizedLocal}" < "${normalizedRemote}"`,
    result: isLocalInitiator,
    localRole: isLocalInitiator ? '👑 INICIADOR' : '👥 RECEPTOR',
    remoteRole: isLocalInitiator ? '👥 RECEPTOR' : '👑 INICIADOR'
  });

  return isLocalInitiator;
}

/**
 * Normaliza un username de Cognito para comparaciones
 */
export function normalizeCognitoUsername(username: string): string {
  return username.trim().toLowerCase();
}




