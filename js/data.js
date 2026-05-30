// data.js — 所有游戏数据定义

// ============ 全局常量 ============
export const CANVAS_W = 480;
export const CANVAS_H = 320;
export const SCALE = 2;
export const TILE_SIZE = 16;

// 游戏场景
export const SCENE = { BEACH: 'beach', VILLAGE: 'village' };

// 潮汐阶段
export const TIDE_PHASE = {
  EBBING: 'ebbing',      // 退潮中 0-15%
  LOW: 'low',            // 低潮 15-55%
  FLOODING: 'flooding',  // 涨潮初期 55-75%
  RUSHING: 'rushing',    // 涨潮加速 75-90%
  PEAK: 'peak',          // 满潮 90-100%
};

// 天气
export const WEATHER = {
  SUNNY: 'sunny',
  DRIZZLE: 'drizzle',
  STORM: 'storm',
};

// ============ 收集物定义 ============
export const COLLECTIBLES = {
  shell_fan: {
    id: 'shell_fan', name: '扇贝壳', category: 'shell', rarity: 'common',
    value: 5, weight: 0.2, stackSize: 9,
    collectMethod: 'dig', collectTime: 800,
    biomes: ['sand_shallow'], alive: false,
    description: '一枚普通的扇贝壳，边缘有些磨损。',
  },
  shell_conch: {
    id: 'shell_conch', name: '海螺壳', category: 'shell', rarity: 'common',
    value: 8, weight: 0.3, stackSize: 9,
    collectMethod: 'dig', collectTime: 900,
    biomes: ['sand_shallow', 'tidal_flat'], alive: false,
    description: '螺旋形的海螺壳，靠近耳边能听到海浪声。',
  },
  clam: {
    id: 'clam', name: '蛤蜊', category: 'shell', rarity: 'uncommon',
    value: 15, weight: 0.5, stackSize: 5,
    collectMethod: 'dig', collectTime: 1200,
    biomes: ['tidal_flat'], alive: true, aquariumOutput: 0.5,
    description: '一颗肥美的蛤蜊，还在吐着沙子。',
  },
  crab_sand: {
    id: 'crab_sand', name: '沙蟹', category: 'crustacean', rarity: 'uncommon',
    value: 20, weight: 1.0, stackSize: 3,
    collectMethod: 'grab', collectTime: 1500,
    biomes: ['sand_shallow', 'tidal_flat'], alive: true, aquariumOutput: 1,
    danger: { type: 'damage', value: 10 },
    description: '一只横着走的小沙蟹，挥舞着钳子。',
  },
  starfish: {
    id: 'starfish', name: '海星', category: 'living', rarity: 'rare',
    value: 35, weight: 0.8, stackSize: 1,
    collectMethod: 'pickup', collectTime: 600,
    biomes: ['tide_pool'], alive: true, aquariumOutput: 2,
    description: '一只橙红色的海星，触感柔软。',
  },
  coin_ancient: {
    id: 'coin_ancient', name: '古钱币', category: 'treasure', rarity: 'rare',
    value: 80, weight: 0.1, stackSize: 1,
    collectMethod: 'auto', collectTime: 400,
    biomes: ['dock_ruins'], alive: false,
    description: '一枚锈迹斑斑的古代铜钱，不知来自哪个朝代。',
  },
  pearl: {
    id: 'pearl', name: '珍珠', category: 'treasure', rarity: 'epic',
    value: 120, weight: 0.1, stackSize: 1,
    collectMethod: 'auto', collectTime: 400,
    biomes: ['reef_zone'], alive: false,
    description: '一颗圆润的珍珠，散发着柔和的光泽。',
  },
};

// ============ 装备定义 ============
export const EQUIPMENT = {
  shovel_wood: {
    id: 'shovel_wood', slot: 'tool', name: '木铲',
    cost: 0, stats: { collectSpeed: 1.0, digBonus: 0 },
    description: '一把简陋的木铲，能挖点贝壳。',
  },
  shovel_iron: {
    id: 'shovel_iron', slot: 'tool', name: '铁铲',
    cost: 200, stats: { collectSpeed: 1.5, digBonus: 10 },
    description: '铁打的铲子，采集效率大幅提升。',
  },
  gloves_leather: {
    id: 'gloves_leather', slot: 'gloves', name: '皮革手套',
    cost: 150, stats: { damageReduce: 15 },
    description: '厚实的皮革手套，防螃蟹夹手。',
  },
  shoes_grip: {
    id: 'shoes_grip', slot: 'shoes', name: '防滑鞋',
    cost: 180, stats: { speedBonus: 0, slipResist: true },
    description: '礁石上也不打滑的好鞋子。',
  },
  basket_medium: {
    id: 'basket_medium', slot: 'backpack', name: '中型竹篓',
    cost: 300, stats: { capacity: 16, maxWeight: 30 },
    description: '更大的竹篓，能装更多东西。',
  },
};

// 初始装备
export const STARTING_EQUIPMENT = ['shovel_wood'];

// ============ 背包默认值 ============
export const DEFAULT_BACKPACK = { slots: 12, maxWeight: 20 };

// ============ 地图微区域定义 ============
export const MICRO_ZONES = {
  shore_safe:    { id: 'shore_safe',    name: '岸边安全区', yRange: [0, 4],   biome: 'safe',       danger: 0 },
  sand_shallow:  { id: 'sand_shallow',  name: '沙滩浅水',   yRange: [4, 7],   biome: 'sand_shallow', danger: 1 },
  tidal_flat:    { id: 'tidal_flat',    name: '潮间带',     yRange: [7, 14],  biome: 'tidal_flat', danger: 2 },
  reef_zone:     { id: 'reef_zone',     name: '礁石区',     yRange: [10, 16], biome: 'reef_zone',  danger: 3 },
  outer_reef:    { id: 'outer_reef',    name: '外礁边缘',   yRange: [14, 18], biome: 'outer_reef', danger: 4 },
  deep_water:    { id: 'deep_water',    name: '远海',       yRange: [17, 20], biome: 'deep_water', danger: 5 },
};

// ============ 月相 ============
export const MOON_PHASES = ['new', 'crescent', 'quarter', 'gibbous', 'full', 'gibbous2', 'quarter2', 'crescent2'];
export const MOON_NAMES = {
  new: '新月', crescent: '蛾眉月', quarter: '上弦月', gibbous: '盈凸月',
  full: '满月', gibbous2: '亏凸月', quarter2: '下弦月', crescent2: '残月',
};
export const MOON_EFFECTS = {
  new:      { tideRange: 1.3, description: '大潮，退得最远' },
  crescent: { tideRange: 1.0, description: '正常潮位' },
  quarter:  { tideRange: 1.0, description: '正常潮位' },
  gibbous:  { tideRange: 1.1, description: '贝类产出+20%' },
  full:     { tideRange: 1.4, description: '大潮，发光海岸' },
  gibbous2: { tideRange: 1.0, description: '鱼类活跃' },
  quarter2: { tideRange: 0.8, description: '小潮，安全区资源翻倍' },
  crescent2:{ tideRange: 0.9, description: '深渊事件概率提升' },
};

// ============ 颜色调色板 ============
export const COLORS = {
  sand_dry:     '#e8d5a3',
  sand_dry_dark:'#c4a970',
  sand_dry_light:'#f0e0b8',
  sand_wet:     '#b89a5e',
  sand_wet_dark:'#8c7a4a',
  water_shallow:'#7ec8d8',
  water_mid:    '#4a9eb0',
  water_deep:   '#2d6e82',
  water_abyss:  '#1a4a5a',
  foam:         '#e8f4f8',
  rock:         '#6b6b6b',
  rock_dark:    '#4a4a4a',
  rock_light:   '#8a8a8a',
  moss:         '#5a7a3a',
  skin:         '#e8c8a8',
  skin_dark:    '#d4b898',
  hat:          '#c8b878',
  hat_dark:     '#a89858',
  cloth:        '#e8e0d0',
  cloth_dark:   '#c8c0b0',
  bamboo:       '#b89860',
  bamboo_dark:  '#a08050',
  red:          '#c04030',
  gold:         '#d4a840',
  ui_bg:        '#f5f0e0',
  ui_dark:      '#2d2010',
  hp_red:       '#d04040',
  stamina_yellow:'#d4a840',
};
