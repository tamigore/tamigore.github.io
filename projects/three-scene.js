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

      // Diagnostic: dump model structure (meshes + materials) to console to aid targeting
      function dumpModelStructure(root) {
        try {
          console.groupCollapsed('three-scene: model structure dump');
          root.traverse((node) => {
            if (!node.isMesh) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m, idx) => {
              const matName = (m && m.name) ? m.name : '[unnamed]';
              const hasMap = !!(m && m.map);
              let colorInfo = 'n/a';
              try {
                if (m && m.color && typeof m.color.getHex === 'function') {
                  colorInfo = '#' + m.color.getHexString?.() || m.color.getHex?.().toString(16);
                }
              } catch (e) { /* ignore */ }
              const metalness = (m && typeof m.metalness === 'number') ? m.metalness : 'n/a';
              const roughness = (m && typeof m.roughness === 'number') ? m.roughness : 'n/a';
              console.log(`mesh:"${node.name || '[unnamed]'}" materialIndex:${idx} material:"${matName}" hasMap:${hasMap} color:${colorInfo} metalness:${metalness} roughness:${roughness}`, node);
            });
          });
          console.groupEnd();
        } catch (err) {
          console.warn('three-scene: failed to dump model structure', err);
        }
      }

      // call the diagnostic dump so you can inspect meshes/materials in the console
      dumpModelStructure(source);

      // --- per-instance texture support (template) ---
      // textureLoader will load image textures and we apply them to each instance
      const textureLoader = new THREE.TextureLoader();

      // Allow passing a comma-separated list of image URLs via the container's
      // `data-images` attribute (e.g. data-images="url1,url2,..."). If not provided
      // fall back to placeholder images from picsum.photos so the template works out of the box.
      const instanceImages = (container.dataset.images ? container.dataset.images.split(',').map(s => s.trim()).filter(Boolean) : [])
        .filter(Boolean);
      if (instanceImages.length === 0) {
        // generate 9 placeholder images (one per grid cell)
        for (let k = 0; k < 9; k++) instanceImages.push(`https://picsum.photos/seed/three${k}/512/512`);
      }

      // helper: apply a loaded texture to an instance's materials
      // optional opts: { node: THREE.Mesh, materialIndex: number }
      function applyTextureToInstance(instance, texture, opts = {}) {
        // ensure correct color space
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        // configure sampling / wrapping for nicer results
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        try {
          texture.anisotropy = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
        } catch (e) {
          // ignore
        }

        if (opts.node) {
          const n = opts.node;
          if (n.isMesh) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            const mi = Number.isFinite(opts.materialIndex) ? opts.materialIndex : 0;
            const m = mats[mi];
            if (m) {
              m.map = texture;
              if (m.color) m.color.setHex(0xffffff);
              if (m.emissive) m.emissive.setScalar(0.08);
              m.needsUpdate = true;
            }
          }
          return;
        }

        // fallback: apply to first material of every mesh (previous behaviour)
        instance.traverse((n) => {
          if (n.isMesh) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            if (mats[0]) {
              mats[0].map = texture;
              if (mats[0].color) mats[0].color.setHex(0xffffff);
              if (mats[0].emissive) mats[0].emissive.setScalar(0.08);
              mats[0].needsUpdate = true;
            }
          }
        });
      }

      // helper: try to heuristically find the mesh that corresponds to the orange panel
      function findCandidateMeshesForImage(instance) {
        const candidates = [];
        const nameRegex = /(screen|label|panel|cover|face|front|display|insert|slot|card|logo|box|plate|window)/i;
        instance.traverse((n) => {
          if (!n.isMesh) return;
          // prefer explicit names
          if (n.name && nameRegex.test(n.name)) {
            candidates.push(n);
            return;
          }
          // check material color for orange/brown hues
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          for (let m of mats) {
            if (!m) continue;
            if (m.map) {
              // already textured — good candidate
              candidates.push(n);
              break;
            }
            if (m.color && typeof m.color.getHSL === 'function') {
              const hsl = {};
              m.color.getHSL(hsl);
              // orange hue approx between 0.03 and 0.12, require some saturation
              if (hsl.h >= 0.02 && hsl.h <= 0.14 && hsl.s > 0.2 && hsl.l > 0.08) {
                candidates.push(n);
                break;
              }
            }
          }
        });
        return candidates;
      }

      // helper: async load then apply (with heuristic targeting)
      function applyImageUrlToInstance(instance, url) {
        if (!url) return;
        textureLoader.load(
          url,
          (tex) => {
            // try to find a good target mesh/material on the instance
            const targets = findCandidateMeshesForImage(instance);
            if (targets.length) {
              // apply to each candidate's first material
              targets.forEach((node) => applyTextureToInstance(instance, tex, { node }));
            } else {
              // fallback to applying broadly
              console.info('three-scene: no clear target mesh found, applying texture broadly');
              applyTextureToInstance(instance, tex);
            }
          },
          undefined,
          (err) => console.warn('three-scene: failed to load instance texture', url, err)
        );
      }

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
          // Before adding to the scene, clone materials per instance so we can tweak them
          // independently per tile.
          instance.traverse((node) => {
            if (node.isMesh) {
              const mat = node.material;
              if (Array.isArray(mat)) {
                node.material = mat.map((m) => (m ? m.clone() : new THREE.MeshStandardMaterial()));
              } else {
                node.material = mat ? mat.clone() : new THREE.MeshStandardMaterial();
              }
              // ensure encoding for color maps
              const nodeMatArray = Array.isArray(node.material) ? node.material : [node.material];
              nodeMatArray.forEach((nm) => {
                if (nm.map) nm.map.encoding = THREE.sRGBEncoding;
                nm.needsUpdate = true;
              });
            }
          });

          wrapper.add(instance);
          scene.add(wrapper);
          // apply a per-instance image texture from the template list
          try {
            const imgUrl = instanceImages[(j * 3 + i) % instanceImages.length];
            if (imgUrl) applyImageUrlToInstance(instance, imgUrl);
          } catch (err) {
            console.warn('three-scene: failed to apply instance image', err);
          }

          wrappers.push({ wrapper, instance, i, j });
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
              // apply per-instance material tweaks: clone materials were created at load time,
              // now tweak color/metalness/roughness per tile
              (function applyInstanceMaterialVariants(entryIndex, ii, jj) {
                const hue = ((ii + jj * horizontalNb) / (horizontalNb * verticalNb));
                const sat = 0.55;
                const light = 0.5;
                const metalness = 0.1 + 0.7 * ((ii + jj * horizontalNb) / (horizontalNb * verticalNb - 1 || 1));
                const roughness = 0.35 + 0.5 * (1 - ((ii + jj * horizontalNb) / (horizontalNb * verticalNb - 1 || 1)));
                entry.instance.traverse((n) => {
                  if (n.isMesh) {
                    const mats = Array.isArray(n.material) ? n.material : [n.material];
                        mats.forEach((m) => {
                          if (!m) return;
                          // If this material already has a texture map applied, skip tinting it.
                          // That lets image textures applied earlier remain visible instead of being
                          // multiplied by the per-instance color.
                          if (m.map) {
                            m.needsUpdate = true;
                            return;
                          }
                          // only set color if material supports it
                          if (m.color && typeof m.color.setHSL === 'function') {
                            m.color.setHSL(hue, sat, light);
                          }
                          // tweak metalness/roughness
                          if (typeof m.metalness === 'number') m.metalness = metalness;
                          if (typeof m.roughness === 'number') m.roughness = roughness;
                          m.needsUpdate = true;
                        });
                  }
                });
              })(idx - 1, i, j);
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
