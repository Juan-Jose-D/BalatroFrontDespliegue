# 🎴 Balatro - Juego de Cartas Multijugador

Un juego de cartas inspirado en Balatro con modo multijugador en tiempo real, desarrollado con React, TypeScript y WebSockets.

## 📋 Descripción

Balatro es un juego de cartas estratégico donde los jugadores forman combinaciones de poker para acumular puntos y superar objetivos. El juego incluye:

- **Modo Multijugador**: Compite en tiempo real contra otros jugadores con sistema de matchmaking
- **Sistema de Jokers**: Cartas especiales que modifican tus puntuaciones y estrategias
- **Progresión por Antes**: Avanza a través de Small Blind, Big Blind y Boss Blind en cada Ante

## ✨ Características Principales

### 🎮 Modos de Juego
- **Solitario**: Juega a tu ritmo contra objetivos progresivos
- **Multijugador en Tiempo Real**: 
  - Matchmaking automático
  - Salas privadas con código
  - Sincronización de estado en tiempo real
  - Cronómetro competitivo

### 🃏 Sistema de Juego
- **Combinaciones de Poker**: 
  - Carta Alta (x1)
  - Pareja (x2)
  - Doble Pareja (x4)
  - Trío (x3)
  - Escalera (x4)
  - Color (x4)
  - Full House (x4)
  - Poker (x11)
  - Escalera de Color (x8)
  - Escalera Real (x8)

- **Jokers**: Hasta 5 jokers activos que modifican puntuaciones
- **Tienda**: Compra jokers y mejoras entre rondas
- **Sistema de Progresión**: 
  - Antes (niveles) con Small, Big y Boss Blind
  - Objetivos de chips que aumentan con la dificultad

### 🎯 Multijugador
- **Sincronización en Tiempo Real**: Estado del juego sincronizado vía WebSocket
- **Cronómetro Competitivo**: Sistema de tiempo cuando un jugador está por detrás
- **Notificaciones**: Alertas de acciones del oponente
- **Chat de Voz**: Comunicación WebRTC entre jugadores (opcional)

### 🔐 Autenticación
- Registro e inicio de sesión con AWS Amplify
- Rutas protegidas
- Gestión de sesión de usuario

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19.1.1** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **React Router DOM** - Enrutamiento
- **AWS Amplify** - Autenticación y servicios en la nube

### Comunicación en Tiempo Real
- **STOMP.js** - Protocolo de mensajería sobre WebSocket
- **SockJS** - Cliente WebSocket con fallback

### Estilos
- **CSS3** - Estilos personalizados con diseño pixel-art

## 📦 Requisitos

- **Node.js** 18+ 
- **npm** o **yarn**
- **Backend Spring Boot** corriendo (ver [BACKEND_SETUP.md](./BACKEND_SETUP.md))

## 🚀 Instalación

1. **Clonar el repositorio**:
```bash
git clone <url-del-repositorio>
cd ARSW-PROYECTO-BALATRO
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar el backend**:
   - Asegúrate de que el backend Spring Boot esté corriendo en `http://localhost:8080`
   - Ver [BACKEND_SETUP.md](./BACKEND_SETUP.md) para más detalles

4. **Configurar variables de entorno** (opcional):
   - Crear archivo `.env` si necesitas cambiar la URL del backend:
   ```
   VITE_BACKEND_URL=http://localhost:8080
   ```

5. **Iniciar el servidor de desarrollo**:
```bash
npm run dev
```

6. **Abrir en el navegador**:
   - El servidor se iniciará en `http://localhost:5173` (o el puerto que Vite asigne)

## 🏗️ Estructura del Proyecto

```
src/
├── assets/              # Imágenes y recursos
│   └── backgrounds/    # Fondos del juego
├── components/          # Componentes reutilizables
│   ├── auth/          # Componentes de autenticación
│   ├── game/          # Componentes del juego (Cartas, Jokers)
│   └── ...            # Otros componentes UI
├── config/             # Configuración (backend, WebSocket)
├── context/            # Context API (Auth, Game, Multiplayer)
├── data/               # Datos estáticos (jokers)
├── hooks/              # Custom hooks
├── pages/              # Páginas/Views principales
│   ├── Menu.tsx
│   ├── PlayGame.tsx           # Modo solitario
│   ├── PlayMultiplayer.tsx    # Modo multijugador
│   ├── Multiplayer.tsx        # Lobby multijugador
│   └── ...
├── services/           # Servicios (WebSocket, Auth, etc.)
├── styles/             # Estilos globales
├── types/              # Definiciones TypeScript
└── utils/              # Utilidades (lógica de poker, mazo, etc.)
```

## 🎮 Cómo Jugar

### Modo Solitario
1. Desde el menú principal, selecciona **"Solitario"**
2. Forma combinaciones de poker con tus cartas
3. Supera los objetivos de chips en cada Blind
4. Avanza a través de los Antes

### Modo Multijugador
1. Inicia sesión o regístrate
2. Desde el menú, selecciona **"Multijugador"**
3. Elige una opción:
   - **Buscar Partida**: Matchmaking automático
   - **Crear Sala Privada**: Crea una sala con código
   - **Unirse a Sala**: Únete con un código de sala
4. Una vez emparejado, compite en tiempo real contra tu oponente

### Reglas del Juego
- **Objetivo**: Superar el objetivo de chips en cada Blind
- **Manos**: Puedes jugar hasta 4 manos por ronda
- **Descartes**: Puedes descartar hasta 3 veces por ronda
- **Jokers**: Compra y gestiona hasta 5 jokers que modifican tus puntuaciones
- **Progresión**: Cada Ante tiene 3 Blinds (Small, Big, Boss)

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo

# Producción
npm run build        # Compila para producción
npm run preview      # Previsualiza build de producción

# Calidad de código
npm run lint         # Ejecuta ESLint
```

## 🌐 Configuración del Backend

El frontend requiere un backend Spring Boot con WebSocket/STOMP. Ver [BACKEND_SETUP.md](./BACKEND_SETUP.md) para:
- Instrucciones de instalación del backend
- Configuración de CORS
- Endpoints requeridos
- Configuración de WebRTC para chat de voz

### Endpoints Principales
- **WebSocket**: `ws://localhost:8080/ws`
- **Matchmaking**: `/app/matchmaking/join`
- **Salas**: `/app/room/create`, `/app/room/join`
- **Juego**: `/app/game/{gameId}`

## 🎨 Características de UI/UX

- Diseño pixel-art retro
- Notificaciones flotantes para acciones del oponente
- Panel de información de la mano de poker
- Visualización de progreso del oponente
- Cronómetro visual cuando estás por detrás
- Sistema de tooltips informativos

## 🐛 Solución de Problemas

### El juego no se conecta al backend
- Verifica que el backend esté corriendo en `http://localhost:8080`
- Revisa la consola del navegador para errores de conexión
- Verifica la configuración CORS en el backend

### Problemas de autenticación
- Asegúrate de tener configurado AWS Amplify correctamente
- Verifica las credenciales en la configuración

### El cronómetro no funciona
- Revisa los logs de la consola para ver el estado del cronómetro
- Verifica que el oponente haya completado una ronda
- Asegúrate de que el jugador local esté por detrás del oponente

## 📝 Notas de Desarrollo

- El proyecto usa **TypeScript** estricto
- Los componentes están organizados por funcionalidad
- El estado del juego se maneja con Context API
- La comunicación en tiempo real usa STOMP sobre WebSocket
- Las reglas de poker siguen las reglas tradicionales

## 👥 Contribuidores

- **Juan**
- **Josue**
- **Alejandro**


## 🔗 Recursos

- [Tutorial en YouTube](https://www.youtube.com/watch?v=gA8Xtrjg1fA)
- [Documentación del Backend](./BACKEND_SETUP.md)

---

**Nota**: Este es un proyecto de demostración desarrollado para ARSW (Arquitectura de Software).
