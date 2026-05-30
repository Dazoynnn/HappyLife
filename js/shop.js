// shop.js — 村庄/商店场景

import { CANVAS_W, CANVAS_H, SCALE, COLORS, EQUIPMENT, MOON_NAMES, MOON_PHASES } from './data.js';

export class ShopScene {
  constructor(inventory) {
    this.inventory = inventory;
    this.selectedSlot = -1;
    this.tab = 'sell'; // sell / equipment / aquarium / museum
    this.message = '';
    this.messageTimer = 0;
    this._tripsCompleted = 0;
    this._selectedBeach = 'white_sand';
    this._museumHall = 'shell'; // 'shell' or 'crustacean'
  }

  showMessage(msg) {
    this.message = msg;
    this.messageTimer = 2.5;
  }

  update(dt) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
  }

  render(ctx) {
    // 村庄背景
    this._drawVillageBg(ctx);

    // 四个建筑按钮
    this._drawBuildings(ctx);

    // 主面板
    this._drawPanel(ctx);

    // 消息
    if (this.messageTimer > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = `${7 * SCALE}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(this.message, CANVAS_W * SCALE / 2, CANVAS_H * SCALE - 20 * SCALE);
    }
  }

  _drawVillageBg(ctx) {
    // 天空
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * SCALE);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(0.6, '#e8b878');
    grad.addColorStop(1, '#d4a860');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);

    // 草地
    ctx.fillStyle = '#8ab860';
    ctx.fillRect(0, CANVAS_H * SCALE * 0.6, CANVAS_W * SCALE, CANVAS_H * SCALE * 0.4);

    // 沙滩边缘
    ctx.fillStyle = COLORS.sand_dry;
    ctx.fillRect(0, CANVAS_H * SCALE * 0.7, CANVAS_W * SCALE, CANVAS_H * SCALE * 0.3);

    // 大海远景
    ctx.fillStyle = COLORS.water_shallow;
    ctx.fillRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE * 0.15);

    // 简单的小屋
    this._drawHut(ctx, 80 * SCALE, 280 * SCALE);
    this._drawHut(ctx, 300 * SCALE, 290 * SCALE);
    this._drawHut(ctx, 600 * SCALE, 270 * SCALE);

    // 渔网架
    ctx.strokeStyle = '#8a7a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(700 * SCALE, 350 * SCALE);
    ctx.lineTo(700 * SCALE, 420 * SCALE);
    ctx.lineTo(760 * SCALE, 420 * SCALE);
    ctx.stroke();
  }

  _drawHut(ctx, x, y) {
    const s = SCALE;
    // 墙
    ctx.fillStyle = '#d8c8a8';
    ctx.fillRect(x, y, 40 * s, 30 * s);
    // 屋顶
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y);
    ctx.lineTo(x + 20 * s, y - 18 * s);
    ctx.lineTo(x + 45 * s, y);
    ctx.fill();
    // 门
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(x + 15 * s, y + 14 * s, 10 * s, 16 * s);
    // 窗
    ctx.fillStyle = '#ffe8a0';
    ctx.fillRect(x + 6 * s, y + 10 * s, 6 * s, 6 * s);
  }

  _drawBuildings(ctx) {
    const s = SCALE;
    const buildings = [
      { label: '鱼市 [Q]', x: 160, y: 380, key: 'Q' },
      { label: '水族箱 [W]', x: 320, y: 390, key: 'W' },
      { label: '博物馆 [E]', x: 480, y: 385, key: 'E' },
      { label: '工坊 [R]', x: 640, y: 375, key: 'R' },
      { label: '海图 [T]', x: 720, y: 380, key: 'T' },
    ];

    for (const b of buildings) {
      // 建筑基座
      ctx.fillStyle = this.tab === 'sell' && b.label === '鱼市' ? '#e8d8c0' :
                       this.tab === 'aquarium' && b.label === '水族箱' ? '#e8d8c0' :
                       this.tab === 'museum' && b.label === '博物馆' ? '#e8d8c0' :
                       this.tab === 'equipment' && b.label === '工坊' ? '#e8d8c0' :
                       this.tab === 'chart' && b.label === '海图' ? '#e8d8c0' : '#d0c0a0';
      ctx.fillRect(b.x * s, b.y * s, 80 * s, 60 * s);
      ctx.strokeStyle = '#a09080';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x * s, b.y * s, 80 * s, 60 * s);

      // 名称
      ctx.fillStyle = COLORS.ui_dark;
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, (b.x + 40) * s, (b.y + 36) * s);
    }

    // 【出海】按钮
    const goX = (CANVAS_W / 2 - 80) * s;
    const goY = 520 * s;
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(goX, goY, 160 * s, 36 * s);
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 2;
    ctx.strokeRect(goX, goY, 160 * s, 36 * s);
    ctx.fillStyle = COLORS.red;
    ctx.font = `bold ${9 * s}px monospace`;
    ctx.fillText('出 海', CANVAS_W * s / 2, goY + 26 * s);

    // 当前日/月相
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`金币: ${this.inventory.gold}`, CANVAS_W * s - 20 * s, 380 * s);
    ctx.fillText(`水族箱: ${this.inventory.aquariumCount}只`, CANVAS_W * s - 20 * s, 400 * s);
    ctx.fillText(`博物馆: ${this.inventory.museumCount}件`, CANVAS_W * s - 20 * s, 420 * s);
  }

  _drawPanel(ctx) {
    const s = SCALE;
    const px = 40 * s;
    const py = 60 * s;
    const pw = CANVAS_W * s - 80 * s;
    const ph = 240 * s;

    ctx.fillStyle = 'rgba(245,240,224,0.95)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#b8a090';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    switch (this.tab) {
      case 'sell':
        this._drawSellTab(ctx, px, py, pw, ph);
        break;
      case 'equipment':
        this._drawEquipmentTab(ctx, px, py, pw, ph);
        break;
      case 'aquarium':
        this._drawAquariumTab(ctx, px, py, pw, ph);
        break;
      case 'museum':
        this._drawMuseumTab(ctx, px, py, pw, ph);
        break;
      case 'chart':
        this._drawChartTab(ctx, px, py, pw, ph);
        break;
    }
  }

  _drawSellTab(ctx, px, py, pw, ph) {
    const s = SCALE;
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('鱼市 — 出售战利品', px + 12 * s, py + 16 * s);

    const items = this.inventory.items;
    if (items.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('背包空空如也，先去赶海吧！', px + pw / 2, py + 80 * s);
      return;
    }

    // 物品列表
    const listY = py + 28 * s;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const def = this._getCollectibleDefSync(item.id) || { name: item.id, value: 0 };
      const iy = listY + i * 24 * s;

      if (i === this.selectedSlot) {
        ctx.fillStyle = '#d4a84040';
        ctx.fillRect(px + 8 * s, iy - s, pw - 16 * s, 22 * s);
      }

      ctx.fillStyle = COLORS.ui_dark;
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${def.name} x${item.count}`, px + 16 * s, iy + 10 * s);

      const itemValue = def.value * item.count;

      ctx.textAlign = 'right';
      ctx.fillText(`${itemValue} 金币`, px + pw - 16 * s, iy + 10 * s);
    }

    // 操作提示
    ctx.fillStyle = '#888';
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('[↑↓]选择 [S]出售选中 [X]全部出售 [Q/W/E/R/T]切换建筑', px + 12 * s, py + ph - 16 * s);
  }

  _drawEquipmentTab(ctx, px, py, pw, ph) {
    const s = SCALE;
    const equips = [
      { id: 'shovel_iron', name: '铁铲', cost: 200, desc: '采集速度+50%，挖掘有加成' },
      { id: 'coral_pick', name: '珊瑚镐', cost: 250, desc: '礁石区效率+200%' },
      { id: 'tongs_bamboo', name: '竹夹', cost: 120, desc: '安全采集螃蟹/海胆' },
      { id: 'gloves_leather', name: '皮革手套', cost: 150, desc: '减少15点伤害' },
      { id: 'shoes_grip', name: '防滑鞋', cost: 180, desc: '礁石上不打滑' },
      { id: 'boots_iron', name: '铁头靴', cost: 220, desc: '免疫尖石伤害，移速-15%' },
      { id: 'basket_medium', name: '中型竹篓', cost: 300, desc: '容量16格/30kg' },
      { id: 'headlamp', name: '头灯', cost: 180, desc: '洞穴/深水视野+50%' },
    ];

    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('工坊 — 装备升级', px + 12 * s, py + 16 * s);
    ctx.fillText(`当前金币: ${this.inventory.gold}`, px + 12 * s, py + 28 * s);

    for (let i = 0; i < equips.length; i++) {
      const eq = equips[i];
      const ey = py + 44 * s + i * 36 * s;
      const canBuy = this.inventory.gold >= eq.cost;

      ctx.fillStyle = i === this.selectedSlot ? '#d4a84040' : 'transparent';
      ctx.fillRect(px + 8 * s, ey - s, pw - 16 * s, 32 * s);

      ctx.fillStyle = COLORS.ui_dark;
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${eq.name} — ${eq.desc}`, px + 16 * s, ey + 12 * s);

      ctx.fillStyle = canBuy ? COLORS.gold : '#888';
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`${eq.cost} 金币 [${i + 1}]购买`, px + pw - 16 * s, ey + 12 * s);
    }
  }

  _drawAquariumTab(ctx, px, py, pw, ph) {
    const s = SCALE;
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('水族箱 — 活体养殖', px + 12 * s, py + 16 * s);

    // 水背景
    const waterY = py + 28 * s;
    const waterH = ph - 60 * s;
    ctx.fillStyle = '#7ec8d8';
    ctx.fillRect(px + 10 * s, waterY, pw - 20 * s, waterH);
    // 水波纹
    ctx.fillStyle = '#ffffff20';
    for (let y = waterY; y < waterY + waterH; y += 12 * s) {
      ctx.fillRect(px + 10 * s, y, pw - 20 * s, 1 * s);
    }

    // 水族箱生物
    const aquarium = this.inventory.aquarium;
    if (aquarium.length === 0) {
      ctx.fillStyle = '#ffffff80';
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('水族箱是空的，把活的生物放进来吧！', px + pw / 2, waterY + waterH / 2);
    } else {
      for (let i = 0; i < aquarium.length; i++) {
        const a = aquarium[i];
        ctx.fillStyle = '#fff';
        ctx.font = `${6 * s}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`${a.name} x${a.count}  产出碎片: ${(a.output * a.count).toFixed(1)}/天`, px + 20 * s, waterY + 20 * s + i * 20 * s);
      }
    }

    // 收集产出
    const frags = this.inventory.collectAquariumOutput();
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`海灵珠碎片: ${this.inventory.seaPearlFragments.toFixed(1)} (10碎片=1海灵珠)`, px + 12 * s, py + ph - 36 * s);

    const canSynth = this.inventory.seaPearlFragments >= 10;
    ctx.fillStyle = canSynth ? COLORS.gold : '#888';
    ctx.fillText(`海灵珠: ${this.inventory.seaPearls}颗 [F]合成`, px + 12 * s, py + ph - 20 * s);
    if (canSynth) {
      this._synthBtn = { x: px + 12 * s, y: py + ph - 26 * s, w: 180 * s, h: 14 * s };
    }
  }

  _drawMuseumTab(ctx, px, py, pw, ph) {
    const s = SCALE;
    // 展区切换
    if (!this._museumHall) this._museumHall = 'shell';
    const halls = [
      { id: 'shell', name: '贝类馆', exhibits: ['shell_fan','shell_conch','clam','starfish','pearl'],
        names: ['扇贝壳','海螺壳','蛤蜊','海星','珍珠'], legacy: 'shell_mastery', legacyDesc: '贝类精通 (贝壳+25%)' },
      { id: 'crustacean', name: '甲壳馆', exhibits: ['crab_sand','crab_rock','urchin','chiton','horseshoe_crab'],
        names: ['沙蟹','石蟹','海胆','石鳖','鲎'], legacy: 'crustacean_immunity', legacyDesc: '甲壳免疫 (不受螃蟹/海胆伤害)' },
      { id: 'fish', name: '鱼类馆', exhibits: ['seahorse','seadragon','goby','octopus_sm','nudibranch'],
        names: ['海马','海龙','虾虎鱼','小章鱼','海蛞蝓'], legacy: 'fish_mastery', legacyDesc: '鱼类精通 (待定)' },
    ];
    const hall = halls.find(h => h.id === this._museumHall) || halls[0];

    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'center';
    const hallIdx = halls.findIndex(h => h.id === this._museumHall);
    ctx.fillText(`◀ 博物馆 — ${hall.name} ▶`, px + pw / 2, py + 16 * s);

    // 展位
    const gridX = px + 20 * s;
    const gridY = py + 32 * s;

    for (let i = 0; i < hall.exhibits.length; i++) {
      const ex = gridX + i * 140 * s;
      const ey = gridY;
      const donated = this.inventory.museum.includes(hall.exhibits[i]);

      ctx.fillStyle = donated ? '#e8e0d0' : '#aaa';
      ctx.fillRect(ex, ey, 120 * s, 70 * s);
      ctx.strokeStyle = donated ? COLORS.gold : '#888';
      ctx.lineWidth = donated ? 2 : 1;
      ctx.strokeRect(ex, ey, 120 * s, 70 * s);

      ctx.fillStyle = COLORS.ui_dark;
      ctx.font = `${5 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(donated ? hall.names[i] : '???', ex + 60 * s, ey + 30 * s);

      if (!donated && this.inventory.items.some(it => it.id === hall.exhibits[i])) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = `${4 * s}px monospace`;
        ctx.fillText('可捐赠', ex + 60 * s, ey + 50 * s);
      }
    }

    // 进度
    const donatedCount = hall.exhibits.filter(e => this.inventory.museum.includes(e)).length;
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`进度: ${donatedCount}/${hall.exhibits.length}  [← →]切换展区`, px + 12 * s, py + ph - 40 * s);

    if (donatedCount === hall.exhibits.length && !this.inventory.hasLegacy(hall.legacy)) {
      const confirming = this._prestigeConfirm === hall.id;
      ctx.fillStyle = confirming ? '#ff6040' : '#c04030';
      const btnX = px + pw / 2 - 70 * s;
      const btnY = py + ph - 50 * s;
      ctx.fillRect(btnX, btnY, 140 * s, 24 * s);
      ctx.fillStyle = '#f5f0e0';
      ctx.font = `bold ${5 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(confirming ? '再次点击确认重置!' : '致伟大的海洋', px + pw / 2, btnY + 16 * s);
      this._museumPrestigeBtn = { x: btnX, y: btnY, w: 140 * s, h: 24 * s };
      this._museumPrestigeHall = hall.id;
    } else if (this.inventory.hasLegacy(hall.legacy)) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = `${5 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`永久遗产: ${hall.legacyDesc}`, px + pw / 2, py + ph - 50 * s);
    } else {
      ctx.fillStyle = '#888';
      ctx.font = `${5 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`集齐5件触发「致伟大的海洋」(${donatedCount}/5)`, px + pw / 2, py + ph - 50 * s);
    }
  }

  _drawChartTab(ctx, px, py, pw, ph) {
    const s = SCALE;
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${7 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('海图 — 选择海滩', px + 12 * s, py + 16 * s);

    const beaches = [
      { id: 'white_sand', name: '白沙湾', risky: '★', unlocked: true, desc: '平坦白色沙滩，适合新手' },
      { id: 'black_reef', name: '黑礁岛', risky: '★★', unlocked: this._tripsCompleted >= 3, desc: '礁石密布，资源丰富' },
      { id: 'seagrass', name: '海草甸', risky: '★★★', unlocked: this._tripsCompleted >= 3, desc: '海草丛生，淤泥暗藏陷阱' },
    ];

    for (let i = 0; i < beaches.length; i++) {
      const b = beaches[i];
      const by = py + 32 * s + i * 70 * s;
      ctx.fillStyle = b.unlocked ? '#e8e0d0' : '#555';
      ctx.fillRect(px + 12 * s, by, pw - 24 * s, 60 * s);
      ctx.strokeStyle = this._selectedBeach === b.id ? COLORS.gold : '#888';
      ctx.lineWidth = this._selectedBeach === b.id ? 2 : 1;
      ctx.strokeRect(px + 12 * s, by, pw - 24 * s, 60 * s);

      ctx.fillStyle = b.unlocked ? COLORS.ui_dark : '#666';
      ctx.font = `${7 * s}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(b.name, px + 24 * s, by + 22 * s);
      ctx.font = `${5 * s}px monospace`;
      ctx.fillText(b.unlocked ? `危险: ${b.risky}  ${b.desc}` : '完成3次出海后解锁', px + 24 * s, by + 44 * s);
    }

    ctx.fillStyle = '#888';
    ctx.font = `${5 * s}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('[点击海滩选择] [数字键5]切换海图', px + 12 * s, py + ph - 16 * s);
  }

  _getCollectibleDefSync(id) {
    const defs = {
      'shell_fan': { name: '扇贝壳', value: 5, category: 'shell' },
      'shell_conch': { name: '海螺壳', value: 8, category: 'shell' },
      'clam': { name: '蛤蜊', value: 15, category: 'shell', alive: true },
      'crab_sand': { name: '沙蟹', value: 20, category: 'crustacean', alive: true },
      'starfish': { name: '海星', value: 35, category: 'living', alive: true },
      'coin_ancient': { name: '古钱币', value: 80, category: 'treasure' },
      'pearl': { name: '珍珠', value: 120, category: 'treasure' },
      'urchin': { name: '海胆', value: 25, category: 'living', alive: true },
      'chiton': { name: '石鳖', value: 18, category: 'shell' },
      'octopus_sm': { name: '小章鱼', value: 45, category: 'living', alive: true },
      'abalone': { name: '鲍鱼', value: 55, category: 'shell', alive: true },
      'seaglass': { name: '海玻璃', value: 10, category: 'treasure' },
      'crab_rock': { name: '石蟹', value: 22, category: 'crustacean', alive: true },
      'seahorse': { name: '海马', value: 40, category: 'fish', alive: true },
      'seadragon': { name: '海龙', value: 70, category: 'fish', alive: true },
      'goby': { name: '虾虎鱼', value: 15, category: 'fish', alive: true },
      'nudibranch': { name: '海蛞蝓', value: 35, category: 'living', alive: true },
      'sand_dollar': { name: '沙钱', value: 12, category: 'shell' },
      'horseshoe_crab': { name: '鲎', value: 90, category: 'crustacean', alive: true },
    };
    return defs[id] || null;
  }
}
