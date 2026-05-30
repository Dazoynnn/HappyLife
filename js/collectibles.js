// collectibles.js — 海滩上的收集物管理

import { COLLECTIBLES, TILE_SIZE, CANVAS_W, CANVAS_H } from './data.js';
import { BeachMap } from './beach.js';

export class Collectible {
  constructor(itemId, x, y) {
    this.id = itemId;
    this.def = COLLECTIBLES[itemId];
    this.x = x;
    this.y = y;
    this.collected = false;
    this.animFrame = 0;
    this.animTimer = 0;
    this.bobOffset = 0;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.glowTimer = 0;

    // 螃蟹有 AI
    if (itemId === 'crab_sand') {
      this.fleeTimer = 0;
      this.fleeX = 0;
      this.fleeY = 0;
      this.state = 'idle';  // idle / flee / attack
    } else {
      this.state = 'default';
    }

    // 埋藏的（需要挖的）有视觉提示
    this.buried = this.def.collectMethod === 'dig';
    this.buriedDepth = this.buried ? 0.3 + Math.random() * 0.5 : 0;
  }

  update(dt, playerX, playerY) {
    if (this.collected) return;

    this.animTimer += dt;
    if (this.animTimer > 0.3) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    this.bobTimer += dt;
    this.bobOffset = Math.sin(this.bobTimer * 2) * 1;

    // 稀有物品发光
    if (this.def.rarity === 'rare' || this.def.rarity === 'epic') {
      this.glowTimer += dt;
    }

    // 螃蟹 AI
    if (this.id === 'crab_sand') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40 && this.state === 'idle') {
        this.state = 'flee';
        this.fleeTimer = 1.5;
        // 逃跑方向：远离玩家
        if (dist > 0) {
          this.fleeX = -dx / dist;
          this.fleeY = -dy / dist;
        }
      }

      if (this.state === 'flee') {
        this.fleeTimer -= dt;
        const speed = 30;
        this.x += this.fleeX * speed * dt;
        this.y += this.fleeY * speed * dt;
        // 边界约束
        this.x = Math.max(8, Math.min(CANVAS_W - 8, this.x));
        this.y = Math.max(20, Math.min(CANVAS_H - 8, this.y));
        if (this.fleeTimer <= 0) {
          this.state = 'idle';
        }
      }
    }
  }

  getDistance(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class CollectibleManager {
  constructor(beachMap, inventory = null) {
    this.beachMap = beachMap;
    this.items = [];
    this.spawned = false;
    this._inventory = inventory;
  }

  // 每次退潮时刷新收集物
  spawnAll(moonEffect = 1.0, weatherKey = 'sunny') {
    this.items = [];
    this.spawned = true;

    // 按 biome 概率生成
    const spawnConfigs = [
      { id: 'shell_fan', biomes: ['sand_shallow', 'tidal_flat'], count: [5, 10] },
      { id: 'shell_conch', biomes: ['sand_shallow', 'tidal_flat'], count: [4, 8] },
      { id: 'clam', biomes: ['tidal_flat'], count: [3, 7] },
      { id: 'crab_sand', biomes: ['sand_shallow', 'tidal_flat'], count: [2, 5] },
      { id: 'starfish', biomes: ['tide_pool', 'reef_zone'], count: [1, 3] },
      { id: 'coin_ancient', biomes: ['dock_ruins'], count: [1, 3] },
      { id: 'pearl', biomes: ['reef_zone'], count: [0, 1] },
      // 黑礁岛特有
      { id: 'urchin', biomes: ['reef_zone', 'barnacle_rock'], count: [2, 5] },
      { id: 'chiton', biomes: ['barnacle_rock', 'moss_rock'], count: [2, 6] },
      { id: 'octopus_sm', biomes: ['tide_pool', 'deep_pool'], count: [0, 3] },
      { id: 'abalone', biomes: ['deep_pool', 'barnacle_rock'], count: [0, 2] },
      { id: 'seaglass', biomes: ['sand_shallow', 'tidal_flat', 'black_reef_shore'], count: [2, 6] },
      { id: 'crab_rock', biomes: ['barnacle_rock', 'moss_rock'], count: [1, 4] },
      // 海草甸特有
      { id: 'seahorse', biomes: ['seagrass_meadow'], count: [1, 3] },
      { id: 'seadragon', biomes: ['seagrass_tall'], count: [0, 2] },
      { id: 'goby', biomes: ['mud_flat', 'seagrass_meadow'], count: [3, 8] },
      { id: 'nudibranch', biomes: ['seagrass_meadow', 'seagrass_tall'], count: [1, 4] },
      { id: 'sand_dollar', biomes: ['mud_flat'], count: [4, 10] },
      { id: 'horseshoe_crab', biomes: ['mud_flat', 'seagrass_meadow'], count: [0, 2] },
    ];

    for (const config of spawnConfigs) {
      const baseCount = config.count[0] + Math.floor(Math.random() * (config.count[1] - config.count[0] + 1));
      let count = Math.floor(baseCount * moonEffect);

      // 天气加成
      if (weatherKey === 'storm') {
        const rareIds = ['pearl', 'abalone', 'octopus_sm', 'seadragon', 'horseshoe_crab', 'starfish', 'coin_ancient'];
        if (rareIds.includes(config.id)) {
          count = Math.floor(count * 2.0);
        }
      }

      // 永久遗产加成
      if (this._inventory?.hasLegacy?.('shell_mastery')) {
        const shellIds = ['shell_fan', 'shell_conch', 'clam'];
        if (shellIds.includes(config.id)) {
          count = Math.floor(count * 1.25);
        }
      }

      for (let i = 0; i < count; i++) {
        // 在对应 biome 中找合法位置
        const pos = this._findSpawnPos(config.biomes);
        if (pos) {
          this.items.push(new Collectible(config.id, pos.x, pos.y));
        }
      }
    }
  }

  _findSpawnPos(biomes) {
    // 尝试 20 次找合法位置
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 20 + Math.random() * (CANVAS_W - 40);
      const y = 30 + Math.random() * (CANVAS_H - 60);
      const tile = this.beachMap.getTileAt(x, y);
      if (tile && biomes.includes(tile.biome)) {
        // 检查是否与其他收集物重叠
        const tooClose = this.items.some(item =>
          Math.abs(item.x - x) < 12 && Math.abs(item.y - y) < 12
        );
        if (!tooClose) return { x, y };
      }
    }
    return null;
  }

  // 找到玩家附近可采集的物品
  findNearest(playerX, playerY, maxDist = 20) {
    let nearest = null;
    let minDist = maxDist;

    for (const item of this.items) {
      if (item.collected) continue;
      const dist = item.getDistance(playerX + 7, playerY + 8); // 玩家中心点
      if (dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    }
    return nearest;
  }

  update(dt, playerX, playerY) {
    for (const item of this.items) {
      item.update(dt, playerX, playerY);
    }
  }

  get activeItems() {
    return this.items.filter(i => !i.collected);
  }
}
