/* Avatar 3D da Aeri (three.js 0.169 + @pixiv/three-vrm 3.1), mesma lógica do Toogle:
   respiração, piscar, olhar/cabeça, expressões por resposta e boca mexendo enquanto ela "fala".
   Se WebGL ou o modelo falharem, fica o avatar 2D (classe .sem-3d). */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const palco = document.getElementById("palco");
const canvas = document.getElementById("avatar");
const status = document.getElementById("carregando");
const pct = document.getElementById("pct");
const semAvatar = motivo => { console.warn("Aeri 2D:", motivo); palco.classList.add("sem-3d"); status.textContent = ""; window.aeri.ok3d = false; };

function temWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

if (!temWebGL()) semAvatar("sem WebGL");
else iniciar().catch(e => semAvatar(e?.message || e));

async function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(0.6, 1.6, 2); scene.add(sol);

  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  const gltf = await loader.loadAsync("aeri.vrm", e => { if (e.total) pct.textContent = Math.round(e.loaded / e.total * 100) + "%"; });
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error("arquivo sem dados VRM");
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons?.(gltf.scene);
  VRMUtils.rotateVRM0(vrm);          // só gira se for VRM 0.x
  vrm.scene.traverse(o => { o.frustumCulled = false; });
  scene.add(vrm.scene);

  const H = vrm.humanoid, bone = n => H.getNormalizedBoneNode(n);
  // tira da pose em T: braços pra baixo, levemente pra frente
  const pose = { leftUpperArm: [0, 0, -1.22], rightUpperArm: [0, 0, 1.22], leftLowerArm: [0, -0.25, 0], rightLowerArm: [0, 0.25, 0] };
  for (const [n, r] of Object.entries(pose)) bone(n)?.rotation.set(...r);

  // enquadra do peito pra cima (estilo atendente de balcão)
  vrm.scene.updateMatrixWorld(true);
  const head = new THREE.Vector3(); (bone("head") || vrm.scene).getWorldPosition(head);
  const alvo = new THREE.Vector3(0, head.y - 0.05, 0);
  function enquadrar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const alturaVisivel = 0.72, larguraVisivel = 0.6;   // metros: do peito pra cima
    const dist = Math.max(alturaVisivel / 2 / tan, larguraVisivel / 2 / (tan * camera.aspect));
    camera.position.set(0, alvo.y + 0.02, dist);
    camera.lookAt(alvo);
    camera.updateProjectionMatrix();
  }
  enquadrar();
  new ResizeObserver(enquadrar).observe(palco);

  // olhar segue a câmera (ou o dedo/mouse, de leve)
  const olhar = new THREE.Object3D(); scene.add(olhar);
  if (vrm.lookAt) vrm.lookAt.target = olhar;
  let mx = 0, my = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  const E = vrm.expressionManager;
  const set = (n, v) => { try { E?.setValue(n, v); } catch {} };
  const HUMORES = ["happy", "sad", "angry", "relaxed", "surprised"];
  const humorAtual = Object.fromEntries(HUMORES.map(h => [h, 0]));
  let piscaT = 2 + Math.random() * 3, piscando = 0, bocaSuave = 0;
  const falaFake = t => 0.15 + 0.6 * Math.abs(Math.sin(t / 95) * Math.sin(t / 210));

  status.textContent = "";
  window.aeri.ok3d = true;
  document.documentElement.dataset.aeri3d = "ok";   // usado pelo teste automático

  const relogio = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(relogio.getDelta(), 0.1), t = relogio.elapsedTime, ms = performance.now();
    const falando = window.aeri.nivel !== null;

    // respiração e balanço leve
    const resp = Math.sin(t * 1.6);
    bone("spine") && (bone("spine").rotation.x = resp * 0.012);
    bone("chest") && (bone("chest").rotation.x = resp * 0.018);
    bone("upperChest") && (bone("upperChest").rotation.x = resp * 0.01);
    bone("hips") && (bone("hips").rotation.y = Math.sin(t * 0.5) * 0.03);
    bone("leftUpperArm") && (bone("leftUpperArm").rotation.z = -1.22 + resp * 0.015);
    bone("rightUpperArm") && (bone("rightUpperArm").rotation.z = 1.22 - resp * 0.015);
    // cabeça: olha pro visitante e acena um pouco quando fala
    if (bone("neck")) {
      bone("neck").rotation.y = Math.sin(t * 0.7) * 0.06 + mx * 0.15;
      bone("neck").rotation.x = (falando ? Math.sin(t * 6) * 0.025 : 0) + Math.sin(t * 0.9) * 0.02 + my * 0.08;
      bone("neck").rotation.z = Math.sin(t * 0.45) * 0.035;
    }
    olhar.position.set(camera.position.x + mx * 0.6, camera.position.y - my * 0.4, camera.position.z);

    // piscar
    piscaT -= dt;
    if (piscaT <= 0) { piscando = 0.16; piscaT = 2.5 + Math.random() * 3.5; }
    if (piscando > 0) piscando -= dt;
    const b = piscando > 0 ? Math.sin((1 - piscando / 0.16) * Math.PI) : 0;

    // expressão (humor da resposta) com transição suave
    const humor = window.aeri.humor;
    for (const h of HUMORES) {
      const alvoH = h === humor ? (h === "happy" ? 0.7 : 0.55) : 0;
      humorAtual[h] += (alvoH - humorAtual[h]) * Math.min(1, dt * 6);
      set(h, humorAtual[h]);
    }
    set("blink", humorAtual.happy > 0.5 ? b * 0.4 : b);

    // boca: segue um ritmo de fala enquanto ela "digita"/fala
    const alvoBoca = falando ? falaFake(ms) : 0;
    bocaSuave += (alvoBoca - bocaSuave) * Math.min(1, dt * 18);
    set("aa", bocaSuave * 0.8);
    set("oh", falando ? bocaSuave * 0.3 * (0.5 + 0.5 * Math.sin(ms / 170)) : 0);

    vrm.update(dt);
    renderer.render(scene, camera);
  });
}
