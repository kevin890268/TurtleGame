// 訊號：世界裡的「動靜」。玩家、小動物、龜龜碰到東西時會發出訊號，龜龜和小動物會注意到。
//
// 連鎖互動就是這樣長出來的：
//   玩家的工具 ─→ 碰到東西 ─→ 訊號 ─→ 龜龜／小動物注意到、有反應（移動）
//                    ↑                                   │
//                    └────── 牠們移動時又碰到別的東西 ←──┘
//
// 座標是 3D 的 (x, z)。要加新的訊號，在 SIGNALS 加一種、在 TURTLE_REACT 寫龜龜會怎麼反應就好。

// range：多遠以內注意得到；life：訊號留多久（秒）
export const SIGNALS = {
  ripple: { range: 42, life: 1.6 },    // 水面的波紋
  splash: { range: 60, life: 1.2 },    // 東西掉進水裡
  rustle: { range: 30, life: 1.0 },    // 水草、植物晃動
  critter: { range: 34, life: 0.35 },  // 小動物在動
  thud: { range: 26, life: 0.5 },      // 東西掉在地上的震動
};

// 龜龜對各種訊號的反應：
//   curious：游／走過去看看；chase：追著跑；startle：嚇一跳縮進殼裡
// near：近到多少以內會嚇到（0～1，1 是在正旁邊）
export const TURTLE_REACT = {
  ripple: { act: 'curious' },
  splash: { act: 'curious', startleNear: 0.85 },
  rustle: { act: 'curious' },
  critter: { act: 'chase' },
  thud: { act: 'startle', startleNear: 0.5 },
};

// 龜龜頭上冒的小泡泡：符號和顏文字
export const EMOTES = {
  curious: ['？', '(・ω・)？', '？？'],
  notice: ['！', '(ﾟωﾟ)！'],
  startle: ['(ﾟДﾟ;)', '(>_<)', '!!'],
  happy: ['♪', '(´∀｀)♪'],
  giveUp: ['(´・ω・`)', '…'],
};

export class SignalBus {
  constructor() {
    this.list = [];
    this.seq = 0;
  }

  // strength：強弱（大約 0～1.5）；source：誰發出的（龜龜不會對自己的動靜有反應）
  emit(type, x, z, strength = 1, source = null) {
    const s = { id: ++this.seq, type, x, z, strength, source, age: 0, ...SIGNALS[type] };
    this.list.push(s);
    return s;
  }

  update(dt) {
    for (const s of this.list) s.age += dt;
    this.list = this.list.filter(s => s.age < s.life);
  }

  // 某個編號之後才出現的訊號（每隻龜龜記得自己看到哪裡了）
  since(id) {
    return this.list.filter(s => s.id > id);
  }
}
