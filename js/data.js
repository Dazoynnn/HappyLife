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

export const WEATHER_TABLE = {
  sunny:   { id: 'sunny', name: '晴天', weight: 60, visibilityMod: 1.0, rareSpawnMod: 1.0, slipMod: 0 },
  drizzle: { id: 'drizzle', name: '小雨', weight: 25, visibilityMod: 0.85, rareSpawnMod: 1.0, fishSpawnMod: 1.2, slipMod: 0 },
  storm:   { id: 'storm', name: '暴雨', weight: 15, visibilityMod: 0.6, rareSpawnMod: 2.0, slipMod: 0.3, screenDarken: true },
};

export function rollWeather() {
  const total = Object.values(WEATHER_TABLE).reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(WEATHER_TABLE)) {
    r -= w.weight;
    if (r <= 0) return key;
  }
  return 'sunny';
}

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
    bulky: false,
    description: '一颗圆润的珍珠，散发着柔和的光泽。',
  },
  // === 黑礁岛收集物 ===
  urchin: {
    id: 'urchin', name: '海胆', category: 'living', rarity: 'uncommon',
    value: 25, weight: 0.6, stackSize: 3,
    collectMethod: 'careful_pickup', collectTime: 1800,
    biomes: ['reef_zone', 'barnacle_rock'], alive: true, aquariumOutput: 1.5,
    danger: { type: 'damage', value: 15 },
    description: '黑色的海胆，刺很长，要小心拿。',
  },
  chiton: {
    id: 'chiton', name: '石鳖', category: 'shell', rarity: 'uncommon',
    value: 18, weight: 0.4, stackSize: 5,
    collectMethod: 'dig', collectTime: 1000,
    biomes: ['barnacle_rock', 'moss_rock'], alive: false,
    description: '紧紧吸在礁石上的小生物，得用力撬下来。',
  },
  octopus_sm: {
    id: 'octopus_sm', name: '小章鱼', category: 'living', rarity: 'rare',
    value: 45, weight: 0.7, stackSize: 2,
    collectMethod: 'grab', collectTime: 2000,
    biomes: ['tide_pool', 'deep_pool'], alive: true, aquariumOutput: 2.5,
    danger: { type: 'escape', value: 0 },
    description: '一只灵活的小章鱼，会喷墨逃跑。',
  },
  abalone: {
    id: 'abalone', name: '鲍鱼', category: 'shell', rarity: 'rare',
    value: 55, weight: 0.5, stackSize: 2,
    collectMethod: 'dig', collectTime: 1600,
    biomes: ['deep_pool', 'barnacle_rock'], alive: true, aquariumOutput: 2,
    description: '吸附在深水礁石上的大鲍鱼，壳很漂亮。',
  },
  seaglass: {
    id: 'seaglass', name: '海玻璃', category: 'treasure', rarity: 'common',
    value: 10, weight: 0.1, stackSize: 9,
    collectMethod: 'auto', collectTime: 500,
    biomes: ['sand_shallow', 'tidal_flat', 'black_reef_shore'], alive: false,
    description: '被海浪打磨光滑的玻璃碎片，有淡淡的颜色。',
  },
  crab_rock: {
    id: 'crab_rock', name: '石蟹', category: 'crustacean', rarity: 'uncommon',
    value: 22, weight: 1.0, stackSize: 3,
    collectMethod: 'grab', collectTime: 1400,
    biomes: ['barnacle_rock', 'moss_rock'], alive: true, aquariumOutput: 1,
    danger: { type: 'damage', value: 12 },
    description: '藏在礁石缝隙里的螃蟹，钳子比沙蟹更大。',
  },
  // === 海草甸收集物 ===
  seahorse: {
    id: 'seahorse', name: '海马', category: 'fish', rarity: 'rare',
    value: 40, weight: 0.3, stackSize: 2,
    collectMethod: 'careful_pickup', collectTime: 1600,
    biomes: ['seagrass_meadow'], alive: true, aquariumOutput: 2.5,
    description: '一只小小的海马，尾巴卷在海草上。',
  },
  seadragon: {
    id: 'seadragon', name: '海龙', category: 'fish', rarity: 'rare',
    value: 70, weight: 0.5, stackSize: 1,
    collectMethod: 'grab', collectTime: 2200,
    biomes: ['seagrass_tall'], alive: true, aquariumOutput: 3,
    danger: { type: 'escape', value: 0 },
    description: '伪装在海草中的海龙，极难发现。',
  },
  goby: {
    id: 'goby', name: '虾虎鱼', category: 'fish', rarity: 'common',
    value: 15, weight: 0.2, stackSize: 5,
    collectMethod: 'grab', collectTime: 1000,
    biomes: ['mud_flat', 'seagrass_meadow'], alive: true, aquariumOutput: 0.5,
    danger: { type: 'escape', value: 0 },
    description: '趴在泥地上的小鱼，反应很快。',
  },
  nudibranch: {
    id: 'nudibranch', name: '海蛞蝓', category: 'living', rarity: 'uncommon',
    value: 35, weight: 0.2, stackSize: 3,
    collectMethod: 'pickup', collectTime: 800,
    biomes: ['seagrass_meadow', 'seagrass_tall'], alive: true, aquariumOutput: 1.5,
    description: '色彩斑斓的海蛞蝓，像一片飘落的彩虹。',
  },
  sand_dollar: {
    id: 'sand_dollar', name: '沙钱', category: 'shell', rarity: 'common',
    value: 12, weight: 0.15, stackSize: 9,
    collectMethod: 'dig', collectTime: 700,
    biomes: ['mud_flat', 'sand_shallow'], alive: false,
    description: '扁圆的白色沙钱，上面有星形花纹。',
  },
  horseshoe_crab: {
    id: 'horseshoe_crab', name: '鲎', category: 'crustacean', rarity: 'rare',
    value: 90, weight: 3.0, stackSize: 1,
    collectMethod: 'grab', collectTime: 2500,
    biomes: ['mud_flat', 'seagrass_meadow'], alive: true, aquariumOutput: 3,
    bulky: true,
    description: '远古生物鲎，背甲像马蹄，非常大只。',
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
  coral_pick: {
    id: 'coral_pick', slot: 'tool', name: '珊瑚镐',
    cost: 250, stats: { collectSpeed: 1.0, reefBonus: 2.0 },
    description: '对礁石区收集效率+200%。',
  },
  tongs_bamboo: {
    id: 'tongs_bamboo', slot: 'tool', name: '竹夹',
    cost: 120, stats: { safeGrab: true },
    description: '安全采集螃蟹/海胆，免疫夹伤和刺伤。',
  },
  boots_iron: {
    id: 'boots_iron', slot: 'shoes', name: '铁头靴',
    cost: 220, stats: { speedBonus: -15, spikeImmune: true },
    description: '不受尖石伤害，移动-15%。',
  },
  headlamp: {
    id: 'headlamp', slot: 'headlamp', name: '头灯',
    cost: 180, stats: { visionBonus: 0.5 },
    description: '洞穴和深水区视野+50%。',
  },
};

// 初始装备
export const STARTING_EQUIPMENT = ['shovel_wood'];

// 沉船事件掉落表
export const SHIPWRECK_LOOT = {
  guaranteed: [{ id: 'coin_ancient', count: 5 }],
  random: [
    { id: 'pearl', count: 1, chance: 0.8 },
    { id: 'shell_conch', count: 3, chance: 0.5 },
    { id: 'starfish', count: 1, chance: 0.5 },
    { id: 'coin_ancient', count: 5, chance: 0.7 },
    { id: 'coin_ancient', count: 10, chance: 0.3 },
  ],
  equipmentDrop: ['shovel_iron', 'gloves_leather', 'shoes_grip', 'coral_pick', 'headlamp'],
};

// 礁石 tile 类型枚举
export const ROCK_TILE_TYPES = ['rock_small', 'rock_medium', 'rock_large', 'rock_barnacle', 'rock_moss'];

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

// ============ 黑礁岛特有 biome ============
export const BLACK_REEF_BIOMES = {
  black_reef_shore: { name: '黑沙滩',    spawnMod: 1.0, danger: 0 },
  barnacle_rock:    { name: '藤壶礁石区', spawnMod: 1.5, danger: 3 },
  moss_rock:        { name: '苔藓礁石区', spawnMod: 1.2, danger: 2 },
  deep_pool:        { name: '深潮池',     spawnMod: 2.0, danger: 2 },
};

// ============ 海滩定义 ============
export const BEACHES = {
  white_sand: {
    id: 'white_sand', name: '白沙湾', unlock: '初始',
    safeZoneRows: 4, rockDensity: 0.15, hasTidePools: true, hasCave: true,
    description: '平坦的白色沙滩，适合新手赶海。',
  },
  black_reef: {
    id: 'black_reef', name: '黑礁岛', unlock: '完成3次白沙湾出海',
    safeZoneRows: 2, rockDensity: 0.4, hasTidePools: true, hasCave: false, hasMossRocks: true, hasDeepPools: true,
    description: '礁石密布的岛屿，潮池众多，资源丰富但危险。',
  },
  seagrass: {
    id: 'seagrass', name: '海草甸', unlock: '完成黑礁岛+水族箱5只生物',
    safeZoneRows: 3, rockDensity: 0.05, hasTidePools: false, hasCave: false,
    hasSeagrass: true, hasMudFlats: true, hasMudPits: true,
    description: '海草丛生的浅滩，淤泥地形暗藏陷阱。',
  },
};

// ============ 博物馆展区定义（统一数据源） ============
export const MUSEUM_HALLS = [
  { id: 'shell', name: '贝类馆', legacy: 'shell_mastery', legacyDesc: '贝类精通 (贝壳+25%)',
    exhibits: ['shell_fan','shell_conch','clam','starfish','pearl'],
    names: ['扇贝壳','海螺壳','蛤蜊','海星','珍珠'] },
  { id: 'crustacean', name: '甲壳馆', legacy: 'crustacean_immunity', legacyDesc: '甲壳免疫 (不受螃蟹/海胆伤害)',
    exhibits: ['crab_sand','crab_rock','urchin','chiton','horseshoe_crab'],
    names: ['沙蟹','石蟹','海胆','石鳖','鲎'] },
  { id: 'fish', name: '鱼类馆', legacy: 'weight_mastery', legacyDesc: '负重大师 (背包负重+10kg)',
    exhibits: ['seahorse','seadragon','goby','octopus_sm','nudibranch'],
    names: ['海马','海龙','虾虎鱼','小章鱼','海蛞蝓'] },
];

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
