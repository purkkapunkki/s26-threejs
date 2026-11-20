import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';

let camera, scene, renderer, cube, controls;
const base = import.meta.env.BASE_URL;
const noise = new ImprovedNoise();

function createSphere(radius) {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const positions = geometry.attributes.position;
  const offset = Math.random() * 100;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const length = Math.hypot(x, y, z);

    const bump =
      noise.noise(x * 1.5 + offset, y * 1.5 + offset * 2, z * 1.5 - offset) *
      radius *
      0.04;

    const scale = (length + bump) / length;
    positions.setXYZ(i, x * scale, y * scale, z * scale);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 'white',
    roughness: 1,
  });

  return new THREE.Mesh(geometry, material);
}

function moveObjectToGround(object) {
  const bounds = new THREE.Box3().setFromObject(object);
  object.position.y += -bounds.min.y;
}

function createSnowman(height = 1.8) {
  const bottomSphere = createSphere(3);
  const middleSphere = createSphere(2);
  const topSphere = createSphere(1);

  // bottomSphere radius + middleSphere radius - overlap
  middleSphere.position.y = 3 + 2 - 0.5;
  // middleSphere radius + topSphere radius - overlap
  topSphere.position.y = 2 + 1 - 0.5;

  bottomSphere.add(middleSphere);
  middleSphere.add(topSphere);

  const virtualHeight = 11;
  bottomSphere.scale.setScalar(height / virtualHeight);
  moveObjectToGround(bottomSphere);

  const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x080808,
    emissive: 0x080808,
    emissiveIntensity: 0.2,
    roughness: 1,
  });

  for (const x of [-0.35, 0.35]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(x, 0.3, 0.9);
    topSphere.add(eye);
  }

  const noseGeometry = new THREE.ConeGeometry(0.14, 0.8, 8);
  const noseMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7518,
    roughness: 1,
  });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);

  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.15, 1.3);
  topSphere.add(nose);

  return bottomSphere;
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  const snowman = createSnowman();
  scene.add(snowman);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // camera.position.z = 5;
  // camera.position.x = 2;
  // camera.position.y = 1;
  camera.position.set(2, 3, 5);
  camera.lookAt(axesHelper.position);
  //camera.lookAt(0, 0, 0);

  // TUTKI KOTITEHTÄVÄÄ VARTEN
  //cube.position.set(1,1,1);
  //cube.rotation.x = Math.PI / 2; // 90 astetta
  // cube.scale.set(2,2,2,);

  // lights
  const blueLight = new THREE.DirectionalLight(0x0000ff, 100);
  const greenLight = new THREE.DirectionalLight(0x00ff00, 100);
  const redLight = new THREE.DirectionalLight(0xff0000, 100);
  blueLight.position.set(0, 1, 0);
  greenLight.position.set(1, 0, 0);
  redLight.position.set(0, 0, 1);
  scene.add(blueLight, greenLight, redLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;

  controls.screenSpacePanning = false;

  controls.minDistance = 1;
  controls.maxDistance = 100;
  window.addEventListener('resize', onWindowResize);
}

async function loadHDR() {
  const loader = new HDRLoader();
  const url = `${base}hdr/passendorf_snow_4k.hdr`;

  try {
    const envMap = await loader.loadAsync(url);

    envMap.mapping = THREE.EquirectangularReflectionMapping;

    // Ympäristön valaistus ja heijastukset
    scene.environment = envMap;

    // Näkyvä taustakuva
    scene.background = envMap;

    console.log('HDR loaded');
  } catch (error) {
    console.error('HDR loading failed:', error);
  }
}

async function loadModel(url) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);

  try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    scene.add(model);
    console.log('Model loaded:', model);
    return model;
  } catch (error) {
    console.error('Model loading failed:', error);
  }
}

function animate(time) {
  //cube.rotation.x = time / 2000;
  //cube.rotation.y = time / 1000;
  controls.update();
  render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderer.render(scene, camera);
}

init();
loadHDR();
loadModel(`${base}models/spruce-tree/spruce-tree.glb`).then((model) => {
  model.position.set(2, 0, -2);
  moveObjectToGround(model);
});

loadModel(`${base}models/basking-alligator/basking-alligator.glb`).then(
  (model) => {
    model.position.set(-0, 0, 0);
    moveObjectToGround(model);
  },
);

console.log(scene);
