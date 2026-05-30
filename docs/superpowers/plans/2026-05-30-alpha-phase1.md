# Alpha Phase 1: 白沙湾系统完善 实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有白沙湾 MVP 上增加威望系统、天气系统、沉船事件、海蚀洞、大件拖拽、海灵珠合成、4 件新装备

**Architecture:** 新增 weather.js / events.js / audio.js 三个模块；扩展 data.js / inventory.js / player.js / game.js / shop.js / renderer.js

**Tech Stack:** 原生 JavaScript ES Modules, Canvas 2D, Web Audio API

---

## 文件结构

```
js/
├── data.js          ← 修改: 新收集物定义、装备、天气表、tile类型
├── weather.js       ← 新建: 天气系统
├── events.js        ← 新建: 随机事件管理
├── audio.js         ← 新建: Web Audio 音效
├── inventory.js     ← 修改: prestige(), 海灵珠合成, 大件物品
├── player.js        ← 修改: 拖拽状态, 装备效果应用
├── game.js          ← 修改: 天气/事件集成, 海蚀洞逻辑
├── shop.js          ← 修改: 威望UI, 新装备, 海灵珠合成UI
├── renderer.js      ← 修改: 雨滴粒子, 沉船特效
└── sprites.js       ← 修改: 新收集物/装备精灵
```

---

### Task 1: 扩展 data.js — 新数据定义

**Files:** Modify: `js/data.js`

- [ ] **Step 1: 添加天气定义**

在 WEATHER 对象后追加：
```js
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
```

- [ ] **Step 2: 添加新 tile 类型到已有常量区**

在 COLORS 对象前添加：
```js
// 黑礁岛 tile 类型（Phase 1 仅定义，Phase 2 使用）
export const ROCK_TILE_TYPES = ['rock_small', 'rock_medium', 'rock_large', 'rock_barnacle', 'rock_moss'];
```

- [ ] **Step 3: 添加新装备定义**

在 EQUIPMENT 对象中追加：
```js
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
  description: '不受尖石伤害，但移动-15%。',
},
headlamp: {
  id: 'headlamp', slot: 'headlamp', name: '头灯',
  cost: 180, stats: { visionBonus: 0.5 },
  description: '洞穴和深水区视野+50%。',
},
```

- [ ] **Step 4: 添加大件收集物标记和海上事件 spawn 表**

```js
// 在 COLLECTIBLES 中为新收集物预留位置（具体定义在 Phase 2/3 任务中添加）
// 添加沉船事件掉落表
export const SHIPWRECK_LOOT = {
  guaranteed: [{ id: 'coin_ancient', count: 20 }],
  random: [
    { id: 'pearl', count: 1, chance: 0.8 },
    { id: 'shell_conch', count: 3, chance: 0.5 },
    { id: 'starfish', count: 1, chance: 0.5 },
    { id: 'coin_ancient', count: 5, chance: 0.7 },
    { id: 'coin_ancient', count: 10, chance: 0.3 },
  ],
  equipmentDrop: ['shovel_iron', 'gloves_leather', 'shoes_grip', 'coral_pick', 'headlamp'],
};
```

- [ ] **Step 5: 提交**

```bash
git add js/data.js
git commit -m "feat(data): 添加天气表、新装备定义、沉船掉落表"
```

---

### Task 2: 新建 weather.js — 天气系统

**Files:** Create: `js/weather.js`, Modify: `js/renderer.js`

- [ ] **Step 1: 创建 WeatherSystem 类**

```js
// weather.js
import { WEATHER_TABLE } from './data.js';

export class WeatherSystem {
  constructor(weatherKey = 'sunny') {
    this.current = WEATHER_TABLE[weatherKey] || WEATHER_TABLE['sunny'];
    this.currentKey = weatherKey;
    this.rainDrops = [];
    this.flashTimer = 0;
    this.flashCooldown = 5 + Math.random() * 10;
  }

  setWeather(key) {
    this.current = WEATHER_TABLE[key] || WEATHER_TABLE['sunny'];
    this.currentKey = key;
    this.rainDrops = [];
  }

  update(dt, canvasW, canvasH) {
    // 雨滴生成
    if (this.currentKey === 'drizzle' || this.currentKey === 'storm') {
      const rate = this.currentKey === 'storm' ? 50 : 18;
      const toSpawn = Math.floor(rate * dt);
      for (let i = 0; i < toSpawn; i++) {
        this.rainDrops.push({
          x: Math.random() * canvasW,
          y: -5,
          speed: 180 + Math.random() * 120,
          length: this.currentKey === 'storm' ? 10 + Math.random() * 4 : 6 + Math.random() * 2,
          alpha: 0.2 + Math.random() * 0.2,
        });
      }
    }
    // 更新雨滴位置
    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const d = this.rainDrops[i];
      d.y += d.speed * dt;
      d.x -= 30 * dt; // 斜风
      if (d.y > canvasH + 10) this.rainDrops.splice(i, 1);
    }
    // 暴雨闪电
    if (this.currentKey === 'storm') {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = this.flashCooldown;
        this.flashCooldown = 5 + Math.random() * 15;
        return true; // 触发闪电
      }
    }
    return false;
  }

  drawRain(ctx, scale = 2) {
    for (const d of this.rainDrops) {
      ctx.strokeStyle = `rgba(255,255,255,${d.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x * scale, d.y * scale);
      ctx.lineTo((d.x + d.length * 0.5) * scale, (d.y + d.length) * scale);
      ctx.stroke();
    }
  }
}
```

- [ ] **Step 2: 修改 renderer.js — 集成天气渲染**

在 `renderBeach` 方法中，天空绘制后、地图绘制前添加天气层。修改 renderer 构造函数：
```js
// 在 constructor 中添加
this.flashAlpha = 0;

// 添加方法
drawWeatherOverlay(ctx, weather) {
  if (!weather || weather.currentKey === 'sunny') return;
  weather.drawRain(ctx, SCALE);
}

triggerLightningFlash() {
  this.flashAlpha = 1.0;
}

// 在 renderBeach 中，_drawSky 之后添加：
// if (weather) this.drawWeatherOverlay(this.bctx, weather);

// 在 renderBeach 末尾、放大渲染后添加闪电：
// if (this.flashAlpha > 0) {
//   this.ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
//   this.ctx.fillRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);
//   this.flashAlpha = Math.max(0, this.flashAlpha - 0.05);
// }
```

- [ ] **Step 3: 提交**

```bash
git add js/weather.js js/renderer.js
git commit -m "feat(weather): 添加天气系统（晴/雨/暴雨+闪电）"
```

---

### Task 3: 新建 events.js — 沉船事件

**Files:** Create: `js/events.js`, Modify: `js/game.js`, `js/renderer.js`

- [ ] **Step 1: 创建 ShipwreckEvent 类**

```js
// events.js
import { SHIPWRECK_LOOT, TILE_SIZE, CANVAS_W, CANVAS_H } from './data.js';
import { Collectible } from './collectibles.js';

export class ShipwreckEvent {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.timeRemaining = 0;    // 时间暂停剩余秒数
    this.looted = false;
    this.spawnedItems = [];
  }

  tryTrigger(beachMap, tide) {
    if (this.active) return false;
    // 仅在外礁区触发
    const playerBiome = beachMap.getBiomeAt(CANVAS_W/2, CANVAS_H/2) ||
      beachMap.tiles[15]?.[10]?.biome;
    if (playerBiome !== 'outer_reef' && playerBiome !== 'reef_zone') return false;
    if (tide.phase !== 'low' && tide.phase !== 'flooding') return false;
    // 3% 每分钟 = 0.0005 每帧(60fps)
    if (Math.random() > 0.0005) return false;

    this.active = true;
    this.x = 60 + Math.random() * (CANVAS_W - 120);
    this.y = CANVAS_H - 40 - Math.random() * 30;
    this.timeRemaining = 45; // 45 秒 = 时间暂停
    this.looted = false;
    this.spawnedItems = [];
    return true;
  }

  /** 生成掉落物，返回 Collectible 数组 */
  spawnLoot() {
    if (this.looted) return [];
    this.looted = true;
    const items = [];
    // 保底掉落
    for (const g of SHIPWRECK_LOOT.guaranteed) {
      for (let i = 0; i < g.count; i++) {
        items.push(new Collectible(g.id,
          this.x + (Math.random()-0.5)*40,
          this.y + (Math.random()-0.5)*20));
      }
    }
    // 随机珍宝
    for (const r of SHIPWRECK_LOOT.random) {
      if (Math.random() < r.chance) {
        for (let i = 0; i < r.count; i++) {
          items.push(new Collectible(r.id,
            this.x + (Math.random()-0.5)*50,
            this.y + (Math.random()-0.5)*30));
        }
      }
    }
    this.spawnedItems = items;
    return items;
  }

  /** 随机掉一件装备 ID，返回装备 id 或 null */
  static rollEquipment() {
    const pool = SHIPWRECK_LOOT.equipmentDrop;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt) {
    if (!this.active) return;
    // 沉船期间潮汐暂停由 game 层处理
  }

  get isExpired() {
    return this.active && this.timeRemaining <= 0;
  }
}
```

- [ ] **Step 2: 集成到 game.js — 触发和暂停潮汐**

在 `_updateBeach` 方法中，采集检测之后添加：
```js
// 沉船事件检测
if (!this.shipwreckEvent) this.shipwreckEvent = new ShipwreckEvent();
if (!this.shipwreckEvent.active) {
  if (this.shipwreckEvent.tryTrigger(this.beachMap, this.tide)) {
    this.tide.paused = true;
    this.effects.addFloatingText(CANVAS_W/2, CANVAS_H/2, '⚓ 发现沉船！时间暂停！', '#d4a840', 3);
    this.renderer.triggerShake(6);
  }
}
if (this.shipwreckEvent?.active) {
  this.shipwreckEvent.timeRemaining -= dt;
  if (this.shipwreckEvent.timeRemaining <= 0) {
    this.tide.paused = false;
    this.tide.elapsed += 30; // 加速30秒
    this.shipwreckEvent.active = false;
    this.shop.showMessage && this.shop.showMessage('潮水加速涨回来了！快跑！');
  }
}
```

- [ ] **Step 3: 沉船交互 — 点击沉船收集战利品**

在 `_updateBeach` 的点击处理中添加沉船交互：
```js
// 点击沉船
if (clicked && this.shipwreckEvent?.active && !this.shipwreckEvent.looted) {
  const gx = this.mouseX / SCALE;
  const gy = this.mouseY / SCALE;
  const sx = this.shipwreckEvent.x;
  const sy = this.shipwreckEvent.y;
  if (Math.abs(gx - sx) < 50 && Math.abs(gy - sy) < 40) {
    const loot = this.shipwreckEvent.spawnLoot();
    for (const item of loot) {
      this.collectibleMgr.items.push(item);
    }
    const equipId = ShipwreckEvent.rollEquipment();
    if (equipId) {
      // 直接将装备加入背包作为一个特殊物品
      this.player.addItem(equipId + '_shipwreck', { name: '沉船装备', weight: 0.1, stackSize: 1, value: 0, collectTime: 0 }, 1);
      this.shop.showMessage(`发现了一件装备！回村后查看。`);
    }
    this.effects.treasureGlow(sx, sy);
  }
}
```

并在 game.js 顶部添加 import:
```js
import { ShipwreckEvent } from './events.js';
```

- [ ] **Step 4: 渲染沉船残骸**

在 renderer.js 中添加方法：
```js
_drawShipwreck(ctx, event) {
  if (!event?.active) return;
  const x = event.x, y = event.y;
  // 船体
  ctx.fillStyle = '#5a3a20';
  ctx.beginPath();
  ctx.moveTo(x-30, y+10);
  ctx.lineTo(x-20, y-5);
  ctx.lineTo(x+20, y-5);
  ctx.lineTo(x+30, y+10);
  ctx.lineTo(x+15, y+25);
  ctx.lineTo(x-15, y+25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 桅杆
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y-5);
  ctx.lineTo(x-10, y-25);
  ctx.stroke();
  // 发光提示（还没被洗劫）
  if (!event.looted) {
    ctx.fillStyle = `rgba(212,168,64,${0.3 + Math.sin(Date.now()/500)*0.2})`;
    ctx.beginPath();
    ctx.arc(x, y+10, 40, 0, Math.PI*2);
    ctx.fill();
  }
}
```

在 `_drawMap` 之后调用 `this._drawShipwreck(ctx, this._shipwreckEvent)`（通过参数传入）。

- [ ] **Step 5: 提交**

```bash
git add js/events.js js/game.js js/renderer.js
git commit -m "feat(events): 添加沉船事件（时间暂停+大量掉落）"
```

---

### Task 4: 威望系统

**Files:** Modify: `js/inventory.js`, `js/shop.js`, `js/game.js`

- [ ] **Step 1: inventory.js — 添加 prestige 方法和 legacies**

```js
// 在 constructor 中添加
this.legacies = [];    // 已获得的永久遗产 id 列表
this.seaPearlFragments = 0;
this.seaPearls = 0;

// 添加方法
prestige(sectionId) {
  if (sectionId === 'shell' && this.museum.length < 5) return false;
  // 记录遗产
  const legacyMap = {
    shell: 'shell_mastery',  // 贝类精通：贝壳产出+25%
  };
  const legacyId = legacyMap[sectionId];
  if (!legacyId || this.legacies.includes(legacyId)) return false;

  this.legacies.push(legacyId);
  // 重置（保留博物馆和水族箱中的活体）
  this.items = [];
  this.gold = 0;
  // 水族箱清空
  this.aquarium = [];
  // 博物馆保留
  return legacyId;
}

hasLegacy(id) {
  return this.legacies.includes(id);
}
```

- [ ] **Step 2: shop.js — 威望 UI 按钮**

在 `_drawMuseumTab` 中，展区完成（donatedCount === 5）时，添加可点击的按钮：
```js
// 在展区完成提示后添加
if (donatedCount === exhibits.length) {
  const btnX = px + pw/2 - 60*s;
  const btnY = py + ph - 50*s;
  ctx.fillStyle = '#c04030';
  ctx.fillRect(btnX, btnY, 120*s, 28*s);
  ctx.fillStyle = '#f5f0e0';
  ctx.font = `bold ${6*s}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('致伟大的海洋', px + pw/2, btnY + 18*s);

  // 添加点击检测（在 game.js _updateVillage 中处理）
}
```

game.js 中添加威望按钮点击：
```js
// 在 museum tab 的点击处理中
if (this.shop.tab === 'museum') {
  const donatedCount = exhibits.filter(e => this.inventory.museum.includes(e)).length;
  if (donatedCount === 5) {
    const btnX = px + pw/2 - 60*s, btnY = py + ph - 50*s;
    if (this._hitTest(btnX, btnY, 120*s, 28*s)) {
      const legacy = this.inventory.prestige('shell');
      if (legacy) {
        this.shop.showMessage('致伟大的海洋！获得永久遗产：贝类精通');
      }
      return;
    }
  }
}
```

- [ ] **Step 3: 永久遗产影响收集物生成**

在 `collectibles.js` 的 `spawnAll` 中检查遗产：
```js
// spawnAll 方法中，计算 count 后
if (this._inventory?.hasLegacy?.('shell_mastery') && config.biomes.some(b => ['sand_shallow', 'tidal_flat'].includes(b))) {
  // 贝类精通：贝壳产出+25%
  const shellIds = ['shell_fan', 'shell_conch', 'clam'];
  if (shellIds.includes(config.id)) {
    count = Math.floor(count * 1.25);
  }
}
```

CollectibleManager 构造函数接收 inventory 引用：
```js
constructor(beachMap, inventory = null) {
  // ... existing code
  this._inventory = inventory;
}
```

- [ ] **Step 4: 提交**

```bash
git add js/inventory.js js/shop.js js/game.js js/collectibles.js
git commit -m "feat(prestige): 威望系统'致伟大的海洋'+贝类精通遗产"
```

---

### Task 5: 海蚀洞 + 大件拖拽 + 海灵珠合成

**Files:** Modify: `js/beach.js`, `js/player.js`, `js/game.js`, `js/inventory.js`, `js/shop.js`, `js/data.js`

- [ ] **Step 1: beach.js — 添加 cave_entrance tile**

在 `_placeDockRuins` 之后添加：
```js
_placeCaveEntrance() {
  // 海蚀洞入口在礁石区随机位置，仅极低潮可见
  const row = 14 + Math.floor(Math.random() * 3);
  const col = 5 + Math.floor(Math.random() * 4);
  this.tiles[row][col] = { type: 'cave_entrance', variant: 0, biome: 'cave' };
  this.tiles[row][col+1] = { type: 'cave_entrance', variant: 0, biome: 'cave' };
}
```

在 `generate()` 中调用：
```js
this._placeCaveEntrance();
```

- [ ] **Step 2: player.js — 大件拖拽状态**

在 Player 类中添加：
```js
// constructor 中添加
this.isDragging = false;
this.draggingItem = null;  // { id, name, weight, value }

// 在 currentSpeed getter 中，开头添加
if (this.isDragging) return this.speed * 0.5;

// 添加方法
startDrag(itemDef) {
  this.isDragging = true;
  this.draggingItem = { id: itemDef.id, name: itemDef.name, weight: itemDef.weight, value: itemDef.value };
}

dropDrag() {
  this.isDragging = false;
  const item = this.draggingItem;
  this.draggingItem = null;
  return item; // 返回以在地图上放置标记
}

canCollect() {
  return !this.isDragging && !this.isCollecting;
}
```

- [ ] **Step 3: game.js — 海蚀洞交互 + 大件采集**

在 `_updateBeach` 中检测玩家是否在海蚀洞 tile 上：
```js
// 在 player.update 之后
const playerTile = this.beachMap.getTileAt(this.player.x + 7, this.player.y + 8);
if (playerTile?.type === 'cave_entrance') {
  if (this.tide.level > 0.6) {
    // 潮水快涨上来了，踢出玩家
    this.player.x = 60 + Math.random() * (CANVAS_W - 120);
    this.player.y = 35;
    this.shop.showMessage('潮水涌入洞穴！你被冲了出来...');
  } else if (this.tide.level < 0.15) {
    // 低潮，洞口开放——提示玩家有稀有物品
    if (!this.caveSpawned && Math.random() < 0.3) {
      // spawn 一个珍珠
      const pearl = new Collectible('pearl', playerTile.col * TILE_SIZE + 8, playerTile.row * TILE_SIZE + 8);
      this.collectibleMgr.items.push(pearl);
      this.caveSpawned = true;
      this.effects.addFloatingText(CANVAS_W/2, 100, '海蚀洞内发现珍宝！', '#d4a840', 2);
    }
  }
}
```

在 `startBeachRun` 中重置 `this.caveSpawned = false;`

大件物品采集（在 `_updateCollecting` 完成时）：
```js
// 采集完成后检查是否是 bulky 物品
if (target.def.bulky) {
  this.player.startDrag(target.def);
  this.shop.showMessage(`开始拖拽${target.def.name}...移动速度减半`);
  // 不添加到背包
  this.player.isCollecting = false;
  this.player.collectTarget = null;
  return;
}
```

按空格放下大件：
```js
if (this.input.wasPressed('Space') && this.player.isDragging) {
  const item = this.player.dropDrag();
  if (item) {
    this.collectibleMgr.items.push(new Collectible(item.id, this.player.x, this.player.y));
    this.effects.addFloatingText(this.player.x, this.player.y - 5, '已放下', '#ffffff', 1);
  }
}
```

- [ ] **Step 4: inventory.js — 海灵珠合成**

```js
// 添加方法
synthesizePearl() {
  if (this.seaPearlFragments < 10) return false;
  this.seaPearlFragments -= 10;
  this.seaPearls++;
  return true;
}

// 修改 collectAquariumOutput
collectAquariumOutput() {
  let fragments = 0;
  for (const a of this.aquarium) {
    fragments += a.output * a.count;
  }
  this.seaPearlFragments += fragments;
  return fragments;
}
```

- [ ] **Step 5: shop.js — 海灵珠合成 UI**

在 `_drawAquariumTab` 底部添加：
```js
// 收集产出之后
const canSynth = this.inventory.seaPearlFragments >= 10;
ctx.fillStyle = canSynth ? COLORS.gold : '#888';
ctx.font = `${5 * s}px monospace`;
ctx.textAlign = 'left';
ctx.fillText(`海灵珠: ${this.inventory.seaPearls}颗 [${canSynth ? 'F' : ''}]合成(10碎片→1珠)`, px + 12*s, py + ph - 36*s);
```

在 game.js 中处理 'KeyF' 合成：
```js
if (this.shop.tab === 'aquarium' && this.input.wasPressed('KeyF')) {
  if (this.inventory.synthesizePearl()) {
    this.shop.showMessage('合成了一颗海灵珠！');
  } else {
    this.shop.showMessage('碎片不足（需要10个）');
  }
}
```

- [ ] **Step 6: 提交**

```bash
git add js/beach.js js/player.js js/game.js js/inventory.js js/shop.js
git commit -m "feat: 海蚀洞+大件拖拽+海灵珠合成"
```

---

### Task 6: 音效系统

**Files:** Create: `js/audio.js`, Modify: `js/game.js`

- [ ] **Step 1: 创建 AudioManager**

```js
// audio.js
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  _tone(freq, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPickup() { this._tone(880, 0.1); setTimeout(() => this._tone(1100, 0.08), 50); }
  playSell() { this._tone(660, 0.12, 'triangle'); }
  playDamage() { this._tone(80, 0.2, 'square', 0.1); }
  playTreasure() {
    this._tone(523, 0.12); setTimeout(() => this._tone(659, 0.1), 80);
    setTimeout(() => this._tone(784, 0.15), 160);
  }
  playWave() {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.03;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.loop = true;
    source.start();
    return { source, gain };
  }
}
```

- [ ] **Step 2: 集成到 game.js**

```js
// constructor 中
this.audio = new AudioManager();
this.audio.init();

// start() 中首次交互时 resume
// _setupMouse 的 click 回调中
this.audio.resume();

// 采集完成时
this.audio.playPickup();

// 出售时
this.audio.playSell();

// 受伤时
this.audio.playDamage();

// 发现珍宝时
this.audio.playTreasure();

// startBeachRun 中开始海浪环境音
this.waveSound = this.audio.playWave();
```

- [ ] **Step 3: 提交**

```bash
git add js/audio.js js/game.js
git commit -m "feat(audio): Web Audio API 程序化音效（拾取/受伤/珍宝/海浪）"
```

---

### Task 7: 更多装备交互

**Files:** Modify: `js/player.js`, `js/game.js`, `js/data.js`

- [ ] **Step 1: data.js 中添加装备购买标记**

（已在 Task 1 中添加新装备定义，现在整合到 shop.js 购买逻辑中。shop.js 的 `_drawEquipmentTab` 需要显示 8 个装备而非 4 个。）

- [ ] **Step 2: shop.js — 扩展装备列表**

将 `_drawEquipmentTab` 中的 equips 数组扩展：
```js
const equips = [
  { id: 'shovel_iron', name: '铁铲', cost: 200, desc: '采集速度+50%，挖掘有加成' },
  { id: 'coral_pick', name: '珊瑚镐', cost: 250, desc: '礁石区效率+200%' },
  { id: 'tongs_bamboo', name: '竹夹', cost: 120, desc: '安全采集螃蟹/海胆' },
  { id: 'gloves_leather', name: '皮革手套', cost: 150, desc: '减少15点攻击伤害' },
  { id: 'shoes_grip', name: '防滑鞋', cost: 180, desc: '礁石上不会打滑' },
  { id: 'boots_iron', name: '铁头靴', cost: 220, desc: '免疫尖石伤害，移速-15%' },
  { id: 'basket_medium', name: '中型竹篓', cost: 300, desc: '容量提升至16格/30kg' },
  { id: 'headlamp', name: '头灯', cost: 180, desc: '洞穴/深水视野+50%' },
];
```

- [ ] **Step 3: game.js — 新装备效果应用**

在 `_buyEquipment` 中扩展：
```js
_buyEquipment(equipId) {
  const def = EQUIPMENT[equipId];
  if (!def) return;
  if (this.inventory.gold < def.cost) { this.shop.showMessage('金币不足！'); return; }
  this.inventory.gold -= def.cost;
  if (def.slot === 'backpack') {
    this.inventory.slots = def.stats.capacity;
    this.inventory.maxWeight = def.stats.maxWeight;
  }
  // 应用手套装备
  if (def.slot === 'gloves') {
    this.inventory.equippedGloves = equipId;
  }
  // 应用鞋子装备
  if (def.slot === 'shoes') {
    this.inventory.equippedShoes = equipId;
  }
  // 应用工具装备
  if (def.slot === 'tool') {
    this.inventory.equippedTool = equipId;
  }
  // 应用头灯
  if (def.slot === 'headlamp') {
    this.inventory.equippedHeadlamp = equipId;
  }
  this.shop.showMessage(`购买了${def.name}！`);
}
```

- [ ] **Step 4: player.js — 装备效果生效**

在 player 的 `update` 中应用装备效果：
```js
// 防滑鞋
if (this.inventory?.equippedShoes === 'shoes_grip' && this.waterDepth === 0) {
  // 在礁石 biome 上不会滑倒
}
// 铁头靴
if (this.inventory?.equippedShoes === 'boots_iron') {
  this.speed = 80 * 0.85;
}
// 头灯视野
if (this.inventory?.equippedHeadlamp === 'headlamp') {
  this.visionRange = 1.5;
}
```

- [ ] **Step 5: 提交**

```bash
git add js/data.js js/player.js js/game.js js/shop.js
git commit -m "feat(equipment): 8件装备完整购买+效果系统"
```

---

## Phase 1 完成检查点

Phase 1 完成后，以下功能应该正常工作：

- [ ] 博物馆展区满 5 件 → 点击「致伟大的海洋」→ 重置并获永久遗产
- [ ] 出海前随机天气生效，小雨有雨滴、暴雨有闪电
- [ ] 外礁区偶尔触发沉船事件，时间暂停，可洗劫残骸
- [ ] 极低潮时海蚀洞入口出现，洞内有稀有珍宝
- [ ] 大件物品可拖拽，空格放下
- [ ] 水族箱碎片满 10 可按 F 合成海灵珠
- [ ] 8 件装备可购买，防滑/免疫尖石/头灯效果生效
- [ ] 拾取/出售/受伤/发现珍宝有音效
- [ ] 海浪环境音在出海时播放
