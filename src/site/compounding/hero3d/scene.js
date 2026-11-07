// The 3D pour: the Bench flacon on a steel pan, built in three.js. This module
// is its own chunk (Hero3D loads it with import()), so three never reaches the
// first script. It draws nothing on its own: the caller asks for a frame with
// render(state) whenever the scroll, the spring or a drag changes. Every
// visual is a function of that state; the only randomness is fixed at build.
// Lifted from the design prototype "Kyphira Rain 3D v3" (design handoff).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  B, DROPS, ETHANOL, BLEND_TOWARD, camera as cameraAt, capState, clamp, easeOut, heroAmount,
  mixHex, oilT, seg, smooth, stream as streamAt,
} from "./timeline.js";

// The flacon's proportions (scene units).
const RO = 0.92, DO = 0.6, RI = 0.74, RZ = 0.42;
const CW = RI * 2, CH = 1.84, CD = RZ * 2, CB = 0.26, CY = CB + CH / 2, BH = 2.34;
const FULL = 0.86; // the fill line, as a share of the cavity
const MIST_N = 90, SPLASH_N = 36;
// Additive light that leaves alpha alone. The canvas is transparent (premultiplied),
// so light added over an empty pixel shows as light over the page, not as black.
const LIGHT = {
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
};

// Seeded so a reload looks the same.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Builds the scene into `host` (a positioned element) and returns its handle.
 * overlay.labels(): the note-name elements (data-pt index = drop index);
 * overlay.readout: the readout pill, pinned under the pan.
 */
export function createScene(host, { overlay, fonts = {}, images = {} } = {}) {
  const rand = seeded(7);
  // Transparent: the stage's own ground (hero3d.css) shows through, so canvas and page never meet at a seam.
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  R.setClearColor(0x000000, 0);
  R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.localClippingEnabled = true;
  R.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  R.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(R.domElement);

  const owned = []; // textures made here, freed on dispose
  const canvasTex = (w, h, draw, repeat) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    owned.push(t);
    return t;
  };

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(R);
  const envTarget = pm.fromScene(new RoomEnvironment(R), 0.04);
  scene.environment = envTarget.texture;
  pm.dispose();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Lights.
  const key = new THREE.DirectionalLight("#fff3e2", 2.4);
  key.position.set(-3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -3, near: 0.5, far: 25 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffe9cc", 1.2);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight("#fff1dc", "#8a5a26", 0.55));

  // The scale: shadow catcher, dark base, brushed steel pan, size engraved on the front.
  const brushed = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = "#808080"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const y = rand() * h, v = 100 + rand() * 60; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(0, y, w, 0.6 + rand()); }
  }, true);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.24 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.37; ground.receiveShadow = true;
  scene.add(ground);
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.26, 1.4, 4, 0.05), new THREE.MeshStandardMaterial({ color: "#1B1814", roughness: 0.55, metalness: 0.1 }));
  base.position.y = -0.23; base.castShadow = base.receiveShadow = true;
  scene.add(base);
  const pan = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.1, 1.72, 4, 0.04), new THREE.MeshStandardMaterial({ color: "#D2CCC1", metalness: 1, roughness: 0.3, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.4 }));
  pan.position.y = -0.05; pan.receiveShadow = true;
  scene.add(pan);
  const engCanvas = document.createElement("canvas");
  engCanvas.width = 512; engCanvas.height = 80;
  const engTex = new THREE.CanvasTexture(engCanvas);
  engTex.colorSpace = THREE.SRGBColorSpace;
  owned.push(engTex);
  const engrave = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.1875), new THREE.MeshBasicMaterial({ map: engTex, transparent: true, depthWrite: false }));
  engrave.position.set(0, -0.23, 0.703);
  scene.add(engrave);

  // The flacon: three glass passes on one shape (tint, additive reflection, fresnel rim).
  const g = new THREE.Group();
  scene.add(g);
  const tintMat = new THREE.MeshPhysicalMaterial({ color: "#EEF4F0", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.04, depthWrite: false, envMapIntensity: 0.1 });
  const reflMat = new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.03, metalness: 0, envMapIntensity: 0.9, transparent: true, ...LIGHT, depthWrite: false });
  const inReflMat = new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.05, metalness: 0, envMapIntensity: 0.2, transparent: true, ...LIGHT, depthWrite: false, side: THREE.BackSide });
  const baseGlass = new THREE.MeshPhysicalMaterial({ color: "#F4F8F4", roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 0.3 });
  const fresnel = (strength, power) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...LIGHT,
    uniforms: { c: { value: new THREE.Color("#FFF4E2") }, s: { value: strength }, pw: { value: power } },
    vertexShader: "varying vec3 n; varying vec3 vv; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); n = normalize(normalMatrix * normal); vv = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 c; uniform float s; uniform float pw; varying vec3 n; varying vec3 vv; void main(){ float f = pow(1.0 - abs(dot(normalize(n), normalize(vv))), pw); gl_FragColor = vec4(c * f * s, 1.0); }",
  });
  const fresOut = fresnel(0.32, 4), fresIn = fresnel(0.1, 3);
  const addGlass = (geo, y, inner) => {
    const a = new THREE.Mesh(geo, tintMat), b = new THREE.Mesh(geo, reflMat), fr = new THREE.Mesh(geo, fresOut);
    a.position.y = b.position.y = fr.position.y = y;
    a.renderOrder = 10; b.renderOrder = 11; fr.renderOrder = 12;
    g.add(a, b, fr);
    if (inner) {
      const c = new THREE.Mesh(inner, inReflMat), ci = new THREE.Mesh(inner, fresIn);
      c.position.y = ci.position.y = CY; c.renderOrder = ci.renderOrder = 9;
      g.add(c, ci);
    }
  };
  addGlass(new RoundedBoxGeometry(RO * 2, BH, DO * 2, 8, 0.3), BH / 2, new RoundedBoxGeometry(CW, CH, CD, 6, 0.24));
  addGlass(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 48), BH + 0.09);
  const heavy = new THREE.Mesh(new RoundedBoxGeometry(CW, CB - 0.03, CD, 4, 0.1), baseGlass);
  heavy.position.y = (CB - 0.03) / 2 + 0.02; heavy.renderOrder = 8;
  g.add(heavy);

  // Collar and the gold octagonal cap with its cream panel.
  const chrome = new THREE.MeshStandardMaterial({ color: "#D9B979", metalness: 1, roughness: 0.2, envMapIntensity: 1.4 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.14, 64), chrome);
  collar.position.y = 2.5; collar.castShadow = true;
  g.add(collar);
  const capG = new THREE.Group();
  capG.position.y = 2.59;
  g.add(capG);
  const capGold = new THREE.MeshPhysicalMaterial({ color: "#D9B979", metalness: 1, roughness: 0.18, clearcoat: 0.7, clearcoatRoughness: 0.08, envMapIntensity: 1.7, flatShading: true });
  const capCream = new THREE.MeshStandardMaterial({ color: "#EFE3C8", metalness: 0.25, roughness: 0.35, envMapIntensity: 0.8, flatShading: true });
  const addCap = (geo, y, m, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.y = y; me.rotation.y = ry; me.castShadow = true; capG.add(me); };
  const oct = Math.PI / 8;
  addCap(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 48), 0.04, capGold);
  addCap(new THREE.CylinderGeometry(0.39, 0.31, 0.62, 8), 0.39, capGold, oct);
  addCap(new THREE.CylinderGeometry(0.29, 0.39, 0.12, 8), 0.76, capGold, oct);
  addCap(new THREE.CylinderGeometry(0.27, 0.27, 0.01, 8), 0.825, capCream, oct);
  const capCanvas = document.createElement("canvas");
  capCanvas.width = 256; capCanvas.height = 384;
  const capTex = new THREE.CanvasTexture(capCanvas);
  capTex.colorSpace = THREE.SRGBColorSpace;
  owned.push(capTex);
  const capPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.33), new THREE.MeshStandardMaterial({ map: capTex, metalness: 0.3, roughness: 0.35, envMapIntensity: 0.8, transparent: true }));
  // Tilted to lie flat on the outward-leaning face of the frustum.
  capPanel.position.set(0, 0.39, ((0.31 + 0.39) / 2) * Math.cos(oct) + 0.004);
  capPanel.rotation.x = Math.atan((0.08 * Math.cos(oct)) / 0.62);
  capG.add(capPanel);

  // The atomiser: ferrule, shoulder, stem, black actuator with gold ring, nozzle, dip tube, mist.
  const atoG = new THREE.Group();
  atoG.visible = false;
  g.add(atoG);
  const blackM = new THREE.MeshStandardMaterial({ color: "#151311", roughness: 0.45, metalness: 0.2, envMapIntensity: 0.7 });
  const addA = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; atoG.add(m); return m; };
  addA(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 64), chrome, 0.055);
  addA(new THREE.CylinderGeometry(0.26, 0.3, 0.03, 64), chrome, 0.145);
  addA(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 24), chrome, 0.2);
  const act = [addA(new THREE.CylinderGeometry(0.15, 0.15, 0.17, 48), blackM, 0.325), addA(new THREE.CylinderGeometry(0.155, 0.155, 0.02, 48), chrome, 0.245)];
  const nozzle = addA(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16), chrome, 0.35);
  nozzle.rotation.x = Math.PI / 2; nozzle.position.z = 0.15;
  act.push(nozzle);
  act.forEach((m) => { m.userData.y0 = m.position.y; });
  const mistPos = new Float32Array(MIST_N * 3);
  const mistSeed = Array.from({ length: MIST_N }, () => ({ a: rand() * Math.PI * 2, r: Math.sqrt(rand()) * 0.32, v: 0.7 + rand() * 0.6, d: rand() * 0.35 }));
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: "#FFF8EC", size: 0.045, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
  mist.position.set(0, 0.35, 0.16); mist.renderOrder = 20; mist.frustumCulled = false;
  atoG.add(mist);
  const tubeL = 2.53 - CB - 0.04;
  const tube = addA(new THREE.CylinderGeometry(0.018, 0.018, tubeL, 12), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.2, transparent: true, opacity: 0.4, depthWrite: false }), -tubeL / 2 - 0.02);
  tube.castShadow = false; tube.renderOrder = 7;

  // Liquids: one cavity-shaped box per liquid, cut by three clipping planes.
  const planes = { oilTop: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), alcBot: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), alcTop: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0) };
  const liqGeo = new RoundedBoxGeometry(CW - 0.01, CH - 0.01, CD - 0.01, 3, 0.07);
  const oilMat = new THREE.MeshPhysicalMaterial({ color: "#B8893A", roughness: 0.18, clearcoat: 0.4, envMapIntensity: 0.5, side: THREE.DoubleSide, clippingPlanes: [planes.oilTop] });
  const alcMat = new THREE.MeshPhysicalMaterial({ color: ETHANOL.deep, roughness: 0.1, envMapIntensity: 0.5, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [planes.alcBot, planes.alcTop] });
  const oilM = new THREE.Mesh(liqGeo, oilMat), alcM = new THREE.Mesh(liqGeo, alcMat);
  oilM.position.y = alcM.position.y = CY; oilM.castShadow = true; alcM.renderOrder = 5;
  g.add(oilM, alcM);
  const surface = (mat, order) => { const h = new THREE.Object3D(), d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); d.rotation.x = -Math.PI / 2; d.renderOrder = order; h.add(d); scene.add(h); return { h, d }; };
  const oilSurf = surface(new THREE.MeshPhysicalMaterial({ color: "#B8893A", roughness: 0.06, clearcoat: 1, envMapIntensity: 0.8 }), 0);
  const alcSurf = surface(new THREE.MeshPhysicalMaterial({ color: ETHANOL.top, roughness: 0.04, clearcoat: 1, envMapIntensity: 0.9, transparent: true, opacity: 0.55, depthWrite: false }), 6);
  const ripH = new THREE.Object3D(), rip = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: "#FFF7EA", transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  rip.rotation.x = -Math.PI / 2; rip.renderOrder = 7;
  ripH.add(rip); scene.add(ripH);

  // The label: a gold plate drawn on a canvas, redrawn when the recipe changes.
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640; labelCanvas.height = 900;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 8;
  owned.push(labelTex);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.3, metalness: 0.6, envMapIntensity: 1.1, transparent: true }));
  label.position.set(0, CY + 0.1, DO + 0.004);
  g.add(label);

  // Effects: glass streaks, mix swirl, meniscus, caustics and pool, glints, splash, puff.
  const add = { transparent: true, depthWrite: false, ...LIGHT };
  const stripT = canvasTex(64, 256, (c, w, h) => {
    const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "rgba(255,255,255,0)"); gx.addColorStop(0.5, "rgba(255,255,255,1)"); gx.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gx; c.fillRect(0, 0, w, h); c.globalCompositeOperation = "destination-in";
    const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(0.15, "#000"); gy.addColorStop(0.85, "#000"); gy.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gy; c.fillRect(0, 0, w, h);
  });
  [[-0.66, 0.14, 0.55], [0.7, 0.07, 0.35]].forEach(([x, w, o]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.8), new THREE.MeshBasicMaterial({ map: stripT, opacity: o, ...add }));
    m.position.set(x, CY + 0.05, DO + 0.008); m.renderOrder = 13; g.add(m);
  });
  const swirlT = canvasTex(256, 256, (c, w, h) => {
    c.translate(w / 2, h / 2); c.lineCap = "round";
    for (let k = 0; k < 5; k++) {
      c.rotate((Math.PI * 2) / 5); c.beginPath();
      for (let i = 0; i <= 60; i++) { const t = i / 60, r = 8 + t * 118, a = t * 4.2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.strokeStyle = "rgba(255,246,228,.85)"; c.lineWidth = 9; c.stroke();
    }
  });
  const swirl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: swirlT, transparent: true, opacity: 0, depthWrite: false }));
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.003; swirl.renderOrder = 8;
  const menT = canvasTex(256, 256, (c, w, h) => {
    const b = 26;
    for (let i = 0; i < b; i++) {
      c.strokeStyle = `rgba(255,250,240,${(1 - i / b) ** 2 * 0.9})`; c.lineWidth = 1; c.beginPath();
      if (c.roundRect) c.roundRect(i + 0.5, i + 0.5, w - 2 * i - 1, h - 2 * i - 1, 60 - i); else c.rect(i, i, w - 2 * i, h - 2 * i);
      c.stroke();
    }
  });
  const menMat = new THREE.MeshBasicMaterial({ map: menT, opacity: 0.7, ...add });
  const meniscus = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), menMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = 8; return m; };
  const menO = meniscus(), menA = meniscus();
  const causT = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.globalCompositeOperation = "lighter"; c.shadowColor = "rgba(255,214,140,1)"; c.shadowBlur = 10;
    for (let i = 0; i < 140; i++) {
      const x = rand() * w, y = rand() * h, r = 14 + rand() * 46;
      c.beginPath();
      for (let j = 0; j <= 7; j++) { const an = (j / 7) * Math.PI * 2, rr = r * (0.7 + rand() * 0.5); c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
      c.closePath(); c.strokeStyle = `rgba(255,${(200 + rand() * 40) | 0},${(120 + rand() * 60) | 0},${0.25 + rand() * 0.35})`; c.lineWidth = 1.5 + rand() * 2.5; c.stroke();
    }
  }, true);
  const causMask = canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#888"); gr.addColorStop(1, "#000"); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
  const caus = [0, 1].map((i) => {
    const t2 = causT.clone(); t2.needsUpdate = true; t2.repeat.set(1.4 + i * 0.5, 1.4 + i * 0.5); owned.push(t2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), new THREE.MeshBasicMaterial({ map: t2, alphaMap: causMask, color: "#FFD9A0", opacity: 0, ...add }));
    m.rotation.x = -Math.PI / 2; m.position.set(0.62, 0.008 + i * 0.001, -0.6); m.renderOrder = 3; scene.add(m);
    return m;
  });
  const glowT = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,236,200,1)"); gr.addColorStop(0.3, "rgba(255,190,110,.45)"); gr.addColorStop(1, "rgba(255,170,80,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), new THREE.MeshBasicMaterial({ map: glowT, opacity: 0, ...add }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0.62, 0.007, -0.6); pool.renderOrder = 2;
  scene.add(pool);
  const starT = canvasTex(128, 128, (c) => {
    c.translate(64, 64);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, 20); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,240,210,0)");
    c.fillStyle = gr; c.fillRect(-64, -64, 128, 128);
    [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].forEach((an, i) => {
      c.save(); c.rotate(an);
      const L = i < 2 ? 62 : 30, lg = c.createLinearGradient(-L, 0, L, 0);
      lg.addColorStop(0, "rgba(255,240,210,0)"); lg.addColorStop(0.5, "rgba(255,255,255,.95)"); lg.addColorStop(1, "rgba(255,240,210,0)");
      c.fillStyle = lg; c.fillRect(-L, -1.5, L * 2, 3); c.restore();
    });
  });
  const glints = [[-0.33, 0.7, 0.2], [0.25, 0.07, 0.3], [0.36, 0.45, 0.12], [-0.3, 1.0, DO + 0.02]].map(([x, y, z], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starT, transparent: true, opacity: 0, depthWrite: false, depthTest: false, ...LIGHT }));
    sp.position.set(x, y, z); sp.scale.setScalar(i === 3 ? 0.26 : 0.34); sp.renderOrder = 31; sp.userData.ph = i * 0.27;
    return sp;
  });
  glints.slice(0, 3).forEach((sp) => capG.add(sp));
  g.add(glints[3]);
  const splashPos = new Float32Array(SPLASH_N * 3);
  const splashSeed = Array.from({ length: SPLASH_N }, () => ({ a: rand() * Math.PI * 2, v: 0.5 + rand() * 0.8, ph: rand() }));
  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute("position", new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: "#E8C98C", size: 0.035, transparent: true, opacity: 0, depthWrite: false }));
  splash.frustumCulled = false; splash.renderOrder = 6;
  scene.add(splash);
  const puffT = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,250,240,.9)"); gr.addColorStop(0.5, "rgba(255,250,240,.35)"); gr.addColorStop(1, "rgba(255,250,240,0)"); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, opacity: 0, depthWrite: false }));
  puff.visible = false; puff.position.set(0, 0.35, 0.5);
  atoG.add(puff);
  alcSurf.h.add(swirl, menA);
  oilSurf.h.add(menO);

  // The pour: a tapered stream, a bead at its head, and the falling drops.
  const strGeo = new THREE.CylinderGeometry(1, 0.55, 1, 24, 12, true);
  strGeo.translate(0, -0.5, 0);
  const strMat = new THREE.MeshPhysicalMaterial({ color: "#B8893A", roughness: 0.05, clearcoat: 1, envMapIntensity: 1.4, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const streamM = new THREE.Mesh(strGeo, strMat);
  streamM.visible = false; streamM.renderOrder = 4;
  scene.add(streamM);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), strMat);
  bead.visible = false;
  scene.add(bead);
  const dropGeo = new THREE.SphereGeometry(1, 24, 16);
  const dropMats = [0, 1, 2, 3].map((i) => new THREE.MeshPhysicalMaterial({ color: i === 3 ? ETHANOL.top : "#B8893A", roughness: 0.06, clearcoat: 1, envMapIntensity: 1.3, transparent: i === 3, opacity: i === 3 ? 0.85 : 1 }));
  const drops = DROPS.map((P) => { const m = new THREE.Mesh(dropGeo, dropMats[P.tier]); m.visible = false; scene.add(m); return m; });

  const v = new THREE.Vector3();
  const c2 = new THREE.Color();
  let dist = 9, W = 1, H = 1, level = 0;

  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    R.setSize(w, h, false);
    cam.aspect = w / h;
    const tf = Math.tan((cam.fov * Math.PI) / 360);
    dist = Math.max(2.55 / tf, 2.15 / (tf * cam.aspect));
    cam.updateProjectionMatrix();
    W = w; H = h;
  }
  resize();

  /** Redraws the label and the cap panel. text: { name, kind, figures, ar }. */
  function drawLabel({ name, kind, figures, ar }) {
    const c = labelCanvas.getContext("2d"), LW = labelCanvas.width, LH = labelCanvas.height;
    c.clearRect(0, 0, LW, LH);
    const rr = (x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
    const gr = c.createLinearGradient(0, 0, LW, LH);
    gr.addColorStop(0, "#E8CF98"); gr.addColorStop(0.45, "#C9A563"); gr.addColorStop(0.7, "#E2C68A"); gr.addColorStop(1, "#B08D57");
    rr(6, 6, LW - 12, LH - 12, 46); c.fillStyle = gr; c.fill();
    c.strokeStyle = "#4A3421"; c.lineWidth = 3; rr(30, 30, LW - 60, LH - 60, 30); c.stroke();
    c.lineWidth = 1.5; rr(42, 42, LW - 84, LH - 84, 22); c.stroke();
    c.fillStyle = "#2E2012"; c.textAlign = "center"; c.textBaseline = "middle";
    if (images.logo) { const lw = 300, lh = (lw * 527) / 488; c.drawImage(images.logo, (LW - lw) / 2, 70, lw, lh); }
    c.font = `italic 400 40px ${fonts.serif}`;
    c.fillText(kind, LW / 2, 470);
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(LW / 2 - 90, 520); c.lineTo(LW / 2 + 90, 520); c.stroke();
    const nm = (name || "").trim() || " ";
    c.direction = ar ? "rtl" : "ltr";
    const fam = ar ? fonts.arabic : fonts.serif, style = ar ? "400" : "italic 400";
    let fs = 96;
    do { c.font = `${style} ${fs}px ${fam}`; fs -= 6; } while (c.measureText(nm).width > LW - 140 && fs > 40);
    c.fillText(nm, LW / 2, 620);
    c.direction = "ltr";
    c.font = `400 34px ${fonts.sans}`;
    c.fillText(figures, LW / 2, LH - 130);
    labelTex.needsUpdate = true;

    const k = capCanvas.getContext("2d"), cw = capCanvas.width, ch = capCanvas.height;
    k.clearRect(0, 0, cw, ch); k.beginPath();
    if (k.roundRect) k.roundRect(8, 8, cw - 16, ch - 16, 40); else k.rect(8, 8, cw - 16, ch - 16);
    k.fillStyle = "#EFE3C8"; k.fill(); k.strokeStyle = "#B08D57"; k.lineWidth = 8; k.stroke();
    if (images.symbol) { const sh = 280, sw = (sh * 196) / 378; k.drawImage(images.symbol, (cw - sw) / 2, (ch - sh) / 2, sw, sh); }
    capTex.needsUpdate = true;
  }

  /** The size engraved on the base, e.g. "1 0 0  m L". */
  function drawEngrave(text) {
    const c = engCanvas.getContext("2d");
    c.clearRect(0, 0, 512, 80);
    c.fillStyle = "rgba(234,223,206,.6)"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `400 40px ${fonts.sans}`;
    c.fillText(text.split("").join(" "), 256, 40);
    engTex.needsUpdate = true;
  }

  /** Level 1: half the particles and a 1024 shadow map. (Level 2 is the caller's: dispose.) */
  function setQuality(next) {
    if (next === level) return;
    level = next;
    mistGeo.setDrawRange(0, level >= 1 ? MIST_N / 2 : MIST_N);
    splashGeo.setDrawRange(0, level >= 1 ? SPLASH_N / 2 : SPLASH_N);
    const size = level >= 1 ? 1024 : 2048;
    key.shadow.mapSize.set(size, size);
    if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
  }

  const project = (x, y, z) => { v.set(x, y, z).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };

  /**
   * One frame. s: { p, oil share c (0 to 1), shade, k (flacon scale), yaw,
   * pitch, heroT (seconds, the ending's clock) }.
   */
  function render(s) {
    const { p, c, shade, k = 1, yaw = 0, pitch = 0, heroT = 0 } = s;
    const tierT = B.tiers.map((w) => seg(w, p));
    const oT = oilT(p), aT = seg(B.alc, p), mT = seg(B.mix, p);
    const oilF = FULL * c * easeOut(oT), alcF = FULL * (1 - c) * aT;
    const oilTop = mixHex(shade, "#FFFFFF", 0.22), oilDeep = mixHex(shade, "#000000", 0.25), blend = mixHex(shade, BLEND_TOWARD, 0.35);
    const { lift, atomiser: aIn } = capState(p);
    const hA = heroAmount(p);

    // Camera.
    const K = cameraAt(p), d = dist * K.dist;
    cam.position.set(Math.sin(K.orbit) * d, K.camY + pitch * 3, Math.cos(K.orbit) * d);
    cam.lookAt(0, K.lookY, 0);
    cam.updateMatrixWorld();
    // Where the top edge of the frame meets the bottle's plane (z = 0): drops enter just above it.
    const ray = v.set(0, 1, 0.5).unproject(cam).sub(cam.position).normalize();
    const frameTop = cam.position.y + ray.y * (-cam.position.z / ray.z);
    const halfW = d * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect;

    // The flacon: scale spring, drag yaw, the mix sway, the ending's breathing.
    const sway = Math.sin(mT * Math.PI * 3) * 0.08 * (1 - mT);
    g.scale.setScalar(k);
    g.rotation.set(0, -0.42 + yaw + Math.sin(mT * Math.PI * 2) * 0.22 * (1 - mT) + Math.sin(heroT * 0.45) * 0.26 * hA, sway);
    g.updateMatrixWorld(true);

    capG.position.set(0.75 * lift, 2.6 + 0.5 * lift, 0.1 * lift);
    capG.rotation.set(0, 0, -0.5 * lift);
    atoG.visible = aIn > 0;
    const crimp = Math.sin(clamp((aIn - 0.85) / 0.15) * Math.PI) * 0.06;
    atoG.position.set(0, 2.53 + 1.5 * Math.pow(1 - aIn, 2), 0);
    atoG.scale.set(1 + crimp * 0.5, 1 - crimp, 1 + crimp * 0.5);
    atoG.rotation.y = (1 - aIn) * 1.2;
    const sp = seg(B.spray, p);
    const press = Math.sin(clamp(sp / 0.35) * Math.PI) * 0.05;
    act.forEach((m) => { m.position.y = m.userData.y0 - press; });
    mist.visible = sp > 0 && sp < 1;
    if (mist.visible) {
      for (let i = 0; i < MIST_N; i++) {
        const S = mistSeed[i], u = clamp((sp - 0.1 - S.d) / 0.55), dz = u * 1.5 * S.v;
        mistPos[i * 3] = Math.cos(S.a) * S.r * dz;
        mistPos[i * 3 + 1] = Math.sin(S.a) * S.r * dz - 0.12 * u * u;
        mistPos[i * 3 + 2] = dz;
      }
      mistGeo.attributes.position.needsUpdate = true;
      mist.material.opacity = 0.85 * clamp(sp / 0.15) * (1 - smooth(0.55, 1, sp));
      mist.material.size = 0.035 + 0.05 * sp;
    }

    // Liquid levels and colours.
    const toWorldY = (ly) => g.localToWorld(v.set(0, ly, 0)).y;
    const oilY = toWorldY(CB + CH * oilF), topY = toWorldY(CB + CH * (oilF + alcF)), bottomY = toWorldY(CB);
    planes.oilTop.constant = oilY;
    planes.alcBot.constant = -oilY;
    planes.alcTop.constant = topY;
    oilM.visible = oilF > 0.0005;
    alcM.visible = alcF > 0.0005;
    oilMat.color.set(shade).lerp(c2.set(blend), mT);
    alcMat.color.set(ETHANOL.deep).lerp(c2.set(blend), mT);
    alcMat.opacity = 0.42 + 0.58 * mT;
    oilSurf.d.material.color.set(oilTop).lerp(c2.set(blend), mT);
    alcSurf.d.material.color.set(ETHANOL.top).lerp(c2.set(mixHex(blend, "#FFFFFF", 0.15)), mT);
    alcSurf.d.material.opacity = 0.55 + 0.45 * mT;
    dropMats[0].color.set(oilTop); dropMats[1].color.set(shade); dropMats[2].color.set(oilDeep);

    const center = g.localToWorld(v.set(0, CY, 0)).clone();
    const place = (S, y, on) => {
      S.h.visible = on;
      S.h.position.set(center.x, y, center.z);
      S.h.rotation.y = g.rotation.y;
      S.d.scale.set((CW - 0.03) * k, (CD - 0.03) * k, 1);
    };
    place(oilSurf, oilY, oilM.visible && !alcM.visible);
    place(alcSurf, topY, alcM.visible);
    const sw = Math.sin(mT * Math.PI);
    swirl.material.opacity = 0.55 * sw; swirl.rotation.z = -mT * 10; swirl.visible = sw > 0.01;
    swirl.scale.copy(alcSurf.d.scale); menA.scale.copy(alcSurf.d.scale); menO.scale.copy(oilSurf.d.scale);

    // The ending: caustics, warm pool, glints.
    pool.material.opacity = 0.55 * hA;
    pool.visible = caus[0].visible = caus[1].visible = hA > 0.001;
    caus.forEach((m, i) => {
      m.material.opacity = (0.75 - 0.25 * i) * hA;
      m.material.map.offset.set(Math.sin(heroT * (0.23 + 0.11 * i) + i) * 0.12, heroT * (i ? -0.035 : 0.028));
      m.material.map.rotation = Math.sin(heroT * 0.17 + i * 2) * 0.08;
    });
    glints.forEach((gl, i) => {
      const w = Math.max(0, Math.sin((heroT * 0.42 + gl.userData.ph) * Math.PI * 2));
      gl.material.opacity = Math.pow(w, 14) * hA;
      gl.material.rotation = heroT * 0.6 + i;
    });
    puff.visible = sp > 0.1 && sp < 1;
    const ps = 0.15 + 0.9 * sp;
    puff.scale.set(ps, ps * 0.75, 1);
    puff.position.z = 0.25 + 0.7 * sp;
    puff.material.opacity = 0.55 * clamp((sp - 0.1) / 0.2) * (1 - smooth(0.4, 1, sp));

    // The stream.
    const mouth = g.localToWorld(v.set(0, 2.62, 0)).clone();
    const surfY = Math.max(topY, bottomY + 0.02);
    const headY = mouth.y + 1.25 * k;
    const ST = streamAt(p), sOn = ST.on;
    strMat.color.set(ST.alc ? ETHANOL.top : shade);
    strMat.opacity = ST.alc ? 0.8 : 1;
    const len = Math.max(0.001, headY - surfY);
    const wR = (ST.alc ? 0.03 : 0.042) * Math.max(0.75, k) * (0.25 + 0.75 * sOn) * (1 + 0.12 * Math.sin(p * 520));
    streamM.visible = bead.visible = sOn > 0.02;
    streamM.position.set(mouth.x, headY, mouth.z);
    streamM.scale.set(wR, len * (0.15 + 0.85 * smooth(0, 0.6, sOn)), wR);
    bead.position.set(mouth.x, headY, mouth.z);
    bead.scale.set(wR * 1.15, wR * 1.4, wR * 1.15);

    // Falling note drops, with their names projected onto them (half of them at level 1).
    const labels = overlay?.labels?.() || [];
    DROPS.forEach((P, i) => {
      const m = drops[i], el = labels[i];
      const u = (tierT[Math.min(P.tier, 2)] - P.s) / 0.4;
      if (P.tier === 3 || u <= 0 || u >= 1 || (level >= 1 && i % 2)) { m.visible = false; if (el) el.style.opacity = 0; return; }
      // Drops appear just inside the top of the frame (the prototype's 4.7+ sat out of view on
      // wide screens, so the names faded unseen) and join the stream above the neck.
      const x0 = (P.x - 0.5) * 2 * halfW * 0.9, y0 = frameTop - 0.12 - P.r * 0.4, z0 = (P.z - 0.5) * 1.6;
      const joinY = mouth.y + 0.55 * k;
      const t = u, kk = smooth(0.25, 1, t), wob = Math.sin(t * 7 + P.ph) * 0.22 * (1 - t);
      const y = y0 + (joinY - y0) * t * t, x = x0 + (mouth.x - x0) * kk + wob, z = z0 + (mouth.z - z0) * kk;
      const f = smooth(0.5, 0.85, t);
      const bs = 0.07 * Math.max(0.7, k) * (1 - smooth(0.82, 1, t));
      m.visible = bs > 0.001;
      m.position.set(x, y, z);
      const sc = bs * f;
      m.scale.set(sc, sc * (1 + 0.8 * smooth(0.6, 1, t)), sc);
      if (!el) return;
      if (f >= 1) { el.style.opacity = 0; return; }
      const [sx, sy] = project(x, y, z);
      el.style.opacity = 1;
      el.style.transform = `translate(${sx}px,${sy}px)`;
      const span = el.firstElementChild;
      if (span) { span.style.opacity = clamp(t / 0.1) * (1 - f); span.style.transform = `translate(-50%,-50%) rotate(${Math.sin(P.ph + u * 5) * 6 * (1 - f)}deg)`; }
    });

    // Ripple and splash where the stream meets the liquid.
    const s01 = (p * 70) % 1, onLiquid = oilM.visible || alcM.visible;
    ripH.visible = sOn > 0.3 && onLiquid;
    const rr = Math.min(CW, CD) * 0.5 * k * (0.12 + 0.8 * s01);
    ripH.position.set(center.x, surfY + 0.004, center.z);
    ripH.rotation.y = g.rotation.y;
    rip.scale.set(rr, rr, 1);
    rip.material.opacity = 0.7 * (1 - s01) * sOn;
    splash.visible = ripH.visible;
    if (splash.visible) {
      for (let i = 0; i < SPLASH_N; i++) {
        const S = splashSeed[i], t = (p * 90 + S.ph) % 1, r2 = (0.04 + 0.3 * t * S.v) * k;
        splashPos[i * 3] = mouth.x + Math.cos(S.a) * r2;
        splashPos[i * 3 + 1] = surfY + 0.02 + 4 * t * (1 - t) * 0.22 * S.v * k;
        splashPos[i * 3 + 2] = mouth.z + Math.sin(S.a) * r2;
      }
      splashGeo.attributes.position.needsUpdate = true;
      splash.material.opacity = 0.9 * sOn;
      splash.material.color.set(ST.alc ? "#F4F7F2" : shade);
    }

    // The readout pill sits under the front of the pan.
    if (overlay?.readout) {
      const [, ry] = project(0, -0.37, 0.9);
      overlay.readout.style.top = `${Math.min(H - 44, Math.max(0, ry))}px`;
    }
    R.render(scene, cam);
  }

  function dispose() {
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { m.map?.dispose?.(); m.alphaMap?.dispose?.(); m.dispose(); });
    });
    owned.forEach((t) => t.dispose());
    envTarget.dispose();
    key.shadow.map?.dispose();
    R.dispose();
    R.forceContextLoss?.();
    R.domElement.remove();
  }

  return { render, resize, drawLabel, drawEngrave, setQuality, dispose, canvas: R.domElement };
}
