import * as THREE from "./three/three.module.min.js";

const ceramic = new THREE.MeshStandardMaterial({ color: "#e8eeff", roughness: 0.27, metalness: 0.08 });
const paper = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45 });
const blue = new THREE.MeshStandardMaterial({ color: "#3559e8", roughness: 0.21, metalness: 0.16 });
const ink = new THREE.MeshStandardMaterial({ color: "#203991", roughness: 0.38 });
const trace = new THREE.MeshStandardMaterial({ color: "#8098ec", roughness: 0.35, metalness: 0.14 });

function mesh(parent, geometry, material, x, y, z) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}

function block(parent, material, width, height, depth, x, y, z) {
  return mesh(parent, new THREE.BoxGeometry(width, height, depth), material, x, y, z);
}

function link(parent, material, from, to, radius = 0.035) {
  const line = new THREE.LineCurve3(new THREE.Vector3(...from), new THREE.Vector3(...to));
  return mesh(parent, new THREE.TubeGeometry(line, 1, radius, 8, false), material, 0, 0, 0);
}

function makeData(group) {
  const stack = new THREE.Group();
  stack.rotation.y = -0.13;
  group.add(stack);
  block(stack, blue, 1.35, 0.13, 0.94, 0, 0.32, 0);
  block(stack, ceramic, 1.28, 0.11, 0.88, -0.07, 0.44, 0.05);
  block(stack, paper, 1.19, 0.1, 0.82, -0.14, 0.55, 0.1);
  for (const [index, length] of [0.68, 0.82, 0.54].entries()) {
    block(stack, index === 0 ? ink : trace, length, 0.02, 0.05, -0.25, 0.61, -0.07 + index * 0.18);
  }
}

function makeModel(group) {
  block(group, ink, 1.28, 0.17, 1.02, 0, 0.34, 0);
  block(group, blue, 1.13, 0.2, 0.87, 0, 0.53, 0);
  block(group, ceramic, 0.8, 0.1, 0.61, 0, 0.68, 0);
  for (const offset of [-0.36, -0.12, 0.12, 0.36]) {
    block(group, trace, 0.11, 0.1, 0.24, offset, 0.43, -0.56);
    block(group, trace, 0.11, 0.1, 0.24, offset, 0.43, 0.56);
  }
  const connections = [[-0.24, 0.75, -0.14], [0.23, 0.75, -0.14], [0, 0.75, 0.17]];
  link(group, trace, connections[0], connections[2], 0.022);
  link(group, trace, connections[1], connections[2], 0.022);
  const dot = new THREE.SphereGeometry(0.067, 14, 10);
  for (const position of connections) mesh(group, dot, blue, ...position);
}

function makeReview(group) {
  const card = new THREE.Group();
  card.rotation.x = -0.21;
  card.rotation.y = 0.12;
  group.add(card);
  block(card, blue, 1.04, 1.05, 0.2, 0, 0.74, 0);
  block(card, paper, 0.88, 0.85, 0.05, 0, 0.74, 0.115);
  link(card, blue, [-0.24, 0.74, 0.16], [-0.06, 0.56, 0.16], 0.055);
  link(card, blue, [-0.06, 0.56, 0.16], [0.27, 0.91, 0.16], 0.055);
}

export function mountWorkflowScene(workflow, visual, canvas, context) {
  const controls = [...workflow.querySelectorAll("input[name=workflow-step]")];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.set(0, 4.3, 10);
  camera.lookAt(0, 0.36, 0);
  renderer.setClearColor(0, 0);
  scene.add(new THREE.HemisphereLight("#ffffff", "#9aaff1", 2.1));
  const key = new THREE.DirectionalLight("#ffffff", 2.9);
  key.position.set(-3, 5, 5);
  scene.add(key);

  const positions = [-2.55, 0, 2.55];
  const halos = [];
  const stages = [makeData, makeModel, makeReview].map((build, index) => {
    const platform = new THREE.Group();
    platform.position.x = positions[index];
    scene.add(platform);
    const halo = new THREE.MeshBasicMaterial({ color: "#385fee", transparent: true, opacity: 0 });
    const ring = mesh(platform, new THREE.RingGeometry(0.98, 1.04, 48), halo, 0, -0.1, 0);
    ring.rotation.x = -Math.PI / 2;
    halos.push(halo);
    mesh(platform, new THREE.CylinderGeometry(0.9, 0.85, 0.2, 48), ceramic, 0, 0, 0);

    const object = new THREE.Group();
    platform.add(object);
    build(object);
    return object;
  });

  link(scene, trace, [positions[0], 0.05, 0], [positions[2], 0.05, 0], 0.055);
  const signal = mesh(scene, new THREE.SphereGeometry(0.125, 20, 14), blue, 0, 0.12, 0);
  signal.visible = false;

  let active = controls.findIndex(control => control.checked);
  let from = active;
  let started = null;
  let frame = 0;
  let visible = false;
  let lost = false;

  function draw(now) {
    frame = 0;
    if (!visible || lost || document.hidden) return;
    started ??= now;
    const progress = motion.matches ? 1 : Math.min((now - started) / 720, 1);
    const eased = progress * (2 - progress);
    let settling = false;
    for (const [index, stage] of stages.entries()) {
      const lift = index === active ? 0.29 : 0;
      stage.position.y = motion.matches ? lift : THREE.MathUtils.lerp(stage.position.y, lift, 0.16);
      halos[index].opacity = index === active ? 0.86 : 0.15;
      settling ||= Math.abs(stage.position.y - lift) > 0.002;
    }
    signal.visible = from !== active && progress < 1;
    signal.position.x = THREE.MathUtils.lerp(positions[from], positions[active], eased);
    renderer.render(scene, camera);
    workflow.dataset.rendered = "";
    if (signal.visible || settling) requestDraw();
  }

  function requestDraw() {
    if (!frame && visible && !lost && !document.hidden) frame = requestAnimationFrame(draw);
  }

  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = visual.getBoundingClientRect();
    if (!width || !height) return;
    const halfWidth = 3.9;
    const halfHeight = Math.max(1.68, halfWidth * height / width);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = 0.1;
    camera.far = 40;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height, false);
    requestDraw();
  });
  resizeObserver.observe(visual);

  const viewportObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    requestDraw();
  });
  viewportObserver.observe(visual);

  workflow.addEventListener("change", (event) => {
    const next = controls.indexOf(event.target);
    if (next < 0 || next === active) return;
    from = active;
    active = next;
    started = null;
    requestDraw();
  });

  motion.addEventListener("change", requestDraw);
  document.addEventListener("visibilitychange", requestDraw);
  canvas.addEventListener("webglcontextlost", () => {
    lost = true;
    delete workflow.dataset.rendered;
    resizeObserver.disconnect();
    viewportObserver.disconnect();
  }, { once: true });
}

