import { THREE } from './three-deps.js';

// Immutable defaults for label texture rendering.
const labelStyle = Object.freeze({
	canvasWidth: 512,
	canvasHeight: 286,
	fallbackText: 'Untitled',
	fontSize: 52,
	defaultLineHeightFactor: 1.05,
	horizontalMarginRatio: 0.05,
	verticalMarginRatio: 0.08,
	minStrokeWidth: 4,
	strokeWidthFactor: 0.08,
	fillStyle: '#f5f7ff',
	strokeStyle: 'rgba(12, 16, 32, 0.85)',
});

const planeAxisMap = {
	x: { width: 'z', height: 'y' },
	y: { width: 'x', height: 'z' },
	z: { width: 'x', height: 'y' },
};

const ellipsis = '...';

const truncateLineToWidth = (ctx, line, targetWidth) => {
	const trimmedLine = typeof line === 'string' ? line.trim() : '';
	if (!trimmedLine)
		return '';
	if (ctx.measureText(trimmedLine).width <= targetWidth)
		return trimmedLine;
	let base = trimmedLine.endsWith(ellipsis) ? trimmedLine.slice(0, -ellipsis.length) : trimmedLine;
	while (base.length && ctx.measureText(`${base}${ellipsis}`).width > targetWidth)
		base = base.slice(0, -1);
	return base ? `${base}${ellipsis}` : ellipsis;
};

const drawTextPair = (ctx, line, x, y, strokeOffset) => {
	if (!line)
		return;
	ctx.strokeText(line, x, y + strokeOffset);
	ctx.fillText(line, x, y);
};

const normalizeMaterialConfig = (text, options = {}) => {
	const effectiveText = text == null || text === '' ? labelStyle.fallbackText : String(text);
	const multiline = !!options.multiline;
	const fontSize = options.fontSize ? options.fontSize : labelStyle.fontSize;
	const lineHeightFactor = options.lineHeightFactor && options.lineHeightFactor > 0 ? options.lineHeightFactor : labelStyle.defaultLineHeightFactor;
	const maxLines = options.maxLines;
	const verticalAnchor = typeof options.anchorVertical === 'string' ? options.anchorVertical.toLowerCase() : 'center';
	const canvasWidth = labelStyle.canvasWidth;
	const canvasHeight = labelStyle.canvasHeight;
	const horizontalMargin = canvasWidth * labelStyle.horizontalMarginRatio;
	const verticalMargin = canvasHeight * labelStyle.verticalMarginRatio;
	const targetWidth = canvasWidth - horizontalMargin * 2;
	const strokeWidth = Math.max(labelStyle.minStrokeWidth, fontSize * labelStyle.strokeWidthFactor);
	const strokeOffset = fontSize * labelStyle.strokeWidthFactor;
	const cacheKey = `${multiline ? 'ml' : 'sg'}|${verticalAnchor}|${maxLines}|${fontSize}|${lineHeightFactor}|${effectiveText}`;
	return {
		text: effectiveText,
		multiline,
		fontSize,
		lineHeightFactor,
		maxLines,
		verticalAnchor,
		canvasWidth,
		canvasHeight,
		horizontalMargin,
		verticalMargin,
		targetWidth,
		strokeWidth,
		strokeOffset,
		cacheKey,
	};
};

const createCanvasContext = (width, height) => {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, width, height);
	ctx.textAlign = 'center';
	return { canvas, ctx };
};

const configureContext = (ctx, config) => {
	switch (config.verticalAnchor) {
		case 'top':
			ctx.textBaseline = 'top';
			break;
		case 'bottom':
			ctx.textBaseline = 'bottom';
			break;
		default:
			ctx.textBaseline = 'middle';
	}
	ctx.font = `700 ${config.fontSize}px "Pixeloid Sans", system-ui, sans-serif`;
	ctx.fillStyle = labelStyle.fillStyle;
	ctx.strokeStyle = labelStyle.strokeStyle;
	ctx.lineWidth = config.strokeWidth;
};

const wrapTextToLines = (ctx, config) => {
	const paragraphs = String(config.text).split(/\n+/).map((part) => part.trim()).filter(Boolean);
	const lines = [];
	for (const paragraph of paragraphs) {
		const words = paragraph.split(/\s+/);
		let current = '';
		for (const word of words) {
			const tentative = current ? `${current} ${word}` : word;
			const width = ctx.measureText(tentative).width;
			if (width <= config.targetWidth || !current)
				current = tentative;
			else {
				lines.push(current);
				current = word;
			}
		}
		if (current)
			lines.push(current);
	}
	if (!lines.length)
		lines.push(config.text);
	if (!config.multiline)
		return lines.slice(0, 1);
	if (typeof config.maxLines === 'number' && lines.length > config.maxLines) {
		const trimmed = lines.slice(0, config.maxLines);
		trimmed[trimmed.length - 1] = truncateLineToWidth(ctx, trimmed[trimmed.length - 1] || '', config.targetWidth);
		return trimmed;
	}
	return lines;
};

const trimLinesToWidth = (ctx, lines, targetWidth) => {
	return lines.map((line) => truncateLineToWidth(ctx, line, targetWidth));
};

const drawTextLines = (ctx, lines, config) => {
	const centerX = config.canvasWidth / 2;
	const { fontSize, lineHeightFactor, verticalAnchor, verticalMargin, strokeOffset } = config;
	if (lines.length === 1 && verticalAnchor === 'center') {
		const midY = config.canvasHeight / 2;
		drawTextPair(ctx, lines[0], centerX, midY, strokeOffset);
		return;
	}
	if (verticalAnchor === 'top') {
		let y = verticalMargin;
		for (const line of lines) {
			drawTextPair(ctx, line, centerX, y, strokeOffset);
			y += fontSize * lineHeightFactor;
		}
		return;
	}
	if (verticalAnchor === 'bottom') {
		let y = config.canvasHeight - verticalMargin;
		for (let idx = lines.length - 1; idx >= 0; idx--) {
			const line = lines[idx];
			drawTextPair(ctx, line, centerX, y, strokeOffset);
			y -= fontSize * lineHeightFactor;
		}
		return;
	}
	const totalHeight = lines.length * fontSize * lineHeightFactor;
	let y = (config.canvasHeight - totalHeight) / 2 + fontSize / 2;
	for (const line of lines) {
		drawTextPair(ctx, line, centerX, y, strokeOffset);
		y += fontSize * lineHeightFactor;
	}
};

const createMaterialFromCanvas = (canvas, renderer) => {
	const texture = new THREE.CanvasTexture(canvas);
	if ('colorSpace' in texture)
		texture.colorSpace = THREE.SRGBColorSpace;
	else
		texture.encoding = THREE.sRGBEncoding;
	texture.anisotropy = renderer.capabilities?.getMaxAnisotropy?.() || texture.anisotropy;
	texture.needsUpdate = true;
	return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
};

export function createLabelFactory({ renderer }) {
	const labelTextures = new Map();
	const labelGeometries = Object.create(null);
	let labelMeta = null;

	const getLabelMaterial = (text, options = {}) => {
		const config = normalizeMaterialConfig(text, options);
		if (labelTextures.has(config.cacheKey))
			return labelTextures.get(config.cacheKey);
		const { canvas, ctx } = createCanvasContext(config.canvasWidth, config.canvasHeight);
		configureContext(ctx, config);
		const wrappedLines = wrapTextToLines(ctx, config);
		const lines = trimLinesToWidth(ctx, wrappedLines, config.targetWidth);
		drawTextLines(ctx, lines, config);
		const material = createMaterialFromCanvas(canvas, renderer);
		labelTextures.set(config.cacheKey, material);
		return material;
	};

	const createLabelMesh = (text, options = {}) => {
		if (!labelMeta)
			return null;
		const { multiline = false, maxLines, anchorVertical = 'center' } = options;
		const material = getLabelMaterial(text, { multiline, maxLines, anchorVertical, fontSize: options.fontSize, lineHeightFactor: options.lineHeightFactor });
		if (!material)
			return null;
		const axis = options.axis || labelMeta.axis;
		const rawNormalSign = options.normalSign ?? labelMeta.normalSign ?? 1;
		const normalSign = Math.sign(rawNormalSign) || 1;
		const thickness = options.thickness ?? labelMeta.thickness ?? 0.02;
		const offset = options.offset || labelMeta.offset || new THREE.Vector3();
		const mirrored = !!options.mirrored;
		const map = planeAxisMap[axis] || planeAxisMap.z;
		const rawWidth = labelMeta.size?.[map.width] ?? 1;
		const rawHeight = labelMeta.size?.[map.height] ?? 0.5;
		const sizeMultiplier = options.sizeMultiplier ?? labelMeta.sizeScale ?? 1;
		const width = rawWidth * sizeMultiplier;
		const height = rawHeight * sizeMultiplier;
		const geomKey = `${axis}:${width.toFixed(4)}:${height.toFixed(4)}`;
		let geometry = labelGeometries[geomKey];
		if (!geometry) {
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
			const anchorHeight = height;
			if (anchorHeight) {
				const shift = anchorHeight * 0.5;
				if (anchor === 'top')
					mesh.position[map.height] -= shift;
				else if (anchor === 'bottom')
					mesh.position[map.height] += shift;
			}
		}
		switch (axis) {
			case 'x':
				mesh.rotation.y = normalSign >= 0 ? Math.PI / 2 : -Math.PI / 2;
				if (normalSign < 0)
						mesh.scale.x = mirrored ? 1 : -1;
				break;
			case 'y':
				mesh.rotation.x = normalSign >= 0 ? -Math.PI / 2 : Math.PI / 2;
				if (normalSign < 0)
					mesh.scale.x = mirrored ? 1 : -1;
				break;
			default:
				mesh.rotation.y = normalSign >= 0 ? 0 : Math.PI;
				if (normalSign < 0)
					mesh.scale.x = mirrored ? 1 : -1;
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
