// 出門走走：戶外池的烏龜偶爾會想離開池子，到圓台上的某個地方逛逛再回來。
//
// 路線都是 3D 座標 (x, z)：先從沙灘走到池子右後方的出口，要去池子左後方的話再沿著池子後面繞過去
// （中間會涉水走過小溪），最後走到目的地。回家就照原路倒著走。
import { STREAM, POOLS, ROCKY, SPRING, BUSHES } from './outdoor-land.js';

const EXIT = [70, -48];     // 池子右後方：從沙灘出發的第一站
const BACK = [20, -94];     // 池子正後方
const WEST = [-80, -88];    // 池子左後方

const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = list => list[Math.floor(Math.random() * list.length)];

// 各種目的地：回傳 [x, z]（不一定每次都找得到合適的點，找不到回傳 null）
const PLACES = [
  {
    label: '小溪邊',
    spot(land) {
      const i = 1 + Math.floor(Math.random() * (STREAM.length - 3));
      const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1];
      const u = Math.random();
      const x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      const l = Math.hypot(bx - ax, bz - az) || 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = land.streamWidth((i + u) / (STREAM.length - 1)) / 2 + 4;
      return [x - ((bz - az) / l) * off * side, z + ((bx - ax) / l) * off * side];
    },
  },
  {
    label: '石頭區',
    spot(land) {
      const x = ROCKY.x + rand(-0.7, 0.7) * ROCKY.rx, z = ROCKY.z + rand(-0.7, 0.7) * ROCKY.rz;
      const [d, at] = land.distToStream(x, z);
      if (land.rockyQ(x, z) > 0.75 || d < land.streamWidth(at) / 2 + 3) return null;
      if (Math.hypot(x - SPRING.x, z - SPRING.z) < SPRING.r + 3) return null;
      return [x, z];
    },
  },
  {
    label: '濕地',
    spot() {
      const p = pickOne(POOLS);
      const a = rand(0, Math.PI * 2), d = p.r * 1.25 + 3;
      return [p.x + Math.cos(a) * d, p.z + Math.sin(a) * d];
    },
  },
  {
    label: '灌木叢下',
    spot() {
      const [x, z, s] = pickOne(BUSHES);
      const a = rand(0, Math.PI * 2), d = s + 2.5;
      return [x + Math.cos(a) * d, z + Math.sin(a) * d];
    },
  },
  {
    label: '草地',
    spot(land) {
      const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * land.disc.r;
      const x = land.disc.cx + Math.cos(a) * r, z = land.disc.cz + Math.sin(a) * r;
      return land.info(x, z).grass > 0.9 ? [x, z] : null;
    },
  },
];

// 規劃一趟出門：{ label, route（出口→目的地前的中繼點）, dest, home（回到沙灘的位置） }
export function planTrip(land, homeX) {
  const ok = ([x, z]) =>
    land.inDisc(x, z, 8) && !land.info(x, z).underwater && land.pondQ(x, z) > 1.05;
  for (let tries = 0; tries < 12; tries++) {
    const place = pickOne(PLACES);
    const dest = place.spot(land);
    if (!dest || !ok(dest)) continue;
    const route = dest[0] > 0 ? [EXIT] : [EXIT, BACK, WEST];
    return { label: place.label, route, dest, home: [homeX, rand(-8, 8)] };
  }
  return null;
}
