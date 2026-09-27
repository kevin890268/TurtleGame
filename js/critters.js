// 小動物：平常躲在東西裡（小魚躲在水草裡），被晃出來之後自己游、自己躲回去。
// 牠們在動的時候會發出 critter 訊號（龜龜會追），躲進別叢水草時那叢也會晃（連鎖）。
//
// 座標是 3D 的 (x, y, z)。第一階段只有小魚；之後的蟲、蝴蝶、蜻蜓照同樣的方式加。
import * as THREE from 'three';
import { drawFish } from './doodles.js';

const rand = (a, b) => a + Math.random() * (b - a);
const CRUISE = 5;          // 平常游的速度
const DART = 16;           // 被嚇到、剛竄出來時的速度

export class Critters {
  constructor(tank) {
    this.tank = tank;
    this.fish = [];
    this.seq = 0;
    const tex = new THREE.CanvasTexture(drawFish());
    tex.colorSpace = THREE.SRGBColorSpace;
    this.fishMat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.3 });
  }

  byId(id) {
    return this.fish.find(f => f.id === id) ?? null;
  }

  // 水草被晃到，一條小魚從裡面竄出來，往遠離動靜的方向游
  spawnFish(plant, fromX, fromZ) {
    const tank = this.tank;
    const sprite = new THREE.Sprite(this.fishMat);
    const size = rand(4.8, 6.4);
    sprite.scale.set(size, size / 2, 1);
    tank.scene.add(sprite);
    const f = {
      id: ++this.seq,
      x: plant.X, z: plant.Z,
      y: Math.min(tank.WATER_Y - 1.5, plant.baseY + rand(2, 5)),
      vx: 0, vz: 0, vy: 0,
      size, sprite, home: plant,
      age: 0, stay: rand(8, 14), pulse: 0, turn: rand(0.6, 1.4),
      seen: tank.signals.seq,
      burst: (sx, sz) => burst(f, sx, sz),
    };
    burst(f, fromX ?? plant.X + rand(-1, 1), fromZ ?? plant.Z + rand(-1, 1));
    this.fish.push(f);
    return f;
  }

  remove(f) {
    this.tank.scene.remove(f.sprite);
    this.fish = this.fish.filter(o => o !== f);
  }

  update(dt) {
    const tank = this.tank;
    const [z0, z1] = tank.zRange;
    const x0 = tank.X(20), x1 = tank.X(tank.terrain.SHORE_X - 25);
    for (const f of [...this.fish]) {
      f.age += dt;
      // 附近有水波、落水聲：嚇一跳往反方向竄
      for (const s of tank.signals.since(f.seen)) {
        if ((s.type === 'ripple' || s.type === 'splash' || s.type === 'thud') && Math.hypot(s.x - f.x, s.z - f.z) < 16) f.burst(s.x, s.z);
      }
      f.seen = tank.signals.seq;

      const speed = Math.hypot(f.vx, f.vz);
      if (f.age > f.stay) {
        // 玩夠了：游回最近的一叢水草躲起來
        const home = nearestPlant(tank.plants, f);
        const dx = home.X - f.x, dz = home.Z - f.z, d = Math.hypot(dx, dz);
        if (d < 1.5) {
          tank.shakePlant(home, 0.45, null);
          home.fish = Math.min(home.maxFish + 1, home.fish + 1);
          this.remove(f);
          continue;
        }
        f.vx += ((dx / d) * CRUISE * 1.2 - f.vx) * Math.min(1, dt * 2);
        f.vz += ((dz / d) * CRUISE * 1.2 - f.vz) * Math.min(1, dt * 2);
        f.vy += ((home.baseY + 3 - f.y) * 0.8 - f.vy) * Math.min(1, dt * 2);
      } else {
        // 到處游：不時轉個彎，速度慢慢回到平常
        f.turn -= dt;
        if (f.turn <= 0) {
          f.turn = rand(0.8, 1.8);
          const a = Math.atan2(f.vz, f.vx) + rand(-1.2, 1.2);
          const s = Math.max(CRUISE, speed);
          f.vx = Math.cos(a) * s;
          f.vz = Math.sin(a) * s;
          f.vy = rand(-1.2, 1.2);
        }
        const k = Math.max(0, 1 - dt * 1.5);
        if (speed > CRUISE) { f.vx *= k + (1 - k) * (CRUISE / speed); f.vz *= k + (1 - k) * (CRUISE / speed); }
      }
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      f.y += f.vy * dt;
      // 不要游出池子：碰到邊就轉回來
      if (f.x < x0 || f.x > x1) { f.vx *= -1; f.x = Math.min(x1, Math.max(x0, f.x)); }
      if (f.z < z0 || f.z > z1) { f.vz *= -1; f.z = Math.min(z1, Math.max(z0, f.z)); }
      const floor = tank.groundAt(f.x, f.z) + 1.2, top = tank.WATER_Y - 0.9;
      if (f.y < floor || f.y > top) { f.vy *= -0.5; f.y = Math.min(top, Math.max(floor, f.y)); }

      // 在動就會被注意到（游得越快越明顯）
      f.pulse -= dt;
      if (f.pulse <= 0) {
        f.pulse = 0.3;
        const sig = tank.signals.emit('critter', f.x, f.z, 0.55 + Math.min(0.6, speed / DART));
        sig.critter = f;
      }

      // 畫面：頭朝游的方向，身體輕輕擺動
      f.sprite.position.set(f.x, f.y + Math.sin(f.age * 9) * 0.08, f.z);
      const face = f.vx >= 0 ? 1 : -1;
      f.sprite.scale.set(face * f.size * (1 + Math.sin(f.age * 14) * 0.04), f.size / 2, 1);
    }
  }
}

function burst(f, sx, sz) {
  let dx = f.x - sx, dz = f.z - sz;
  const d = Math.hypot(dx, dz);
  if (d < 0.01) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dz = Math.sin(a); } else { dx /= d; dz /= d; }
  const a = Math.atan2(dz, dx) + rand(-0.5, 0.5);
  f.vx = Math.cos(a) * DART;
  f.vz = Math.sin(a) * DART;
  f.vy = rand(-1.5, 1.5);
  f.turn = rand(0.8, 1.4);
}

function nearestPlant(plants, f) {
  let best = plants[0], bd = Infinity;
  for (const p of plants) {
    if (p.emergent) continue;
    const d = Math.hypot(p.X - f.x, p.Z - f.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
