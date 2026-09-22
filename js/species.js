// 品種表：每個品種的體型、習性與照顧難度。遊戲規則（sim.js）、烏龜行為（tank.js）和畫面都從這裡讀。
// 新增品種：在這裡加一筆，再照 assets/prompts/PROMPTS_*.md 生姿勢圖、執行 tools/slice_poses.py <id>。
// 品種資料來源見 docs/species.md，體型與習性的研究見 docs/species_traits.md。

export const SPECIES = {
  bangui: {
    id: 'bangui',
    name: '斑龜',
    latin: 'Mauremys sinensis',
    tag: '台灣原生',
    difficulty: 1,
    blurb: '台灣最常見的原生澤龜，脖子有許多細黃線。溫和好養，游泳和曬背都很平均。',
    intro: '一隻小斑龜來到你家了！',
    startLength: 3.5,
    maxLength: 25,
    stages: [6, 12],          // 小於 6 cm 幼龜、小於 12 cm 亞成龜，之後成龜
    growth: 1,
    rates: { hunger: 1, dirt: 1, sun: 1 },        // 數值下降速度的倍率
    harmBelow: { hunger: 15, water: 20, sun: 15 }, // 低於這個值開始傷害健康
    diet: { pellet: 1, shrimp: 1, veggie: 1, fruit: 1 }, // 各種食物的飽足效果倍率（沒列的是 1）
    favorites: ['shrimp', 'worm', 'fruit'],       // 最愛：吃到心情多加分（臺灣生命大百科：也吃漿果、蚯蚓）
    swimSpeed: 1,             // 游泳速度倍率
    // 白天閒晃時選擇去哪裡的機率（依序判斷：曬背 → 淺水區 → 水底走路 → 游泳）
    habits: { bask: 0.5, shallow: 0.3, bottom: 0.1 },
    palette: { shellTop: '#5b5a36', shellBottom: '#3a3822', skin: '#55583a', stripe: '#e6d95c', plastron: '#c7b36a', neckStripes: 3 },
  },

  musk: {
    id: 'musk',
    name: '麝香龜',
    latin: 'Sternotherus odoratus',
    tag: '小型・水底派',
    difficulty: 2,
    blurb: '小小的蛋龜，游泳笨拙，大多在水底走來走去，很少上岸曬背。受驚時會放出臭味。',
    intro: '一隻小麝香龜來到你家了！',
    startLength: 2.5,
    maxLength: 14,
    stages: [4, 8],
    growth: 0.8,
    rates: { hunger: 0.9, dirt: 1.1, sun: 0.4 },
    harmBelow: { hunger: 15, water: 20, sun: 5 },
    diet: { pellet: 1, shrimp: 1.3, veggie: 0.3, fruit: 0.3, snail: 1.3 },
    favorites: ['snail', 'worm'],                  // 研究：主要吃螺類、小型蚌類和水生昆蟲
    swimSpeed: 0.55,
    habits: { bask: 0.08, shallow: 0.35, bottom: 0.5 },
    palette: { shellTop: '#3b3629', shellBottom: '#211e17', skin: '#4a4a3c', stripe: '#e3d9a0', plastron: '#d8c79a', neckStripes: 0 },
  },

  map: {
    id: 'map',
    name: '地圖龜',
    latin: 'Graptemys pseudogeographica kohnii',
    tag: '進階・愛曬背',
    difficulty: 3,
    blurb: '背甲中線有鋸齒狀突起，非常會游泳也非常愛曬背。對水質很敏感，膽子小。',
    intro: '一隻小地圖龜來到你家了！',
    startLength: 3,
    maxLength: 22,
    stages: [5, 11],
    growth: 1,
    rates: { hunger: 1, dirt: 1, sun: 1.5 },
    harmBelow: { hunger: 15, water: 40, sun: 30 },
    diet: { pellet: 1, shrimp: 1.2, veggie: 0.6, fruit: 0.5, snail: 1.2 },
    favorites: ['snail', 'fish'],                  // 研究：吃螺、蚌、螯蝦、魚
    swimSpeed: 1.25,
    habits: { bask: 0.75, shallow: 0.15, bottom: 0.03 },
    palette: { shellTop: '#6b6a4a', shellBottom: '#45432c', skin: '#5a5d3e', stripe: '#f0dd62', plastron: '#e2d18c', neckStripes: 4 },
  },

  painted: {
    id: 'painted',
    name: '錦龜',
    latin: 'Chrysemys picta',
    tag: '外來寵物・愛曬背',
    difficulty: 2,
    blurb: '背甲平滑沒有稜、邊緣有紅黑條紋，脖子和四肢也有紅色條紋。很會游泳，曬背曬得比誰都勤，個性活潑。',
    intro: '一隻小錦龜來到你家了！',
    startLength: 3,
    maxLength: 15,
    stages: [5, 10],
    growth: 1,
    rates: { hunger: 1, dirt: 1, sun: 1.3 },
    harmBelow: { hunger: 15, water: 30, sun: 25 },
    diet: { pellet: 1, shrimp: 1.1, veggie: 0.7, fruit: 0.4, snail: 1.1, worm: 1.2 },
    favorites: ['worm', 'snail'],                  // 野外主食水生昆蟲、螺類，也吃一些水生植物
    swimSpeed: 1.2,
    habits: { bask: 0.7, shallow: 0.2, bottom: 0.05 },
    palette: { shellTop: '#3a3a28', shellBottom: '#211e14', skin: '#3f4a2e', stripe: '#f0d94f', plastron: '#e6d27a', neckStripes: 4 },
  },

  slider: {
    id: 'slider',
    name: '巴西龜（收容）',
    latin: 'Trachemys scripta elegans',
    tag: '收容・大胃王',
    difficulty: 2,
    blurb: '被棄養的巴西龜。在台灣是入侵種，禁止商業輸入，請不要棄養或放生。食量大、水髒得快，但很親人。',
    intro: '一隻被棄養的巴西龜來到你家了。給牠一個新家吧。',
    startLength: 8,
    maxLength: 30,
    stages: [6, 14],
    growth: 1.2,
    rates: { hunger: 1.3, dirt: 1.4, sun: 1 },
    harmBelow: { hunger: 15, water: 15, sun: 15 },
    diet: { pellet: 1, shrimp: 1, veggie: 0.8, fruit: 1 },
    favorites: ['fish', 'veggie'],                 // 研究：什麼都吃，長大越偏草食
    swimSpeed: 1.1,
    habits: { bask: 0.55, shallow: 0.2, bottom: 0.05 },
    palette: { shellTop: '#5d6b3a', shellBottom: '#3b4524', skin: '#56663a', stripe: '#e8e070', plastron: '#e6d27a', neckStripes: 4, earPatch: '#d2452f' },
  },

  european: {
    id: 'european',
    name: '歐洲澤龜',
    latin: 'Emys orbicularis',
    tag: '歐洲原生・水陸均衡',
    difficulty: 2,
    blurb: '歐洲唯一的原生澤龜，全身有黃色小斑點。游泳和陸地都很均衡，個性温和。',
    intro: '一隻小歐洲澤龜來到你家了！',
    startLength: 3,
    maxLength: 20,
    stages: [5, 10],
    growth: 1,
    rates: { hunger: 1, dirt: 1, sun: 1 },
    harmBelow: { hunger: 15, water: 25, sun: 15 },
    diet: { pellet: 1, shrimp: 1, veggie: 0.8, fruit: 0.5, snail: 1 },
    favorites: ['snail', 'worm'],
    swimSpeed: 1,
    habits: { bask: 0.5, shallow: 0.3, bottom: 0.1 },
    palette: { shellTop: '#4a4a32', shellBottom: '#2e2e1e', skin: '#3a3a28', stripe: '#d4c850', plastron: '#c7b84a', neckStripes: 2 },
  },

  'Striped Mud': {
    id: 'Striped Mud',
    name: '條紋動胸龜',
    latin: 'Kinosternon baurii',
    tag: '小型・蛋龜',
    difficulty: 2,
    blurb: '又叫果核泥龜，背甲上有黃色條紋。小小一隻，游泳笨拙，大多在水底走來走去。',
    intro: '一隻小條紋動胸龜來到你家了！',
    startLength: 2.5,
    maxLength: 12,
    stages: [4, 8],
    growth: 0.8,
    rates: { hunger: 0.9, dirt: 1, sun: 0.5 },
    harmBelow: { hunger: 15, water: 20, sun: 8 },
    diet: { pellet: 1, shrimp: 1.2, veggie: 0.4, fruit: 0.3, snail: 1.2 },
    favorites: ['snail', 'worm'],
    swimSpeed: 0.6,
    habits: { bask: 0.15, shallow: 0.35, bottom: 0.45 },
    palette: { shellTop: '#5a4a2e', shellBottom: '#3a3020', skin: '#4a4030', stripe: '#d4b850', plastron: '#c8a848', neckStripes: 2 },
  },

  'Razor-backed Musk': {
    id: 'Razor-backed Musk',
    name: '剃刀龜',
    latin: 'Sternotherus carinatus',
    tag: '小型・水底派',
    difficulty: 2,
    blurb: '背甲高高隆起像剃刀，全身有深色斑點。游泳笨拙，喜歡在水底走來走去。',
    intro: '一隻小剃刀龜來到你家了！',
    startLength: 3,
    maxLength: 15,
    stages: [5, 10],
    growth: 0.9,
    rates: { hunger: 0.9, dirt: 1.1, sun: 0.4 },
    harmBelow: { hunger: 15, water: 20, sun: 5 },
    diet: { pellet: 1, shrimp: 1.3, veggie: 0.3, fruit: 0.3, snail: 1.3 },
    favorites: ['snail', 'worm'],
    swimSpeed: 0.5,
    habits: { bask: 0.1, shallow: 0.3, bottom: 0.55 },
    palette: { shellTop: '#6a5a3a', shellBottom: '#4a3a28', skin: '#5a5040', stripe: '#d8c060', plastron: '#c8a850', neckStripes: 0 },
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export function getSpecies(id) {
  return SPECIES[id] || SPECIES.bangui;
}

export function stageOf(len, sp) {
  return len < sp.stages[0] ? '幼龜' : len < sp.stages[1] ? '亞成龜' : '成龜';
}
