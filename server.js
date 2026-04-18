const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Suprimir el 404 de Chrome DevTools
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));

// Servir todos los archivos estáticos del proyecto
app.use(express.static(path.join(__dirname)));

// Ruta raíz → juego directamente
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'juego.html'));
});

// ──────────────────────────────────────────────
//  Estado del servidor
// ──────────────────────────────────────────────
const listaJugadores = []; // { id, name, x, y, z }

// ──────────────────────────────────────────────
//  Socket.io
// ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);

  socket.on('Iniciar', (nombre) => {
    console.log(`[Iniciar] ${nombre}`);
    if (!listaJugadores.find(j => j.id === socket.id)) {
      listaJugadores.push({ id: socket.id, name: nombre, x: 0, y: 0, z: 0 });
    }
    // Notificar a todos los jugadores ya conectados al recién llegado
    for (const j of listaJugadores) {
      io.emit('Iniciar', j.name, j.id);
    }
  });

  socket.on('Posicion', (posicion) => {
    const j = listaJugadores.find(j => j.id === socket.id);
    if (!j) return;
    j.x = posicion.x;
    j.y = posicion.y;
    j.z = posicion.z;
    // Difundir a todos
    io.emit('Posicion', { x: j.x, y: j.y, z: j.z }, j.name, j.id);
  });

  socket.on('disconnect', () => {
    const idx = listaJugadores.findIndex(j => j.id === socket.id);
    if (idx !== -1) {
      console.log(`[-] Desconectado: ${listaJugadores[idx].name}`);
      listaJugadores.splice(idx, 1);
      io.emit('Desconectar', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));