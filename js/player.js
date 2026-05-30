// player.js — 玩家角色

import { CANVAS_W, CANVAS_H, TILE_SIZE, DEFAULT_BACKPACK, STARTING_EQUIPMENT } from './data.js';

export class Player {
  constructor() {
    // 在地图上的位置（像素坐标）
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H - 40;  // 起始在岸边安全区

    this.width = 14;
    this.height = 16;

    this.speed = 80;          // 像素/秒 步行
    this.runSpeed = 140;      // 像素/秒 奔跑

    this.maxHp = 100;
    this.hp = 100;

    this.maxStamina = 100;
    this.stamina = 100;
    this.staminaDrainWalk = 0.5;
    this.staminaDrainRun = 4;
    this.staminaRegen = 3;    // 每秒恢复（安全区）

    this.facing = 'down';     // 朝向: up/down/left/right
    this.anim = 'idle';       // 当前动画状态
    this.animFrame = 0;
    this.animTimer = 0;

    // 负重
    this.backpackSlots = DEFAULT_BACKPACK.slots;
    this.maxWeight = DEFAULT_BACKPACK.maxWeight;
    this.items = [];          // { id, count, weight }
    this.currentWeight = 0;

    // 装备
    this.equipment = {
      tool: null,     // 当前装备的工具
      gloves: null,
      shoes: null,
      backpack: null,
    };

    // 状态
    this.isCollecting = false;
    this.collectTarget = null;
    this.collectTimer = 0;
    this.isDragging = false;
    this.draggingItem = null;  // { id, name, weight, value }
    this.isInWater = false;
    this.waterDepth = 0;     // 0=陆地, 1=浅水, 2=中水, 3=深水
    this.isInSafeZone = true;

    // 移动输入平滑
    this.velocityX = 0;
    this.velocityY = 0;
  }

  get weightRatio() {
    return this.maxWeight > 0 ? this.currentWeight / this.maxWeight : 0;
  }

  get isOverburdened() {
    return this.weightRatio >= 0.8;
  }

  get isFull() {
    return this.items.length >= this.backpackSlots;
  }

  get currentSpeed() {
    if (this.isDragging) return this.speed * 0.5;
    if (this._mudStuck > 0) return 0; // 暗坑困住
    let base = this.speed;
    // 淤泥减速（涉水靴可免疫，目前无涉水靴装备则直接减速）
    if (this._onMud && this.inventory?.equippedShoes !== 'boots_iron') base *= 0.65;
    // 奔跑（Shift 加速）
    // 实际速度由 game 根据 input 决定是否奔跑
    // 负重惩罚
    const wr = this.weightRatio;
    if (wr > 0.85) base *= 0.55;
    else if (wr > 0.7) base *= 0.75;
    else if (wr > 0.5) base *= 0.9;

    // 涉水惩罚
    if (this.waterDepth >= 2) base *= 0.5;
    else if (this.waterDepth >= 1) base *= 0.8;

    // 体力耗尽
    if (this.stamina <= 0) base *= 0.7;

    return base;
  }

  get currentRunSpeed() {
    if (this.isDragging) return this.currentSpeed; // 拖拽时不能跑
    let base = this.runSpeed;
    const wr = this.weightRatio;
    if (wr > 0.85) return this.currentSpeed; // 太重无法跑
    if (wr > 0.7) base *= 0.7;
    if (this.waterDepth >= 2) base *= 0.6;
    if (this.waterDepth >= 1) base *= 0.85;
    if (this.stamina <= 10) return this.currentSpeed;
    return base;
  }

  startDrag(itemDef) {
    this.isDragging = true;
    this.draggingItem = { id: itemDef.id, name: itemDef.name, weight: itemDef.weight || 5, value: itemDef.value || 50 };
  }

  dropDrag() {
    this.isDragging = false;
    const item = this.draggingItem;
    this.draggingItem = null;
    return item;
  }

  canCollect() {
    return !this.isDragging && !this.isCollecting;
  }

  // 添加物品到背包
  addItem(itemId, itemDef, count = 1) {
    const stackSize = itemDef.stackSize || 1;
    // 查找已有堆叠
    for (let slot of this.items) {
      if (slot.id === itemId && slot.count < stackSize) {
        const canAdd = Math.min(count, stackSize - slot.count);
        slot.count += canAdd;
        this.currentWeight += itemDef.weight * canAdd;
        count -= canAdd;
        if (count <= 0) return true;
      }
    }
    // 需要新槽位
    while (count > 0 && this.items.length < this.backpackSlots) {
      const add = Math.min(count, stackSize);
      this.items.push({ id: itemId, count: add, weight: itemDef.weight });
      this.currentWeight += itemDef.weight * add;
      count -= add;
    }
    return count <= 0;
  }

  // 移除物品
  removeItem(slotIndex, count = 1) {
    if (slotIndex >= this.items.length) return false;
    const slot = this.items[slotIndex];
    const toRemove = Math.min(count, slot.count);
    this.currentWeight -= slot.weight * toRemove;
    slot.count -= toRemove;
    if (slot.count <= 0) {
      this.items.splice(slotIndex, 1);
    }
    return true;
  }

  // 更新水位状态（由 tide 系统调用）
  updateWaterDepth(tideLevel, beachMap) {
    const tileY = Math.floor(this.y / TILE_SIZE);
    const waterLine = Math.floor(tideLevel * beachMap.height);
    this.isInWater = tileY >= waterLine;
    if (this.isInWater) {
      this.waterDepth = Math.min(3, Math.max(1, tileY - waterLine + 1));
    } else {
      this.waterDepth = 0;
    }
    // 安全区判定
    this.isInSafeZone = tideLevel < 0.1 ? true : (tileY < beachMap.safeZoneEnd);
  }

  // 受到伤害，source: 'creature'|'water'|'trap'|undefined
  takeDamage(amount, source = null) {
    // 甲壳免疫遗产 — 螃蟹/海胆攻击免疫
    if (source === 'creature' && this.inventory?.hasLegacy?.('crustacean_immunity')) {
      amount = 0;
    }
    // 竹夹只免疫生物攻击（螃蟹/海胆）
    if (amount > 0 && source === 'creature' && this.inventory?.equippedTool === 'tongs_bamboo') {
      amount = 0;
    }
    // 手套减伤
    if (amount > 0 && this.inventory?.equippedGloves === 'gloves_leather') {
      amount = Math.max(0, amount - 15);
    }
    this.hp = Math.max(0, this.hp - amount);
    return amount;
  }

  // 更新动画
  updateAnim(dt, input, isRunning) {
    this.animTimer += dt;
    if (this.isDragging) {
      this.anim = 'carry';
    } else if (this.isCollecting) {
      this.anim = this.collectTarget?.collectMethod === 'grab' ? 'grab' : 'dig';
    } else if (this.isOverburdened) {
      this.anim = 'carry';
    } else if (input.isMoving) {
      this.anim = isRunning ? 'run' : 'walk';
      this.facing = input.dirName;
    } else {
      this.anim = 'idle';
    }
    // 帧更新
    if (this.animTimer > 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  update(dt, input, isRunning, tideLevel, beachMap) {
    // 移动
    const dir = input.direction;
    let speed = isRunning ? this.currentRunSpeed : this.currentSpeed;

    // 铁头靴减速
    if (this.inventory?.equippedShoes === 'boots_iron') {
      speed *= 0.85;
    }

    this.velocityX = dir.x * speed;
    this.velocityY = dir.y * speed;

    let newX = this.x + this.velocityX * dt;
    let newY = this.y + this.velocityY * dt;

    // 边界约束
    newX = Math.max(4, Math.min(CANVAS_W - this.width - 4, newX));
    newY = Math.max(4, Math.min(CANVAS_H - this.height - 4, newY));

    // 简易碰撞检测（后续可扩展礁石碰撞）
    const tileY = Math.floor(newY / TILE_SIZE);
    if (tileY < beachMap.height) {
      this.x = newX;
      this.y = newY;
    }

    // 体力消耗/恢复
    if (input.isMoving && isRunning && !this.isInSafeZone) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRun * dt);
    } else if (input.isMoving && !this.isInSafeZone) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainWalk * dt);
    } else if (this.isInSafeZone || !input.isMoving) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
    }

    // 水中扣血由 game.js 统一处理，这里不再重复

    // 苔藓礁石滑倒检测
    this._slipStun = this._slipStun || 0;
    const tile = beachMap.getTileAt(this.x + 7, this.y + 8);
    if (tile?.type === 'rock_moss' && this.inventory?.equippedShoes !== 'shoes_grip') {
      this._slipTimer = (this._slipTimer || 0) + dt;
      if (this._slipTimer > 1.5 && Math.random() < dt * 2) {
        this._slipTimer = 0;
        this.hp = Math.max(0, this.hp - 5);
        this._slipStun = 0.6;
      }
    } else {
      this._slipTimer = 0;
    }
    if (this._slipStun > 0) {
      this._slipStun -= dt;
    }

    // 淤泥减速标记
    this._onMud = tile?.type === 'mud_flat' || tile?.biome === 'mud_flat' || tile?.type === 'seagrass_short';

    // 暗坑陷阱
    this._mudStuck = this._mudStuck || 0;
    if (tile?.type === 'mud_pit' && this._mudStuck <= 0 && Math.random() < dt * 1.5) {
      this._mudStuck = 2.0; // 被困2秒
      this.hp = Math.max(0, this.hp - 3);
    }
    if (this._mudStuck > 0) {
      this._mudStuck -= dt;
    }

    // 更新水位状态
    this.updateWaterDepth(tideLevel, beachMap);

    // 更新动画
    this.updateAnim(dt, input, isRunning);
  }
}
