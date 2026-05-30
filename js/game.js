// game.js — 游戏主循环和场景管理

import { CANVAS_W, CANVAS_H, SCALE, TILE_SIZE, SCENE, MOON_PHASES, COLLECTIBLES, EQUIPMENT, rollWeather } from './data.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { Player } from './player.js';
import { BeachMap } from './beach.js';
import { TideSystem } from './tide.js';
import { CollectibleManager, Collectible } from './collectibles.js';
import { EffectsManager } from './effects.js';
import { Inventory } from './inventory.js';
import { ShopScene } from './shop.js';
import { WeatherSystem } from './weather.js';
import { ShipwreckEvent } from './events.js';
import { AudioManager } from './audio.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new InputManager();
    this.renderer = new Renderer(canvas);
    this.ui = new UIManager();
    this.inventory = new Inventory();
    this.effects = new EffectsManager();

    // 场景
    this.scene = SCENE.VILLAGE;
    this.shop = new ShopScene(this.inventory);

    // 天气
    this.weather = new WeatherSystem('sunny');
    this.currentWeather = 'sunny';

    // 音频
    this.audio = new AudioManager();
    this.audio.init();

    // 事件
    this.shipwreckEvent = null;

    // 海滩相关（出海时初始化）
    this.beachMap = null;
    this.tide = null;
    this.player = null;
    this.collectibleMgr = null;

    // 游戏进度
    this.day = 1;
    this.moonIndex = 0;  // 新月开始
    this.currentBeach = 'white_sand';  // 当前选择的海滩
    this.tripsCompleted = 0;  // 已完成出海次数（用于解锁海滩）

    // UI 状态
    this.showBackpack = false;
    this.backpackSlotSelected = -1;

    // 采集交互
    this.interactionTarget = null;
    this.isRunning = false;

    // 时间
    this.lastTime = 0;
    this.gameTime = 0;

    // 出海冷却（返回后短暂冷却）
    this.cooldownTimer = 0;
  }

  // ============ 场景切换 ============

  startBeachRun() {
    // 随机天气
    this.currentWeather = rollWeather();
    this.weather.setWeather(this.currentWeather);

    // 初始化海滩
    this.beachMap = new BeachMap(this.currentBeach);

    // 初始化潮汐
    const baseDuration = 240; // 4分钟
    const moonPhase = MOON_PHASES[this.moonIndex % 8];
    const moonEffect = (moonPhase === 'new' || moonPhase === 'full') ? 1.3 :
                       (moonPhase === 'quarter2') ? 0.8 : 1.0;
    this.tide = new TideSystem(baseDuration);
    this.tide.setMoonEffect(moonEffect);
    this.tide.start();

    // 初始化玩家
    this.player = new Player();
    this.player.x = 60 + Math.random() * (CANVAS_W - 120);
    this.player.y = 30;
    this.player.inventory = this.inventory;
    // 同步背包数据
    this.player.items = this.inventory.items;
    this.player.currentWeight = this.inventory.currentWeight;
    this.player.backpackSlots = this.inventory.slots;
    this.player.maxWeight = this.inventory.maxWeight;

    // 初始化收集物
    this.collectibleMgr = new CollectibleManager(this.beachMap, this.inventory);
    this.collectibleMgr.spawnAll(moonEffect);

    // 初始化事件
    this.shipwreckEvent = new ShipwreckEvent();
    this._caveSpawned = false;

    // 启动海浪环境音
    this.audio.playWave();

    // 切换场景
    this.scene = SCENE.BEACH;
    this.showBackpack = false;
    this.interactionTarget = null;
  }

  returnToVillage() {
    // 停止海浪音
    this.audio.stopWave();
    // 结算
    this.scene = SCENE.VILLAGE;
    this.tide.stop();

    // 同步背包数据回 inventory
    this.inventory.items = this.player.items;
    // 水族箱产出收集
    const frags = this.inventory.collectAquariumOutput();
    if (frags > 0) {
      this.shop.showMessage(`水族箱产出了 ${frags} 个海灵珠碎片！`);
    }

    // 日数推进
    this.day++;
    this.tripsCompleted++;
    this.moonIndex = (this.moonIndex + 1) % 8;

    // 清理海滩状态
    this.beachMap = null;
    this.tide = null;
    this.player = null;
    this.collectibleMgr = null;
    this.effects = new EffectsManager();

    // 切换商店标签
    this.shop.tab = 'sell';
    this.shop.selectedSlot = -1;
  }

  // ============ 主循环 ============

  start() {
    this.lastTime = performance.now();
    this._loop = (time) => {
      try {
        const dt = Math.min(0.1, (time - this.lastTime) / 1000); // cap at 100ms
        this.lastTime = time;
        this.gameTime += dt;

        this.update(dt);
        this.render();

        this.input.endFrame();
      } catch (e) {
        console.error('Game loop error:', e);
      }
      requestAnimationFrame(this._loop);
    };
    requestAnimationFrame(this._loop);

    // 鼠标支持
    this._setupMouse();
  }

  _setupMouse() {
    const canvas = this.canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = (CANVAS_W * SCALE) / rect.width;
      const scaleY = (CANVAS_H * SCALE) / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('click', (e) => {
      this.mouseClicked = true;
      this.audio.resume();
    });

    canvas.style.cursor = 'default';
  }

  _consumeClick() {
    if (this.mouseClicked) {
      this.mouseClicked = false;
      return true;
    }
    return false;
  }

  _hitTest(x, y, w, h) {
    return this.mouseX >= x && this.mouseX <= x + w &&
           this.mouseY >= y && this.mouseY <= y + h;
  }

  // ============ 更新 ============

  update(dt) {
    if (this.scene === SCENE.BEACH) {
      this._updateBeach(dt);
    } else if (this.scene === SCENE.VILLAGE) {
      this._updateVillage(dt);
    }
  }

  _updateBeach(dt) {
    // 天气更新
    const lightning = this.weather.update(dt, CANVAS_W, CANVAS_H);
    if (lightning) {
      this.renderer.triggerLightningFlash();
    }

    // 潮汐更新
    this.tide.update(dt);

    // 沉船事件更新
    if (this.shipwreckEvent?.active) {
      this.shipwreckEvent.update(dt);
      if (this.shipwreckEvent.isExpired) {
        this.tide.elapsed += 20; // 潮水加速恢复
        this.shipwreckEvent.active = false;
        this.renderer.triggerShake(3);
      }
    } else if (this.shipwreckEvent) {
      this.shipwreckEvent.tryTrigger(this.beachMap, this.tide);
    }

    // 鼠标点击 —— 海滩上点击收集物
    const clicked = this._consumeClick();
    if (clicked && !this.showBackpack && !this.player.isCollecting) {
      // 转换鼠标坐标到游戏坐标 (480x320)
      const gx = this.mouseX / SCALE;
      const gy = this.mouseY / SCALE;

      // 检查点击是否在玩家附近（40px 范围内）
      const distToPlayer = Math.sqrt(
        (gx - (this.player.x + 7)) ** 2 + (gy - (this.player.y + 8)) ** 2
      );
      if (distToPlayer <= 22) {

      // 先检查是否点击沉船
      if (this.shipwreckEvent?.active && !this.shipwreckEvent.looted && this.shipwreckEvent.hitTest(gx, gy)) {
        const loot = this.shipwreckEvent.spawnLoot();
        for (const item of loot) {
          this.collectibleMgr.items.push(item);
        }
        const equipId = ShipwreckEvent.rollEquipment();
        if (equipId) {
          const equipDef = EQUIPMENT[equipId];
          this.player.addItem(equipId + '_found', {
            name: equipDef?.name || '神秘装备', weight: 0.1, stackSize: 1,
            value: equipDef?.cost || 100, collectTime: 0,
          }, 1);
        }
        this.effects.treasureGlow(this.shipwreckEvent.x, this.shipwreckEvent.y);
        this.renderer.triggerShake(4);
        this.shop.showMessage('洗劫沉船！大量珍宝！');
      }

      const target = this.collectibleMgr.findNearest(gx, gy, 20);
      if (target) {
        this.player.isCollecting = true;
        this.player.collectTarget = target;
        this.player.collectTimer = target.def.collectTime / 1000;
      }

      }
    }

    // 背包切换
    if (this.input.wasPressed('Tab') || this.input.wasPressed('KeyB')) {
      this.showBackpack = !this.showBackpack;
      this.player.isCollecting = false;
      this.interactionTarget = null;
    }

    if (this.showBackpack) {
      // ESC 关闭背包
      if (this.input.wasPressed('Escape') || this.input.wasPressed('Tab') || this.input.wasPressed('KeyB')) {
        this.showBackpack = false;
        return;
      }
      // 鼠标点击背包面板 (尺寸与 ui.js renderBackpack 严格一致)
      if (this._consumeClick()) {
        const s = SCALE;
        const pw = 280 * s, ph = 280 * s;
        const px = (CANVAS_W * s - pw) / 2;
        const py = (CANVAS_H * s - ph) / 2;
        // 点击面板外部关闭
        if (!this._hitTest(px, py, pw, ph)) {
          this.showBackpack = false;
          return;
        }
        // 点击物品格子
        const cols = 4, cellSize = 50 * s, gap = 4 * s;
        const gridX = px + 12 * s;
        const gridY = py + 32 * s;
        for (let i = 0; i < Math.max(this.inventory.totalSlots, this.inventory.items.length); i++) {
          const cx = gridX + (i % cols) * (cellSize + gap);
          const cy = gridY + Math.floor(i / cols) * (cellSize + gap);
          if (this._hitTest(cx, cy, cellSize, cellSize)) {
            this.backpackSlotSelected = i;
            return;
          }
        }
        // 点击底部按钮
        const btnW = (pw - 40 * s) / 2, btnH = 20 * s;
        const btnY1 = py + ph - 48 * s, btnY2 = py + ph - 24 * s;
        if (this._hitTest(px + 12 * s, btnY1, btnW, btnH)) {
          if (this.backpackSlotSelected < this.inventory.items.length) {
            const val = this.inventory.sellItem(this.backpackSlotSelected);
            if (val > 0) this.shop.showMessage(`出售 +${val}金币`);
          }
        }
        if (this._hitTest(px + 16 * s + btnW, btnY1, btnW, btnH)) {
          if (this.backpackSlotSelected < this.inventory.items.length) {
            const id = this.inventory.items[this.backpackSlotSelected].id;
            this.inventory.addToAquarium(id);
          }
        }
        if (this._hitTest(px + 12 * s, btnY2, btnW, btnH)) {
          if (this.backpackSlotSelected < this.inventory.items.length) {
            const id = this.inventory.items[this.backpackSlotSelected].id;
            this.inventory.donateItem(id);
          }
        }
        if (this._hitTest(px + 16 * s + btnW, btnY2, btnW, btnH)) {
          this.showBackpack = false;
        }
      }
      this._updateBackpackInput();
      return;
    }

    // 返回村庄
    if (this.input.wasPressed('Escape')) {
      this.returnToVillage();
      return;
    }

    // 满潮强制返回
    if (this.tide.progress >= 1.0) {
      this.shop.showMessage('潮水已满！被冲回岸边，丢失一半战利品...');
      // 随机丢弃一半物品
      const items = this.player.items;
      for (let i = items.length - 1; i >= 0; i--) {
        if (Math.random() < 0.5) {
          this.player.currentWeight -= items[i].weight * items[i].count;
          items.splice(i, 1);
        }
      }
      this.returnToVillage();
      return;
    }

    // 采集交互
    if (this.player.isCollecting) {
      this._updateCollecting(dt);
      return;
    }

    // 海蚀洞检测
    const playerTile = this.beachMap.getTileAt(this.player.x + 7, this.player.y + 8);
    if (playerTile?.type === 'cave_entrance' && !this._caveSpawned) {
      this._caveSpawned = true;
      if (this.tide.level < 0.15) {
        // 洞内发现珍珠
        const cx = playerTile.col * TILE_SIZE + 8;
        const cy = playerTile.row * TILE_SIZE + 8;
        const pearl = new Collectible('pearl', cx, cy);
        this.collectibleMgr.items.push(pearl);
        this.effects.addFloatingText(CANVAS_W / 2, 100, '海蚀洞内发现珍珠！', '#d4a840', 2);
      }
    }

    // 拖拽物品放下
    if (this.input.wasPressed('Space') && this.player.isDragging) {
      const item = this.player.dropDrag();
      if (item) {
        this.collectibleMgr.items.push(new Collectible(item.id, this.player.x, this.player.y));
        this.effects.addFloatingText(this.player.x, this.player.y - 5, '已放下', '#ffffff', 1);
      }
    }

    // 查找附近可采集物
    this.interactionTarget = this.collectibleMgr.findNearest(this.player.x, this.player.y, 25);

    // 开始采集
    if (this.input.wasPressed('KeyE') && this.interactionTarget && this.player.canCollect()) {
      this.player.isCollecting = true;
      this.player.collectTarget = this.interactionTarget;
      this.player.collectTimer = this.interactionTarget.def.collectTime / 1000;
    }

    // 奔跑判定
    this.isRunning = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');

    // 玩家更新
    if (!this.player.isCollecting) {
      this.player.update(dt, this.input, this.isRunning, this.tide.level, this.beachMap);
    }

    // 收集物更新
    this.collectibleMgr.update(dt, this.player.x, this.player.y);

    // 潮汐伤害
    if (this.player.waterDepth >= 3) {
      this.player.takeDamage(8 * dt);
      if (this.tide.isDangerous) {
        this.renderer.triggerDangerFlash();
      }
    }

    // 玩家死亡
    if (this.player.hp <= 0) {
      this.shop.showMessage('你昏迷了，被海浪冲回岸边...');
      // 丢一半物品
      const items = this.player.items;
      for (let i = items.length - 1; i >= 0; i--) {
        if (Math.random() < 0.5) {
          this.player.currentWeight -= items[i].weight * items[i].count;
          items.splice(i, 1);
        }
      }
      this.returnToVillage();
      return;
    }

    // 特效更新
    this.effects.update(dt);
  }

  _updateCollecting(dt) {
    this.player.collectTimer -= dt;

    // 动画更新
    this.player.updateAnim(dt, this.input, false);

    if (this.player.collectTimer <= 0) {
      // 采集完成
      const target = this.player.collectTarget;
      if (target && !target.collected) {
        // 危险判定（螃蟹夹手等）
        if (target.def.danger) {
          const dmg = target.def.danger.value;
          this.player.takeDamage(dmg);
          this.effects.burstDamage(target.x + 7, target.y + 4);
          this.effects.addFloatingText(target.x, target.y - 5, `-${dmg} HP`, '#c04030', 1);
          this.audio.playDamage();
          if (dmg > 0) {
            this.renderer.triggerShake(2);
          }
        }

        // 添加到背包
        const success = this.player.addItem(target.id, target.def, 1);
        if (success) {
          target.collected = true;
          this.effects.burstCollect(target.x + 7, target.y + 4, 8, '#d4c08a');
          this.effects.addFloatingText(target.x, target.y - 8, `+${target.def.name}`, '#ffffff', 1.5);

          // 稀有物品特效
          if (target.def.rarity === 'rare' || target.def.rarity === 'epic') {
            this.effects.treasureGlow(target.x + 7, target.y + 4);
            this.renderer.triggerShake(1);
            this.audio.playTreasure();
          } else {
            this.audio.playPickup();
          }
        }
      }

      this.player.isCollecting = false;
      this.player.collectTarget = null;
      this.interactionTarget = null;
    }

    // 如果在采集过程中螃蟹逃跑了，取消采集
    if (this.player.collectTarget && this.player.collectTarget.collected) {
      this.player.isCollecting = false;
      this.player.collectTarget = null;
    }
  }

  _updateBackpackInput() {
    if (this.input.wasPressed('ArrowUp')) this.backpackSlotSelected = Math.max(0, this.backpackSlotSelected - 4);
    if (this.input.wasPressed('ArrowDown')) this.backpackSlotSelected = Math.min(this.inventory.totalSlots - 1, this.backpackSlotSelected + 4);
    if (this.input.wasPressed('ArrowLeft')) this.backpackSlotSelected = Math.max(0, this.backpackSlotSelected - 1);
    if (this.input.wasPressed('ArrowRight')) this.backpackSlotSelected = Math.min(this.inventory.totalSlots - 1, this.backpackSlotSelected + 1);

    if (this.input.wasPressed('KeyS') && this.backpackSlotSelected < this.inventory.items.length) {
      const val = this.inventory.sellItem(this.backpackSlotSelected);
      if (val > 0) {
        this.shop.showMessage(`出售获得 ${val} 金币！`);
      }
    }
    if (this.input.wasPressed('KeyA') && this.backpackSlotSelected < this.inventory.items.length) {
      const itemId = this.inventory.items[this.backpackSlotSelected].id;
      const success = this.inventory.addToAquarium(itemId);
      if (success) this.shop.showMessage(`已将 ${COLLECTIBLES[itemId]?.name || itemId} 放入水族箱`);
    }
    if (this.input.wasPressed('KeyM') && this.backpackSlotSelected < this.inventory.items.length) {
      const itemId = this.inventory.items[this.backpackSlotSelected].id;
      const success = this.inventory.donateItem(itemId);
      if (success) this.shop.showMessage(`已向博物馆捐赠 ${COLLECTIBLES[itemId]?.name || itemId}`);
      else this.shop.showMessage('已捐赠过此物品');
    }
  }

  _updateVillage(dt) {
    this.shop.update(dt);
    const s = SCALE; // = 2

    // ==== 鼠标点击处理 ====
    const clicked = this._consumeClick();
    if (clicked) {
      const mx = this.mouseX, my = this.mouseY;

      // 五个建筑 (位置对应 shop._drawBuildings)
      const buildings = [
        { tab: 'sell',      x: 160*s, y: 380*s, w: 80*s, h: 60*s },
        { tab: 'aquarium',  x: 320*s, y: 390*s, w: 80*s, h: 60*s },
        { tab: 'museum',    x: 480*s, y: 385*s, w: 80*s, h: 60*s },
        { tab: 'equipment', x: 640*s, y: 375*s, w: 80*s, h: 60*s },
        { tab: 'chart',     x: 720*s, y: 380*s, w: 80*s, h: 60*s },
      ];
      for (const b of buildings) {
        if (this._hitTest(b.x, b.y, b.w, b.h)) {
          this.shop.tab = b.tab;
          this.shop.selectedSlot = -1;
          return;
        }
      }

      // 【出海】按钮
      const goX = (CANVAS_W / 2 - 80) * s, goY = 520 * s, goW = 160 * s, goH = 36 * s;
      if (this._hitTest(goX, goY, goW, goH)) {
        this.startBeachRun();
        return;
      }

      // 面板内点击 (位置对应 shop._drawPanel)
      const px = 40 * s, py = 60 * s, pw = CANVAS_W * s - 80 * s;

      if (this.shop.tab === 'sell') {
        // 出售列表 (每行 24*s 高, 从 py+28*s 开始)
        const listY = py + 28 * s;
        const items = this.inventory.items;
        for (let i = 0; i < items.length; i++) {
          const iy = listY + i * 24 * s;
          if (this._hitTest(px + 8*s, iy - s, pw - 16*s, 22*s)) {
            this.shop.selectedSlot = i;
            // 双击出售
            if (this.shop._lastClickSlot === i && Date.now() - this.shop._lastClickTime < 400) {
              const val = this.inventory.sellItem(i);
              if (val > 0) this.shop.showMessage(`出售获得 ${val} 金币`);
            }
            this.shop._lastClickSlot = i;
            this.shop._lastClickTime = Date.now();
            return;
          }
        }
      }

      if (this.shop.tab === 'equipment') {
        // 装备行 (每行 36*s 高, 从 py+44*s 开始)
        const equips = ['shovel_iron','gloves_leather','shoes_grip','basket_medium'];
        for (let i = 0; i < equips.length; i++) {
          const ey = py + 44 * s + i * 36 * s;
          if (this._hitTest(px + 8*s, ey - s, pw - 16*s, 32*s)) {
            this._buyEquipment(equips[i]);
            return;
          }
        }
      }

      if (this.shop.tab === 'museum') {
        // 展位 (5个, 每 140*s 宽, 从 gridX 开始)
        const exhibits = ['shell_fan','shell_conch','clam','starfish','pearl'];
        const gridX = px + 20 * s, gridY = py + 32 * s;
        for (let i = 0; i < exhibits.length; i++) {
          const ex = gridX + i * 140 * s;
          if (this._hitTest(ex, gridY, 120*s, 80*s)) {
            if (this.inventory.donateItem(exhibits[i])) {
              this.shop.showMessage(`已捐赠！`);
            }
            return;
          }
        }
        // 威望按钮
        const donatedCount = exhibits.filter(e => this.inventory.museum.includes(e)).length;
        if (donatedCount >= exhibits.length && !this.inventory.hasLegacy('shell_mastery')) {
          const btnX = px + pw/2 - 60*s, btnY = py + 230*s;
          if (this._hitTest(btnX, btnY, 120*s, 28*s)) {
            const legacy = this.inventory.prestige('shell');
            if (legacy) {
              this.shop.showMessage('致伟大的海洋！获得永久遗产：贝类精通');
            }
            return;
          }
        }
      }

      if (this.shop.tab === 'aquarium') {
        // 海灵珠合成按钮
        const canSynth = this.inventory.seaPearlFragments >= 10;
        if (canSynth && this.shop._synthBtn) {
          const sb = this.shop._synthBtn;
          if (this._hitTest(sb.x, sb.y, sb.w, sb.h)) {
            if (this.inventory.synthesizePearl()) {
              this.shop.showMessage('合成了一颗海灵珠！');
            }
            return;
          }
        }
      }

      if (this.shop.tab === 'chart') {
        // 海滩选择
        const beaches = [
          { id: 'white_sand', name: '白沙湾', unlocked: true, row: 0 },
          { id: 'black_reef', name: '黑礁岛', unlocked: this.tripsCompleted >= 3, row: 1 },
          { id: 'seagrass', name: '海草甸', unlocked: this.tripsCompleted >= 6 && this.inventory.aquariumCount >= 5, row: 2 },
        ];
        const chartY = py + 32 * s;
        for (const b of beaches) {
          if (!b.unlocked) continue;
          const by = chartY + b.row * 70 * s;
          if (this._hitTest(px + 12 * s, by, pw - 24 * s, 60 * s)) {
            this.currentBeach = b.id;
            this.shop._selectedBeach = b.id;
            this.shop.showMessage(`选择了${b.name}`);
            return;
          }
        }
      }
    }

    // ==== 键盘输入 ====
    if (this.input.wasPressed('KeyQ')) { this.shop.tab = 'sell'; this.shop.selectedSlot = -1; }
    if (this.input.wasPressed('KeyW')) { this.shop.tab = 'equipment'; this.shop.selectedSlot = -1; }
    if (this.input.wasPressed('KeyE')) { this.shop.tab = 'aquarium'; this.shop.selectedSlot = -1; }
    if (this.input.wasPressed('KeyR')) { this.shop.tab = 'museum'; this.shop.selectedSlot = -1; }
    if (this.input.wasPressed('KeyT')) { this.shop.tab = 'chart'; this.shop.selectedSlot = -1; }

    if (this.shop.tab === 'sell') {
      if (this.input.wasPressed('ArrowUp')) this.shop.selectedSlot = Math.max(0, this.shop.selectedSlot - 1);
      if (this.input.wasPressed('ArrowDown')) this.shop.selectedSlot = Math.min(Math.max(0, this.inventory.items.length - 1), this.shop.selectedSlot + 1);
      if (this.input.wasPressed('KeyS') && this.shop.selectedSlot < this.inventory.items.length) {
        const val = this.inventory.sellItem(this.shop.selectedSlot);
        this.audio.playSell();
        this.shop.showMessage(`出售获得 ${val} 金币`);
      }
      if (this.input.wasPressed('KeyA')) {
        const total = this.inventory.sellAll();
        this.audio.playSell();
        this.shop.showMessage(`全部出售获得 ${total} 金币`);
      }
    }

    if (this.shop.tab === 'equipment') {
      if (this.input.wasPressed('Digit1')) this._buyEquipment('shovel_iron');
      if (this.input.wasPressed('Digit2')) this._buyEquipment('gloves_leather');
      if (this.input.wasPressed('Digit3')) this._buyEquipment('shoes_grip');
      if (this.input.wasPressed('Digit4')) this._buyEquipment('basket_medium');
    }

    if (this.shop.tab === 'museum') {
      if (this.input.wasPressed('Digit1')) this.inventory.donateItem('shell_fan');
      if (this.input.wasPressed('Digit2')) this.inventory.donateItem('shell_conch');
      if (this.input.wasPressed('Digit3')) this.inventory.donateItem('clam');
      if (this.input.wasPressed('Digit4')) this.inventory.donateItem('starfish');
      if (this.input.wasPressed('Digit5')) this.inventory.donateItem('pearl');
      if (this.input.wasPressed('KeyP')) {
        const legacy = this.inventory.prestige('shell');
        if (legacy) this.shop.showMessage('致伟大的海洋！获得永久遗产：贝类精通');
        else this.shop.showMessage('展区未完成或已获得此遗产');
      }
    }

    if (this.shop.tab === 'aquarium') {
      if (this.input.wasPressed('KeyF')) {
        if (this.inventory.synthesizePearl()) {
          this.shop.showMessage('合成了一颗海灵珠！');
        } else {
          this.shop.showMessage('碎片不足（需要10个）');
        }
      }
    }

    if (this.input.wasPressed('Space') || this.input.wasPressed('Enter')) {
      this.startBeachRun();
    }
  }

  _buyEquipment(equipId) {
    const def = EQUIPMENT[equipId];
    if (!def) return;
    if (this.inventory.gold < def.cost) {
      this.shop.showMessage('金币不足！');
      return;
    }
    this.inventory.gold -= def.cost;

    switch (def.slot) {
      case 'backpack':
        this.inventory.slots = def.stats.capacity;
        this.inventory.maxWeight = def.stats.maxWeight;
        break;
      case 'gloves':
        this.inventory.equippedGloves = equipId;
        break;
      case 'shoes':
        this.inventory.equippedShoes = equipId;
        break;
      case 'tool':
        this.inventory.equippedTool = equipId;
        break;
      case 'headlamp':
        this.inventory.equippedHeadlamp = equipId;
        break;
    }
    this.audio.playSell();
    this.shop.showMessage(`购买了${def.name}！`);
  }

  // ============ 渲染 ============

  render() {
    if (this.scene === SCENE.BEACH) {
      this.renderer.clear();
      this.renderer.renderBeach(
        this.beachMap, this.tide, this.player,
        this.collectibleMgr, this.effects, this.gameTime,
        this.weather, this.shipwreckEvent
      );
      this.ui.render(this.renderer.ctx, {
        tide: this.tide,
        player: this.player,
        inventory: this.inventory,
        moonIndex: this.moonIndex,
        weather: this.currentWeather,
      });
      if (this.showBackpack) {
        this.ui.renderBackpack(this.renderer.ctx, this.inventory, this.backpackSlotSelected);
      }
    } else if (this.scene === SCENE.VILLAGE) {
      this.renderer.ctx.clearRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);
      this.shop._tripsCompleted = this.tripsCompleted;
      this.shop._aquariumCount = this.inventory.aquariumCount;
      this.shop._selectedBeach = this.currentBeach;
      this.shop.render(this.renderer.ctx);
      this._renderVillageHUD();
    }
    this._updateCursor();
  }

  _updateCursor() {
    const mx = this.mouseX, my = this.mouseY, s = SCALE;
    let pointer = false;

    if (this.scene === SCENE.VILLAGE) {
      // 建筑
      const buildings = [
        [160*s, 380*s, 80*s, 60*s],
        [320*s, 390*s, 80*s, 60*s],
        [480*s, 385*s, 80*s, 60*s],
        [640*s, 375*s, 80*s, 60*s],
      ];
      const goX = (CANVAS_W / 2 - 80) * s, goY = 520 * s;
      if ((this._hitTest(goX, goY, 160*s, 36*s)) ||
          buildings.some(b => this._hitTest(b[0],b[1],b[2],b[3]))) {
        pointer = true;
      }
    } else if (this.scene === SCENE.BEACH && !this.showBackpack) {
      const gx = mx / SCALE, gy = my / SCALE;
      const target = this.collectibleMgr?.findNearest(gx, gy, 30);
      if (target) pointer = true;
    }

    this.canvas.style.cursor = pointer ? 'pointer' : 'default';
  }

  _renderVillageHUD() {
    const ctx = this.renderer.ctx;
    const s = SCALE;

    // 顶部信息
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, CANVAS_W * s, 24 * s);

    const moonPhase = MOON_PHASES[this.moonIndex % 8];
    ctx.fillStyle = '#f5f0e0';
    ctx.font = `${6 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${this.day} 天 | 月相: ${moonPhase}`, 10 * s, 16 * s);

    ctx.textAlign = 'right';
    ctx.fillText(`金币: ${this.inventory.gold} | 水族箱: ${this.inventory.aquariumCount}只 | 博物馆: ${this.inventory.museumCount}件`, CANVAS_W * s - 10 * s, 16 * s);

    // 底部操作提示
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, CANVAS_H * s - 24 * s, CANVAS_W * s, 24 * s);
    ctx.fillStyle = '#ddd';
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('[Q/W/E/R]切换建筑 [S]出售 [A]全部出售 [方向键]选择 [空格/回车]出海赶潮！', CANVAS_W * s / 2, CANVAS_H * s - 8 * s);
  }
}
