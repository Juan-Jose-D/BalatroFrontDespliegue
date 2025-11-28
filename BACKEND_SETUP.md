# 🚀 Cómo Iniciar el Backend

## Requisitos
- Java 17 o superior
- Maven 3.6+

## Pasos

1. **Clonar el repositorio del backend** (si no lo tienes):
```bash
git clone https://github.com/Josuehmz/ARSW-Proyecto-Backend.git
cd ARSW-Proyecto-Backend
```

2. **Instalar dependencias y compilar**:
```bash
mvn clean install
```

3. **Iniciar el servidor**:
```bash
mvn spring-boot:run
```

4. **Verificar que esté corriendo**:
   - Abre tu navegador en: `http://localhost:8080`
   - Deberías ver una respuesta del servidor

## Configuración CORS

El backend debe tener configurado CORS para permitir conexiones desde `http://localhost:5175`.

Si tienes problemas de CORS, agrega esto en tu configuración de Spring Boot:

```java
@Configuration
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:5175", "http://localhost:5174", "http://localhost:5173")
                .withSockJS();
    }
}
```

## ✅ Backend Listo

Una vez que veas:
```
[STOMP Debug] Connected to server
```

En la consola del navegador, el backend está funcionando correctamente.

## 🎤 Chat de Voz WebRTC

Para que el chat de voz funcione correctamente, el backend debe implementar los endpoints y la lógica descritos en:

**📄 [BACKEND_WEBRTC_REQUIREMENTS.md](./BACKEND_WEBRTC_REQUIREMENTS.md)**

Este documento contiene:
- Endpoints requeridos (`/app/session/register` y `/app/webrtc/signal`)
- Formato de mensajes esperado
- Lógica de normalización de playerIds
- Implementación sugerida en Java/Spring Boot







