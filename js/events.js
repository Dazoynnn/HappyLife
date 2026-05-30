// events.js — 随机事件管理（沉船/鲨鱼/人鱼商人等）
import { SHIPWRECK_LOOT, CANVAS_W, CANVAS_H } from './data.js';
import { Collectible } from './collectibles.js';

export class ShipwreckEvent {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.timeRemaining = 0;
    this.looted = false;
    this.spawnedItems = [];
  }

  /** 每帧尝试触发，返回 true 表示触发了 */
  tryTrigger(beachMap, tide) {
    if (this.active) return false;
    // 仅在退潮期或低潮期触发
    const p = tide.progress;
    if (p > 0.6 || p < 0.05) return false;
    // 3% 每分钟 ≈ 每帧 0.0005 (60fps)
    if (Math.random() > 0.0008) return false;

    this.active = true;
    this.x = 60 + Math.random() * (CANVAS_W - 120);
    this.y = CANVAS_H - 30 - Math.random() * 40;
    this.timeRemaining = 45; // 45 秒，沉船存在时间
    this.looted = false;
    this.spawnedItems = [];
    return true;
  }

  /** 洗劫沉船，返回新生成的收集物数组 */
  spawnLoot() {
    if (this.looted) return [];
    this.looted = true;
    const items = [];
    // 保底掉落
    for (const g of SHIPWRECK_LOOT.guaranteed) {
      for (let i = 0; i < g.count; i++) {
        items.push(new Collectible(g.id,
          this.x + (Math.random() - 0.5) * 40,
          this.y + (Math.random() - 0.5) * 20));
      }
    }
    // 随机珍宝
    for (const r of SHIPWRECK_LOOT.random) {
      if (Math.random() < r.chance) {
        for (let i = 0; i < r.count; i++) {
          items.push(new Collectible(r.id,
            this.x + (Math.random() - 0.5) * 50,
            this.y + (Math.random() - 0.5) * 30));
        }
      }
    }
    this.spawnedItems = items;
    return items;
  }

  /** 随机掉落装备 ID（50%概率） */
  static rollEquipment() {
    if (Math.random() > 0.5) return null;
    const pool = SHIPWRECK_LOOT.equipmentDrop;
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt) {
    if (!this.active) return;
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.active = false;
    }
  }

  get isExpired() {
    return this.active && this.timeRemaining <= 0;
  }

  /** 检查点击是否命中沉船 */
  hitTest(px, py) {
    if (!this.active) return false;
    return Math.abs(px - this.x) < 50 && Math.abs(py - this.y) < 40;
  }
}
