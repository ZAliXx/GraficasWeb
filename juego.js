// ═══════════════════════════════════════════════════════════
//  CÓDIGO ORIGINAL DE TADEO — SIN MODIFICAR
// ═══════════════════════════════════════════════════════════
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let papa = null;
let oficina = null;
let puntaje = 0;

const collidersSolidos = [];
const collidersLlaves = [];
let puertaCollider = null;

const llavesModelos = [];

// jerarquía
const mundo = new THREE.Group();
const entorno = new THREE.Group();
const jugador = new THREE.Group();

scene.add(mundo);
mundo.add(entorno);
mundo.add(jugador);

const loader = new THREE.GLTFLoader();

function crearCollider(x, y, z, w, h, d, tipo = "solido") {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    entorno.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const obj = { mesh, box };
    if (tipo === "llave") {
        collidersLlaves.push(obj);
    } else if (tipo === "puerta") {
        puertaCollider = obj;
    } else {
        collidersSolidos.push(obj);
    }
}

loader.load("oficina.glb", (gltf) => {
    oficina = gltf.scene;
    entorno.add(oficina);
    const box = new THREE.Box3().setFromObject(oficina);
    const center = box.getCenter(new THREE.Vector3());
    oficina.position.sub(center);
    // paredes
    crearCollider(0, -0.5, -3, 6, 5, 0.2);
    crearCollider(3, -0.5, 0, 0.2, 5, 6);
    crearCollider(0, -0.5, 3, 6, 5, 0.2);
    crearCollider(-3, -0.5, 0, 0.2, 5, 6, "puerta");
    // escritorio
    crearCollider(0.3, -0.5, 0.2, 1.5, 0, 0.8);
    // objetos extra
    crearCollider(-1.5, -0.5, -2.5, 1.5, 0.5, 0.5);
    crearCollider(1.5, -0.5, -2.5, 2.3, 0.5, 0.5);
    crearCollider(-2.5, -0.5, 0.5, 0.5, 0.5, 2.5);
    crearCollider(0.5, -0.5, -1, 0.1, 0.1, 0.1);
    crearCollider(0, -0.5, 1, 0.5, 0.5, 0.5);
    crearCollider(-0.2, -1.5, -2.5, 0.5, 0.5, 0.5, "llave");
    crearCollider(1, -1, -2, 0.5, 0.5, 0.5, "llave");
    crearCollider(-1, -1, 2.5, 0.3, 0.3, 0.3, "llave");
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
});

function cargarModelo(ruta, x = 0, y = 0, z = 0, escala = 1) {
    loader.load(ruta, (gltf) => {
        const modelo = gltf.scene;
        modelo.position.set(x, y, z);
        modelo.scale.setScalar(escala);
        if (ruta === "papà.glb") {
            papa = modelo;
            jugador.add(papa);
        } else {
            entorno.add(modelo);
            if (ruta.includes("llave")) {
                llavesModelos.push(modelo);
            }
        }
    });
}

cargarModelo("papà.glb", -1, -1.5, 0, 0.9);
cargarModelo("llave1.glb", -0.2, -1.5, -2.5, 0.02);
cargarModelo("llave2.glb", 1, -1, -2, 0.005);
cargarModelo("llave3.glb", -1, -1, 2.5, 0.1);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 3, 3);
scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function actualizarScore() {
    const score = document.getElementById("score");
    score.textContent = "Puntaje: " + puntaje;
}

function animate() {
    requestAnimationFrame(animate);
    collidersSolidos.forEach(c => c.box.setFromObject(c.mesh));
    collidersLlaves.forEach(c => c.box.setFromObject(c.mesh));
    if (puertaCollider) puertaCollider.box.setFromObject(puertaCollider.mesh);
    if (papa) {
        camera.position.x = papa.position.x;
        camera.position.z = papa.position.z + 3;
        camera.lookAt(papa.position);
    }
    renderer.render(scene, camera);
}
animate();

document.addEventListener("keydown", (event) => {
    if (!papa) return;
    const moveSpeed = 0.1;
    const rotSpeed = 0.05;
    const prevPosition = papa.position.clone();

    if (event.key === "a") papa.position.x -= moveSpeed;
    if (event.key === "d") papa.position.x += moveSpeed;
    if (event.key === "w") papa.position.z -= moveSpeed;
    if (event.key === "s") papa.position.z += moveSpeed;

    const boxPapa = new THREE.Box3().setFromObject(papa);

    for (let c of collidersSolidos) {
        if (boxPapa.intersectsBox(c.box)) {
            papa.position.copy(prevPosition);
            return;
        }
    }

    if (puertaCollider && boxPapa.intersectsBox(puertaCollider.box)) {
        papa.position.copy(prevPosition);
        return;
    }

    for (let i = collidersLlaves.length - 1; i >= 0; i--) {
        if (boxPapa.intersectsBox(collidersLlaves[i].box)) {
            entorno.remove(collidersLlaves[i].mesh);
            collidersLlaves.splice(i, 1);
            entorno.remove(llavesModelos[i]);
            llavesModelos.splice(i, 1);
            puntaje++;
            actualizarScore();
            console.log("Puntaje:", puntaje);
            break;
        }
    }

    if (puntaje === 3 && puertaCollider) {
        entorno.remove(puertaCollider.mesh);
        puertaCollider = null;
    }

    if (event.key === "ArrowLeft") papa.rotation.y += rotSpeed;
    if (event.key === "ArrowRight") papa.rotation.y -= rotSpeed;

    // ── Emitir posición al servidor ──
    if (socketConectado) {
        socket.emit('Posicion', {
            x: papa.position.x,
            y: papa.position.y,
            z: papa.position.z
        });
    }
});

// ═══════════════════════════════════════════════════════════
//  MULTIJUGADOR — agregado sobre el código original
// ═══════════════════════════════════════════════════════════
const socket = io();
let socketConectado = false;
let miNombre = "";

// Avatares de otros jugadores: { socketId: { name, mesh } }
const jugadoresRemotos = {};
const COLORES = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xf08080, 0xc77dff];
let colorIdx = 0;

function crearAvatarRemoto(nombre) {
    const color = COLORES[colorIdx % COLORES.length];
    colorIdx++;

    // Cubo como representación del otro jugador
    const geo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -1.05, 0);

    // Label con el nombre encima
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nombre, 128, 44);
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
    );
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.set(0, 1.1, 0);
    mesh.add(sprite);

    mundo.add(mesh);
    return mesh;
}

function actualizarListaUI() {
    const ul = document.getElementById('ulJugadores');
    ul.innerHTML = '';
    if (miNombre) {
        const li = document.createElement('li');
        li.className = 'yo';
        li.textContent = '★ ' + miNombre;
        ul.appendChild(li);
    }
    for (const id in jugadoresRemotos) {
        const li = document.createElement('li');
        li.textContent = '· ' + jugadoresRemotos[id].name;
        ul.appendChild(li);
    }
}

// Botón conectar
document.getElementById('idBoton').addEventListener('click', () => {
    const nombre = document.getElementById('idNombreJugador').value.trim();
    if (!nombre) return;
    miNombre = nombre;
    document.getElementById('idBoton').disabled = true;
    socket.emit('Iniciar', nombre);
});

// Alguien se conectó (incluido yo mismo al entrar)
socket.on('Iniciar', (nombre, id) => {
    if (id === socket.id) {
        // Soy yo
        socketConectado = true;
        document.getElementById('panelConexion').style.display = 'none';
        document.getElementById('listaJugadores').style.display = 'block';
    } else {
        // Otro jugador
        if (!jugadoresRemotos[id]) {
            jugadoresRemotos[id] = { name: nombre, mesh: crearAvatarRemoto(nombre) };
        }
    }
    actualizarListaUI();
});

// Posición de otro jugador
socket.on('Posicion', (pos, nombre, id) => {
    if (id === socket.id) return; // ignorar eco propio
    if (!jugadoresRemotos[id]) {
        jugadoresRemotos[id] = { name: nombre, mesh: crearAvatarRemoto(nombre) };
        actualizarListaUI();
    }
    // Interpolación suave hacia la nueva posición
    jugadoresRemotos[id].mesh.position.lerp(
        new THREE.Vector3(pos.x, pos.y, pos.z), 0.2
    );
});

// Alguien se desconectó
socket.on('Desconectar', (id) => {
    if (jugadoresRemotos[id]) {
        mundo.remove(jugadoresRemotos[id].mesh);
        delete jugadoresRemotos[id];
        actualizarListaUI();
    }
});