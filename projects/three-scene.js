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
	const loadingManager = new THREE.LoadingManager();
	const loader = new GLTFLoader(loadingManager);
	const textureLoader = new THREE.TextureLoader(loadingManager);
	// relative to projects/index.html -> assets is one level up
	const modelUrl = '../assets/3D/GBA-SP-Game.glb';
	const textureVariants = [
		{ key: 'H42N42', label: 'H42N42', description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec fringilla, mauris ut mattis tristique, felis risus fringilla mi, nec semper ante ante a velit. Pellentesque blandit sapien in nibh bibendum, a malesuada nunc ornare.", path: '../assets/3D/Textures/H42N42.png', tintHex: '#1eff00' },
		{ key: 'BeyondBad', label: 'Beyond Bad', description: "efj eiwfjiweoj fpoe hfper hgap erghrioe jgaoe gjoeiarjger gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/BeyondBad.png', tintHex: '#cc3366' },
		{ key: 'Turing', label: 'Turing', description: "eiwfjiweoj fpoe hfper hgap erghrioe jgaoe gjoeiarjger gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/Turing.jpg', tintHex: '#dd9e2f' },
		{ key: 'Malloc', label: 'Malloc', description: "fpoe hfper hgap erghrioe jgaoe gjoeiarjger gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/Malloc.jpg', tintHex: '#7756c7' },
		{ key: 'Raytracer', label: 'Raytracer', description: "hgap erghrioe jgaoe gjoeiarjger gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/RT.jpg', tintHex: '#c5c5c5ff' },
		{ key: 'ETZ', label: 'ETZ', description: "jgaoe gjoeiarjger gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/ETZ.png', tintHex: '#4d6aff' },
		{ key: 'Minecraft', label: 'Minecraft', description: "gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/Minecraft.jpg', tintHex: '#e05f2a' },
		{ key: 'LonelyBot', label: 'Lonely Bot', description: "gjeiorgjeiog jaeroig jeraoigj oigjer agjear g", path: '../assets/3D/Textures/LonelyBot.png', tintHex: '#25e4da' },
		{ key: 'Leaffliction', label: 'Leaffliction', description: "agjear g", path: '../assets/3D/Textures/Leaffliction.jpg', tintHex: '#99e641' },
	];
	container._textureVariants = textureVariants;

	if (typeof location !== 'undefined' && location.protocol === 'file:')
		console.warn('three-scene: page is served via file:// — please run a local HTTP server so GLTFLoader and textures can be fetched (e.g. python -m http.server)');

	// store wrappers for the 3x3 grid so we can update them on resize
	const wrappers = [];
	let modelBounds = null;
	let labelMeta = null;
	const labelTextures = new Map();
	const labelGeometries = Object.create(null);

	// loader UI elements (optional)
	const loaderEl = container.querySelector('.three-loader');
	const loaderPercentEl = loaderEl?.querySelector('.three-loader-percent');
	if (loaderPercentEl)
		loaderPercentEl.textContent = '0%';

	// keep loader element in sync with loading manager progress
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

	const mirrorTextureX = (texture) => {
		if (!texture) return null;
		texture.userData = texture.userData || {};
		if (!texture.userData._mirroredX) {
			texture.wrapS = THREE.RepeatWrapping;
			const nextRepeat = texture.repeat?.x || 1;
			texture.repeat.x = -Math.abs(nextRepeat);
			texture.offset.x = 1 - (texture.offset?.x || 0);
			texture.needsUpdate = true;
			texture.userData._mirroredX = true;
		}
		return texture;
	};

	const applyTextureVariant = (group, variant) => {
		if (!variant) return;
		const texture = mirrorTextureX(variant.texture || null);
		group.traverse((node) => {
			if (!node.isMesh || node.name !== 'Cube037') return;
			const materials = Array.isArray(node.material) ? node.material : [node.material];
			materials.forEach((mat) => {
				if (!mat) return;
				if (texture) {
					mat.map = texture;
					mat.needsUpdate = true;
				} else if (mat.map) {
					mat.map = null;
					mat.needsUpdate = true;
				}
			});
		});
	};

	const applyVariantTint = (group, variant) => {
		if (!variant || !variant.tintHex) return;
		const targetColor = new THREE.Color();
		try {
			targetColor.set(variant.tintHex);
		}
		catch (err) {
			console.warn('three-scene: invalid tintHex value', variant.tintHex, err);
			return;
		}
		group.traverse((node) => {
			if (!node.isMesh) return;
			const materials = Array.isArray(node.material) ? node.material : [node.material];
			materials.forEach((mat) => {
				if (!mat) return;
				if (mat.name === 'Translucent Plastic.009') {
					mat.color.copy(targetColor);
					mat.needsUpdate = true;
				}
			});
		});
	};

	const planeAxisMap = {
		x: { width: 'z', height: 'y' },
		y: { width: 'x', height: 'z' },
		z: { width: 'x', height: 'y' },
	};

	const getLabelMaterial = (text, options = {}) => {
		const effectiveText = (text == null || text === '') ? 'Untitled' : String(text);
		const multiline = !!options.multiline;
		const fontSize = 52;
		const lineHeightFactor = (options.lineHeightFactor && options.lineHeightFactor > 0) ? options.lineHeightFactor : 1.05;
		const desiredMaxLines = options.maxLines && options.maxLines > 0 ? options.maxLines : 4;
		const verticalAnchor = typeof options.anchorVertical === 'string' ? options.anchorVertical.toLowerCase() : 'center';
		const canvasWidth = 512;
		const canvasHeight = 256;
		const horizontalMargin = canvasWidth * 0.1;
		const verticalMargin = canvasHeight * 0.08;
		const targetWidth = canvasWidth - horizontalMargin * 2;
		const availableHeight = canvasHeight - verticalMargin * 2;
		const maxLinesByHeight = Math.max(1, Math.floor(availableHeight / (fontSize * lineHeightFactor)));
		const maxLines = multiline ? Math.max(1, Math.min(desiredMaxLines, maxLinesByHeight)) : 1;
		const cacheKey = `${multiline ? 'ml' : 'sg'}|${verticalAnchor}|${maxLines}|${fontSize}|${lineHeightFactor}|${effectiveText}`;
		if (labelTextures.has(cacheKey)) return labelTextures.get(cacheKey);
		const canvas = document.createElement('canvas');
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.textAlign = 'center';
		switch (verticalAnchor) {
			case 'top':
				ctx.textBaseline = 'top';
				break;
			case 'bottom':
				ctx.textBaseline = 'bottom';
				break;
			default:
				ctx.textBaseline = 'middle';
		}
		ctx.font = `700 ${fontSize}px "Pixeloid Sans", system-ui, sans-serif`;
		const wrapText = (textValue) => {
			const paragraphs = String(textValue).split(/\n+/).map((part) => part.trim()).filter(Boolean);
			const lines = [];
			for (const paragraph of paragraphs) {
				const words = paragraph.split(/\s+/);
				let current = '';
				for (const word of words) {
					const tentative = current ? `${current} ${word}` : word;
					const width = ctx.measureText(tentative).width;
					if (width <= targetWidth || !current) {
						current = tentative;
					}
					else {
						lines.push(current);
						current = word;
					}
				}
				if (current)
					lines.push(current);
			}
			if (!lines.length)
				lines.push(effectiveText);
			if (!multiline)
				return lines.slice(0, 1);
			if (lines.length > maxLines) {
				const trimmed = lines.slice(0, maxLines);
				const ellipsis = '...';
				let lastLine = trimmed[trimmed.length - 1] || '';
				while (lastLine.length && ctx.measureText(`${lastLine}${ellipsis}`).width > targetWidth)
					lastLine = lastLine.slice(0, -1);
				trimmed[trimmed.length - 1] = lastLine ? `${lastLine}${ellipsis}` : ellipsis;
				return trimmed;
			}
			return lines;
		};
		let lines = multiline ? wrapText(effectiveText) : [effectiveText];
		const ellipsis = '...';
		lines = lines.map((line) => {
			const trimmedLine = typeof line === 'string' ? line.trim() : '';
			if (!trimmedLine)
				return '';
			if (ctx.measureText(trimmedLine).width <= targetWidth)
				return trimmedLine;
			let base = trimmedLine.endsWith(ellipsis) ? trimmedLine.slice(0, -ellipsis.length) : trimmedLine;
			while (base.length && ctx.measureText(`${base}${ellipsis}`).width > targetWidth)
				base = base.slice(0, -1);
			return base ? `${base}${ellipsis}` : ellipsis;
		});
		ctx.fillStyle = '#f5f7ff';
		ctx.strokeStyle = 'rgba(12, 16, 32, 0.85)';
		ctx.lineWidth = Math.max(4, fontSize * 0.08);
		const centerX = canvas.width / 2;
		if (lines.length === 1 && verticalAnchor === 'center') {
			const midY = canvas.height / 2;
			ctx.strokeText(lines[0], centerX, midY + fontSize * 0.08);
			ctx.fillText(lines[0], centerX, midY);
		}
		else {
			if (verticalAnchor === 'top') {
				let y = verticalMargin;
				for (const line of lines) {
					ctx.strokeText(line, centerX, y + fontSize * 0.08);
					ctx.fillText(line, centerX, y);
					y += fontSize * lineHeightFactor;
				}
			}
			else if (verticalAnchor === 'bottom') {
				let y = canvas.height - verticalMargin;
				for (let idx = lines.length - 1; idx >= 0; idx--) {
					const line = lines[idx];
					ctx.strokeText(line, centerX, y + fontSize * 0.08);
					ctx.fillText(line, centerX, y);
					y -= fontSize * lineHeightFactor;
				}
			}
			else {
				const totalHeight = lines.length * fontSize * lineHeightFactor;
				let y = (canvas.height - totalHeight) / 2 + fontSize / 2;
				for (const line of lines) {
					ctx.strokeText(line, centerX, y + fontSize * 0.08);
					ctx.fillText(line, centerX, y);
					y += fontSize * lineHeightFactor;
				}
			}
		}
		const texture = new THREE.CanvasTexture(canvas);
		if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
		else texture.encoding = THREE.sRGBEncoding;
		texture.anisotropy = renderer.capabilities?.getMaxAnisotropy?.() || texture.anisotropy;
		texture.needsUpdate = true;
		const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
		labelTextures.set(cacheKey, material);
		return material;
	};

	const createLabelMesh = (text, options = {}) => {
		if (!labelMeta) return null;
		const { multiline = false, maxLines, anchorVertical = 'center' } = options;
		const material = getLabelMaterial(text, { multiline, maxLines, anchorVertical });
		if (!material) return null;
		const axis = options.axis || labelMeta.axis;
		const rawNormalSign = options.normalSign ?? labelMeta.normalSign ?? 1;
		const normalSign = Math.sign(rawNormalSign) || 1;
		const thickness = options.thickness ?? labelMeta.thickness ?? 0.02;
		const sourceOffset = options.offset || labelMeta.offset || new THREE.Vector3();
		const offset = sourceOffset.clone ? sourceOffset.clone() : new THREE.Vector3().copy(sourceOffset);
		const mirrored = !!options.mirrored;
		const geomKey = axis;
		let geometry = labelGeometries[geomKey];
		if (!geometry) {
			const map = planeAxisMap[axis] || planeAxisMap.z;
			const width = labelMeta.size[map.width] || 1;
			const height = labelMeta.size[map.height] || 0.5;
			geometry = new THREE.PlaneGeometry(width, height);
			labelGeometries[geomKey] = geometry;
		}
		const mesh = new THREE.Mesh(geometry, material);
		mesh.name = 'LabelText';
		mesh.renderOrder = 10;
		mesh.userData = { ...(mesh.userData || {}), labelSide: normalSign >= 0 ? 'front' : 'back', mirrored };
		mesh.position.copy(offset);
		mesh.position[axis] += normalSign * (thickness * 0.5 + 0.001);
		const anchor = typeof anchorVertical === 'string' ? anchorVertical.toLowerCase() : 'center';
		if (anchor !== 'center') {
			const map = planeAxisMap[axis] || planeAxisMap.z;
			const height = labelMeta.size?.[map.height] || 0;
			if (height) {
				const shift = height * 0.5;
				if (anchor === 'top')
					mesh.position[map.height] -= shift;
				else if (anchor === 'bottom')
					mesh.position[map.height] += shift;
			}
		}
		switch (axis) {
			case 'x':
				mesh.rotation.y = normalSign >= 0 ? Math.PI / 2 : -Math.PI / 2;
				if (normalSign < 0) mesh.scale.x = mirrored ? 1 : -1;
				break;
			case 'y':
				mesh.rotation.x = normalSign >= 0 ? -Math.PI / 2 : Math.PI / 2;
				if (normalSign < 0) mesh.scale.x = mirrored ? 1 : -1;
				break;
			default:
				mesh.rotation.y = normalSign >= 0 ? 0 : Math.PI;
				if (normalSign < 0) mesh.scale.x = mirrored ? 1 : -1;
		}
		return mesh;
	};

	// Load the shared model once, then clone it per grid cell while swapping textures.
	(async () => {
		try {
			const [gltf, texturePayload] = await Promise.all([
				loader.loadAsync(modelUrl),
				Promise.all(textureVariants.map(async (variant) => {
					if (!variant.path) return { ...variant, texture: null, status: 'missing-path' };
					try {
						const tex = await textureLoader.loadAsync(variant.path);
						if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
						else tex.encoding = THREE.sRGBEncoding;
						tex.flipY = false;
						tex.needsUpdate = true;
						return { ...variant, texture: tex, status: 'loaded' };
					} catch (err) {
						console.warn('three-scene: failed to load texture', variant.path, err);
						return { ...variant, texture: null, status: 'error', error: err };
					}
				})),
			]);

			const sourceScene = gltf.scene || gltf.scenes?.[0];
			if (!sourceScene) throw new Error('GLB has no default scene');

			// Normalize and rotate the label UVs so textures appear upright across all instances.
			sourceScene.traverse((node) => {
				if (!node.isMesh || node.name !== 'Cube037') return;
				if (!node.geometry) return;
				node.geometry = node.geometry.clone();
				const geom = node.geometry;
				const uvAttr = geom.getAttribute('uv2') || geom.getAttribute('uv');
				if (!uvAttr) return;
				const min = new THREE.Vector2(Infinity, Infinity);
				const max = new THREE.Vector2(-Infinity, -Infinity);
				const temp = new THREE.Vector2();
				for (let i = 0; i < uvAttr.count; i++) {
					temp.fromBufferAttribute(uvAttr, i);
					if (!Number.isFinite(temp.x) || !Number.isFinite(temp.y)) continue;
					min.x = Math.min(min.x, temp.x);
					min.y = Math.min(min.y, temp.y);
					max.x = Math.max(max.x, temp.x);
					max.y = Math.max(max.y, temp.y);
				}
				if (!Number.isFinite(min.x) || !Number.isFinite(min.y) || !Number.isFinite(max.x) || !Number.isFinite(max.y)) return;
				const span = new THREE.Vector2(max.x - min.x, max.y - min.y);
				if (span.x <= 1e-5 || span.y <= 1e-5) return;
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

			sourceScene.updateMatrixWorld(true);
			const box = new THREE.Box3().setFromObject(sourceScene);
			const size = box.getSize(new THREE.Vector3());
			const center = box.getCenter(new THREE.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
			modelBounds = { box, size, center, maxDim };
			const labelNode = sourceScene.getObjectByName('Cube037');
			if (labelNode && labelNode.isMesh) {
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
				labelMeta = {
					offset,
					size: labelSizeWorld,
					axis,
					normalSign,
					thickness,
				};
			}

			if (labelMeta && modelBounds) {
				const thickness = labelMeta.size.y;
				const topOffset = new THREE.Vector3(0, thickness * 0.75, 0);
				labelMeta = {
					...labelMeta,
					axis: 'x',
					normalSign: 1,
					thickness,
					offset: topOffset,
				};
			}

			const ensureStandard = (mat) => {
				const params = {};
				if (mat.map) {
					if ('colorSpace' in mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
					else mat.map.encoding = THREE.sRGBEncoding;
					params.map = mat.map;
				}
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
				if (mat && typeof mat.name === 'string') newMat.name = mat.name;
				newMat.needsUpdate = true;
				return newMat;
			};

			sourceScene.traverse((node) => {
				if (!node.isMesh) return;
				const oldMat = node.material;
				try {
					if (Array.isArray(oldMat))
						node.material = oldMat.map((m) => (m && m.isMeshStandardMaterial ? m : ensureStandard(m || {})));
					else
						node.material = (oldMat && oldMat.isMeshStandardMaterial) ? oldMat : ensureStandard(oldMat || {});
				}
				catch (err) {
					console.warn('material conversion failed for node', node.name, err);
				}
			});

			for (let idx = 0; idx < 9; idx++) {
				const variant = texturePayload[idx] || texturePayload[0] || { texture: null, key: 'fallback', label: 'Fallback' };
				const j = Math.floor(idx / 3);
				const i = idx % 3;
				const instance = sourceScene.clone(true);
				const wrapper = new THREE.Group();

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
					nodeMaterials.forEach((nm) => {
						if (!nm)
							return;
						if (nm.map) {
							if ('colorSpace' in nm.map)
								nm.map.colorSpace = THREE.SRGBColorSpace;
							else
								nm.map.encoding = THREE.sRGBEncoding;
						}
						nm.needsUpdate = true;
					});
				});

				applyTextureVariant(instance, variant);
				applyVariantTint(instance, variant);

				wrapper.add(instance);
				if (!wrapper.userData)
					wrapper.userData = {};
				wrapper.userData.variant = variant;
				scene.add(wrapper);
				const frontLabelText = variant.label;
				const backLabelText = variant.description;
				const frontLabelMesh = createLabelMesh(frontLabelText);
				const back_offset = labelMeta ? labelMeta.offset.clone().sub(new THREE.Vector3(-0.45, 0.35, 0)) : new THREE.Vector3();
				const backLabelMesh = createLabelMesh(backLabelText, {
					normalSign: -(labelMeta?.normalSign || 1),
					mirrored: true,
					offset: back_offset,
					multiline: true,
					maxLines: 3,
					anchorVertical: 'top',
				});
				if (frontLabelMesh)
					wrapper.add(frontLabelMesh);
				if (backLabelMesh)
					wrapper.add(backLabelMesh);
				wrappers.push({ wrapper, instance, i, j, variant, frontLabel: frontLabelMesh, backLabel: backLabelMesh });
			}

			const layoutModels = () => {
				const w = container.clientWidth;
				const h = container.clientHeight;
				const cellW = w / 3;
				const cellH = h / 3;
				const targetPixels = Math.min(cellW, cellH) * 0.75;
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
					const gridWorldHeight = scaledDiameter * 3 * 1.15;
					const newDistance = gridWorldHeight / (2 * Math.tan(fovRad / 2));
					distance = distance * 0.5 + newDistance * 0.5;
				}

				const scaledDiameter = modelMaxDim * scaleFactor;
				const cellWorldSize = scaledDiameter * 1.15;
				let idx = 0;
				const horizontalNb = 3;
				const verticalNb = 3;
				for (let j = 0; j < verticalNb; j++) {
					for (let i = 0; i < horizontalNb; i++) {
						const entry = wrappers[idx++];
						const wrapper = entry.wrapper;
						wrapper.scale.setScalar(scaleFactor);
						const x = (i - 1) * cellWorldSize;
						const y = (1 - j) * cellWorldSize;
						wrapper.position.set(x, y, 0);
						wrapper.rotation.set(0, -Math.PI / 2, 0);
						if (!wrapper.userData) wrapper.userData = {};
						wrapper.userData.variant = entry.variant;
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

			layoutModels();
			if (loaderEl)
				loaderEl.classList.add('hidden');
			container._layoutModels = layoutModels;
			container._loadedTextures = texturePayload;
		} catch (err) {
			console.error('three-scene: failed to load shared model', err);
			if (loaderEl) {
				loaderEl.classList.remove('hidden');
				const textEl = loaderEl.querySelector('.three-loader-text');
				if (textEl)
					textEl.textContent = 'Failed to load model or textures';
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
		if (!foundWrapper || Math.abs(foundWrapper.rotation.y - foundWrapper.userData.targetRotationY) > 0.02)
			return;

		// toggle persisted state
		const isToggled = !!foundWrapper.userData.toggled;
		if (isToggled) {
			foundWrapper.userData.toggled = false;
			// if not hovered, return to base rotation; if hovered, keep flipped until leave
			if (!foundWrapper.userData.hovered)
				foundWrapper.userData.targetRotationY = foundWrapper.userData.baseRotationY;
			else
				foundWrapper.userData.targetRotationY = foundWrapper.userData.baseRotationY + Math.PI;
		}
		else {
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
