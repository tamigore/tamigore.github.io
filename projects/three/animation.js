export function startAnimationLoop({ camera, scene, renderer, wrappers }) {
	let pointerX = 0;
	let pointerY = 0;

	const animate = () => {
		for (let k = 0; k < wrappers.length; k++) {
			const wrapper = wrappers[k].wrapper;
			const target = wrapper.userData?.targetRotationY ?? wrapper.rotation.y;
			const delta = target - wrapper.rotation.y;
			wrapper.rotation.y += delta * 0.12;
		}

		camera.position.x += (pointerX * 0.8 - camera.position.x) * 0.04;
		camera.position.y += (-pointerY * 0.6 - camera.position.y) * 0.04;
		camera.lookAt(0, 0, 0);

		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	};

	requestAnimationFrame(animate);

	return {
		setPointer: ({ normalizedX = 0, normalizedY = 0 } = {}) => {
			pointerX = normalizedX;
			pointerY = normalizedY;
		},
	};
}
