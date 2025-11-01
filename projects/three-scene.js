// Minimal three.js demo (module) — now loads a GLB model instead of the cube
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById('three-container');
if (!container) {
  console.warn('three-scene: container not found');
} else {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  // `outputEncoding` was removed in newer three.js versions. Use `outputColorSpace` instead.
  // Map the previous sRGB encoding to the new SRGB color space constant.
  if ('outputColorSpace' in renderer) {
    // modern API
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    // fallback for older releases that still support outputEncoding
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
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
  scene.add(dir);

  // loader
  const loader = new GLTFLoader();
  // relative to projects/index.html -> assets is one level up
  const modelUrl = '../assets/gba-sp/GBA-SP-Game.glb';

  // store wrappers for the 3x3 grid so we can update them on resize
  const wrappers = [];
  let originalBox = null;
  let originalSize = null;
  let originalCenter = null;

  // loader UI elements (optional)
  const loaderEl = container.querySelector('.three-loader');
  const loaderPercentEl = loaderEl?.querySelector('.three-loader-percent');

  loader.load(
    modelUrl,
    (gltf) => {
      const source = gltf.scene || gltf.scenes?.[0];
      if (!source) {
        console.error('three-scene: GLTF has no scene');
        return;
      }

      // compute original bounding box (used for sizing and centering)
      originalBox = new THREE.Box3().setFromObject(source);
      originalSize = originalBox.getSize(new THREE.Vector3());
      originalCenter = originalBox.getCenter(new THREE.Vector3());
      const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);

      // --- material conversion: ensure PBR MeshStandardMaterial and proper encodings ---
      // This preserves existing texture maps where present and converts older
      // materials to MeshStandard so lighting and roughness/metalness behave predictably.
      source.traverse((node) => {
        if (node.isMesh) {
          const oldMat = node.material;
          // If material already is Standard, we leave as-is but ensure encodings
          const ensureStandard = (mat) => {
            // copy maps we can reuse
            const params = {};
            if (mat.map) { mat.map.encoding = THREE.sRGBEncoding; params.map = mat.map; }
            if (mat.normalMap) params.normalMap = mat.normalMap;
            if (mat.aoMap) params.aoMap = mat.aoMap;
            if (mat.roughnessMap) params.roughnessMap = mat.roughnessMap;
            if (mat.metalnessMap) params.metalnessMap = mat.metalnessMap;
            // preserve vertexcolors/skin settings
            params.color = (mat.color && mat.color.isColor) ? mat.color.clone() : new THREE.Color(0xdddddd);
            if (mat.vertexColors) params.vertexColors = mat.vertexColors;
            if (mat.skinning) params.skinning = mat.skinning;
            // sensible defaults if the incoming material doesn't specify
            params.metalness = (typeof mat.metalness === 'number') ? mat.metalness : 0.2;
            params.roughness = (typeof mat.roughness === 'number') ? mat.roughness : 0.6;
            const newMat = new THREE.MeshStandardMaterial(params);
            newMat.needsUpdate = true;
            return newMat;
          };

          try {
            // if array of materials (multi-material), convert each
            if (Array.isArray(oldMat)) {
              node.material = oldMat.map(ensureStandard);
            } else {
              // replace only if not already a MeshStandardMaterial instance
              if (!(oldMat && oldMat.isMeshStandardMaterial)) {
                node.material = ensureStandard(oldMat || {});
              } else {
                // ensure encoding on existing color map
                if (oldMat.map) oldMat.map.encoding = THREE.sRGBEncoding;
              }
            }
          } catch (err) {
            // fallback: leave original material
            console.warn('material conversion failed for node', node.name, err);
          }
        }
      });

      // create 3x3 clones, wrap them in groups and add to scene
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          // clone the source to create independent instances
          const instance = source.clone(true);

          // wrapper group lets us apply uniform scale and position without mutating
          // the instance's internal transforms
          const wrapper = new THREE.Group();
          // center the instance inside the wrapper (preserve internal transforms by moving instance)
          instance.position.sub(originalCenter);
          wrapper.add(instance);
          scene.add(wrapper);
          wrappers.push({ wrapper, instance });
        }
      }

      // initial layout (position, scale, camera)
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
    },
    (progress) => {
      // progress.loaded / progress.total may be undefined for some hosts
      if (loaderPercentEl && progress && typeof progress.loaded === 'number' && typeof progress.total === 'number' && progress.total > 0) {
        const pct = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
        loaderPercentEl.textContent = pct + '%';
      }
    },
    (err) => {
      console.error('three-scene: failed to load model', err);
      if (loaderEl) {
        loaderEl.classList.remove('hidden');
        loaderEl.querySelector('.three-loader-text').textContent = 'Failed to load model';
      }
    }
  );

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
  let hoveredWrapper = null;

  function setHoveredWrapper(wrapper) {
    if (hoveredWrapper === wrapper) return;
    // unhover previous: only reset target if it isn't toggled
    if (hoveredWrapper) {
      hoveredWrapper.userData.hovered = false;
      if (!hoveredWrapper.userData.toggled) {
        hoveredWrapper.userData.targetRotationY = hoveredWrapper.userData.baseRotationY;
      }
    }
    hoveredWrapper = wrapper;
    if (hoveredWrapper) {
      hoveredWrapper.userData.hovered = true;
      // if it's already toggled, keep it rotated; otherwise rotate on hover
      if (hoveredWrapper.userData.toggled) {
        hoveredWrapper.userData.targetRotationY = hoveredWrapper.userData.baseRotationY + Math.PI;
      } else {
        hoveredWrapper.userData.targetRotationY = hoveredWrapper.userData.baseRotationY + Math.PI; // 180deg
      }
    }
  }

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
