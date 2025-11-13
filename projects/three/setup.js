import { THREE } from './three-deps.js';

export function createScene() {
	return new THREE.Scene();
}

export function createRenderer(container) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(container.clientWidth, container.clientHeight, false);
	if ('outputColorSpace' in renderer)
		renderer.outputColorSpace = THREE.SRGBColorSpace;
	else
		renderer.outputEncoding = THREE.sRGBEncoding;
	container.appendChild(renderer.domElement);
	return renderer;
}

export function createCamera(container, fov = 50) {
	const aspect = container.clientWidth / container.clientHeight;
	const camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1000);
	camera.position.set(0, 0, 3.5);
	return camera;
}

export function addDefaultLights(scene) {
	const lights = [];
	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);
	lights.push(ambient);
	const positions = [
		[5, 5, 5],
		[5, 5, -5],
		[-5, 5, -5],
		[-5, 5, 5],
	];
	for (const pos of positions) {
		const light = new THREE.DirectionalLight(0xffffff, 0.9);
		light.position.set(...pos);
		scene.add(light);
		lights.push(light);
	}
	return lights;
}
