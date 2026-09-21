// 2.5D 版：場景用 Three.js 做成 3D，澤龜是永遠轉向鏡頭的 2D 圖片。
// 烏龜的行為、食物、泡泡都沿用 2D 版 Tank 的邏輯（1000×600 的邏輯座標），這裡只負責換成 3D 來畫。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Tank } from './tank.js';
import { W, H, WATER_TOP, LAMP_X, AIR_STONE_X, groundY, sampleGround } from './terrain.js';
import { drawHeart } from './turtle-shape.js';
import { CONFIG } from './config.js';
import { isNight } from './sim.js';

// 1 個 3D 單位 = 邏輯座標 10px；缸子寬 100、高 60、深 44
const S = 0.1;
const TW = W * S, TH = H * S, TD = 44;
const X = x => (x - W / 2) * S;
const Y = y => (H - y) * S;
const WATER_Y = Y(WATER_TOP);
const SHORE_X = (() => { let x = 0; while (x < W && groundY(x) > WATER_TOP) x += 2; return x; })();
const LAMP_POS = new THREE.Vector3(X(LAMP_X), TH + 4, 0);

const rand = (a, b) => a + Math.random() * (b - a);

// 烏龜貼圖：512×512 的 canvas，背甲中心在正中央、背甲寬 SHELL_TEX px
const TEX = 512, SHELL_TEX = 160;
// 3D 場景裡烏龜照實際比例會太小，畫面上放大一點（不影響遊戲邏輯）
const TURTLE_SCALE = 1.4;
// 食物也一樣，照實際大小（約 1 公分）在畫面上幾乎看不到
const FOOD_SCALE = 2.2;

export class Tank3D extends Tank {
  constructor(canvas, getState, assets, hooks) {
    super(canvas, getState, assets, hooks);
    this.dayF = null;
    this.initScene();
    // 父類別建構時已經建好烏龜，那時場景還沒好，現在補建牠們的 3D 物件
    for (const agent of this.agents.values()) this.onAgentAdded(agent);
    this.resize();
    canvas.addEventListener('pointerup', e => this.onPointerUp(e));
  }

  // ---------- 場景建立 ----------

  initScene() {
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas: this.c, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = this.scene = new THREE.Scene();
    this.dayBg = new THREE.Color('#efe6d2');
    this.nightBg = new THREE.Color('#1a2140');
    scene.background = this.dayBg.clone();

    const cam = this.camera = new THREE.PerspectiveCamera(40, W / H, 1, 1000);
    cam.position.set(0, 46, 110);
    const ctl = this.controls = new OrbitControls(cam, this.c);
    ctl.target.set(0, 28, 0);
    ctl.enableDamping = true;
    ctl.enablePan = false;
    ctl.minDistance = 60;
    ctl.maxDistance = 180;
    ctl.minPolarAngle = 0.75;
    ctl.maxPolarAngle = 1.62;
    ctl.minAzimuthAngle = -1.1;
    ctl.maxAzimuthAngle = 1.1;
    ctl.update();

    this.hemi = new THREE.HemisphereLight(0xfff6e0, 0x6b5a40, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.position.set(-60, 120, 90);
    scene.add(this.hemi, this.sun);

    this.buildRoom();
    this.buildTerrain();
    this.buildWaterAndGlass();
    this.buildLamp();
    this.buildPlants();
    this.buildTurtle();
    this.buildParticles();
  }

  buildRoom() {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(260, 4, 130),
      new THREE.MeshStandardMaterial({ color: 0x9a7350, roughness: 0.8 }),
    );
    table.position.set(0, -3, 0);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 260),
      new THREE.MeshStandardMaterial({ color: 0xe9dfc9, roughness: 1 }),
    );
    wall.position.set(0, 80, -70);
    this.scene.add(table, wall);
  }

  // 地形：把 terrain.js 的剖面往深度方向擠出來。水面下是砂，水面上是土和青苔。
  buildTerrain() {
    const shape = new THREE.Shape();
    shape.moveTo(X(0), 0);
    for (const [x, y] of sampleGround(10)) shape.lineTo(X(x), Y(y));
    shape.lineTo(X(W), 0);
    shape.closePath();

    const depth = TD - 0.6;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -depth / 2);

    const sand = new THREE.Color('#c9b48c');
    const soil = new THREE.Color('#8f7a5c');
    const moss = new THREE.Color('#7d9a4f');
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > Y(150)) c.copy(moss);
      else if (y > WATER_Y + 0.3) c.copy(soil);
      else c.copy(sand).multiplyScalar(0.85 + 0.15 * (y / WATER_Y));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 群組 0 是前後兩片剖面，群組 1 是表面
    const terrain = new THREE.Mesh(geo, [
      new THREE.MeshStandardMaterial({ color: 0x9c8565, roughness: 1 }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    ]);
    this.scene.add(terrain);

    // 水底的小石子
    const pebbleColors = [0x9c8a66, 0xcbb995, 0x877556, 0xd8c9a8].map(v => new THREE.Color(v));
    const pebbles = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      500,
    );
    const m = new THREE.Matrix4();
    for (let i = 0; i < pebbles.count; i++) {
      const x = rand(5, SHORE_X - 10);
      const r = rand(0.35, 0.9);
      m.compose(
        new THREE.Vector3(X(x), Y(groundY(x)), rand(-TD / 2 + 1, TD / 2 - 1)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), 0)),
        new THREE.Vector3(r, r * 0.7, r),
      );
      pebbles.setMatrixAt(i, m);
      pebbles.setColorAt(i, pebbleColors[i % 4]);
    }
    this.scene.add(pebbles);

    // 曬台上的大石頭
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xa28c6a, roughness: 0.95, flatShading: true });
    for (const [x, z, sx, sy, sz] of [[960, -12, 5, 2.2, 5], [985, 10, 4, 1.8, 4], [905, -17, 3.5, 1.6, 3], [940, 16, 3, 1.4, 3]]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockMat);
      rock.scale.set(sx, sy, sz);
      rock.position.set(X(x), Y(groundY(x)), z);
      rock.rotation.y = rand(0, 3);
      this.scene.add(rock);
    }

    // 打氣石
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x7d7d82 }),
    );
    stone.position.set(X(AIR_STONE_X), Y(groundY(AIR_STONE_X)) + 0.6, -14);
    this.scene.add(stone);
  }

  buildWaterAndGlass() {
    const scene = this.scene;
    const waterW = SHORE_X * S;
    const waterX = X(0) + waterW / 2;

    this.cleanWater = new THREE.Color('#6cc0cc');
    this.dirtyWater = new THREE.Color('#6d7436');
    this.waterMat = new THREE.MeshStandardMaterial({
      color: this.cleanWater.clone(), transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.2,
    });
    const water = new THREE.Mesh(new THREE.BoxGeometry(waterW, WATER_Y, TD - 0.4), this.waterMat);
    water.position.set(waterX, WATER_Y / 2, 0);
    water.renderOrder = 1;
    scene.add(water);

    // 水面（會起伏）：只到岸邊
    const surfGeo = new THREE.PlaneGeometry(waterW, TD - 0.4, 40, 18);
    surfGeo.rotateX(-Math.PI / 2);
    this.surfBase = surfGeo.attributes.position.array.slice();
    this.surface = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({
      color: 0xbfe8ee, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide,
    }));
    this.surface.position.set(waterX, WATER_Y, 0);
    this.surface.renderOrder = 2;
    scene.add(this.surface);

    // 玻璃與邊框
    const glassGeo = new THREE.BoxGeometry(TW, TH, TD);
    const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, roughness: 0.05,
    }));
    glass.position.y = TH / 2;
    glass.renderOrder = 3;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeo), new THREE.LineBasicMaterial({ color: 0x2c2c2c }));
    edges.position.y = TH / 2;
    const base = new THREE.Mesh(new THREE.BoxGeometry(TW + 1.5, 1.5, TD + 1.5), new THREE.MeshStandardMaterial({ color: 0x2c2c2c }));
    base.position.y = -0.4;
    scene.add(glass, edges, base);
  }

  buildLamp() {
    const scene = this.scene;
    const dark = new THREE.MeshStandardMaterial({ color: 0x4a4a4f, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 40, 6), dark);
    cord.position.set(LAMP_POS.x, LAMP_POS.y + 24, LAMP_POS.z);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(6, 6, 24, 1, true), dark);
    hood.position.set(LAMP_POS.x, LAMP_POS.y + 3, LAMP_POS.z);
    this.bulbMat = new THREE.MeshStandardMaterial({ color: 0xcfcfc6, emissive: 0x000000 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), this.bulbMat);
    bulb.position.copy(LAMP_POS).add(new THREE.Vector3(0, 0.8, 0));
    scene.add(cord, hood, bulb);

    const baskY = Y(groundY(LAMP_X));
    this.lampLight = new THREE.SpotLight(0xffd27a, 0, 90, 0.55, 0.6, 0);
    this.lampLight.position.copy(LAMP_POS);
    this.lampLight.target.position.set(LAMP_POS.x, baskY, 0);
    scene.add(this.lampLight, this.lampLight.target);

    const coneH = LAMP_POS.y - baskY;
    this.lightCone = new THREE.Mesh(
      new THREE.ConeGeometry(11, coneH, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe28c, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    this.lightCone.position.set(LAMP_POS.x, LAMP_POS.y - coneH / 2, LAMP_POS.z);
    this.lightCone.renderOrder = 4;
    scene.add(this.lightCone);
  }

  buildPlants() {
    this.blades = [];
    const mats = {
      submerged: [0x3f7431, 0x4f8a3c].map(c => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 })),
      emergent: [0x5b8a32, 0x6d9a3c].map(c => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 })),
    };
    for (const p of this.plants) {
      const z = p.emergent ? rand(-12, 4) : rand(-18, -9);
      const baseY = Y(groundY(p.x));
      for (let i = 0; i < 4; i++) {
        const h = (p.h - i * 18) * S;
        const geo = new THREE.PlaneGeometry(p.emergent ? 0.9 : 1.3, h, 1, 10);
        geo.translate(0, h / 2, 0);
        const mesh = new THREE.Mesh(geo, mats[p.emergent ? 'emergent' : 'submerged'][i % 2]);
        mesh.position.set(X(p.x) + i * 0.7 - 1, baseY, z + rand(-2, 2));
        mesh.rotation.set(0, rand(-0.6, 0.6), p.emergent ? (i - 1.5) * 0.08 : 0);
        this.scene.add(mesh);
        this.blades.push({ mesh, h, base: geo.attributes.position.array.slice(), phase: p.p + i, amp: p.emergent ? 0.4 : 1.8 });
      }
    }
  }

  buildTurtle() {
    this.turtleViews = new Map(); // 烏龜 id → 這隻烏龜的 3D 物件

    const heartTex = canvasTexture(64, 64, ctx => { ctx.fillStyle = '#ef6f8f'; drawHeart(ctx, 32, 34, 22); });
    this.heartSprites = Array.from({ length: 12 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
      sp.scale.set(3, 3, 1);
      sp.visible = false;
      this.scene.add(sp);
      return sp;
    });
    this.zTex = canvasTexture(64, 64, ctx => {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('z', 32, 34);
    });
  }

  // 每隻烏龜：一片轉向鏡頭的貼圖、頭上的名字、睡覺時的 zzz
  onAgentAdded(agent) {
    if (!this.scene) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEX;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }),
    );
    mesh.userData.agentId = agent.id;

    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nameTex = new THREE.CanvasTexture(nameCanvas);
    nameTex.colorSpace = THREE.SRGBColorSpace;
    const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false, depthTest: false }));
    name.scale.set(12, 3, 1);
    name.renderOrder = 10;

    const zzz = Array.from({ length: 3 }, (_, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.zTex, transparent: true, depthWrite: false }));
      sp.scale.setScalar(1.5 + i * 0.6);
      return sp;
    });

    this.scene.add(mesh, name, ...zzz);
    this.turtleViews.set(agent.id, { mesh, canvas, ctx: canvas.getContext('2d'), tex, name, nameCanvas, nameTex, nameKey: '', zzz });
  }

  onAgentRemoved(agent) {
    const v = this.turtleViews?.get(agent.id);
    if (!v) return;
    this.scene.remove(v.mesh, v.name, ...v.zzz);
    v.tex.dispose();
    v.nameTex.dispose();
    this.turtleViews.delete(agent.id);
  }

  buildParticles() {
    this.bubbleMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }),
      150,
    );
    this.bubbleMesh.count = 0;
    this.bubbleMesh.renderOrder = 2;
    this.scene.add(this.bubbleMesh);

    // 水髒時漂浮的雜質
    const n = 300;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = rand(5, SHORE_X - 5);
      pos[i * 3] = X(x);
      pos[i * 3 + 1] = rand(Y(groundY(x)) + 0.5, WATER_Y - 0.5);
      pos[i * 3 + 2] = rand(-TD / 2 + 1, TD / 2 - 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motePoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x5a5028, size: 0.45, transparent: true, opacity: 0.7 }));
    this.moteCount = n;
    this.scene.add(this.motePoints);

    this.foodMeshes = new Map();
    // 菜葉：一片中間微微拱起的葉子
    const leaf = new THREE.PlaneGeometry(2.2, 1.3, 6, 3);
    const lp = leaf.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const x = lp.getX(i), y = lp.getY(i);
      lp.setX(i, x * (1 - (y / 0.65) ** 2 * 0.25)); // 兩端收窄
      lp.setZ(i, -(x * x) * 0.12 - Math.abs(y) * 0.15);
    }
    leaf.rotateX(-Math.PI / 2);
    leaf.computeVertexNormals();
    this.foodGeo = {
      pellet: new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10).rotateZ(Math.PI / 2),
      shrimp: new THREE.TorusGeometry(0.55, 0.22, 8, 14, Math.PI * 1.3),
      veggie: leaf,
    };
    this.foodMat = {
      pellet: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }),
      shrimp: new THREE.MeshStandardMaterial({ color: 0xe58a5c, roughness: 0.6 }),
      veggie: new THREE.MeshStandardMaterial({ color: 0x7cc454, side: THREE.DoubleSide, roughness: 0.7 }),
    };

    // 落水漣漪
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.rippleMeshes = Array.from({ length: 16 }, () => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), rippleMat.clone());
      ring.renderOrder = 3;
      ring.visible = false;
      this.scene.add(ring);
      return ring;
    });
    this.rottenMat = new THREE.MeshStandardMaterial({ color: 0x6d6440 });
  }

  // ---------- 覆寫 2D 版的部分行為 ----------

  resize() {
    if (!this.renderer) return; // 父類別建構時會先呼叫一次，那時場景還沒建好
    const r = this.c.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }

  // 拖曳是轉鏡頭，只有「點一下」才算摸烏龜
  onPointer(e) {
    this.downAt = { x: e.clientX, y: e.clientY };
  }

  onPointerUp(e) {
    if (!this.downAt || Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6) return;
    const r = this.c.getBoundingClientRect();
    const ndc = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    if (this.tool) {
      const p = this.dropPoint(ray.ray);
      if (this.dropFoodAt(this.tool, p.x / S + W / 2, p.z)) this.hooks.onDrop(this.tool);
      return;
    }
    const meshes = [...this.turtleViews.values()].map(v => v.mesh);
    const hit = ray.intersectObjects(meshes)[0];
    this.clickAgent(hit ? this.agents.get(hit.object.userData.agentId) : null);
  }

  // 點擊的位置換算成要在哪裡丟食物：
  // 點在水面附近 → 用視線和水面的交點；點在水中（視線先穿過前面的玻璃）→ 用缸子中間那個深度
  dropPoint(ray) {
    const p = new THREE.Vector3();
    const inside = v => Math.abs(v.z) < TD / 2 - 3 && v.x > X(0) && v.x < X(W);
    if (ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_Y), p) && inside(p)) return p;
    ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), p);
    p.z = rand(-6, 6);
    return p;
  }

  // ---------- 繪圖 ----------

  draw() {
    const s = this.getState();
    const dirt = 1 - s.tank.water / 100;

    this.controls.update();
    this.updateLighting(s);
    this.updateWater(dirt);
    this.updatePlants();
    this.placedNames = [];
    for (const agent of this.agents.values()) this.updateTurtleView(agent);
    this.updateFoodMeshes();
    this.updateBubbles3d();
    this.updateOverlays();

    this.renderer.render(this.scene, this.camera);
  }

  updateLighting(s) {
    const target = isNight(s) ? 0 : 1;
    this.dayF = this.dayF === null ? target : this.dayF + (target - this.dayF) * 0.03;
    const f = this.dayF;
    this.sun.intensity = 0.1 + 1.5 * f;
    this.hemi.intensity = 0.25 + 0.85 * f;
    this.scene.background.copy(this.nightBg).lerp(this.dayBg, f);

    const on = s.lamp.on;
    this.lampLight.intensity += ((on ? 4 : 0) - this.lampLight.intensity) * 0.1;
    this.lightCone.visible = on;
    this.bulbMat.emissive.set(on ? 0xffe9a0 : 0x000000);
  }

  updateWater(dirt) {
    this.waterMat.color.copy(this.cleanWater).lerp(this.dirtyWater, dirt);
    this.waterMat.opacity = 0.28 + dirt * 0.35;

    const pos = this.surface.geometry.attributes.position;
    const base = this.surfBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.3 + this.time * 2) * 0.25 + Math.cos(z * 0.35 + this.time * 1.6) * 0.2;
    }
    pos.needsUpdate = true;
    this.surface.geometry.computeVertexNormals();

    this.motePoints.geometry.setDrawRange(0, Math.floor(this.moteCount * dirt));
    this.motePoints.position.y = Math.sin(this.time * 0.4) * 0.6;
  }

  updatePlants() {
    for (const b of this.blades) {
      const pos = b.mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = b.base[i * 3 + 1];
        const k = (y / b.h) ** 2;
        pos.array[i * 3] = b.base[i * 3] + Math.sin(this.time * 0.8 + b.phase) * b.amp * k;
        pos.array[i * 3 + 2] = b.base[i * 3 + 2] + Math.cos(this.time * 0.6 + b.phase) * b.amp * 0.45 * k;
      }
      pos.needsUpdate = true;
    }
  }

  updateTurtleView(agent) {
    const v = this.turtleViews.get(agent.id);
    if (!v) return;
    const t = agent.t;
    const f = agent.frame();

    const ctx = v.ctx;
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.save();
    ctx.translate(TEX / 2, TEX / 2);
    agent.paint(ctx, f, SHELL_TEX);
    ctx.restore();
    v.tex.needsUpdate = true;

    const mesh = v.mesh;
    const { foot, h } = agent.size();
    const size = f.shell * S * TURTLE_SCALE * TEX / SHELL_TEX;
    // 放大後腳底也要貼地：以背甲中心下方 foot 的位置為準往上撐
    const lift = t.grounded ? foot * (TURTLE_SCALE - 1) : 0;
    mesh.position.set(X(t.x), Y(t.y + f.dy * TURTLE_SCALE - lift), agent.z);
    mesh.scale.set(size * t.face * f.m.sx, size * f.m.sy, 1);
    // 只繞 Y 軸轉向鏡頭，烏龜保持直立
    const cam = this.camera.position;
    mesh.rotation.set(0, Math.atan2(cam.x - mesh.position.x, cam.z - mesh.position.z), -(t.tilt + f.m.rot) * t.face);

    // 名字（有改名或選取狀態改變時才重畫）
    const selected = agent.id === this.selectedId;
    const key = `${agent.turtle.name}|${selected}`;
    if (key !== v.nameKey) {
      v.nameKey = key;
      drawNameTag(v.nameCanvas, agent.turtle.name, selected);
      v.nameTex.needsUpdate = true;
    }
    // 跟別隻的名字太近就往上錯開
    const nx = X(t.x);
    let ny = Y(t.y - h * TURTLE_SCALE) + 3;
    while (this.placedNames.some(p => Math.abs(p.x - nx) < 9 && Math.abs(p.y - ny) < 2.6)) ny += 2.6;
    this.placedNames.push({ x: nx, y: ny });
    v.name.position.set(nx, ny, agent.z);
  }

  // 水面高度（跟 updateWater 的波浪公式一樣），讓漂浮的食物跟著起伏
  surfaceHeight(wx, wz) {
    const x = wx - this.surface.position.x;
    return WATER_Y + Math.sin(x * 0.3 + this.time * 2) * 0.25 + Math.cos(wz * 0.35 + this.time * 1.6) * 0.2;
  }

  updateFoodMeshes() {
    const alive = new Set(this.food);
    for (const [f, mesh] of this.foodMeshes) {
      if (!alive.has(f)) {
        this.scene.remove(mesh);
        this.foodMeshes.delete(f);
      }
    }
    for (const f of this.food) {
      let mesh = this.foodMeshes.get(f);
      if (!mesh) {
        mesh = new THREE.Mesh(this.foodGeo[f.type], this.foodMat[f.type]);
        mesh.scale.setScalar(FOOD_SCALE);
        this.foodMeshes.set(f, mesh);
        this.scene.add(mesh);
      }
      const wx = X(f.x);
      const wz = f.z ?? 0;
      if (f.floating) {
        // 浮在水面：大部分泡在水裡，跟著波浪上下、慢慢打轉
        mesh.position.set(wx, this.surfaceHeight(wx, wz) - 0.12 * FOOD_SCALE, wz);
        mesh.rotation.set(Math.sin(this.time * 1.7 + f.seed) * 0.15, f.seed + this.time * 0.2 * f.spin, Math.cos(this.time * 1.4 + f.seed) * 0.15);
      } else {
        mesh.position.set(wx, Y(f.y), wz);
        if (f.type === 'veggie') {
          // 菜葉像落葉一樣左右擺著沉下去
          mesh.rotation.set(Math.sin(this.time * 2 + f.seed) * 0.5, f.seed, Math.cos(this.time * 1.6 + f.seed) * 0.4);
        } else if (f.vy > 1) {
          // 下沉時慢慢翻滾，沉到底就停下來
          mesh.rotation.x += f.spin * 0.02;
          mesh.rotation.z += f.spin * 0.013;
        }
      }
      if (f.age > CONFIG.foodRotSeconds * 0.6) mesh.material = this.rottenMat;
    }

    this.rippleMeshes.forEach((ring, i) => {
      const r = this.ripples[i];
      ring.visible = !!r;
      if (!r) return;
      const k = r.age / 1.5;
      ring.position.set(X(r.x), WATER_Y + 0.05, r.z ?? 0);
      ring.scale.setScalar(0.6 + k * 4);
      ring.material.opacity = 0.7 * (1 - k);
    });
  }

  updateBubbles3d() {
    const m = new THREE.Matrix4();
    const bubbles = this.bubbles.slice(0, 150);
    bubbles.forEach((b, i) => {
      const r = b.r * S * 0.9;
      m.makeScale(r, r, r).setPosition(X(b.x), Y(b.y), -14 + Math.sin(b.p) * 0.8);
      this.bubbleMesh.setMatrixAt(i, m);
    });
    this.bubbleMesh.count = bubbles.length;
    this.bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  updateOverlays() {
    this.heartSprites.forEach((sp, i) => {
      const p = this.hearts[i];
      sp.visible = !!p;
      if (!p) return;
      sp.position.set(X(p.x), Y(p.y) + 2, (p.z ?? 0) + 1);
      sp.material.opacity = Math.min(1, p.life);
    });

    for (const agent of this.agents.values()) {
      const v = this.turtleViews.get(agent.id);
      if (!v) continue;
      const t = agent.t;
      const { w, h } = agent.size();
      v.zzz.forEach((sp, i) => {
        sp.visible = agent.sleeping;
        if (!agent.sleeping) return;
        const ph = (this.time * 0.5 + i / 3) % 1;
        sp.position.set(X(t.x + t.face * w * 0.3 + ph * 20), Y(t.y - h * 0.9 - ph * 50), agent.z + 1);
        sp.material.opacity = 1 - ph;
      });
    }
  }
}

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 烏龜頭上的名字牌
function drawNameTag(canvas, name, selected) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = (selected ? '▼ ' : '') + name;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(30, 30, 20, .6)';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = selected ? '#ffe27a' : '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}
