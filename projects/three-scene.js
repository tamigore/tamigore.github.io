import { loadConfig } from './three/config.js';
import { createScene, createRenderer, createCamera, addDefaultLights } from './three/setup.js';
import { createLoadingManager } from './three/loading-manager.js';
import { createLabelFactory } from './three/label-factory.js';
import { buildModelGrid } from './three/model-grid.js';
import { setupPointerToggle } from './three/interactions.js';
import { startAnimationLoop } from './three/animation.js';

const container = document.getElementById('three-container');

if (!container) {
	console.warn('three-scene: container not found');
}
else {
	(async () => {
		let config;
		try {
			config = await loadConfig();
		}
		catch (err) {
			console.error('three-scene: failed to load config.json', err);
			return;
		}

		const { modelUrl, textureVariants, gridConfig } = config;
		const scene = createScene();
		const renderer = createRenderer(container);
		const camera = createCamera(container);
		addDefaultLights(scene);

		container._textureVariants = textureVariants;

		if (typeof location !== 'undefined' && location.protocol === 'file:')
			console.warn('three-scene: page is served via file:// — please run a local HTTP server so GLTFLoader and textures can be fetched (e.g. python -m http.server)');

		const loaderEl = container.querySelector('.three-loader');
		const loaderPercentEl = loaderEl?.querySelector('.three-loader-percent');
		const loadingManager = createLoadingManager({ loaderEl, loaderPercentEl });
		const labelFactory = createLabelFactory({ renderer });

		let pointerCleanup = null;

		const onResize = () => {
			const w = container.clientWidth || 1;
			const h = container.clientHeight || 1;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			if (typeof container._layoutModels === 'function')
				container._layoutModels();
			else
				renderer.setSize(w, h, false);
		};

		try {
			const { wrappers } = await buildModelGrid({
				scene,
				camera,
				renderer,
				container,
				modelUrl,
				textureVariants,
				loadingManager,
				labelFactory,
				gridConfig,
				loaderEl,
			});

			const animationApi = startAnimationLoop({ camera, scene, renderer, wrappers });
			pointerCleanup = setupPointerToggle({
				container,
				camera,
				scene,
			});

			onResize();
		}
		catch (err) {
			console.error('three-scene: failed to load shared model', err);
			return;
		}

		window.addEventListener('resize', onResize, { passive: true });

		const cleanup = () => {
			window.removeEventListener('resize', onResize);
			if (pointerCleanup)
				pointerCleanup();
		};

		container._threeCleanup = cleanup;
	})();
}
