# 🎙️ Backend para Chat de Voz - Instrucciones

## Solo necesitas crear 2 archivos Java:

### 1. SignalingMessage.java

```java
package com.arsw.balatro.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {
    private String type;
    private String gameId;
    private String senderId;
    private String targetId;
    private Object payload;
    private String timestamp;
}
```

### 2. WebRTCSignalingController.java

```java
package com.arsw.balatro.controller;

import com.arsw.balatro.model.dto.SignalingMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebRTCSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/webrtc/signal")
    public void handleSignaling(@Payload SignalingMessage message, Principal principal) {
        try {
            log.info("WebRTC Signal: type={}, gameId={}, from={}, to={}", 
                message.getType(), message.getGameId(), 
                message.getSenderId(), message.getTargetId());

            var signalMessage = new Object() {
                public final String type = "WEBRTC_SIGNAL";
                public final SignalingMessage payload = message;
            };

            messagingTemplate.convertAndSendToUser(
                message.getTargetId(),
                "/queue/webrtc/" + message.getGameId(),
                signalMessage
            );

            log.info("Signal forwarded to: {}", message.getTargetId());

        } catch (Exception e) {
            log.error("Error handling WebRTC signal", e);
        }
    }
}
```

## ¡Eso es todo! Con estos 2 archivos el chat de voz funcionará.

