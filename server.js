const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.json({}));
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'juego.html')));

// Posiciones de spawn distintas para cada jugador
const SPAWNS = [
    { x: -1,  z:  0  },   // jugador 1: esquina izquierda
    { x:  2.5, z:  2  },  // jugador 2: esquina derecha atrás
    { x:  2.5, z: -2  },  // jugador 3: esquina derecha frente
    { x: -1,  z: -2  },   // jugador 4: esquina izquierda frente
];

const listaJugadores = []; // { id, name, x, y, z, spawn }
let juegoTerminado = false;

io.on('connection', (socket) => {
    console.log(`[+] Conectado: ${socket.id}`);

    socket.on('Iniciar', (nombre) => {
        if (!listaJugadores.find(j => j.id === socket.id)) {
            // Asignar spawn según cuántos jugadores hay
            const spawn = SPAWNS[listaJugadores.length % SPAWNS.length];
            listaJugadores.push({ id: socket.id, name: nombre, x: spawn.x, y: 0, z: spawn.z, spawn });
        }

        // Notificar a todos con la info de spawn de cada jugador
        for (const j of listaJugadores) {
            io.emit('Iniciar', j.name, j.id, j.spawn);
        }
    });

    socket.on('Posicion', (posicion) => {
        const j = listaJugadores.find(j => j.id === socket.id);
        if (!j) return;
        j.x = posicion.x; j.y = posicion.y; j.z = posicion.z;
        io.emit('Posicion', { x: j.x, y: j.y, z: j.z }, j.name, j.id);
    });

    socket.on('LlaveRecogida', (indice) => {
        console.log(`[Llave] índice ${indice} recogida`);
        io.emit('LlaveRecogida', indice);
    });

    socket.on('Ganar', (nombreGanador) => {
        if (juegoTerminado) return;
        juegoTerminado = true;
        console.log(`[Ganar] ${nombreGanador}`);
        io.emit('Ganar', nombreGanador);
    });

    socket.on('disconnect', () => {
        const idx = listaJugadores.findIndex(j => j.id === socket.id);
        if (idx !== -1) {
            console.log(`[-] Desconectado: ${listaJugadores[idx].name}`);
            listaJugadores.splice(idx, 1);
            io.emit('Desconectar', socket.id);
        }
        if (listaJugadores.length === 0) juegoTerminado = false;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));