// renderer.js — 主渲染器

import { CANVAS_W, CANVAS_H, TILE_SIZE, SCALE, COLORS } from './data.js';
import { getTileSprite, getPlayerSprite, getCollectibleSprite } from './sprites.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // 实际绘图缓冲区（480x320）
    this.buffer = document.createElement('canvas');
    this.buffer.width = CANVAS_W;
    this.buffer.height = CANVAS_H;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;
    // UI 层直接画在大画布上（960x640）
    this.canvas.width = CANVAS_W * SCALE;
    this.canvas.height = CANVAS_H * SCALE;
    this.ctx.imageSmoothingEnabled = false;

    this.waveTime = 0;
    this.screenShake = 0;
    this.dangerFlash = 0;
    this.flashAlpha = 0;   // 闪电闪屏 alpha

    // 天空渐变缓存
    this._skyGradient = null;
  }

  // ============ 海滩场景渲染 ============

  renderBeach(beachMap, tide, player, collectibleMgr, effectsMgr, time, weather = null, shipwreckEvent = null) {
    const ctx = this.bctx;
    this._shipwreckEvent = shipwreckEvent;
    this.waveTime += 0.05;

    // 1. 天空背景渐变
    this._drawSky(ctx, tide);

    // 2. 海滩 tile
    this._drawMap(ctx, beachMap);

    // 2.5. 沉船残骸
    if (this._shipwreckEvent?.active) {
      this._drawShipwreck(ctx, this._shipwreckEvent);
    }

    // 3. 收集物
    this._drawCollectibles(ctx, collectibleMgr);

    // 5. 玩家
    this._drawPlayer(ctx, player);

    // 6. 潮水覆盖层
    this._drawWaterOverlay(ctx, beachMap, tide);

    // 7. 特效
    effectsMgr.draw(ctx, 2);

    // 8. 危险边缘泛红
    this._drawDangerVignette(ctx, tide);

    // 屏幕震动
    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake * 2;
      shakeY = (Math.random() - 0.5) * this.screenShake * 2;
      this.screenShake = Math.max(0, this.screenShake - 0.05);
    }

    // 放大渲染到主 canvas
    this.ctx.clearRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);
    this.ctx.drawImage(
      this.buffer,
      shakeX, shakeY, CANVAS_W, CANVAS_H,
      0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE
    );

    // 闪电闪屏
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);
      this.flashAlpha = Math.max(0, this.flashAlpha - 0.04);
    }

    // 天气效果（雨滴画在主 canvas 2x 上，确保可见）
    if (weather && weather.currentKey !== 'sunny') {
      weather.drawRain(this.ctx, SCALE);
    }

    // 危险闪屏
    if (this.dangerFlash > 0) {
      this.ctx.fillStyle = `rgba(192,64,48,${this.dangerFlash * 0.3})`;
      this.ctx.fillRect(0, 0, CANVAS_W * SCALE, CANVAS_H * SCALE);
      this.dangerFlash = Math.max(0, this.dangerFlash - 0.03);
    }

    // 交互提示（画在大 canvas 上）
    this._drawInteractionPrompt(player, collectibleMgr);
  }

  _drawSky(ctx, tide) {
    const danger = tide.dangerLevel;
    // 天空颜色随时间/潮汐变化
    const r1 = Math.floor(135 - danger * 80);
    const g1 = Math.floor(206 - danger * 130);
    const b1 = Math.floor(235 - danger * 150);
    const r2 = Math.floor(200 + danger * 30);
    const g2 = Math.floor(180 - danger * 100);
    const b2 = Math.floor(140 - danger * 80);

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(0.3, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(0.5, `rgb(${(r1+r2)/2},${(g1+g2)/2},${(b1+b2)/2})`);
    grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  _drawMap(ctx, beachMap) {
    for (let row = 0; row < beachMap.rows; row++) {
      for (let col = 0; col < beachMap.cols; col++) {
        const tile = beachMap.tiles[row][col];
        const sx = col * TILE_SIZE;
        const sy = row * TILE_SIZE;

        // 获取 tile sprite
        let spriteType = tile.type;
        if (tile.type.startsWith('rock_')) {
          spriteType = tile.type;
        }

        const sprite = getTileSprite(spriteType, tile.variant || 0);
        if (sprite) {
          ctx.drawImage(sprite, sx, sy);
        }
      }
    }
  }

  _drawCollectibles(ctx, mgr) {
    for (const item of mgr.activeItems) {
      if (item.collected) continue;

      const sprite = getCollectibleSprite(item.id, item.state, item.animFrame);
      if (!sprite) continue;

      const x = item.x + item.bobOffset;
      const y = item.y;

      // 埋藏的收集物半透明显示
      if (item.buried) {
        ctx.globalAlpha = 0.5 + item.buriedDepth * 0.3;
      }

      // 稀有物品发光
      if ((item.def.rarity === 'rare' || item.def.rarity === 'epic') && item.glowTimer > 0) {
        ctx.save();
        const glowAlpha = 0.3 + Math.sin(item.glowTimer * 4) * 0.2;
        ctx.shadowColor = '#d4a840';
        ctx.shadowBlur = 6;
        ctx.globalAlpha = glowAlpha + 0.6;
      }

      ctx.drawImage(sprite, Math.floor(x), Math.floor(y));

      if (item.def.rarity === 'rare' || item.def.rarity === 'epic') {
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }
  }

  _drawPlayer(ctx, player) {
    const sprite = getPlayerSprite(player.anim, player.facing, player.animFrame);
    if (!sprite) return;

    const x = Math.floor(player.x);
    const y = Math.floor(player.y);

    // 水中只显示上半身（简单实现：截断绘制）
    if (player.waterDepth >= 1) {
      ctx.save();
      // 裁剪下半部分
      const waterCutoff = y + 12 - player.waterDepth * 3;
      ctx.drawImage(sprite, x, y);
      // 水纹遮罩
      ctx.fillStyle = COLORS.water_shallow + '60';
      ctx.fillRect(x, waterCutoff, 20, y + 20 - waterCutoff);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, x, y);
    }

    // 体力耗尽时喘气
    if (player.stamina <= 0) {
      ctx.fillStyle = '#ffffff40';
      ctx.font = '4px monospace';
      ctx.fillText('...', x + 22, y + 5);
    }
  }

  _drawWaterOverlay(ctx, beachMap, tide) {
    const waterLinePx = tide.waterLineTile * TILE_SIZE;
    if (waterLinePx >= CANVAS_H) return;

    // 半透明水面
    const alpha = 0.35 + tide.dangerLevel * 0.2;
    ctx.fillStyle = `rgba(45,110,130,${alpha})`;
    ctx.fillRect(0, waterLinePx, CANVAS_W, CANVAS_H - waterLinePx);

    // 泡沫线（波浪形边界）
    ctx.fillStyle = `rgba(232,244,248,${0.5 + Math.sin(this.waveTime) * 0.3})`;
    for (let x = 0; x < CANVAS_W; x += 2) {
      const waveY = waterLinePx + Math.sin(x * 0.1 + this.waveTime) * 2;
      ctx.fillRect(x, waveY, 2, 1);
      // 浪花飞沫（确定性伪随机，基于位置+时间）
      const hash = (x * 137 + Math.floor(this.waveTime * 60)) % 100;
      if (hash < 3) {
        const fx = x + ((hash * 7) % 8 - 4);
        ctx.fillRect(fx, waveY - 2, 1, 1);
      }
    }
  }

  _drawShipwreck(ctx, event) {
    if (!event?.active) return;
    const x = event.x, y = event.y;
    // 船体
    ctx.fillStyle = '#5a3a20';
    ctx.beginPath();
    ctx.moveTo(x - 30, y + 10);
    ctx.lineTo(x - 20, y - 5);
    ctx.lineTo(x + 20, y - 5);
    ctx.lineTo(x + 30, y + 10);
    ctx.lineTo(x + 15, y + 25);
    ctx.lineTo(x - 15, y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 桅杆
    ctx.strokeStyle = '#6a6a6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x - 10, y - 25);
    ctx.stroke();
    // 苔痕
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(x - 12, y + 18, 8, 4);
    ctx.fillRect(x + 5, y + 20, 6, 3);
    // 发光提示（还没被洗劫）
    if (!event.looted) {
      ctx.fillStyle = `rgba(212,168,64,${0.25 + Math.sin(Date.now() / 500) * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y + 12, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    // 残骸碎片
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x - 35, y + 22, 10, 3);
    ctx.fillRect(x + 28, y + 18, 6, 2);
  }

  _drawDangerVignette(ctx, tide) {
    const danger = tide.dangerLevel;
    if (danger <= 0) return;

    const alpha = danger * 0.4;
    const grad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(192,64,48,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  _drawInteractionPrompt(player, collectibleMgr) {
    const nearest = collectibleMgr.findNearest(player.x, player.y, 25);
    if (!nearest) return;

    const ctx = this.ctx;
    const px = (player.x + 10) * SCALE;
    const py = (player.y - 6) * SCALE;

    // 气泡
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(px, py, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 提示文字
    ctx.fillStyle = '#2d2010';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const label = nearest.def.collectMethod === 'dig' ? '挖' :
                  nearest.def.collectMethod === 'grab' ? '抓' :
                  nearest.def.collectMethod === 'pickup' ? '捡' : '取';
    ctx.fillText(`[E]${label}`, px, py + 3);
  }

  // ============ 屏幕震动 ============
  triggerShake(intensity = 3) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  triggerDangerFlash() {
    this.dangerFlash = 1;
  }

  triggerLightningFlash() {
    this.flashAlpha = 1.0;
  }

  // ============ UI 渲染（在大 canvas 上） ============
  renderUI(gameState) {
    // 由 ui.js 处理
  }

  // 清除缓冲区
  clear() {
    this.bctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  }
}
