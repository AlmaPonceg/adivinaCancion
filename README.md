# Adivina la Canción — Trivia Musical en Tiempo Real

Juego web multijugador en tiempo real para trivia musical (ideal para cumpleaños y eventos grupales).
Cuenta con arquitectura Host/Jugador, pulsador (buzzer) ultra-rápido con resolución en milisegundos en el servidor, panel de control para el host con reproductor de YouTube y Spotify, división automática de equipos y marcador en vivo.

---

## Características

- **Tiempo real con Socket.io**: Buzzer atómico en el servidor con marcas de tiempo precisas para determinar quién pulsó primero.
- **Pantalla Host**:
  - Código de sala y código QR grande para unirse al instante desde el celular.
  - Sorteo automático o manual de equipos.
  - Reproductor integrado de YouTube y enlaces de Spotify.
  - Control de juez: validar respuestas correctas/incorrectas y bloqueo automático de equipo que falló.
- **Pantalla Jugador (Móvil)**:
  - Diseño responsive táctil optimizado para smartphones.
  - Pulsador de gran tamaño con feedback visual y vibración táctil (haptic).
- **Estilo editorial**: Diseño moderno, minimalista y libre de emojis infantiles, con paleta sobria (charcoal, dorado, marfil).

---

## Estructura del Proyecto

```
├── client/              # Frontend en React + Tailwind CSS + Framer Motion (Vite)
│   ├── src/
│   │   ├── components/  # Buzzer, MusicPlayer, Scoreboard, JudgePanel, etc.
│   │   ├── pages/       # Landing, HostLobby, HostGame, PlayerJoin, PlayerBuzzer, GameOver
│   │   └── socket.js    # Conexión Socket.io cliente
├── server/              # Backend en Node.js + Express + Socket.io
│   ├── gameManager.js   # Lógica del estado de las salas, turnos y puntuación
│   └── index.js         # Servidor HTTP y handlers de Socket.io
└── package.json         # Scripts de inicio coordinado
```

---

## Instalación y Uso

### 1. Clonar el repositorio
```bash
git clone https://github.com/AlmaPonceg/adivinaCancion.git
cd adivinaCancion
```

### 2. Instalar dependencias
```bash
# Instalar dependencias raíz y de los subproyectos
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. Iniciar en desarrollo
```bash
npm run dev
```
- **Frontend (Host y Jugadores):** `http://localhost:5173`
- **Backend (API y Sockets):** `http://localhost:3001`

Para que los invitados se conecten desde sus teléfonos móviles en la misma red Wi-Fi, pueden acceder directamente a la IP local de tu computadora (por ejemplo: `http://192.168.1.X:5173`).
