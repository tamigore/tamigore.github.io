import { THREE } from './three-deps.js';

const planeAxisMap = {
	x: { width: 'z', height: 'y' },
	y: { width: 'x', height: 'z' },
	z: { width: 'x', height: 'y' },
};

export function createLabelFactory({ renderer }) {
	const labelTextures = new Map();
	const labelGeometries = Object.create(null);
	let labelMeta = null;

	const getLabelMaterial = (text, options = {}) => {
		const effectiveText = text == null || text === '' ? 'Untitled' : String(text);
		const multiline = !!options.multiline;
		const fontSize = 52;
		const lineHeightFactor = options.lineHeightFactor && options.lineHeightFactor > 0 ? options.lineHeightFactor : 1.05;
		const desiredMaxLines = options.maxLines;
		const verticalAnchor = typeof options.anchorVertical === 'string' ? options.anchorVertical.toLowerCase() : 'center';
		const canvasWidth = 512;
		const canvasHeight = 286;
		const horizontalMargin = canvasWidth * 0.1;
		const verticalMargin = canvasHeight * 0.08;
		const targetWidth = canvasWidth - horizontalMargin * 2;
		const maxLines = desiredMaxLines;
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

	return {
		createLabelMesh,
		setLabelMeta: (meta) => {
			labelMeta = meta;
		},
		getLabelMeta: () => labelMeta,
	};
}
