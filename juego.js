
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

const mundo = new THREE.Group();
const entorno = new THREE.Group();
const jugador = new THREE.Group();
scene.add(mundo);
mundo.add(entorno);
mundo.add(jugador);

const loader = new THREE.GLTFLoader();


const socket = io();
let socketConectado = false;
let miNombre  = "";
let miSpawn   = null; // { x, z } 

function crearCollider(x, y, z, w, h, d, tipo = "solido") {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mat  = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    entorno.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const obj = { mesh, box };
    if      (tipo === "llave")  collidersLlaves.push(obj);
    else if (tipo === "puerta") puertaCollider = obj;
    else                        collidersSolidos.push(obj);
}

loader.load("oficina.glb", (gltf) => {
    oficina = gltf.scene;
    entorno.add(oficina);
    const box    = new THREE.Box3().setFromObject(oficina);
    const center = box.getCenter(new THREE.Vector3());
    oficina.position.sub(center);
    crearCollider(0,   -0.5, -3,   6,   5,   0.2);
    crearCollider(3,   -0.5,  0,   0.2, 5,   6);
    crearCollider(0,   -0.5,  3,   6,   5,   0.2);
    crearCollider(-3,  -0.5,  0,   0.2, 5,   6,   "puerta");
    crearCollider(0.3, -0.5,  0.2, 1.5, 0,   0.8);
    crearCollider(-1.5,-0.5, -2.5, 1.5, 0.5, 0.5);
    crearCollider(1.5, -0.5, -2.5, 2.3, 0.5, 0.5);
    crearCollider(-2.5,-0.5,  0.5, 0.5, 0.5, 2.5);
    crearCollider(0.5, -0.5, -1,   0.1, 0.1, 0.1);
    crearCollider(0,   -0.5,  1,   0.5, 0.5, 0.5);
    // 4 llaves
    crearCollider(-0.2, -1.5, -2.5, 0.5, 0.5, 0.5, "llave");
    crearCollider(1,    -1,   -2,   0.5, 0.5, 0.5, "llave");
    crearCollider(-1,   -1,    2.5, 0.3, 0.3, 0.3, "llave");
    crearCollider(2,    -1,    1,   0.4, 0.4, 0.4, "llave");
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
});


function cargarLlave(ruta, x, y, z, escala) {
    loader.load(ruta, (gltf) => {
        const modelo = gltf.scene;
        modelo.position.set(x, y, z);
        modelo.scale.setScalar(escala);
        entorno.add(modelo);
        llavesModelos.push(modelo);
    });
}
cargarLlave("llave1.glb", -0.2, -1.5, -2.5, 0.02);
cargarLlave("llave2.glb",  1,   -1,   -2,   0.005);
cargarLlave("llave3.glb", -1,   -1,    2.5,  0.1);
cargarLlave("llave3.glb",  2,   -1,    1,    0.1);


function cargarPapa(spawnX, spawnZ) {
    console.log('cargarPapa llamado con spawn:', spawnX, spawnZ);
    loader.load("papà.glb", (gltf) => {
        papa = gltf.scene;
        papa.position.set(spawnX, -1.5, spawnZ);
        papa.scale.setScalar(0.9);
        jugador.add(papa);
        console.log('papa cargado en posicion:', papa.position);
    });
}

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 3, 3);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function actualizarScore() {
    document.getElementById("score").textContent = "Llaves: " + puntaje + "/2";
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
    console.log('keydown:', event.key, '| papa:', !!papa, '| socketConectado:', socketConectado);
    if (!papa || !socketConectado) return;

    const moveSpeed = 0.1;
    const rotSpeed  = 0.05;
    const prevPos   = papa.position.clone();

    if (event.key === "a") papa.position.x -= moveSpeed;
    if (event.key === "d") papa.position.x += moveSpeed;
    if (event.key === "w") papa.position.z -= moveSpeed;
    if (event.key === "s") papa.position.z += moveSpeed;

    const boxPapa = new THREE.Box3().setFromObject(papa);

    for (let c of collidersSolidos) {
        if (boxPapa.intersectsBox(c.box)) {
            console.log('Colision solido en:', c.mesh.position);
            papa.position.copy(prevPos); return;
        }
    }

    if (puertaCollider && boxPapa.intersectsBox(puertaCollider.box)) {
        console.log('Colision puerta');
        if (puntaje >= 2) {
            socket.emit('Ganar', miNombre);
        } else {
            papa.position.copy(prevPos);
        }
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
            socket.emit('LlaveRecogida', i);
            break;
        }
    }

    if (event.key === "ArrowLeft")  papa.rotation.y += rotSpeed;
    if (event.key === "ArrowRight") papa.rotation.y -= rotSpeed;

    socket.emit('Posicion', { x: papa.position.x, y: papa.position.y, z: papa.position.z });
});


const jugadoresRemotos = {}; 

function crearAvatarRemoto(nombre, spawnX, spawnZ) {
   
    const grupo = new THREE.Group();
    grupo.position.set(spawnX, 0, spawnZ);
    mundo.add(grupo);

    loader.load("papà.glb", (gltf) => {
        const modelo = gltf.scene;
        modelo.scale.setScalar(0.9);
        modelo.position.set(0, -1.5, 0);
        grupo.add(modelo);

       
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff9500';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(nombre, 128, 44);
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })
        );
        sprite.scale.set(1.8, 0.45, 1);
        sprite.position.set(0, 0.8, 0);
        grupo.add(sprite);
    });

    return grupo;
}

function mostrarPantalla(titulo, subtitulo) {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.82);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:200;font-family:sans-serif;color:#fff;`;
    div.innerHTML = `
        <h1 style="font-size:3rem;color:#ff9500;margin:0">${titulo}</h1>
        <p style="font-size:1.3rem;margin-top:12px;color:#ffcc66">${subtitulo}</p>
        <button onclick="location.reload()" style="margin-top:24px;padding:12px 32px;
            background:#ff9500;border:none;border-radius:8px;font-size:1rem;
            font-weight:bold;cursor:pointer;">Jugar de nuevo</button>`;
    document.body.appendChild(div);
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


document.getElementById('idBoton').addEventListener('click', () => {
    const nombre = document.getElementById('idNombreJugador').value.trim();
    if (!nombre) return;
    miNombre = nombre;
    document.getElementById('idBoton').disabled = true;
    socket.emit('Iniciar', nombre);
});


socket.on('Iniciar', (nombre, id, spawn) => {
    if (id === socket.id) {
       
        if (!socketConectado) {
            socketConectado = true;
            miSpawn = spawn || { x: -1, z: 0 };
            console.log('Mi spawn asignado:', miSpawn);
            document.getElementById('panelConexion').style.display = 'none';
            document.getElementById('listaJugadores').style.display = 'block';
            cargarPapa(miSpawn.x, miSpawn.z);
        }
    } else {
        if (!jugadoresRemotos[id]) {
            const sx = spawn ? spawn.x : 1;
            const sz = spawn ? spawn.z : 0;
            jugadoresRemotos[id] = { name: nombre, grupo: crearAvatarRemoto(nombre, sx, sz) };
        }
    }
    actualizarListaUI();
});

socket.on('Posicion', (pos, nombre, id) => {
    if (id === socket.id) return;
    if (!jugadoresRemotos[id]) {
        jugadoresRemotos[id] = { name: nombre, grupo: crearAvatarRemoto(nombre, pos.x, pos.z) };
        actualizarListaUI();
    }
    const g = jugadoresRemotos[id].grupo;
    g.position.x += (pos.x - g.position.x) * 0.2;
    g.position.z += (pos.z - g.position.z) * 0.2;
});

socket.on('LlaveRecogida', (indice) => {
    if (indice < 0 || indice >= collidersLlaves.length) return;
    entorno.remove(collidersLlaves[indice].mesh);
    collidersLlaves.splice(indice, 1);
    entorno.remove(llavesModelos[indice]);
    llavesModelos.splice(indice, 1);
});


socket.on('Ganar', (nombreGanador) => {
    if (nombreGanador === miNombre) {
        mostrarPantalla('🏆 ¡Ganaste!', 'Conseguiste 2 llaves y escapaste primero');
    } else {
        mostrarPantalla('😞 ¡Perdiste!', `${nombreGanador} escapó primero`);
    }
    socketConectado = false;
});


socket.on('Desconectar', (id) => {
    if (jugadoresRemotos[id]) {
        mundo.remove(jugadoresRemotos[id].grupo);
        delete jugadoresRemotos[id];
        actualizarListaUI();
    }
});