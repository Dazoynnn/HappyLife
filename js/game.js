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
import { hasSeenTutorial, markTutorialSeen, drawTutorial } from './tutorial.js';

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

    // 尝试读档
    const loaded = this.loadGame();

    // 新手引导（首次加载无存档时显示）
    this._showTutorial = !loaded && !hasSeenTutorial();
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
    this.collectibleMgr.spawnAll(moonEffect, this.currentWeather);

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

    // 自动存档
    this.saveGame();
  }

  /** 随机丢弃背包中一半物品（满潮/死亡惩罚） */
  _dropHalfItems() {
    const items = this.player.items;
    for (let i = items.length - 1; i >= 0; i--) {
      if (Math.random() < 0.5) {
        this.player.currentWeight -= items[i].weight * items[i].count;
        items.splice(i, 1);
      }
    }
  }

  /** 存档到 localStorage */
  saveGame() {
    try {
      const data = {
        version: 1,
        day: this.day,
        moonIndex: this.moonIndex,
        tripsCompleted: this.tripsCompleted,
        inventory: this.inventory.toJSON(),
      };
      localStorage.setItem('tideHunter_save', JSON.stringify(data));
    } catch (e) { /* 静默失败 */ }
  }

  /** 从 localStorage 读档 */
  loadGame() {
    try {
      const raw = localStorage.getItem('tideHunter_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;
      this.day = data.day || 1;
      this.moonIndex = data.moonIndex || 0;
      this.tripsCompleted = data.tripsCompleted || 0;
      if (data.inventory) this.inventory.fromJSON(data.inventory);
      return true;
    } catch (e) { return false; }
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
        const btns = this.ui._bpButtons;
        if (btns) {
          for (const b of btns) {
            const bw = (pw - 40 * s) / 2, bh = 26 * s;
          if (this._hitTest(b.x, b.y, bw, bh)) {
              if (b.action === 'close') { this.showBackpack = false; return; }
              if (this.backpackSlotSelected >= this.inventory.items.length) return;
              const id = this.inventory.items[this.backpackSlotSelected].id;
              const def = COLLECTIBLES[id];
              if (b.action === 'sell') {
                const val = this.inventory.sellItem(this.backpackSlotSelected);
                if (val > 0) this.shop.showMessage(`出售 +${val}金币`);
              } else if (b.action === 'aquarium') {
                if (!def?.alive) { this.shop.showMessage('只有活体生物才能放入水族箱'); }
                else if (this.inventory.addToAquarium(id)) { this.shop.showMessage(`已将 ${def.name} 放入水族箱`); }
              } else if (b.action === 'museum') {
                this.inventory.donateItem(id);
              }
              return;
            }
          }
        }
      }
      this._updateBackpackInput();
      return;
    }

    // 返回村庄（必须先在安全区，双击确认）
    if (this.input.wasPressed('Escape')) {
      if (!this.player.isInSafeZone) {
        this.effects.addFloatingText(this.player.x, this.player.y - 10, '先回到岸边!', '#ffa040', 2);
        return;
      }
      const now = Date.now();
      if (this._escTimer && now - this._escTimer < 1500) {
        this._escTimer = 0;
        this.returnToVillage();
      } else {
        this._escTimer = now;
        this.effects.addFloatingText(this.player.x, this.player.y - 10, '再按Esc确认回村', '#d4a840', 1.5);
      }
      return;
    }

    // 满潮强制返回
    if (this.tide.progress >= 1.0) {
      this.shop.showMessage('潮水已满！被冲回岸边，丢失一半战利品...');
      this._dropHalfItems();
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
      if (this.tide.level < 0.15) {
        this._caveSpawned = true;
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
      const prevStuck = this.player._mudStuck || 0;
      this.player.update(dt, this.input, this.isRunning, this.tide.level, this.beachMap);
      // 暗坑视觉反馈
      if (prevStuck <= 0 && this.player._mudStuck > 0) {
        this.renderer.triggerShake(2);
        this.effects.addFloatingText(this.player.x, this.player.y - 5, '陷入淤泥!', '#8a7a5a', 1.5);
      }
      // 苔藓滑倒反馈
      if (this.player._slipStun > 0 && this.player._slipStun + dt >= 0.6) {
        this.effects.addFloatingText(this.player.x, this.player.y - 8, '滑倒了!', '#c04030', 1);
      }
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
      this._dropHalfItems();
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
          const src = target.def.danger.type === 'damage' ? 'creature' : null;
          this.player.takeDamage(dmg, src);
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
    const maxSlot = Math.max(0, this.inventory.items.length - 1);
    if (this.input.wasPressed('ArrowUp')) this.backpackSlotSelected = Math.max(0, this.backpackSlotSelected - 4);
    if (this.input.wasPressed('ArrowDown')) this.backpackSlotSelected = Math.min(maxSlot, this.backpackSlotSelected + 4);
    if (this.input.wasPressed('ArrowLeft')) this.backpackSlotSelected = Math.max(0, this.backpackSlotSelected - 1);
    if (this.input.wasPressed('ArrowRight')) this.backpackSlotSelected = Math.min(maxSlot, this.backpackSlotSelected + 1);

    if (this.input.wasPressed('KeyS') && this.backpackSlotSelected < this.inventory.items.length) {
      const val = this.inventory.sellItem(this.backpackSlotSelected);
      if (val > 0) {
        this.shop.showMessage(`出售获得 ${val} 金币！`);
      }
    }
    if (this.input.wasPressed('KeyA') && this.backpackSlotSelected < this.inventory.items.length) {
      const itemId = this.inventory.items[this.backpackSlotSelected].id;
      const def = COLLECTIBLES[itemId];
      if (!def?.alive) {
        this.shop.showMessage('只有活体生物才能放入水族箱');
      } else {
        const success = this.inventory.addToAquarium(itemId);
        if (success) this.shop.showMessage(`已将 ${def.name} 放入水族箱`);
        else this.shop.showMessage('放入失败');
      }
    }
    if (this.input.wasPressed('KeyM') && this.backpackSlotSelected < this.inventory.items.length) {
      const itemId = this.inventory.items[this.backpackSlotSelected].id;
      const success = this.inventory.donateItem(itemId);
      if (success) this.shop.showMessage(`已向博物馆捐赠 ${COLLECTIBLES[itemId]?.name || itemId}`);
      else this.shop.showMessage('已捐赠过此物品');
    }
  }

  _updateVillage(dt) {
    // 新手引导：按键或点击关闭
    if (this._showTutorial) {
      if (this.input.anyKeyPressed() || this._consumeClick()) {
        this._showTutorial = false;
        markTutorialSeen();
      }
      return;
    }

    this.shop.update(dt);
    const s = SCALE; // = 2

    // ==== 鼠标点击处理 ====
    const clicked = this._consumeClick();
    if (clicked) {
      const mx = this.mouseX, my = this.mouseY;

      // "?" 帮助按钮
      if (this._helpBtn && this._hitTest(this._helpBtn.x, this._helpBtn.y, this._helpBtn.w, this._helpBtn.h)) {
        this._showTutorial = true;
        return;
      }

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
        const equips = ['shovel_iron','coral_pick','tongs_bamboo','gloves_leather','shoes_grip','boots_iron','basket_medium','headlamp'];
        for (let i = 0; i < equips.length; i++) {
          const ey = py + 44 * s + i * 36 * s;
          if (this._hitTest(px + 8*s, ey - s, pw - 16*s, 32*s)) {
            this._buyEquipment(equips[i]);
            return;
          }
        }
      }

      if (this.shop.tab === 'museum') {
        // 点击展位
        const slots = this.shop._museumSlots;
        if (slots) {
          for (const slot of slots) {
            if (slot && this._hitTest(slot.x, slot.y, slot.w, slot.h)) {
              if (this.inventory.donateItem(slot.id)) {
                this.shop.showMessage(`已捐赠！`);
              }
              return;
            }
          }
        }
        // 威望按钮（二次确认）
        const hallDefs = {
          shell: { exhibits: ['shell_fan','shell_conch','clam','starfish','pearl'], legacy: 'shell_mastery' },
          crustacean: { exhibits: ['crab_sand','crab_rock','urchin','chiton','horseshoe_crab'], legacy: 'crustacean_immunity' },
          fish: { exhibits: ['seahorse','seadragon','goby','octopus_sm','nudibranch'], legacy: 'weight_mastery' },
        };
        const hallId = this.shop._museumHall || 'shell';
        const hd = hallDefs[hallId];
        const exhibits = hd.exhibits;
        const donatedCount = exhibits.filter(e => this.inventory.museum.includes(e)).length;
        if (donatedCount >= exhibits.length && !this.inventory.hasLegacy(hd.legacy)) {
          const btnX = px + pw/2 - 70*s, btnY = py + ph - 60*s;
          if (this._hitTest(btnX, btnY, 140*s, 26*s)) {
            if (this.shop._prestigeConfirm === hallId) {
              const legacy = this.inventory.prestige(hallId);
              if (legacy) {
                this.shop.showMessage('致伟大的海洋！获得永久遗产！');
                this.shop._prestigeConfirm = null;
              }
            } else {
              this.shop._prestigeConfirm = hallId;
              this.shop.showMessage('再次点击确认重置所有进度...');
            }
            return;
          }
        } else {
          this.shop._prestigeConfirm = null;
        }
        // 点击 ◀ ▶ 切换展区
        const titleW = pw * 0.6;
        const titleX = px + (pw - titleW) / 2;
        if (this._hitTest(titleX - 30*s, py + 4*s, 30*s, 20*s)) {
          const halls = ['shell','crustacean','fish'];
          const idx = halls.indexOf(hallId);
          this.shop._museumHall = halls[(idx - 1 + 3) % 3];
        }
        if (this._hitTest(titleX + titleW, py + 4*s, 30*s, 20*s)) {
          const halls = ['shell','crustacean','fish'];
          const idx = halls.indexOf(hallId);
          this.shop._museumHall = halls[(idx + 1) % 3];
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
          { id: 'seagrass', name: '海草甸', unlocked: this.tripsCompleted >= 3, row: 2 },
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
      if (this.input.wasPressed('KeyX')) {
        const total = this.inventory.sellAll();
        this.audio.playSell();
        this.shop.showMessage(`全部出售获得 ${total} 金币`);
      }
    }

    if (this.shop.tab === 'equipment') {
      if (this.input.wasPressed('Digit1')) this._buyEquipment('shovel_iron');
      if (this.input.wasPressed('Digit2')) this._buyEquipment('coral_pick');
      if (this.input.wasPressed('Digit3')) this._buyEquipment('tongs_bamboo');
      if (this.input.wasPressed('Digit4')) this._buyEquipment('gloves_leather');
      if (this.input.wasPressed('Digit5')) this._buyEquipment('shoes_grip');
      if (this.input.wasPressed('Digit6')) this._buyEquipment('boots_iron');
      if (this.input.wasPressed('Digit7')) this._buyEquipment('basket_medium');
      if (this.input.wasPressed('Digit8')) this._buyEquipment('headlamp');
    }

    if (this.shop.tab === 'museum') {
      // 展区切换
      if (this.input.wasPressed('ArrowLeft')) {
        const halls = ['shell','crustacean','fish'];
        const idx = halls.indexOf(this.shop._museumHall || 'shell');
        this.shop._museumHall = halls[(idx - 1 + 3) % 3];
      }
      if (this.input.wasPressed('ArrowRight')) {
        const halls = ['shell','crustacean','fish'];
        const idx = halls.indexOf(this.shop._museumHall || 'shell');
        this.shop._museumHall = halls[(idx + 1) % 3];
      }
      // 捐赠快捷键（根据当前展区）
      const hallExhibits = {
        shell: ['shell_fan','shell_conch','clam','starfish','pearl'],
        crustacean: ['crab_sand','crab_rock','urchin','chiton','horseshoe_crab'],
        fish: ['seahorse','seadragon','goby','octopus_sm','nudibranch'],
      };
      const curExhibits = hallExhibits[this.shop._museumHall || 'shell'] || [];
      if (this.input.wasPressed('Digit1') && curExhibits[0]) this.inventory.donateItem(curExhibits[0]);
      if (this.input.wasPressed('Digit2') && curExhibits[1]) this.inventory.donateItem(curExhibits[1]);
      if (this.input.wasPressed('Digit3') && curExhibits[2]) this.inventory.donateItem(curExhibits[2]);
      if (this.input.wasPressed('Digit4') && curExhibits[3]) this.inventory.donateItem(curExhibits[3]);
      if (this.input.wasPressed('Digit5') && curExhibits[4]) this.inventory.donateItem(curExhibits[4]);
      if (this.input.wasPressed('KeyP')) {
        const hallId = this.shop._museumHall || 'shell';
        const legacy = this.inventory.prestige(hallId);
        if (legacy) this.shop.showMessage('致伟大的海洋！获得永久遗产！');
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

      // 新手引导遮罩
      if (this._showTutorial) {
        drawTutorial(this.renderer.ctx);
      }
    }
    this._updateCursor();
  }

  _updateCursor() {
    const mx = this.mouseX, my = this.mouseY, s = SCALE;
    let pointer = false;

    if (this.scene === SCENE.VILLAGE) {
      // ? 帮助按钮
      if (this._helpBtn && this._hitTest(this._helpBtn.x, this._helpBtn.y, this._helpBtn.w, this._helpBtn.h)) {
        pointer = true;
      }
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

    // "?" 帮助按钮（左上角，竹简风格）
    const helpS = 16 * s, helpX = 6 * s, helpY = 2 * s;
    // 竹简底色圆角方形
    ctx.fillStyle = '#c8b878';
    ctx.beginPath();
    const r = 3 * s;
    ctx.moveTo(helpX + r, helpY);
    ctx.lineTo(helpX + helpS - r, helpY);
    ctx.arcTo(helpX + helpS, helpY, helpX + helpS, helpY + r, r);
    ctx.lineTo(helpX + helpS, helpY + helpS - r);
    ctx.arcTo(helpX + helpS, helpY + helpS, helpX + helpS - r, helpY + helpS, r);
    ctx.lineTo(helpX + r, helpY + helpS);
    ctx.arcTo(helpX, helpY + helpS, helpX, helpY + helpS - r, r);
    ctx.lineTo(helpX, helpY + r);
    ctx.arcTo(helpX, helpY, helpX + r, helpY, r);
    ctx.closePath();
    ctx.fill();
    // 边框 — 深色竹纹
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 竹简编织横纹
    ctx.strokeStyle = '#a89858';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const ly = helpY + 4 * s + i * 4 * s;
      ctx.beginPath();
      ctx.moveTo(helpX + 2 * s, ly);
      ctx.lineTo(helpX + helpS - 2 * s, ly);
      ctx.stroke();
    }
    // "?" 文字 — 朱砂红毛笔色
    ctx.fillStyle = '#c04030';
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('?', helpX + helpS / 2, helpY + helpS / 2 + 4 * s);
    this._helpBtn = { x: helpX, y: helpY, w: helpS, h: helpS };

    const moonPhase = MOON_PHASES[this.moonIndex % 8];
    ctx.fillStyle = '#f5f0e0';
    ctx.font = `${6 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${this.day} 天 | 月相: ${moonPhase}`, 38 * s, 16 * s);

    ctx.textAlign = 'right';
    ctx.fillText(`金币: ${this.inventory.gold} | 水族箱: ${this.inventory.aquariumCount}只 | 博物馆: ${this.inventory.museumCount}件`, CANVAS_W * s - 10 * s, 16 * s);

    // 底部操作提示
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, CANVAS_H * s - 24 * s, CANVAS_W * s, 24 * s);
    ctx.fillStyle = '#ddd';
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('[Q/W/E/R/T]切换建筑 [S]出售 [X]全部出售 [方向键]选择 [空格/回车]出海赶潮！', CANVAS_W * s / 2, CANVAS_H * s - 8 * s);
  }
}
