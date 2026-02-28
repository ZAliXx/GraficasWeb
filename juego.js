const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth/window.innerHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new THREE.GLTFLoader();

loader.load("oficina.glb",(gltf)=>{

const modelo = gltf.scene;
scene.add(modelo);

// calcular tamaño del modelo
const box = new THREE.Box3().setFromObject(modelo);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());

modelo.position.sub(center);

// distancia ideal de cámara
const maxDim = Math.max(size.x,size.y,size.z);
const fov = camera.fov * (Math.PI/180);
let cameraZ = Math.abs(maxDim/2 / Math.tan(fov/2));

cameraZ *= 1.5;

camera.position.set(0, maxDim*0.3, cameraZ);
camera.lookAt(0,0,0);

});

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(3,3,3);
scene.add(light);

camera.position.z = 3;

const ambient = new THREE.AmbientLight(0xffffff,0.5);
scene.add(ambient);

window.addEventListener("resize",()=>{
camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth,window.innerHeight);
});

// LOOP 
function animate(){
requestAnimationFrame(animate);
renderer.render(scene,camera);
}
animate();