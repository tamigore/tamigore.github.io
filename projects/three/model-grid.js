import { THREE, GLTFLoader } from './three-deps.js';
import { applyTextureVariant, applyVariantTint } from './variants.js';

const DEFAULT_GRID = {
	rows: 3,
	columns: 3,
	rotationY: -Math.PI / 2,
	spacingFactor: 1.15,
	targetScaleRatio: 0.75,
};

async function loadModelAndTextures(loader, textureLoader, modelUrl, textureVariants = []) {
	const texturePromises = textureVariants.map(async (variant) => {
		if (!variant.path)
			return { ...variant, texture: null, status: 'missing-path' };
		try {
			const texture = await textureLoader.loadAsync(variant.path);
			if ('colorSpace' in texture)
				texture.colorSpace = THREE.SRGBColorSpace;
			else
				texture.encoding = THREE.sRGBEncoding;
			texture.flipY = false;
			texture.needsUpdate = true;
			return { ...variant, texture, status: 'loaded' };
		}
		catch (error) {
			console.warn('three-scene: failed to load texture', variant.path, error);
			return { ...variant, texture: null, status: 'error', error };
		}
	});

	const [gltf, texturePayload] = await Promise.all([
		loader.loadAsync(modelUrl),
		Promise.all(texturePromises),
	]);

	return { gltf, texturePayload };
}

function getSourceScene(gltf) {
	const sourceScene = gltf.scene || gltf.scenes?.[0];
	if (!sourceScene)
		throw new Error('GLB has no default scene');
	return sourceScene;
}

function rotateReferenceCubeUVs(sourceScene) {
	sourceScene.traverse((node) => {
		if (!node.isMesh || node.name !== 'Cube037' || !node.geometry)
			return;
		node.geometry = node.geometry.clone();
		const geom = node.geometry;
		const uvAttr = geom.getAttribute('uv2') || geom.getAttribute('uv');
		if (!uvAttr)
			return;
		const min = new THREE.Vector2(Infinity, Infinity);
		const max = new THREE.Vector2(-Infinity, -Infinity);
		const temp = new THREE.Vector2();
		for (let i = 0; i < uvAttr.count; i++) {
			temp.fromBufferAttribute(uvAttr, i);
			if (!Number.isFinite(temp.x) || !Number.isFinite(temp.y))
				continue;
			min.x = Math.min(min.x, temp.x);
			min.y = Math.min(min.y, temp.y);
			max.x = Math.max(max.x, temp.x);
			max.y = Math.max(max.y, temp.y);
		}
		if (!Number.isFinite(min.x) || !Number.isFinite(min.y) || !Number.isFinite(max.x) || !Number.isFinite(max.y))
			return;
		const span = new THREE.Vector2(max.x - min.x, max.y - min.y);
		if (span.x <= 1e-5 || span.y <= 1e-5)
			return;
		const rotated = new Float32Array(uvAttr.count * 2);
		for (let i = 0; i < uvAttr.count; i++) {
			temp.fromBufferAttribute(uvAttr, i);
			const uNorm = (temp.x - min.x) / span.x;
			const vNorm = (temp.y - min.y) / span.y;
			const uRot = vNorm;
			const vRot = 1 - uNorm;
			rotated[i * 2] = uRot;
			rotated[i * 2 + 1] = vRot;
		}
		const rotatedAttr = new THREE.BufferAttribute(rotated, 2);
		geom.setAttribute('uv', rotatedAttr);
		if (geom.getAttribute('uv2'))
			geom.setAttribute('uv2', rotatedAttr.clone());
	});
}

function computeModelBounds(sourceScene) {
	sourceScene.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(sourceScene);
	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
	return { box, size, center, maxDim };
}

function configureLabelFactory(sourceScene, modelBounds, labelFactory) {
	if (!labelFactory?.setLabelMeta)
		return;
	const center = modelBounds?.center;
	const labelNode = sourceScene.getObjectByName('Cube037');
	if (!labelNode || !labelNode.isMesh || !center)
		return;
	labelNode.updateWorldMatrix(true, false);
	const labelBox = new THREE.Box3().setFromObject(labelNode);
	const labelCenterWorld = labelBox.getCenter(new THREE.Vector3());
	const labelSizeWorld = labelBox.getSize(new THREE.Vector3());
	const offset = labelCenterWorld.clone().sub(center);
	let axis = 'x';
	let thickness = labelSizeWorld.x;
	if (labelSizeWorld.y < thickness) {
		axis = 'y';
		thickness = labelSizeWorld.y;
	}
	if (labelSizeWorld.z < thickness) {
		axis = 'z';
		thickness = labelSizeWorld.z * 0.1;
	}
	let normalSign = Math.sign(offset[axis]);
	if (!normalSign)
		normalSign = 1;
	let labelMeta = {
		offset,
		size: labelSizeWorld,
		axis,
		normalSign,
		thickness,
	};
	if (modelBounds) {
		const topOffset = new THREE.Vector3(0, labelMeta.size.y * 0.75, 0);
		labelMeta = {
			...labelMeta,
			axis: 'x',
			normalSign: 1,
			thickness: labelMeta.size.y,
			offset: topOffset,
		};
	}
	labelMeta.sizeScale = 1.25;
	labelFactory.setLabelMeta(labelMeta);
}

function ensureStandardMaterial(mat) {
	const params = {};
	if (mat.map) {
		if ('colorSpace' in mat.map)
			mat.map.colorSpace = THREE.SRGBColorSpace;
		else
			mat.map.encoding = THREE.sRGBEncoding;
		params.map = mat.map;
	}
	if (mat.normalMap)
		params.normalMap = mat.normalMap;
	if (mat.aoMap)
		params.aoMap = mat.aoMap;
	if (mat.roughnessMap)
		params.roughnessMap = mat.roughnessMap;
	if (mat.metalnessMap)
		params.metalnessMap = mat.metalnessMap;
	params.color = mat.color && mat.color.isColor ? mat.color.clone() : new THREE.Color(0xdddddd);
	if (mat.vertexColors)
		params.vertexColors = mat.vertexColors;
	if (mat.skinning)
		params.skinning = mat.skinning;
	params.metalness = typeof mat.metalness === 'number' ? mat.metalness : 0.2;
	params.roughness = typeof mat.roughness === 'number' ? mat.roughness : 0.6;
	const newMat = new THREE.MeshStandardMaterial(params);
	if (mat && typeof mat.name === 'string')
		newMat.name = mat.name;
	newMat.needsUpdate = true;
	return newMat;
}

function convertSceneMaterialsToStandard(sourceScene) {
	sourceScene.traverse((node) => {
		if (!node.isMesh)
			return;
		const oldMat = node.material;
		try {
			if (Array.isArray(oldMat))
				node.material = oldMat.map((m) => (m && m.isMeshStandardMaterial ? m : ensureStandardMaterial(m || {})));
			else
				node.material = oldMat && oldMat.isMeshStandardMaterial ? oldMat : ensureStandardMaterial(oldMat || {});
		}
		catch (err) {
			console.warn('material conversion failed for node', node.name, err);
		}
	});
}

function prepareInstance(sourceScene, center) {
	const instance = sourceScene.clone(true);
	if (center)
		instance.position.sub(center.clone());
	instance.traverse((node) => {
		if (!node.isMesh)
			return;
		const mat = node.material;
		if (Array.isArray(mat))
			node.material = mat.map((m) => (m ? m.clone() : new THREE.MeshStandardMaterial()));
		else
			node.material = mat ? mat.clone() : new THREE.MeshStandardMaterial();
		const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
		nodeMaterials.forEach((material) => {
			if (!material)
				return;
			if (material.map) {
				if ('colorSpace' in material.map)
					material.map.colorSpace = THREE.SRGBColorSpace;
				else
					material.map.encoding = THREE.sRGBEncoding;
			}
			material.needsUpdate = true;
		});
	});
	return instance;
}

function attachLabelMeshes(wrapper, variant, labelFactory) {
	if (!labelFactory?.createLabelMesh)
		return { frontLabelMesh: null, backLabelMesh: null };
	const labelMeta = labelFactory.getLabelMeta?.() || null;
	const frontLabelMesh = labelFactory.createLabelMesh(variant.label, {
		offset: labelMeta ? labelMeta.offset.clone().sub(new THREE.Vector3(0.3, 0, 0)) : new THREE.Vector3(),
	});
	const backOffset = labelMeta
		? labelMeta.offset.clone().sub(new THREE.Vector3(-0.45, 0.2, 0))
		: new THREE.Vector3();
	const backLabelMesh = labelFactory.createLabelMesh(variant.description, {
		normalSign: -((labelMeta?.normalSign) || 1),
		mirrored: true,
		offset: backOffset,
		multiline: true,
		maxLines: 6,
		anchorVertical: 'top',
		fontSize: 42,
	});
	if (frontLabelMesh)
		wrapper.add(frontLabelMesh);
	if (backLabelMesh)
		wrapper.add(backLabelMesh);
	return { frontLabelMesh, backLabelMesh };
}

function createGridWrappers({ sourceScene, texturePayload, finalGrid, scene, center, labelFactory }) {
	const wrappers = [];
	const fallbackVariant = texturePayload[0] || { texture: null, key: 'fallback', label: 'Fallback' };
	const totalCells = finalGrid.rows * finalGrid.columns;
	for (let idx = 0; idx < totalCells; idx++) {
		const variant = texturePayload[idx] || fallbackVariant;
		const row = Math.floor(idx / finalGrid.columns);
		const column = idx % finalGrid.columns;
		const instance = prepareInstance(sourceScene, center);
		const wrapper = new THREE.Group();
		applyTextureVariant(instance, variant);
		applyVariantTint(instance, variant);
		wrapper.add(instance);
		wrapper.userData = wrapper.userData || {};
		wrapper.userData.variant = variant;
		const { frontLabelMesh, backLabelMesh } = attachLabelMeshes(wrapper, variant, labelFactory);
		scene.add(wrapper);
		wrappers.push({
			wrapper,
			instance,
			column,
			row,
			variant,
			frontLabel: frontLabelMesh,
			backLabel: backLabelMesh,
		});
	}
	return wrappers;
}

function createLayoutModels({ container, finalGrid, camera, renderer, modelBounds, wrappers }) {
	return function layoutModels() {
		const w = container.clientWidth;
		const h = container.clientHeight;
		const cellW = w / finalGrid.columns;
		const cellH = h / finalGrid.rows;
		const targetPixels = Math.min(cellW, cellH) * finalGrid.targetScaleRatio;
		const fovRad = (camera.fov * Math.PI) / 180;
		let distance = Math.max(2, camera.position.z);
		let scaleFactor = 1;
		const maxIterations = 4;
		const modelMaxDim = modelBounds?.maxDim || 1;

		for (let it = 0; it < maxIterations; it++) {
			const worldHeightAtDistance = 2 * distance * Math.tan(fovRad / 2);
			const worldUnitsPerPixel = worldHeightAtDistance / h;
			scaleFactor = (targetPixels * worldUnitsPerPixel) / modelMaxDim;
			const scaledDiameter = modelMaxDim * scaleFactor;
			const gridWorldHeight = scaledDiameter * finalGrid.rows * finalGrid.spacingFactor;
			const newDistance = gridWorldHeight / (2 * Math.tan(fovRad / 2));
			distance = distance * 0.5 + newDistance * 0.5;
		}

		const scaledDiameter = modelMaxDim * scaleFactor;
		const cellWorldSize = scaledDiameter * finalGrid.spacingFactor;
		let idx = 0;
		for (let row = 0; row < finalGrid.rows; row++) {
			for (let column = 0; column < finalGrid.columns; column++) {
				const entry = wrappers[idx++];
				if (!entry)
					continue;
				const { wrapper, variant } = entry;
				wrapper.scale.setScalar(scaleFactor);
				const x = (column - (finalGrid.columns - 1) / 2) * cellWorldSize;
				const y = (((finalGrid.rows - 1) / 2) - row) * cellWorldSize;
				wrapper.position.set(x, y, 0);
				wrapper.rotation.set(0, finalGrid.rotationY, 0);
				wrapper.userData = wrapper.userData || {};
				wrapper.userData.variant = variant;
				wrapper.userData.baseRotationY = wrapper.rotation.y;
				wrapper.userData.targetRotationY = wrapper.rotation.y;
				wrapper.userData.hovered = false;
				wrapper.userData.isGridWrapper = true;
				wrapper.userData.toggled = false;
			}
		}

		camera.position.set(0, 0, distance * 1.02);
		camera.lookAt(0, 0, 0);
		renderer.setSize(w, h, false);
	};
}

export async function buildModelGrid({
	scene,
	camera,
	renderer,
	container,
	modelUrl,
	textureVariants,
	loadingManager,
	labelFactory,
	gridConfig = {},
	loaderEl,
}) {
	const finalGrid = { ...DEFAULT_GRID, ...gridConfig };
	let wrappers = [];
	const loader = new GLTFLoader(loadingManager);
	const textureLoader = new THREE.TextureLoader(loadingManager);

	try {
		const { gltf, texturePayload } = await loadModelAndTextures(loader, textureLoader, modelUrl, textureVariants);
		const sourceScene = getSourceScene(gltf);
		rotateReferenceCubeUVs(sourceScene);
		const modelBounds = computeModelBounds(sourceScene);
		configureLabelFactory(sourceScene, modelBounds, labelFactory);
		convertSceneMaterialsToStandard(sourceScene);
		wrappers = createGridWrappers({
			sourceScene,
			texturePayload,
			finalGrid,
			scene,
			center: modelBounds.center,
			labelFactory,
		});
		const layoutModels = createLayoutModels({ container, finalGrid, camera, renderer, modelBounds, wrappers });
		layoutModels();
		if (loaderEl)
			loaderEl.classList.add('hidden');
		container._layoutModels = layoutModels;
		container._loadedTextures = texturePayload;

		return { wrappers, layoutModels, textures: texturePayload };
	}
	catch (err) {
		if (loaderEl) {
			loaderEl.classList.remove('hidden');
			const textEl = loaderEl.querySelector('.three-loader-text');
			if (textEl)
				textEl.textContent = 'Failed to load model or textures';
		}
		throw err;
	}
}
