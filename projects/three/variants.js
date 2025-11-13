import { THREE } from './three-deps.js';

export function mirrorTextureX(texture) {
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
}

export function applyTextureVariant(group, variant) {
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
			}
			else if (mat.map) {
				mat.map = null;
				mat.needsUpdate = true;
			}
		});
	});
}

export function applyVariantTint(group, variant) {
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
}
