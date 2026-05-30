// inventory.js — 背包和库存管理

import { COLLECTIBLES, DEFAULT_BACKPACK } from './data.js';

export class Inventory {
  constructor() {
    this.slots = DEFAULT_BACKPACK.slots;
    this.maxWeight = DEFAULT_BACKPACK.maxWeight;
    this.items = [];     // [{ id, count, weight }]
    this.gold = 50;      // 起始金币
    this.aquarium = [];  // 水族箱生物: [{ id, name, output, count }]
    this.museum = [];    // 已捐赠: [itemId, ...]
    this.legacies = [];  // 已获得的永久遗产 id 列表
    this.seaPearlFragments = 0; // 海灵珠碎片
    this.seaPearls = 0;        // 海灵珠数量
  }

  get currentWeight() {
    return this.items.reduce((sum, item) => sum + item.weight * item.count, 0);
  }

  get weightRatio() {
    return this.maxWeight > 0 ? this.currentWeight / this.maxWeight : 0;
  }

  get totalSlots() {
    return this.slots;
  }

  get usedSlots() {
    return this.items.length;
  }

  get isFull() {
    return this.items.length >= this.slots;
  }

  // 从海滩转移物品（采集）
  addItem(itemId, count = 1) {
    const def = COLLECTIBLES[itemId];
    if (!def) return false;

    const stackSize = def.stackSize || 1;
    let remaining = count;

    // 尝试堆叠
    for (let slot of this.items) {
      if (slot.id === itemId && slot.count < stackSize) {
        const canAdd = Math.min(remaining, stackSize - slot.count);
        slot.count += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) return true;
      }
    }

    // 新槽位
    while (remaining > 0 && this.items.length < this.slots) {
      const add = Math.min(remaining, stackSize);
      this.items.push({ id: itemId, count: add, weight: def.weight });
      remaining -= add;
    }

    return remaining <= 0;
  }

  // 出售物品
  sellItem(slotIndex, count = 1) {
    if (slotIndex >= this.items.length) return 0;
    const slot = this.items[slotIndex];
    const def = COLLECTIBLES[slot.id];
    const toSell = Math.min(count, slot.count);
    const value = def.value * toSell;
    this.gold += value;
    slot.count -= toSell;
    if (slot.count <= 0) {
      this.items.splice(slotIndex, 1);
    }
    return value;
  }

  // 全部出售
  sellAll() {
    let total = 0;
    while (this.items.length > 0) {
      total += this.sellItem(0, this.items[0].count);
    }
    return total;
  }

  // 捐赠给博物馆
  donateItem(itemId) {
    if (this.museum.includes(itemId)) return false;
    // 从背包中移除一个
    const idx = this.items.findIndex(s => s.id === itemId);
    if (idx < 0) return false;
    this.items[idx].count--;
    if (this.items[idx].count <= 0) {
      this.items.splice(idx, 1);
    }
    this.museum.push(itemId);
    return true;
  }

  // 放入水族箱
  addToAquarium(itemId) {
    const def = COLLECTIBLES[itemId];
    if (!def || !def.alive) return false;
    // 从背包中移除
    const idx = this.items.findIndex(s => s.id === itemId);
    if (idx < 0) return false;
    this.items[idx].count--;
    if (this.items[idx].count <= 0) {
      this.items.splice(idx, 1);
    }
    // 添加到水族箱
    const existing = this.aquarium.find(a => a.id === itemId);
    if (existing) {
      existing.count++;
    } else {
      this.aquarium.push({
        id: itemId,
        name: def.name,
        output: def.aquariumOutput || 1,
        count: 1,
      });
    }
    return true;
  }

  // 水族箱每日产出
  collectAquariumOutput() {
    let fragments = 0;
    for (const a of this.aquarium) {
      fragments += a.output * a.count;
    }
    this.seaPearlFragments += fragments;
    return Math.floor(fragments);
  }

  /** 威望重置 — 致伟大的海洋 */
  prestige(sectionId) {
    const legacyMap = {
      shell: 'shell_mastery',  // 贝类精通
    };
    const legacyId = legacyMap[sectionId];
    if (!legacyId || this.legacies.includes(legacyId)) return null;

    const sectionRequirements = { shell: 5 };
    const required = sectionRequirements[sectionId] || 0;
    if (this.museum.length < required) return null;

    this.legacies.push(legacyId);
    // 重置
    this.items = [];
    this.gold = 0;
    this.aquarium = [];
    this.seaPearlFragments = 0;
    return legacyId;
  }

  hasLegacy(id) {
    return this.legacies.includes(id);
  }

  /** 海灵珠合成 */
  synthesizePearl() {
    if (this.seaPearlFragments < 10) return false;
    this.seaPearlFragments -= 10;
    this.seaPearls++;
    return true;
  }

  get museumCount() {
    return this.museum.length;
  }

  get aquariumCount() {
    return this.aquarium.reduce((s, a) => s + a.count, 0);
  }

  // 重置背包（保留水族箱、博物馆、金币）
  resetBackpack() {
    this.items = [];
  }
}
