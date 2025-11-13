import { THREE } from './three-deps.js';

export function setupPointerToggle({ container, camera, scene }) {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	const handlePointerMove = (event) => {
		const rect = container.getBoundingClientRect();
		const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const normalizedY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
		pointer.set(normalizedX, normalizedY);
		raycaster.setFromCamera(pointer, camera);
		const intersects = raycaster.intersectObjects(scene.children, true);
		if (!intersects.length) return;
		let node = intersects[0].object;
		let wrapper = null;
		while (node) {
			if (node.userData && node.userData.isGridWrapper) {
				wrapper = node;
				break;
			}
			node = node.parent;
		}
		if (!wrapper || Math.abs(wrapper.rotation.y - wrapper.userData?.targetRotationY) > 0.02)
			return;

		const isToggled = !!wrapper.userData.toggled;
		if (isToggled) {
			wrapper.userData.toggled = false;
			if (!wrapper.userData.hovered)
				wrapper.userData.targetRotationY = wrapper.userData.baseRotationY;
			else
				wrapper.userData.targetRotationY = wrapper.userData.baseRotationY + Math.PI;
		}
		else {
			wrapper.userData.toggled = true;
			wrapper.userData.targetRotationY = wrapper.userData.baseRotationY + Math.PI;
		}
	};

	container.addEventListener('pointermove', handlePointerMove);

	return () => {
		container.removeEventListener('pointermove', handlePointerMove);
	};
}
