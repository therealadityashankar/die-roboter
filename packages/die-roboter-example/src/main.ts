// Import from the local copy of the robot files
import { SO101 } from './robots/SO101';
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

function animate() {
  renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );

document.addEventListener('DOMContentLoaded', async () => {
  // Create a new SO101 robot
  const robot = new SO101();
  await robot.load();
  scene.add(robot)
});
