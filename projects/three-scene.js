// Minimal three.js demo (module) — now loads a GLB model instead of the cube
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById('three-container');

if (!container)
	console.warn('three-scene: container not found');
else {
	const scene = new THREE.Scene();

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(container.clientWidth, container.clientHeight, false);
	// `outputEncoding` was removed in newer three.js versions. Use `outputColorSpace` instead.
	// Map the previous sRGB encoding to the new SRGB color space constant.
	if ('outputColorSpace' in renderer) // modern API
		renderer.outputColorSpace = THREE.SRGBColorSpace;
	else // fallback for older releases that still support outputEncoding
		renderer.outputEncoding = THREE.sRGBEncoding;
	container.appendChild(renderer.domElement);

	const fov = 50;
	const aspect = container.clientWidth / container.clientHeight;
	const camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1000);
	camera.position.set(0, 0, 3.5);

	// Lights
	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);
	const dir = new THREE.DirectionalLight(0xffffff, 0.9);
	dir.position.set(5, 5, 5);
	const dir3 = new THREE.DirectionalLight(0xffffff, 0.9);
	dir3.position.set(-5, 5, 5);
	const dir2 = new THREE.DirectionalLight(0xffffff, 0.9);
	dir2.position.set(-5, 5, -5);
	const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
	dir1.position.set(5, 5, -5);
	scene.add(dir);
	scene.add(dir1);
	scene.add(dir2);
	scene.add(dir3);

	// loader
	const loader = new GLTFLoader();
	// relative to projects/index.html -> assets is one level up
	const modelUrl = '../assets/3D/Raytracer.glb';
	// Array of model URLs for each grid cell (3x3 = 9).
	const modelUrls = [
		'../assets/3D/H42N42.glb',
		'../assets/3D/BeyondBad.glb',
		'../assets/3D/Turing.glb',
		'../assets/3D/Malloc.glb',
		'../assets/3D/Raytracer.glb',
		'../assets/3D/ETZ.glb',
		'../assets/3D/Minecraft.glb',
		'../assets/3D/LonelyBot.glb',
		'../assets/3D/Leaffliction.glb',
	];
	// expose for runtime inspection or later dynamic swapping
	container._modelUrls = modelUrls;

	// store wrappers for the 3x3 grid so we can update them on resize
	const wrappers = [];
	let originalBox = null;
	let originalSize = null;
	let originalCenter = null;

	// loader UI elements (optional)
	const loaderEl = container.querySelector('.three-loader');
	const loaderPercentEl = loaderEl?.querySelector('.three-loader-percent');

	// helper: try loading from a list of URLs sequentially until one succeeds
	function tryLoadModel(urls, onProgress, onSuccess, onError) {
		const list = Array.isArray(urls) ? urls.slice() : [urls];
		const attempts = [];
		const tryNext = () => {
			if (!list.length) {
				const err = new Error('no model URLs left');
				err.attempts = attempts;
				if (onError) onError(err);
				return;
			}
			const u = list.shift();
			console.info('three-scene: attempting to load model', u);
			loader.load(u, (gltf) => onSuccess(gltf, u), onProgress, (err) => {
				attempts.push({ url: u, status: err?.target?.status || null, message: err.message || String(err) });
				console.warn('three-scene: failed to load', u, { status: err?.target?.status || null, message: err.message || String(err) });
				// show a small debug panel listing attempted URLs and statuses to help diagnose
				try {
					const panel = document.createElement('div');
					panel.className = 'model-debug';
					panel.style = 'position:fixed;left:12px;bottom:12px;right:12px;max-height:40vh;overflow:auto;background:rgba(0,0,0,0.85);color:#fff;padding:12px;border-radius:8px;z-index:99999;font-family:monospace;font-size:13px;';
					const title = document.createElement('div');
					title.textContent = 'Model load attempts';
					title.style = 'font-weight:700;margin-bottom:8px;';
					panel.appendChild(title);
					if (!attempts.length) {
						const p = document.createElement('div');
						p.textContent = 'No attempts recorded';
						panel.appendChild(p);
					} else {
						attempts.forEach(a => {
							const row = document.createElement('div');
							row.style = 'margin-bottom:6px;';
							const url = document.createElement('div');
							url.textContent = a.url || '<unknown>';
							url.style = 'color:#9bd;';
							const msg = document.createElement('div');
							msg.textContent = `status: ${a.status || 'n/a'} message: ${a.message || ''}`;
							msg.style = 'color:#ccc;font-size:12px;';
							row.appendChild(url);
							row.appendChild(msg);
							panel.appendChild(row);
						});
					}
					const close = document.createElement('button');
					close.textContent = 'Close';
					close.style = 'position:absolute;top:6px;right:8px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer;';
					close.addEventListener('click', () => panel.remove());
					panel.appendChild(close);
					document.body.appendChild(panel);
				} catch (e) {
					console.warn('three-scene: failed to render debug panel', e);
				}
				// try next URL
				tryNext();
			});
		};
		// quick sanity: if served via file:// it's unlikely XHR will work
		if (typeof location !== 'undefined' && location.protocol === 'file:') {
			console.warn('three-scene: page is served via file:// — please run a local HTTP server so GLTFLoader can fetch .glb files (e.g. python -m http.server)');
		}
		tryNext();
	}

	// Load one model per grid cell using `modelUrls`. Missing entries fall back to
	// the default `modelUrl`. We load each unique URL once and clone per tile.
	(async () => {
		try {
			const urls = modelUrls.map(u => u || modelUrl);
			const unique = Array.from(new Set(urls));
			const loaded = Object.create(null);

			// load each unique URL
			for (const u of unique) {
				try {
					const g = await loader.loadAsync(u);
					loaded[u] = g;
					console.info('three-scene: loaded', u);
				} catch (e) {
					console.warn('three-scene: failed to load', u, e);
					loaded[u] = null;
				}
			}

			// find first successfully loaded GLTF to use as a fallback if some entries failed
			const firstLoaded = unique.map(u => loaded[u]).find(Boolean);
			if (!firstLoaded) {
				const err = new Error('no model URLs loaded');
				throw err;
			}

			// prepare per-cell source, bounding info and compute global maxDim
			const perCell = urls.map((u) => {
				const g = loaded[u] || firstLoaded;
				const src = g.scene || g.scenes?.[0];
				const box = new THREE.Box3().setFromObject(src);
				const size = box.getSize(new THREE.Vector3());
				const center = box.getCenter(new THREE.Vector3());
				const maxd = Math.max(size.x, size.y, size.z);
				return { g, src, box, size, center, maxd };
			});

			const maxDim = perCell.reduce((m, c) => Math.max(m, c.maxd || 1), 1);

			// material conversion per source (ensure standard materials and proper encodings)
			perCell.forEach(({ src }) => {
				src.traverse((node) => {
					if (!node.isMesh) return;
					const oldMat = node.material;
					const ensureStandard = (mat) => {
						const params = {};
						if (mat.map) { mat.map.encoding = THREE.sRGBEncoding; params.map = mat.map; }
						if (mat.normalMap) params.normalMap = mat.normalMap;
						if (mat.aoMap) params.aoMap = mat.aoMap;
						if (mat.roughnessMap) params.roughnessMap = mat.roughnessMap;
						if (mat.metalnessMap) params.metalnessMap = mat.metalnessMap;
						params.color = (mat.color && mat.color.isColor) ? mat.color.clone() : new THREE.Color(0xdddddd);
						if (mat.vertexColors) params.vertexColors = mat.vertexColors;
						if (mat.skinning) params.skinning = mat.skinning;
						params.metalness = (typeof mat.metalness === 'number') ? mat.metalness : 0.2;
						params.roughness = (typeof mat.roughness === 'number') ? mat.roughness : 0.6;
						const newMat = new THREE.MeshStandardMaterial(params);
						newMat.needsUpdate = true;
						return newMat;
					};

					try {
						if (Array.isArray(oldMat)) node.material = oldMat.map(ensureStandard);
						else node.material = (oldMat && oldMat.isMeshStandardMaterial) ? oldMat : ensureStandard(oldMat || {});
					} catch (err) {
						console.warn('material conversion failed for node', node.name, err);
					}
				});
			});

			// create instances for each cell using its mapped source
			for (let idx = 0; idx < 9; idx++) {
				const j = Math.floor(idx / 3);
				const i = idx % 3;
				const info = perCell[idx];
				const source = info.src;
				const instance = source.clone(true);
				const wrapper = new THREE.Group();

				// center per-instance
				instance.position.sub(info.center);

				// clone materials per instance and ensure texture encodings are correct
				instance.traverse((node) => {
					if (!node.isMesh) return;
					const mat = node.material;
					if (Array.isArray(mat)) node.material = mat.map((m) => (m ? m.clone() : new THREE.MeshStandardMaterial()));
					else node.material = mat ? mat.clone() : new THREE.MeshStandardMaterial();
					const nodeMatArray = Array.isArray(node.material) ? node.material : [node.material];
					nodeMatArray.forEach((nm) => { if (nm && nm.map) nm.map.encoding = THREE.sRGBEncoding; if (nm) nm.needsUpdate = true; });
				});

				wrapper.add(instance);
				scene.add(wrapper);
				wrappers.push({ wrapper, instance, i, j });
			}

			// layout function uses the computed maxDim
			function layoutModels() {
				const w = container.clientWidth;
				const h = container.clientHeight;

				// cell size in pixels (3 columns / rows)
				const cellW = w / 3;
				const cellH = h / 3;
				const targetPixels = Math.min(cellW, cellH) * 0.75; // occupy ~75% of cell

				// iterative solve to find a scaleFactor (world units per model unit) and camera distance
				const fovRad = (camera.fov * Math.PI) / 180;
				let distance = Math.max(2, camera.position.z);
				let scaleFactor = 1;
				const maxIterations = 4;
				const modelMaxDim = maxDim > 0 ? maxDim : 1;

				for (let it = 0; it < maxIterations; it++) {
					const worldHeightAtDistance = 2 * distance * Math.tan(fovRad / 2);
					const worldUnitsPerPixel = worldHeightAtDistance / h;

					// scale so model's max dimension maps to targetPixels in screen space
					scaleFactor = (targetPixels * worldUnitsPerPixel) / modelMaxDim;
					const scaledDiameter = modelMaxDim * scaleFactor;

					// grid world height (3 models stacked) plus a small gap factor
					const gridWorldHeight = scaledDiameter * 3 * 1.15;

					// compute distance so the grid fits vertically in the fov
					const newDistance = gridWorldHeight / (2 * Math.tan(fovRad / 2));
					// damp updates for stability
					distance = distance * 0.5 + newDistance * 0.5;
				}

				// apply computed scale & positions
				const scaledDiameter = modelMaxDim * scaleFactor;
				const cellWorldSize = scaledDiameter * 1.15; // spacing between centers

				let idx = 0;
				const horizontalNb = 3;
				const verticalNb = 3;
				for (let j = 0; j < verticalNb; j++) {
					for (let i = 0; i < horizontalNb; i++) {
						const entry = wrappers[idx++];
						const wrapper = entry.wrapper;
						// set uniform scale
						wrapper.scale.setScalar(scaleFactor);

						// center grid at origin, compute x,y positions
						const x = (i - 1) * cellWorldSize;
						const y = (1 - j) * cellWorldSize; // invert y so top row is positive
						wrapper.position.set(x, y, 0);
						// set a default facing rotation so models look forward; store base rotation
						wrapper.rotation.set(0, -Math.PI / 2, 0);
						if (!wrapper.userData) wrapper.userData = {};
						wrapper.userData.baseRotationY = wrapper.rotation.y;
						wrapper.userData.targetRotationY = wrapper.rotation.y;
						wrapper.userData.hovered = false;
						wrapper.userData.isGridWrapper = true;
						// ensure no stale toggle state remains (we use hover to control flip)
						wrapper.userData.toggled = false;
						// apply per-instance material tweaks: clone materials were created at load time,
						// now tweak color/metalness/roughness per tile
						// no per-instance color tinting — preserve original material colors and maps
					}
				}

				// position camera to look at the center of the grid
				camera.position.set(0, 0, distance * 1.02);
				camera.lookAt(0, 0, 0);
				renderer.setSize(w, h, false);
			}

			// run initial layout
			layoutModels();

			// hide loader UI
			if (loaderEl) loaderEl.classList.add('hidden');

			// expose layoutModels for resize handler
			container._layoutModels = layoutModels;
		} catch (err) {
			console.error('three-scene: failed to load models', err);
			if (loaderEl) {
				loaderEl.classList.remove('hidden');
				loaderEl.querySelector('.three-loader-text').textContent = 'Failed to load model(s)';
			}
		}
	})();

	// handle resize
	const onResize = () => {
		const w = container.clientWidth;
		const h = container.clientHeight;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		// if the layoutModels function exists (after model loaded) call it so scale/positions
		// and camera distance are recalculated to fit the 3x3 grid. Otherwise just resize renderer.
		if (typeof container._layoutModels === 'function')
			container._layoutModels();
		else
			renderer.setSize(w, h, false);
	};

	window.addEventListener('resize', onResize, { passive: true });

	// Raycast-based hover handling: rotate a model 180deg on Y while hovered
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	// Hover toggles persistent flipped state for the model under pointer.
	function onPointerMoveToggle(e) {
		const r = container.getBoundingClientRect();
		pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
		pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
		raycaster.setFromCamera(pointer, camera);
		const intersects = raycaster.intersectObjects(scene.children, true);
		if (!intersects.length) return;
		let node = intersects[0].object;
		let foundWrapper = null;
		while (node) {
			if (node.userData && node.userData.isGridWrapper) {
				foundWrapper = node;
				break;
			}
			node = node.parent;
		}
		if (!foundWrapper) return;
		if (Math.abs(foundWrapper.rotation.y - foundWrapper.userData.targetRotationY) > 0.02) return;

		// toggle persisted state
		const isToggled = !!foundWrapper.userData.toggled;
		if (isToggled) {
			foundWrapper.userData.toggled = false;
			// if not hovered, return to base rotation; if hovered, keep flipped until leave
			if (!foundWrapper.userData.hovered) {
				foundWrapper.userData.targetRotationY = foundWrapper.userData.baseRotationY;
			} else {
				foundWrapper.userData.targetRotationY = foundWrapper.userData.baseRotationY + Math.PI;
			}
		} else {
			foundWrapper.userData.toggled = true;
			foundWrapper.userData.targetRotationY = foundWrapper.userData.baseRotationY + Math.PI;
		}
	}

	container.addEventListener('pointermove', onPointerMoveToggle);
	// container.addEventListener('pointerdown', onPointerDownToggle);

	// animation
	let mouseX = 0;
	let mouseY = 0;
	const clock = new THREE.Clock();

	function animate() {
		const t = clock.getElapsedTime();
		// update per-wrapper rotations toward targetRotationY (smooth)
		for (let k = 0; k < wrappers.length; k++) {
			const wrapper = wrappers[k].wrapper;
			const target = wrapper.userData?.targetRotationY ?? wrapper.rotation.y;
			const delta = target - wrapper.rotation.y;
			wrapper.rotation.y += delta * 0.12;
		}

		// subtle camera movement
		camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.04;
		camera.position.y += (-mouseY * 0.6 - camera.position.y) * 0.04;
		camera.lookAt(0, 0, 0);

		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}

	// init
	requestAnimationFrame(animate);

	// initial sizing
	onResize();
}
