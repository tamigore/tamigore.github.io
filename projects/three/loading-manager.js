import { THREE } from './three-deps.js';

export function createLoadingManager({ loaderEl, loaderPercentEl } = {}) {
	if (loaderPercentEl)
		loaderPercentEl.textContent = '0%';
	const loadingManager = new THREE.LoadingManager();

	loadingManager.onStart = () => {
		if (loaderEl)
			loaderEl.classList.remove('hidden');
		if (loaderPercentEl)
			loaderPercentEl.textContent = '0%';
	};

	loadingManager.onProgress = (itemUrl, loaded, total) => {
		if (!loaderPercentEl)
			return;
		if (!total) {
			loaderPercentEl.textContent = '...';
			return;
		}
		const pct = Math.min(100, Math.round((loaded / total) * 100));
		loaderPercentEl.textContent = `${pct}%`;
	};

	loadingManager.onLoad = () => {
		if (loaderPercentEl)
			loaderPercentEl.textContent = '100%';
	};

	loadingManager.onError = () => {
		if (loaderEl)
			loaderEl.classList.remove('hidden');
		if (loaderPercentEl)
			loaderPercentEl.textContent = 'Error';
	};

	return loadingManager;
}
