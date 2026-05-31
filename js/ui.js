// ui.js — HUD 和覆盖层 UI

import { CANVAS_W, CANVAS_H, SCALE, MOON_NAMES, MOON_PHASES, COLORS, COLLECTIBLES } from './data.js';
import { genHeartIcon, genStaminaIcon, genGoldIcon, genMoonIcon, genTideBarBg, getCollectibleSprite } from './sprites.js';

export class UIManager {
  constructor() {
    this.heartIcon = genHeartIcon();
    this.staminaIcon = genStaminaIcon();
    this.goldIcon = genGoldIcon();
    this.tideBarBg = genTideBarBg();

    // 月相图标缓存
    this.moonIcons = {};
    for (const phase of MOON_PHASES) {
      this.moonIcons[phase] = genMoonIcon(phase);
    }
  }

  render(ctx, gameState) {
    const { tide, player, inventory, moonIndex, weather } = gameState;

    // 顶部 HUD
    this._drawTopBar(ctx, tide, inventory, moonIndex, weather);

    // 底部 HUD
    this._drawBottomBar(ctx, player, gameState);
  }

  _drawTopBar(ctx, tide, inventory, moonIndex, weather = 'sunny') {
    const ox = 8 * SCALE;
    const oy = 6 * SCALE;

    // 半透明背景条
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, CANVAS_W * SCALE, 28 * SCALE);

    // 月相图标
    const moonPhase = MOON_PHASES[moonIndex % 8];
    const moonIcon = this.moonIcons[moonPhase] || this.moonIcons['full'];
    ctx.drawImage(moonIcon, ox, oy, 20 * SCALE, 20 * SCALE);
    // 月相名称
    ctx.fillStyle = '#f5f0e0';
    ctx.font = `${6 * SCALE}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(MOON_NAMES[moonPhase] || '', ox + 22 * SCALE, oy + 13 * SCALE);

    // 天气指示
    const weatherNames = { sunny: '☀', drizzle: '🌧', storm: '⛈' };
    const weatherColors = { sunny: '#d4a840', drizzle: '#7ec8d8', storm: '#8888cc' };
    const weatherEmoji = weatherNames[weather] || '';
    ctx.fillStyle = weatherColors[weather] || '#888';
    ctx.font = `${7 * SCALE}px monospace`;
    ctx.fillText(weatherEmoji, ox + 122 * SCALE, oy + 14 * SCALE);

    // 潮位指示条
    const tideX = 160 * SCALE;
    const tideY = oy + 2 * SCALE;
    const tideW = 200 * SCALE;
    const tideH = 14 * SCALE;
    ctx.drawImage(this.tideBarBg, tideX, tideY, tideW, tideH);

    // 潮位填充（波浪边效果）
    const fillRatio = tide.level;
    ctx.fillStyle = tide.phaseColor;
    ctx.fillRect(tideX, tideY + 2 * SCALE, tideW * fillRatio, tideH - 4 * SCALE);

    // 潮位状态文字
    ctx.fillStyle = '#ffffff';
    ctx.font = `${5 * SCALE}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${tide.phaseText} ${tide.timeString}`, tideX + 4 * SCALE, tideY + 11 * SCALE);

    // 右侧：金币
    const goldX = CANVAS_W * SCALE - 100 * SCALE;
    ctx.drawImage(this.goldIcon, goldX, oy + 1 * SCALE, 8 * SCALE, 8 * SCALE);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `${7 * SCALE}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${inventory.gold}`, goldX + 10 * SCALE, oy + 9 * SCALE);

    // 背包图标 + 数量
    const bagX = CANVAS_W * SCALE - 42 * SCALE;
    ctx.fillStyle = inventory.weightRatio >= 0.8 ? COLORS.red : '#8a8a6a';
    ctx.fillRect(bagX, oy + 2 * SCALE, 12 * SCALE, 14 * SCALE);
    ctx.fillStyle = '#5a5a3a';
    ctx.fillRect(bagX + 1 * SCALE, oy + 3 * SCALE, 10 * SCALE, 11 * SCALE);
    // 编织纹
    ctx.fillStyle = '#8a8a6a';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(bagX + 2 * SCALE, oy + (4 + i * 3) * SCALE, 8 * SCALE, 1 * SCALE);
    }
    // 数量
    ctx.fillStyle = '#ffffff';
    ctx.font = `${5 * SCALE}px monospace`;
    ctx.textAlign = 'right';
    const slotText = `${inventory.usedSlots}/${inventory.totalSlots}`;
    ctx.fillText(slotText, bagX + 14 * SCALE, oy + 14 * SCALE);

    // 重量警告
    if (inventory.weightRatio >= 0.8) {
      ctx.fillStyle = COLORS.red;
      ctx.font = `${4 * SCALE}px monospace`;
      ctx.fillText('重!', bagX, oy);
    }
  }

  _drawBottomBar(ctx, player, gameState) {
    const barY = CANVAS_H * SCALE - 36 * SCALE;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, barY, CANVAS_W * SCALE, 36 * SCALE);

    const ox = 8 * SCALE;
    const oy = barY + 4 * SCALE;

    // 心形 + HP 条
    ctx.drawImage(this.heartIcon, ox, oy, 10 * SCALE, 10 * SCALE);
    const hpBarX = ox + 12 * SCALE;
    const hpBarW = 100 * SCALE;
    const hpBarH = 6 * SCALE;
    ctx.fillStyle = '#333';
    ctx.fillRect(hpBarX, oy + 2 * SCALE, hpBarW, hpBarH);
    const hpRatio = player.hp / player.maxHp;
    const hpColor = hpRatio < 0.25 ? COLORS.red : COLORS.hp_red;
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, oy + 2 * SCALE, hpBarW * hpRatio, hpBarH);
    ctx.fillStyle = '#fff';
    ctx.font = `${4 * SCALE}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.ceil(player.hp)}`, hpBarX + hpBarW + 4 * SCALE, oy + 8 * SCALE);

    // 闪电 + 体力条
    const stY = oy + 14 * SCALE;
    ctx.drawImage(this.staminaIcon, ox, stY, 8 * SCALE, 8 * SCALE);
    const stBarX = ox + 10 * SCALE;
    const stBarW = 80 * SCALE;
    const stBarH = 5 * SCALE;
    ctx.fillStyle = '#333';
    ctx.fillRect(stBarX, stY + 2 * SCALE, stBarW, stBarH);
    const stRatio = player.stamina / player.maxStamina;
    ctx.fillStyle = stRatio < 0.3 ? '#c08030' : COLORS.stamina_yellow;
    ctx.fillRect(stBarX, stY + 2 * SCALE, stBarW * stRatio, stBarH);

    // 工具快捷键提示
    const toolX = CANVAS_W * SCALE - 200 * SCALE;
    ctx.fillStyle = '#f5f0e0';
    ctx.font = `${5 * SCALE}px monospace`;
    ctx.textAlign = 'right';
    const inv = gameState.inventory;
    let toolName = '木铲';
    if (inv?.equippedTool === 'shovel_iron') toolName = '铁铲';
    else if (inv?.equippedTool === 'coral_pick') toolName = '珊瑚镐';
    else if (inv?.equippedTool === 'tongs_bamboo') toolName = '竹夹';
    ctx.fillText(`工具: ${toolName}`, CANVAS_W * SCALE - 10 * SCALE, oy + 15 * SCALE);

    // 操作提示
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `${4 * SCALE}px monospace`;
    ctx.fillText('WASD移动 Shift奔跑 E采集 Tab背包 Esc回村 鼠标点击采集', CANVAS_W * SCALE - 10 * SCALE, oy + 28 * SCALE);
  }

  // 背包面板 — 适配 960×640 画面
  get _bp() {
    const s = SCALE;
    return {
      pw: 280 * s, ph: 280 * s,
      px: (CANVAS_W * s - 280 * s) / 2,
      py: (CANVAS_H * s - 280 * s) / 2,
      cellSize: 50 * s, gap: 4 * s, cols: 4,
    };
  }

  renderBackpack(ctx, inventory, slotSelected) {
    const s = SCALE;
    const bp = this._bp;
    const { pw, ph, px, py, cellSize, gap, cols } = bp;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_W * s, CANVAS_H * s);

    // 面板背景
    ctx.fillStyle = COLORS.ui_bg;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#b8a090';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // 标题
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `bold ${8 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('背包 [Esc/Tab关闭]', px + pw / 2, py + 14 * s);

    // 负重
    ctx.fillStyle = COLORS.ui_dark;
    ctx.font = `${6 * SCALE}px monospace`;
    ctx.fillText(`负重: ${inventory.currentWeight.toFixed(1)}/${inventory.maxWeight}kg 槽位: ${inventory.usedSlots}/${inventory.totalSlots}`, px + pw / 2, py + 26 * s);

    // 物品格子
    const gridX = px + 12 * s;
    const gridY = py + 32 * s;

    for (let i = 0; i < Math.max(inventory.totalSlots, inventory.items.length); i++) {
      const cx = gridX + (i % cols) * (cellSize + gap);
      const cy = gridY + Math.floor(i / cols) * (cellSize + gap);

      // 超出面板底部的不画
      if (cy + cellSize > py + ph - 30 * s) continue;

      ctx.fillStyle = i < inventory.totalSlots ? '#e8e0d0' : '#ccc';
      ctx.fillRect(cx, cy, cellSize, cellSize);
      ctx.strokeStyle = i === slotSelected ? COLORS.gold : '#b8a090';
      ctx.lineWidth = i === slotSelected ? 2 : 1;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      if (i < inventory.items.length) {
        const item = inventory.items[i];
        const sprite = getCollectibleSprite(item.id);
        if (sprite) {
          const sw = sprite.width * 2;
          const sh = sprite.height * 2;
          ctx.drawImage(sprite, cx + (cellSize - sw) / 2, cy + 6 * s, sw, sh);
        }
        ctx.fillStyle = COLORS.ui_dark;
        ctx.font = `${4 * s}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`x${item.count}`, cx + cellSize / 2, cy + cellSize - 10 * s);
      }
    }

    // 物品描述（从COLLECTIBLES查找）
    const descY = py + ph - 72 * s;
    let descText = '选择一个物品查看详情';
    if (slotSelected >= 0 && slotSelected < inventory.items.length) {
      const selItem = inventory.items[slotSelected];
      const def = COLLECTIBLES[selItem.id];
      if (def?.description) descText = def.description;
    }
    ctx.fillStyle = descText.length > 20 ? '#888' : '#999';
    ctx.font = `${4 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(descText, px + pw / 2, descY);

    // 底部按钮
    const btnY1 = py + ph - 58 * s;
    const btnY2 = py + ph - 30 * s;
    const btnW = (pw - 40 * s) / 2;
    const btnH = 26 * s;

    const buttons = [
      { label: '[S]出售',     x: px + 12 * s,         y: btnY1, action: 'sell' },
      { label: '[A]水族箱',   x: px + 16 * s + btnW,  y: btnY1, action: 'aquarium' },
      { label: '[M]博物馆',   x: px + 12 * s,         y: btnY2, action: 'museum' },
      { label: '[Tab]关闭',   x: px + 16 * s + btnW,  y: btnY2, action: 'close' },
    ];

    this._bpButtons = buttons;

    for (const b of buttons) {
      ctx.fillStyle = '#d8d0c0';
      ctx.fillRect(b.x, b.y, btnW, btnH);
      ctx.strokeStyle = '#a09080';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, btnW, btnH);
      ctx.fillStyle = COLORS.ui_dark;
      ctx.font = `${6 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + btnW / 2, b.y + btnH / 2 + 4 * s);
    }
  }
}
