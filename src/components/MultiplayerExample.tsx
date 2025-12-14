/**
 * Componente de ejemplo para demostrar la integración con el backend WebSocket
 * Este componente muestra cómo usar el hook useWebSocket para:
 * - Conectar al servidor
 * - Buscar partida (matchmaking)
 * - Enviar y recibir mensajes en tiempo real
 */

import { useWebSocket } from "../hooks/useWebSocket";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const MultiplayerExample = () => {
  const navigate = useNavigate();
  
  // Generar ID de jugador único (en producción, obtenerlo de autenticación)
  const [playerId] = useState(() => `player-${Math.random().toString(36).substr(2, 9)}`);
  
  const {
    isConnected,
    isInQueue,
    queueStatus,
    currentMatch,
    error,
    connect,
    disconnect,
    joinQueue,
    leaveQueue,
    clearError,
  } = useWebSocket({
    playerId,
    autoConnect: false, // Conectar manualmente para este ejemplo
  });

  // Cuando se encuentra una partida, navegar a la pantalla de juego
  useEffect(() => {
    if (currentMatch) {
      console.log("🎮 ¡Partida encontrada!", currentMatch);
      
      // Aquí deberías navegar a tu componente de juego
      // navigate(`/game/${currentMatch.gameId}`);
      
      alert(`¡Partida encontrada! 
ID: ${currentMatch.gameId}
Oponente: ${currentMatch.player2Name || currentMatch.player1Name}`);
    }
  }, [currentMatch, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🃏 Balatro Multiplayer</h1>
        <p style={styles.subtitle}>Ejemplo de Integración WebSocket</p>

        {/* Estado de conexión */}
        <div style={styles.statusSection}>
          <div style={styles.statusBadge}>
            Estado: {isConnected ? "🟢 Conectado" : "🔴 Desconectado"}
          </div>
          <div style={styles.playerInfo}>
            Player ID: <code>{playerId}</code>
          </div>
        </div>

        {/* Botones de conexión */}
        <div style={styles.buttonGroup}>
          {!isConnected ? (
            <button
              onClick={connect}
              style={styles.buttonPrimary}
            >
              🔌 Conectar al Servidor
            </button>
          ) : (
            <button
              onClick={disconnect}
              style={styles.buttonSecondary}
            >
              🔌 Desconectar
            </button>
          )}
        </div>

        {/* Sección de Matchmaking */}
        {isConnected && !currentMatch && (
          <div style={styles.matchmakingSection}>
            <h2 style={styles.sectionTitle}>Matchmaking</h2>
            
            {!isInQueue ? (
              <button
                onClick={joinQueue}
                style={styles.buttonSuccess}
              >
                🔍 Buscar Partida
              </button>
            ) : (
              <div style={styles.queueInfo}>
                <div style={styles.spinner}>⏳</div>
                <h3>Buscando oponente...</h3>
                
                {queueStatus && (
                  <div style={styles.queueDetails}>
                    <p>📍 Posición en cola: <strong>#{queueStatus.queuePosition || "N/A"}</strong></p>
                    <p>👥 Jugadores en cola: <strong>{queueStatus.playersInQueue}</strong></p>
                    <p>⏱️ Tiempo estimado: <strong>{queueStatus.estimatedWaitTime || "N/A"}s</strong></p>
                  </div>
                )}
                
                <button
                  onClick={leaveQueue}
                  style={styles.buttonDanger}
                >
                  ❌ Cancelar Búsqueda
                </button>
              </div>
            )}
          </div>
        )}

        {/* Partida encontrada */}
        {currentMatch && (
          <div style={styles.matchFoundSection}>
            <h2 style={styles.matchFoundTitle}>🎉 ¡Partida Encontrada!</h2>
            
            <div style={styles.matchInfo}>
              <p><strong>ID de Partida:</strong></p>
              <code style={styles.code}>{currentMatch.gameId}</code>
              
              <div style={styles.playersInfo}>
                <div style={styles.playerCard}>
                  <span style={styles.playerEmoji}>👤</span>
                  <span>{currentMatch.player1Name}</span>
                </div>
                
                <span style={styles.vs}>VS</span>
                
                <div style={styles.playerCard}>
                  <span style={styles.playerEmoji}>👤</span>
                  <span>{currentMatch.player2Name}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                // Aquí navegar a la pantalla de juego
                alert("Navegar a /game/" + currentMatch.gameId);
                // navigate(`/game/${currentMatch.gameId}`);
              }}
              style={styles.buttonPrimary}
            >
              🎮 Ir a la Partida
            </button>
          </div>
        )}

        {/* Mensajes de error */}
        {error && (
          <div style={styles.errorSection}>
            <p style={styles.errorText}>❌ {error}</p>
            <button onClick={clearError} style={styles.buttonSmall}>
              Cerrar
            </button>
          </div>
        )}

        {/* Instrucciones */}
        <div style={styles.instructions}>
          <h3 style={styles.instructionsTitle}>📋 Instrucciones</h3>
          <ol style={styles.instructionsList}>
            <li>Asegúrate de que el backend esté corriendo en <code>http://localhost:8080</code></li>
            <li>Haz clic en "Conectar al Servidor"</li>
            <li>Haz clic en "Buscar Partida"</li>
            <li>Abre otra ventana del navegador y repite los pasos 2-3</li>
            <li>¡Cuando se emparejen, verás la información de la partida!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// Estilos en línea para el ejemplo
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "600px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  title: {
    fontSize: "2.5rem",
    margin: "0 0 10px 0",
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: "30px",
  },
  statusSection: {
    backgroundColor: "#f5f5f5",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  statusBadge: {
    fontSize: "1.1rem",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  playerInfo: {
    fontSize: "0.9rem",
    color: "#666",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
  },
  buttonPrimary: {
    flex: 1,
    padding: "15px 30px",
    fontSize: "1rem",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#667eea",
    color: "white",
    transition: "all 0.3s",
  },
  buttonSecondary: {
    flex: 1,
    padding: "15px 30px",
    fontSize: "1rem",
    fontWeight: "bold",
    border: "2px solid #667eea",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "white",
    color: "#667eea",
    transition: "all 0.3s",
  },
  buttonSuccess: {
    width: "100%",
    padding: "15px 30px",
    fontSize: "1.1rem",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#10b981",
    color: "white",
    transition: "all 0.3s",
  },
  buttonDanger: {
    padding: "10px 20px",
    fontSize: "1rem",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#ef4444",
    color: "white",
    marginTop: "15px",
  },
  buttonSmall: {
    padding: "8px 16px",
    fontSize: "0.9rem",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#666",
    color: "white",
  },
  matchmakingSection: {
    textAlign: "center",
    marginBottom: "30px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    marginBottom: "20px",
    color: "#333",
  },
  queueInfo: {
    padding: "20px",
    backgroundColor: "#f0f9ff",
    borderRadius: "8px",
    border: "2px solid #3b82f6",
  },
  spinner: {
    fontSize: "3rem",
    animation: "spin 2s linear infinite",
  },
  queueDetails: {
    margin: "20px 0",
    textAlign: "left",
  },
  matchFoundSection: {
    backgroundColor: "#f0fdf4",
    padding: "30px",
    borderRadius: "8px",
    border: "2px solid #10b981",
    textAlign: "center",
    marginBottom: "20px",
  },
  matchFoundTitle: {
    fontSize: "2rem",
    color: "#059669",
    marginBottom: "20px",
  },
  matchInfo: {
    marginBottom: "20px",
  },
  code: {
    display: "block",
    backgroundColor: "#1f2937",
    color: "#10b981",
    padding: "10px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.9rem",
    margin: "10px 0 20px 0",
    wordBreak: "break-all",
  },
  playersInfo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "20px",
  },
  playerCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
  },
  playerEmoji: {
    fontSize: "2rem",
  },
  vs: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#666",
  },
  errorSection: {
    backgroundColor: "#fee2e2",
    padding: "15px",
    borderRadius: "8px",
    border: "2px solid #ef4444",
    marginBottom: "20px",
  },
  errorText: {
    color: "#dc2626",
    margin: "0 0 10px 0",
  },
  instructions: {
    backgroundColor: "#fffbeb",
    padding: "20px",
    borderRadius: "8px",
    border: "2px solid #f59e0b",
  },
  instructionsTitle: {
    fontSize: "1.2rem",
    marginBottom: "10px",
    color: "#92400e",
  },
  instructionsList: {
    margin: "0",
    paddingLeft: "20px",
    color: "#92400e",
  },
};

